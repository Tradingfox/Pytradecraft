# TradingView Signal Setup Guide

Complete guide for connecting TradingView alerts and strategies to your trading platform.

## Table of Contents

1. [Overview](#overview)
2. [Setting Up Signal Sources](#setting-up-signal-sources)
3. [Pine Script Examples](#pine-script-examples)
4. [Alert Configuration](#alert-configuration)
5. [Testing Your Setup](#testing-your-setup)
6. [Troubleshooting](#troubleshooting)

## Overview

TradingView can send trading signals to your platform via webhooks. This enables automated trading based on your custom indicators and strategies.

### What You Can Send

- Buy/Sell/Close signals
- Entry prices and quantities
- Stop loss and take profit levels
- Multiple take profit targets
- Custom comments and metadata
- Strategy state information

## Setting Up Signal Sources

### Step 1: Create a Signal Source

1. Navigate to the **Signals** view in your platform
2. Click **Add Signal Source**
3. Select **TradingView** as the source type
4. Configure the source:
   - **Name**: Give it a descriptive name (e.g., "ES 5min Strategy")
   - **Description**: Optional notes about what this source does
5. Click **Create**

### Step 2: Get Your Webhook URL

After creating the source, you'll receive a unique webhook URL:

```
https://your-project.supabase.co/functions/v1/receive-tradingview-signal?id=abc123xyz
```

**Important**: Keep this URL secure. Anyone with this URL can send signals to your account.

### Step 3: Connect Accounts

1. Go to the **Trading** view
2. Connect your trading accounts (TopstepX, etc.)
3. In the **Signals** view, configure which accounts should execute signals from this source

## Pine Script Examples

### Basic Buy/Sell Indicator

```pine
//@version=5
indicator("Basic Signal Sender", overlay=true)

// Your indicator logic
fastMA = ta.sma(close, 10)
slowMA = ta.sma(close, 30)

buySignal = ta.crossover(fastMA, slowMA)
sellSignal = ta.crossunder(fastMA, slowMA)

// Plot signals
plotshape(buySignal, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(sellSignal, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)

// Alert conditions
if buySignal
    alert('{"action": "buy", "ticker": "{{ticker}}", "price": ' + str.tostring(close) + ', "quantity": 10}', alert.freq_once_per_bar)

if sellSignal
    alert('{"action": "sell", "ticker": "{{ticker}}", "price": ' + str.tostring(close) + ', "quantity": 10}', alert.freq_once_per_bar)
```

### Strategy with Stop Loss and Take Profit

```pine
//@version=5
strategy("Automated Strategy", overlay=true)

// Strategy parameters
stopLossPercent = input.float(2.0, "Stop Loss %")
takeProfitPercent = input.float(4.0, "Take Profit %")

// Your strategy logic
fastMA = ta.sma(close, 10)
slowMA = ta.sma(close, 30)

if ta.crossover(fastMA, slowMA)
    strategy.entry("Long", strategy.long)

if ta.crossunder(fastMA, slowMA)
    strategy.entry("Short", strategy.short)

// Calculate SL/TP
longSL = strategy.position_avg_price * (1 - stopLossPercent / 100)
longTP = strategy.position_avg_price * (1 + takeProfitPercent / 100)
shortSL = strategy.position_avg_price * (1 + stopLossPercent / 100)
shortTP = strategy.position_avg_price * (1 - takeProfitPercent / 100)

if strategy.position_size > 0
    strategy.exit("Exit Long", "Long", stop=longSL, limit=longTP)

if strategy.position_size < 0
    strategy.exit("Exit Short", "Short", stop=shortSL, limit=shortTP)
```

### Advanced Strategy with Multiple TPs

```pine
//@version=5
strategy("Multi-TP Strategy", overlay=true)

// Strategy parameters
positionSize = input.int(3, "Position Size (contracts)")
stopLossPercent = input.float(2.0, "Stop Loss %")

// Your strategy logic
buyCondition = ta.crossover(ta.rsi(close, 14), 30)
sellCondition = ta.crossunder(ta.rsi(close, 14), 70)

if buyCondition
    strategy.entry("Long", strategy.long, qty=positionSize)

if sellCondition
    strategy.close("Long")

// Calculate levels
entryPrice = strategy.position_avg_price
stopLoss = entryPrice * (1 - stopLossPercent / 100)
tp1 = entryPrice * 1.015  // 1.5%
tp2 = entryPrice * 1.030  // 3.0%
tp3 = entryPrice * 1.050  // 5.0%

// Alert message with all variables
alertMessage = '{\n' +
     '  "ticker": "{{ticker}}",\n' +
     '  "exchange": "{{exchange}}",\n' +
     '  "interval": "{{interval}}",\n' +
     '  "close": {{close}},\n' +
     '  "time": "{{time}}",\n' +
     '  "strategy.order.action": "{{strategy.order.action}}",\n' +
     '  "strategy.order.contracts": {{strategy.order.contracts}},\n' +
     '  "strategy.order.price": {{strategy.order.price}},\n' +
     '  "strategy.position_size": {{strategy.position_size}},\n' +
     '  "strategy.market_position": "{{strategy.market_position}}",\n' +
     '  "stop_loss": ' + str.tostring(stopLoss) + ',\n' +
     '  "tp1": ' + str.tostring(tp1) + ',\n' +
     '  "tp2": ' + str.tostring(tp2) + ',\n' +
     '  "tp3": ' + str.tostring(tp3) + '\n' +
     '}'

// Send alert on strategy actions
if strategy.position_size != 0
    alert(alertMessage, alert.freq_once_per_bar)
```

### Complete Alert Template

Use this template for maximum compatibility:

```json
{
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
  "strategy.order.id": "{{strategy.order.id}}",
  "strategy.order.comment": "{{strategy.order.comment}}",
  "strategy.position_size": {{strategy.position_size}},
  "strategy.market_position": "{{strategy.market_position}}",
  "strategy.prev_market_position": "{{strategy.prev_market_position}}"
}
```

## Alert Configuration

### Creating an Alert

1. Open your chart in TradingView
2. Click the **Alert** button (clock icon) or press `Alt + A`
3. Configure the alert:

   **Condition**: Select your indicator or strategy

   **Options**:
   - Alert name: Descriptive name for tracking
   - Frequency: `Once Per Bar Close` (recommended) or `All`

   **Webhook URL**: Paste your webhook URL

   **Message**: Your JSON payload (see examples above)

4. Click **Create**

### Alert Message Tips

- Always use valid JSON format
- Include double quotes around string values
- No trailing commas
- Test your JSON in a validator first
- Use TradingView's built-in variables ({{ticker}}, {{close}}, etc.)

### Strategy Variables

When using Pine Script strategies, these variables are automatically available:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{strategy.order.action}}` | buy, sell, or close | "buy" |
| `{{strategy.order.contracts}}` | Number of contracts | 5 |
| `{{strategy.order.price}}` | Order entry price | 4500.50 |
| `{{strategy.position_size}}` | Current position size | 10 |
| `{{strategy.market_position}}` | long, short, or flat | "long" |
| `{{strategy.order.id}}` | Unique order identifier | "LONG_001" |
| `{{strategy.order.comment}}` | Order comment | "Breakout" |

## Testing Your Setup

### Step 1: Test the Webhook

Use the built-in testing utility:

```typescript
import { testSignalEndpoint, tradingViewExamplePayloads } from './utils/signalTesting';

const webhookUrl = 'YOUR_WEBHOOK_URL_HERE';
const result = await testSignalEndpoint(
  webhookUrl,
  tradingViewExamplePayloads.basicBuySignal
);

console.log(result);
```

### Step 2: Send a Test Alert

Create a simple alert in TradingView with a basic payload:

```json
{
  "ticker": "TEST",
  "action": "buy",
  "quantity": 1,
  "price": 100
}
```

### Step 3: Verify in Platform

1. Go to the **Signals** view
2. Check the **Recent Signals** table
3. Verify the signal was received and parsed correctly
4. Check the **Execution Logs** for any errors

### Step 4: Test with Paper Trading

Before live trading:

1. Set up a paper trading account
2. Configure signal execution for paper account only
3. Send multiple test signals
4. Verify orders are created correctly
5. Monitor execution and error handling

## Troubleshooting

### Signal Not Received

**Check:**
- Webhook URL is correct and complete (includes `?id=...`)
- Signal source is set to **Active** in the platform
- TradingView alert is active (not expired)
- Alert frequency is set correctly

**Verify:**
- Check browser network tab when creating alert
- Look for 200 OK response from webhook
- Check Supabase Edge Function logs

### Invalid Signal Format

**Common Issues:**
- Missing required fields (ticker/symbol)
- Invalid JSON syntax
- Using single quotes instead of double quotes
- Trailing commas in JSON
- Missing quantity for buy/sell orders

**Fix:**
- Validate JSON in an online validator
- Use the complete alert template above
- Test payload with the testing utility

### Signal Received but Not Executed

**Check:**
- AI interpretation is enabled (if using AI workflow)
- Connected accounts are active
- Account filters match the signal
- Risk management settings allow the trade
- Sufficient buying power in account

**Debug:**
- Check AI interpretation logs
- Review order execution logs
- Verify account connection status

### Duplicate Signals

**Cause:**
- Alert frequency set to "All" instead of "Once Per Bar Close"
- Multiple alerts triggered for same condition

**Fix:**
- Set alert frequency to "Once Per Bar Close"
- Review strategy logic to prevent duplicate entries
- Add cooldown period in your strategy

### Wrong Symbol Format

**Issue:**
TradingView sends "BTCUSD" but your broker expects "BTC/USD"

**Solution:**
Add symbol mapping in signal filters:

1. Go to Signal Source settings
2. Add a filter rule:
   - Type: Symbol Mapping
   - From: "BTCUSD"
   - To: "BTC/USD"

## Best Practices

### Security

- Never share your webhook URLs
- Regularly rotate webhook IDs
- Use IP filtering if available
- Monitor signal sources for suspicious activity

### Reliability

- Always include error handling in Pine Script
- Set appropriate alert frequencies
- Use "Once Per Bar Close" to avoid false signals
- Test thoroughly before live trading

### Risk Management

- Set position size limits per signal source
- Configure stop losses in your strategy
- Use multiple take profit levels
- Monitor daily loss limits

### Monitoring

- Enable push notifications for signal events
- Set up alerts for failed executions
- Review execution logs regularly
- Monitor AI interpretation confidence scores

## Example Workflows

### Workflow 1: Simple Indicator Alerts

1. Create Pine Script indicator
2. Add alert conditions with basic JSON
3. Signals go directly to order execution
4. Manual monitoring via dashboard

### Workflow 2: Strategy with AI Interpretation

1. Create Pine Script strategy
2. Send comprehensive signal data
3. AI interprets and validates signal
4. AI determines optimal position sizing
5. Orders executed with risk management
6. Notifications sent on execution

### Workflow 3: Multi-Timeframe Strategy

1. Multiple strategies on different timeframes
2. Each strategy has unique webhook
3. Signals filtered and combined by AI
4. AI prevents conflicting signals
5. Unified execution across accounts

## Support

For issues or questions:

1. Check the **Execution Logs** in the Signals view
2. Review the **AI Interpretation Logs** if using AI workflow
3. Test with example payloads from testing utility
4. Verify Pine Script syntax in TradingView editor

## Appendix: All Supported Variables

The platform supports all standard TradingView variables:

### Basic Variables
- `{{ticker}}` - Symbol ticker
- `{{exchange}}` - Exchange name
- `{{interval}}` - Chart timeframe
- `{{close}}`, `{{open}}`, `{{high}}`, `{{low}}` - OHLC prices
- `{{volume}}` - Volume
- `{{time}}` - Timestamp

### Strategy Variables
- All `strategy.*` placeholders
- Position and order information
- Market state

### Custom Variables
- Any variables you calculate in Pine Script
- Plot values (plot_0, plot_1, etc.)
- Indicator values

See the Edge function source code for complete variable support.
