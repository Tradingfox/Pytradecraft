import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TradingViewSignal {
  ticker?: string;
  symbol?: string;
  exchange?: string;
  interval?: string;
  timeframe?: string;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  time?: string;
  'strategy.position_size'?: number;
  position_size?: number;
  'strategy.order.action'?: string;
  order_action?: string;
  action?: string;
  side?: string;
  order?: string;
  'strategy.order.contracts'?: number;
  contracts?: number;
  quantity?: number;
  qty?: number;
  size?: number;
  'strategy.order.price'?: number;
  order_price?: number;
  price?: number;
  entry?: number;
  entryPrice?: number;
  'strategy.order.id'?: string;
  order_id?: string;
  'strategy.order.comment'?: string;
  order_comment?: string;
  comment?: string;
  message?: string;
  'strategy.market_position'?: string;
  market_position?: string;
  sentiment?: string;
  'strategy.prev_market_position'?: string;
  stop_loss?: number;
  sl?: number;
  stopLoss?: number;
  take_profit?: number;
  tp?: number;
  takeProfit?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  leverage?: number;
  plot_0?: number;
  plot_1?: number;
  plot_2?: number;
  plot_3?: number;
  [key: string]: any;
}

function extractTakeProfitLevels(data: TradingViewSignal): number[] | null {
  const tpLevels: number[] = [];
  
  if (data.take_profit || data.tp || data.takeProfit) {
    const mainTp = data.take_profit || data.tp || data.takeProfit;
    if (typeof mainTp === 'number') {
      tpLevels.push(mainTp);
    }
  }
  
  for (let i = 1; i <= 10; i++) {
    const tpKey = `tp${i}`;
    const takeProfitKey = `take_profit_${i}`;
    if (data[tpKey] && typeof data[tpKey] === 'number') {
      tpLevels.push(data[tpKey]);
    } else if (data[takeProfitKey] && typeof data[takeProfitKey] === 'number') {
      tpLevels.push(data[takeProfitKey]);
    }
  }
  
  return tpLevels.length > 0 ? tpLevels : null;
}

function parseAction(data: TradingViewSignal): string {
  const actionStr = (
    data['strategy.order.action'] ||
    data.order_action ||
    data.action ||
    data.side ||
    data.order ||
    data.sentiment ||
    data['strategy.market_position'] ||
    ''
  ).toLowerCase();
  
  if (actionStr.includes('buy') || actionStr.includes('long') || actionStr === 'bullish') {
    return 'buy';
  } else if (actionStr.includes('sell') || actionStr.includes('short') || actionStr === 'bearish') {
    return 'sell';
  } else if (actionStr.includes('close') || actionStr.includes('exit') || actionStr.includes('flat')) {
    return 'close';
  }
  
  return 'alert';
}

function parseOrderType(data: TradingViewSignal): string {
  const actionStr = (
    data.action ||
    data.order_type ||
    data.type ||
    ''
  ).toLowerCase();
  
  if (actionStr.includes('limit')) {
    return 'limit';
  } else if (actionStr.includes('stop')) {
    return 'stop';
  }
  
  return 'market';
}

function extractSymbol(data: TradingViewSignal): string {
  let symbol = data.ticker || data.symbol || '';
  
  if (data.exchange) {
    if (data.exchange.endsWith('_DL') || data.exchange.endsWith('_DLY')) {
      symbol = `${symbol} (Delayed)`;
    }
  }
  
  return symbol;
}

function extractPrice(data: TradingViewSignal): number | null {
  const price = 
    data['strategy.order.price'] ||
    data.order_price ||
    data.price ||
    data.entry ||
    data.entryPrice ||
    data.close;
  
  return typeof price === 'number' ? price : null;
}

function extractQuantity(data: TradingViewSignal): number {
  const qty = 
    data['strategy.order.contracts'] ||
    data.contracts ||
    data.quantity ||
    data.qty ||
    data.size ||
    data['strategy.position_size'] ||
    data.position_size ||
    1;
  
  return typeof qty === 'number' ? qty : 1;
}

function extractStopLoss(data: TradingViewSignal): number | null {
  const sl = data.stop_loss || data.sl || data.stopLoss;
  return typeof sl === 'number' ? sl : null;
}

function extractTimeframe(data: TradingViewSignal): string | null {
  return data.interval || data.timeframe || null;
}

