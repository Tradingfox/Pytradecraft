import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TradingViewSignal {
  action?: string;
  order?: string;
  side?: string;
  ticker?: string;
  symbol?: string;
  price?: number;
  entry?: number;
  entryPrice?: number;
  stop_loss?: number;
  sl?: number;
  take_profit?: number;
  tp?: number;
  quantity?: number;
  qty?: number;
  interval?: string;
  timeframe?: string;
  comment?: string;
  message?: string;
  leverage?: number;
  [key: string]: any;
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

    let rawData: TradingViewSignal;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      rawData = await req.json();
    } else {
      const text = await req.text();
      try {
        rawData = JSON.parse(text);
      } catch {
        rawData = { message: text, raw: text };
      }
    }

    console.log('Received TradingView signal:', rawData);

    const action = (
      rawData.action ||
      rawData.order ||
      rawData.side ||
      ''
    ).toLowerCase();

    let signalType = 'alert';
    if (action.includes('buy') || action.includes('long')) {
      signalType = 'buy';
    } else if (action.includes('sell') || action.includes('short')) {
      signalType = 'sell';
    } else if (action.includes('close') || action.includes('exit')) {
      signalType = 'close';
    }

    const symbol = rawData.ticker || rawData.symbol || '';
    const price = rawData.price || rawData.entry || rawData.entryPrice;
    const stopLoss = rawData.stop_loss || rawData.sl;
    const takeProfit = rawData.take_profit || rawData.tp;
    const quantity = rawData.quantity || rawData.qty || 1;
    const timeframe = rawData.interval || rawData.timeframe;
    const comment = rawData.comment || rawData.message;
    const leverage = rawData.leverage || 1;

    let orderAction = 'market';
    if (action.includes('limit')) {
      orderAction = 'limit';
    } else if (action.includes('stop')) {
      orderAction = 'stop';
    }

    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .insert({
        signal_source_id: signalSource.id,
        signal_type: signalType,
        symbol,
        action: orderAction,
        price,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        quantity,
        leverage,
        timeframe,
        comment,
        raw_data: rawData,
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
      details: { source: 'tradingview', webhook_id: webhookId },
      success: true,
      message: 'Signal received successfully from TradingView',
    });

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal.id,
        message: 'Signal received and saved',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing TradingView signal:', error);
    return new Response(
      JSON.stringify({
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