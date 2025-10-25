import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
}

function parseSignalFromText(text: string): any {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const signal: any = {
    rawText: text,
    parsed: {},
  };

  let signalType = 'alert';
  if (/buy|long|entrada.*long/i.test(text)) signalType = 'buy';
  else if (/sell|short|entrada.*short/i.test(text)) signalType = 'sell';
  else if (/close|exit|cerrar|fechar/i.test(text)) signalType = 'close';

  signal.signalType = signalType;

  const symbolMatch = text.match(/(?:symbol|pair|símbolo|par)[:\s]*([A-Z0-9\/]+)/i) ||
                      text.match(/([A-Z]{3,6}\/[A-Z]{3,6})/i) ||
                      text.match(/([A-Z]{3,10}USD[T]?)/i);
  if (symbolMatch) signal.symbol = symbolMatch[1];

  const priceMatch = text.match(/(?:price|entry|precio|entrada)[:\s]*([0-9.,]+)/i);
  if (priceMatch) signal.price = parseFloat(priceMatch[1].replace(',', ''));

  const slMatch = text.match(/(?:stop\s*loss|sl|stop)[:\s]*([0-9.,]+)/i);
  if (slMatch) signal.stopLoss = parseFloat(slMatch[1].replace(',', ''));

  const tpMatches = text.matchAll(/(?:take\s*profit|tp|target)[\s]*([0-9])?[:\s]*([0-9.,]+)/gi);
  const tpLevels: number[] = [];
  for (const match of tpMatches) {
    tpLevels.push(parseFloat(match[2].replace(',', '')));
  }
  if (tpLevels.length > 0) {
    signal.takeProfit = tpLevels[0];
    signal.takeProfitLevels = tpLevels;
  }

  const qtyMatch = text.match(/(?:quantity|qty|size|lote|tamaño)[:\s]*([0-9.,]+)/i);
  if (qtyMatch) signal.quantity = parseFloat(qtyMatch[1].replace(',', ''));

  const leverageMatch = text.match(/(?:leverage|apalancamento|alavancagem)[:\s]*([0-9]+)x?/i);
  if (leverageMatch) signal.leverage = parseInt(leverageMatch[1]);

  const timeframeMatch = text.match(/(?:timeframe|tf|período)[:\s]*(\d+[mhd])/i);
  if (timeframeMatch) signal.timeframe = timeframeMatch[1];

  return signal;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const webhookId = url.searchParams.get('id');

    if (!webhookId) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook ID parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: signalSource, error: sourceError } = await supabase
      .from('signal_sources')
      .select('*')
      .eq('webhook_url', webhookId)
      .eq('is_active', true)
      .maybeSingle();

    if (sourceError || !signalSource) {
      console.error('Signal source not found:', sourceError);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook ID or inactive source' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const update: TelegramUpdate = await req.json();
    console.log('Received Telegram update:', update);

    const message = update.message || update.channel_post;
    if (!message || !message.text) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No text message to process' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const parsedSignal = parseSignalFromText(message.text);
    console.log('Parsed signal:', parsedSignal);

    if (!parsedSignal.symbol) {
      console.log('No symbol found in message, skipping');
      return new Response(
        JSON.stringify({ ok: true, message: 'No trading symbol detected' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .insert({
        signal_source_id: signalSource.id,
        signal_type: parsedSignal.signalType,
        symbol: parsedSignal.symbol,
        action: 'market',
        price: parsedSignal.price,
        stop_loss: parsedSignal.stopLoss,
        take_profit: parsedSignal.takeProfit,
        take_profit_levels: parsedSignal.takeProfitLevels ? JSON.stringify(parsedSignal.takeProfitLevels) : null,
        quantity: parsedSignal.quantity || 1,
        leverage: parsedSignal.leverage || 1,
        timeframe: parsedSignal.timeframe,
        comment: `Telegram: ${message.chat.title || 'Direct message'}`,
        raw_data: {
          telegram_update: update,
          parsed: parsedSignal,
        },
        status: 'received',
      })
      .select()
      .single();

    if (signalError) {
      console.error('Error saving signal:', signalError);
      return new Response(
        JSON.stringify({ error: 'Failed to save signal', details: signalError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabase.from('signal_execution_logs').insert({
      signal_id: signal.id,
      action: 'received',
      details: {
        source: 'telegram',
        chat_id: message.chat.id,
        chat_title: message.chat.title,
      },
      success: true,
      message: 'Signal received successfully from Telegram',
    });

    return new Response(
      JSON.stringify({
        ok: true,
        signal_id: signal.id,
        message: 'Signal received and saved',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Telegram signal:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});