function extractComment(data: TradingViewSignal): string | null {
  return (
    data['strategy.order.comment'] ||
    data.order_comment ||
    data.comment ||
    data.message ||
    null
  );
}

function extractLeverage(data: TradingViewSignal): number {
  const lev = data.leverage;
  return typeof lev === 'number' && lev > 0 ? lev : 1;
}

function validateSignal(signal: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!signal.symbol || signal.symbol.trim() === '') {
    errors.push('Symbol/ticker is required');
  }

  if (signal.signal_type === 'alert') {
    return { valid: errors.length === 0, errors };
  }

  if (signal.signal_type === 'buy' || signal.signal_type === 'sell') {
    if (!signal.quantity || signal.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (signal.action === 'limit' || signal.action === 'stop') {
      if (!signal.price || signal.price <= 0) {
        errors.push('Price is required for limit/stop orders');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function verifyWebhookSecurity(req: Request, signalSource: any): { valid: boolean; reason?: string } {
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';

  if (userAgent.toLowerCase().includes('tradingview')) {
    return { valid: true };
  }

  if (referer.includes('tradingview.com')) {
    return { valid: true };
  }

  const rateLimit = signalSource.metadata?.rate_limit_per_hour || 1000;
  const currentHour = new Date().getHours();
  const signalCount = signalSource.metadata?.signal_count_by_hour?.[currentHour] || 0;

  if (signalCount > rateLimit) {
    return {
      valid: false,
      reason: `Rate limit exceeded: ${signalCount}/${rateLimit} signals this hour`
    };
  }

  return { valid: true };
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
        JSON.stringify({ 
          success: false,
          error: 'Missing webhook ID parameter',
          hint: 'Include ?id=YOUR_WEBHOOK_ID in the URL'
        }),
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
        JSON.stringify({
          success: false,
          error: 'Invalid webhook ID or inactive source',
          hint: 'Check that the webhook ID is correct and the signal source is active'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const securityCheck = verifyWebhookSecurity(req, signalSource);
    if (!securityCheck.valid) {
      console.warn('🔒 Security check failed:', securityCheck.reason);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Security verification failed',
          reason: securityCheck.reason
        }),
        {
          status: 429,
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

    console.log('📊 Received TradingView signal:', JSON.stringify(rawData, null, 2));

    const signalType = parseAction(rawData);
    const symbol = extractSymbol(rawData);
    const price = extractPrice(rawData);
    const stopLoss = extractStopLoss(rawData);
    const takeProfitLevels = extractTakeProfitLevels(rawData);
    const quantity = extractQuantity(rawData);
    const timeframe = extractTimeframe(rawData);
    const comment = extractComment(rawData);
    const leverage = extractLeverage(rawData);
    const orderAction = parseOrderType(rawData);

    const signalData = {
      signal_source_id: signalSource.id,
      signal_type: signalType,
      symbol,
      action: orderAction,
      price,
      stop_loss: stopLoss,
      take_profit: takeProfitLevels ? takeProfitLevels[0] : null,
      take_profit_levels: takeProfitLevels ? JSON.stringify(takeProfitLevels) : null,
      quantity,
      leverage,
      timeframe,
      comment,
      raw_data: rawData,
      status: 'received',
    };

    const validation = validateSignal(signalData);
    if (!validation.valid) {
      console.warn('⚠️ Signal validation failed:', validation.errors);
      
      await supabase.from('trading_signals').insert({
        ...signalData,
        status: 'ignored',
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Signal validation failed',
          validation_errors: validation.errors,
          hint: 'Check that all required fields are present and valid',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .insert(signalData)
      .select()
      .single();

    if (signalError) {
      console.error('❌ Error saving signal:', signalError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to save signal', 
          details: signalError.message 
        }),
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
        source: 'tradingview', 
        webhook_id: webhookId,
        signal_type: signalType,
        symbol: symbol,
        exchange: rawData.exchange,
        timeframe: timeframe,
      },
      success: true,
      message: `TradingView ${signalType.toUpperCase()} signal received for ${symbol}`,
    });

    console.log(`✅ Signal saved successfully: ${signal.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal.id,
        message: 'Signal received and saved',
        parsed: {
          symbol,
          action: signalType,
          order_type: orderAction,
          quantity,
          price,
          stop_loss: stopLoss,
          take_profit_levels: takeProfitLevels,
          timeframe,
          leverage,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 Error processing TradingView signal:', error);
    return new Response(
      JSON.stringify({
        success: false,
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