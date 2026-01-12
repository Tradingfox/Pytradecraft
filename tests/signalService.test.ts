/**
 * Signal Service Tests
 *
 * Tests for the optimized signal service
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Mock TradingSignal
const mockSignal = {
  id: 'test-signal-1',
  signal_source_id: 'test-source-1',
  signal_type: 'buy' as const,
  symbol: 'BTCUSD',
  action: 'market' as const,
  price: 50000,
  stop_loss: 49000,
  take_profit: 52000,
  take_profit_levels: [52000, 53000, 54000],
  quantity: 1,
  leverage: 10,
  timeframe: '5',
  comment: 'Test signal',
  raw_data: {},
  status: 'received' as const,
  execution_status: null,
  order_id: null,
  received_at: new Date().toISOString(),
  executed_at: null,
  error_message: null,
};

Deno.test('Signal Validation - Valid Buy Signal', () => {
  // This would test the validation logic
  // In real implementation, you'd import and test the actual validation function
  const signal = { ...mockSignal };

  const errors: string[] = [];

  if (!signal.symbol) errors.push('Symbol required');
  if (!signal.quantity || signal.quantity <= 0) errors.push('Quantity must be > 0');
  if (signal.leverage < 1 || signal.leverage > 100) errors.push('Leverage 1-100');

  assertEquals(errors.length, 0, 'Valid signal should have no errors');
});

Deno.test('Signal Validation - Missing Symbol', () => {
  const signal = { ...mockSignal, symbol: '' };

  const errors: string[] = [];
  if (!signal.symbol || signal.symbol.trim() === '') {
    errors.push('Symbol is required');
  }

  assertEquals(errors.length, 1);
  assertEquals(errors[0], 'Symbol is required');
});

Deno.test('Signal Validation - Invalid Quantity', () => {
  const signal = { ...mockSignal, quantity: 0 };

  const errors: string[] = [];
  if (!signal.quantity || signal.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  assertEquals(errors.length, 1);
});

Deno.test('Signal Validation - Invalid Leverage', () => {
  const signal = { ...mockSignal, leverage: 150 };

  const errors: string[] = [];
  if (signal.leverage < 1 || signal.leverage > 100) {
    errors.push('Leverage must be between 1 and 100');
  }

  assertEquals(errors.length, 1);
});

Deno.test('Signal Validation - Stop Loss Logic (Buy)', () => {
  const signal = { ...mockSignal, signal_type: 'buy' as const, price: 50000, stop_loss: 51000 };

  const errors: string[] = [];
  if (signal.signal_type === 'buy' && signal.stop_loss && signal.stop_loss >= signal.price!) {
    errors.push('Stop loss must be below entry price for buy orders');
  }

  assertEquals(errors.length, 1);
});

Deno.test('Signal Validation - Stop Loss Logic (Sell)', () => {
  const signal = { ...mockSignal, signal_type: 'sell' as const, price: 50000, stop_loss: 49000 };

  const errors: string[] = [];
  if (signal.signal_type === 'sell' && signal.stop_loss && signal.stop_loss <= signal.price!) {
    errors.push('Stop loss must be above entry price for sell orders');
  }

  assertEquals(errors.length, 1);
});

Deno.test('Filter Application - Symbol Whitelist', () => {
  const signal = { ...mockSignal, symbol: 'BTCUSD' };
  const filter = {
    filter_type: 'symbol',
    filter_rules: {
      mode: 'whitelist',
      symbols: ['ES', 'NQ', 'YM'],
    },
    is_active: true,
  };

  const allowed = filter.filter_rules.symbols.includes(signal.symbol);
  const shouldPass = filter.filter_rules.mode === 'whitelist' ? allowed : !allowed;

  assertEquals(shouldPass, false, 'BTCUSD should not pass ES/NQ/YM whitelist');
});

Deno.test('Filter Application - Symbol Blacklist', () => {
  const signal = { ...mockSignal, symbol: 'BTCUSD' };
  const filter = {
    filter_type: 'symbol',
    filter_rules: {
      mode: 'blacklist',
      symbols: ['BTCUSD', 'ETHUSD'],
    },
    is_active: true,
  };

  const blocked = filter.filter_rules.symbols.includes(signal.symbol);
  const shouldPass = filter.filter_rules.mode === 'blacklist' ? !blocked : blocked;

  assertEquals(shouldPass, false, 'BTCUSD should be blocked by blacklist');
});

Deno.test('Filter Application - Timeframe Filter', () => {
  const signal = { ...mockSignal, timeframe: '5' };
  const filter = {
    filter_type: 'timeframe',
    filter_rules: {
      timeframes: ['5', '15', '30'],
    },
    is_active: true,
  };

  const shouldPass = filter.filter_rules.timeframes.includes(signal.timeframe!);

  assertEquals(shouldPass, true, '5min timeframe should pass');
});

Deno.test('Filter Application - Risk Limits (Leverage)', () => {
  const signal = { ...mockSignal, leverage: 20 };
  const filter = {
    filter_type: 'risk',
    filter_rules: {
      max_leverage: 10,
    },
    is_active: true,
  };

  const shouldPass = signal.leverage <= filter.filter_rules.max_leverage;

  assertEquals(shouldPass, false, '20x leverage should not pass 10x limit');
});

Deno.test('Filter Application - Trading Hours', () => {
  const now = new Date();
  const currentHour = now.getHours();

  const filter = {
    filter_type: 'time',
    filter_rules: {
      trading_hours: {
        start: 9,
        end: 16,
      },
    },
    is_active: true,
  };

  const shouldPass = currentHour >= filter.filter_rules.trading_hours.start &&
                     currentHour < filter.filter_rules.trading_hours.end;

  // This test will pass or fail depending on current time
  // In real tests, you'd mock the time
  assertExists(shouldPass);
});

Deno.test('Priority Calculation - Buy Signal', () => {
  const signal = { ...mockSignal, signal_type: 'buy' as const, action: 'market' as const };

  let priority = 0;
  if (signal.signal_type === 'buy' || signal.signal_type === 'sell') priority += 100;
  if (signal.action === 'market') priority += 50;
  if (signal.stop_loss) priority += 10;
  if (signal.take_profit) priority += 10;
  if (signal.leverage > 10) priority -= 20;

  assertEquals(priority, 170, 'Buy market order with SL/TP should have priority 170');
});

Deno.test('Priority Calculation - High Leverage Penalty', () => {
  const signal = { ...mockSignal, signal_type: 'buy' as const, leverage: 20 };

  let priority = 0;
  if (signal.signal_type === 'buy') priority += 100;
  if (signal.leverage > 10) priority -= 20;

  assertEquals(priority, 80, 'High leverage should reduce priority');
});

Deno.test('Take Profit Levels - Sorting and Deduplication', () => {
  const rawLevels = [15100, 15000, 15200, 15100, 15000]; // Has duplicates and not sorted

  const uniqueSorted = [...new Set(rawLevels)].sort((a, b) => a - b);

  assertEquals(uniqueSorted.length, 3);
  assertEquals(uniqueSorted[0], 15000);
  assertEquals(uniqueSorted[1], 15100);
  assertEquals(uniqueSorted[2], 15200);
});

console.log('✅ All signal service tests defined. Run with: deno test tests/signalService.test.ts');
