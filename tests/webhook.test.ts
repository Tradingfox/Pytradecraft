/**
 * Webhook Tests
 *
 * Tests for the optimized TradingView webhook handler
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

const WEBHOOK_URL = Deno.env.get('TEST_WEBHOOK_URL') || 'http://localhost:54321/functions/v1/receive-tradingview-signal';
const TEST_WEBHOOK_ID = Deno.env.get('TEST_WEBHOOK_ID') || 'test-webhook-id';

Deno.test('Webhook - Basic Buy Signal', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'BTCUSD',
      action: 'buy',
      price: 50000,
      quantity: 1,
      timeframe: '5',
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertExists(data.signal_id);
  assertEquals(data.success, true);
  assertEquals(data.parsed.symbol, 'BTCUSD');
  assertEquals(data.parsed.action, 'buy');
  assertEquals(data.parsed.quantity, 1);
});

Deno.test('Webhook - Signal with Stop Loss and Take Profit', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'ES',
      'strategy.order.action': 'sell',
      'strategy.order.price': 4500.50,
      'strategy.order.contracts': 2,
      stop_loss: 4520.00,
      take_profit: 4470.00,
      timeframe: '15',
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.parsed.symbol, 'ES');
  assertEquals(data.parsed.action, 'sell');
  assertEquals(data.parsed.quantity, 2);
  assertEquals(data.parsed.stop_loss, 4520.00);
  assertEquals(data.parsed.take_profit_levels[0], 4470.00);
});

Deno.test('Webhook - Multiple Take Profit Levels', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'NQ',
      action: 'buy',
      quantity: 3,
      entry: 15000.25,
      sl: 14950.00,
      tp1: 15050.00,
      tp2: 15100.00,
      tp3: 15150.00,
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.parsed.take_profit_levels.length, 3);
  assertEquals(data.parsed.take_profit_levels[0], 15050.00);
  assertEquals(data.parsed.take_profit_levels[1], 15100.00);
  assertEquals(data.parsed.take_profit_levels[2], 15150.00);
});

Deno.test('Webhook - Invalid Signal (Missing Symbol)', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'buy',
      quantity: 1,
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.validation_errors);
});

Deno.test('Webhook - Missing Webhook ID', async () => {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'BTCUSD',
      action: 'buy',
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('Webhook - CORS Preflight', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get('access-control-allow-origin'));
});

Deno.test('Webhook - Duplicate Signal Detection', async () => {
  const payload = {
    ticker: 'BTCUSD',
    action: 'buy',
    price: 50000,
    quantity: 1,
  };

  // Send first signal
  const response1 = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data1 = await response1.json();
  assertEquals(data1.success, true);

  // Send duplicate immediately
  const response2 = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data2 = await response2.json();
  assertEquals(data2.duplicate, true);
});

Deno.test('Webhook - Strategy Variables Parsing', async () => {
  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'ES',
      exchange: 'CME',
      interval: '5',
      close: 4500.75,
      'strategy.order.action': 'buy',
      'strategy.order.contracts': 2,
      'strategy.order.price': 4500.75,
      'strategy.position_size': 2,
      'strategy.market_position': 'long',
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.parsed.symbol, 'ES');
  assertEquals(data.parsed.action, 'buy');
  assertEquals(data.parsed.quantity, 2);
  assertEquals(data.parsed.price, 4500.75);
});

Deno.test('Webhook - Performance (Processing Time)', async () => {
  const start = Date.now();

  const response = await fetch(`${WEBHOOK_URL}?id=${TEST_WEBHOOK_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'BTCUSD',
      action: 'buy',
      quantity: 1,
    }),
  });

  const data = await response.json();
  const totalTime = Date.now() - start;

  assertEquals(response.status, 200);
  assertEquals(data.success, true);

  // Assert processing time is reasonable (< 1 second)
  assertEquals(totalTime < 1000, true, `Processing took ${totalTime}ms, expected < 1000ms`);

  // Check if meta information includes processing time
  if (data.meta) {
    assertExists(data.meta.processing_time_ms);
    assertEquals(data.meta.processing_time_ms < 500, true, 'Server processing should be < 500ms');
  }
});

console.log('✅ All webhook tests defined. Run with: deno test tests/webhook.test.ts');
