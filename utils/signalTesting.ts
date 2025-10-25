export const tradingViewExamplePayloads = {
  basicBuySignal: {
    ticker: "AAPL",
    action: "buy",
    contracts: 10,
    price: 175.50,
    close: 175.50,
    time: "2025-10-25T14:30:00Z",
    interval: "1H"
  },

  strategySellSignal: {
    ticker: "EURUSD",
    exchange: "FOREX",
    interval: "15",
    close: 1.0850,
    open: 1.0845,
    high: 1.0860,
    low: 1.0840,
    volume: 125000,
    time: "2025-10-25T14:30:00Z",
    "strategy.order.action": "sell",
    "strategy.order.contracts": 5,
    "strategy.order.price": 1.0850,
    "strategy.position_size": 5,
    "strategy.market_position": "short",
    "strategy.order.comment": "Bearish reversal pattern detected"
  },

  multiTakeProfitSignal: {
    symbol: "BTC/USD",
    action: "long",
    side: "buy",
    quantity: 0.5,
    entry: 45000,
    stop_loss: 44000,
    tp1: 46000,
    tp2: 47000,
    tp3: 48000,
    leverage: 10,
    timeframe: "4H",
    comment: "Strong bullish momentum"
  },

  limitOrderSignal: {
    ticker: "TSLA",
    order: "buy",
    type: "limit",
    contracts: 20,
    price: 250.00,
    stopLoss: 245.00,
    takeProfit: 260.00,
    interval: "1D"
  },

  closePositionSignal: {
    ticker: "NVDA",
    action: "close",
    "strategy.market_position": "flat",
    "strategy.prev_market_position": "long",
    close: 485.25,
    message: "Target reached - closing position"
  },

  complexStrategySignal: {
    ticker: "ES",
    exchange: "CME",
    interval: "5",
    close: 4500.50,
    open: 4498.75,
    high: 4502.00,
    low: 4497.25,
    volume: 250000,
    time: "2025-10-25T14:30:00Z",
    "strategy.order.action": "buy",
    "strategy.order.contracts": 2,
    "strategy.order.price": 4500.50,
    "strategy.order.id": "ES_LONG_001",
    "strategy.order.comment": "Breakout confirmed",
    "strategy.position_size": 2,
    "strategy.market_position": "long",
    "strategy.prev_market_position": "flat",
    stop_loss: 4495.00,
    take_profit_1: 4510.00,
    take_profit_2: 4520.00,
    take_profit_3: 4530.00,
    leverage: 5,
    plot_0: 4485.50,
    plot_1: 4515.75,
    plot_2: 78.5,
    plot_3: 65.2
  },

  alertOnlySignal: {
    ticker: "SPY",
    message: "RSI overbought condition detected",
    close: 450.25,
    interval: "1H",
    plot_0: 75.5,
    sentiment: "bearish"
  }
};

export const telegramExamplePayloads = {
  basicSignal: {
    text: "🔔 BUY SIGNAL\nSymbol: EURUSD\nEntry: 1.0850\nSL: 1.0800\nTP: 1.0950",
    channel: "trading_signals_pro"
  },

  detailedSignal: {
    text: `📊 TRADING SIGNAL

Symbol: BTC/USDT
Direction: LONG
Entry Price: $45,000
Stop Loss: $44,000
Take Profit 1: $46,500
Take Profit 2: $48,000
Take Profit 3: $50,000
Position Size: 0.5 BTC
Leverage: 10x
Timeframe: 4H

Analysis: Strong bullish momentum with volume confirmation`,
    channel: "crypto_signals_vip"
  }
};

export function generateWebhookUrl(baseUrl: string, webhookId: string): string {
  return `${baseUrl}/functions/v1/receive-tradingview-signal?id=${webhookId}`;
}

export function generatePineScriptAlert(webhookUrl: string): string {
  return `{
  "ticker": "{{ticker}}",
  "exchange": "{{exchange}}",
  "interval": "{{interval}}",
  "close": {{close}},
  "open": {{open}},
  "high": {{high}},
  "low": {{low}},
  "volume": {{volume}},
  "time": "{{time}}",
  "strategy.order.action": "{{strategy.order.action}}",
  "strategy.order.contracts": {{strategy.order.contracts}},
  "strategy.order.price": {{strategy.order.price}},
  "strategy.position_size": {{strategy.position_size}},
  "strategy.market_position": "{{strategy.market_position}}",
  "strategy.order.comment": "{{strategy.order.comment}}"
}`;
}

export async function testSignalEndpoint(
  webhookUrl: string,
  payload: any
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return {
      success: response.ok,
      response: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function validateTradingViewPayload(payload: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.ticker && !payload.symbol) {
    errors.push('Missing ticker or symbol');
  }

  const hasAction = payload.action || payload['strategy.order.action'] ||
                   payload.side || payload.order;
  if (!hasAction) {
    warnings.push('No action specified - will be treated as alert');
  }

  if (hasAction && hasAction !== 'close') {
    const hasQuantity = payload.contracts || payload['strategy.order.contracts'] ||
                       payload.quantity || payload.qty || payload.size ||
                       payload['strategy.position_size'] || payload.position_size;
    if (!hasQuantity) {
      errors.push('No quantity specified for order');
    }
  }

  const orderType = String(payload.type || payload.order_type || '').toLowerCase();
  if ((orderType === 'limit' || orderType === 'stop') && !payload.price) {
    errors.push(`${orderType} order requires price`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
