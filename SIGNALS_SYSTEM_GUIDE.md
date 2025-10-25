# Trading Signals System - Complete Guide

The PyTradeCraft Trading Signals System allows you to receive and automatically execute trading signals from multiple sources including TradingView, Telegram, MT4, and MT5.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setting Up Signal Sources](#setting-up-signal-sources)
4. [Signal Format Requirements](#signal-format-requirements)
5. [Signal Filtering](#signal-filtering)
6. [Auto-Execution](#auto-execution)
7. [Testing Webhooks](#testing-webhooks)

---

## Overview

The signals system consists of:
- **Supabase Database**: Stores signal sources, received signals, execution logs, and filters
- **Edge Functions**: Serverless endpoints that receive webhooks from external sources
- **Signal Service**: Processes, validates, and manages signals
- **Signal Executor**: Automatically executes approved signals
- **UI Components**: Manage sources, view signals, and configure filters

---

## Architecture

### Database Schema

**signal_sources**: Stores configured signal sources
- `id`: Unique identifier
- `name`: Friendly name for the source
- `source_type`: Type (tradingview, telegram, mt4, mt5, custom)
- `webhook_url`: Generated unique webhook URL
- `config`: Source-specific configuration (JSON)
- `is_active`: Whether the source is enabled

**trading_signals**: Stores received signals
- `id`: Unique identifier
- `signal_source_id`: Reference to source
- `signal_type`: Type (buy, sell, close, modify, alert)
- `symbol`: Trading symbol/contract
- `action`: Order type (market, limit, stop, etc.)
- `price`, `stop_loss`, `take_profit`: Price levels
- `quantity`, `leverage`: Position sizing
- `status`: Processing status (received, validated, executing, executed, failed, ignored)
- `raw_data`: Original signal data (JSON)

**signal_filters**: Configurable filters
- Filter signals by symbol, timeframe, signal type, risk parameters, trading hours

---

## Setting Up Signal Sources

### 1. Create a Signal Source

Navigate to **Signals** page and click **Add Signal Source**. Choose from:

#### TradingView
- Best for: Chart-based alerts, technical indicators
- Setup time: 2 minutes
- Supports: All TradingView alerts

#### Telegram
- Best for: Signal channels, group signals, copy trading
- Setup time: 5 minutes
- Supports: Text-based signal parsing

#### MT4/MT5
- Best for: Expert Advisor signals, automated strategies
- Setup time: 10 minutes
- Requires: MetaAPI or bridge software

### 2. Configure the Source

Enter a descriptive name and any required configuration:
- **TradingView**: Just a name is needed
- **Telegram**: Bot token and channel/group ID
- **MT4/MT5**: Account number and server details

### 3. Copy Your Webhook URL

After creation, you'll receive a unique webhook URL. This URL is specific to your signal source and includes authentication.

Example webhook URL:
```
https://your-project.supabase.co/functions/v1/receive-tradingview-signal?id=abc123-def456-...
```

---

## Signal Format Requirements

### TradingView Webhook Format

TradingView requires JSON format in the alert message. Here's the recommended format:

```json
{
  "action": "buy",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "stop_loss": {{low}},
  "take_profit": {{high}},
  "timeframe": "{{interval}}",
  "comment": "Your strategy name"
}
```

**Supported Fields:**
- `action` or `side`: "buy", "sell", "long", "short", "close"
- `symbol` or `ticker`: Trading symbol
- `price`, `entry`, `entryPrice`: Entry price (optional for market orders)
- `stop_loss` or `sl`: Stop loss price
- `take_profit` or `tp`: Take profit price
- `quantity` or `qty`: Position size (defaults to 1)
- `leverage`: Leverage multiplier (defaults to 1)
- `timeframe` or `interval`: Chart timeframe
- `comment` or `message`: Description

**Setup in TradingView:**
1. Open your chart
2. Click Alert (⏰) button
3. Set your conditions
4. In Notifications tab, enable "Webhook URL"
5. Paste your webhook URL
6. Add the JSON message above
7. Click "Create"

### Telegram Signal Format

The Telegram parser can understand natural language signals. Examples:

**Format 1: Structured**
```
Symbol: BTCUSDT
Action: BUY
Entry: 45000
Stop Loss: 44000
Take Profit: 47000
Quantity: 0.1
Leverage: 10x
```

**Format 2: Compact**
```
BUY ETHUSD @ 2500
SL: 2450
TP: 2600, 2650, 2700
Size: 1.0
```

**Format 3: Emoji-based**
```
🟢 LONG GBPUSD
Entry 1.2500
Stop 1.2450
Target 1.2600
```

**Supported Patterns:**
- Actions: BUY, SELL, LONG, SHORT, CLOSE, EXIT
- Symbols: BTCUSDT, BTC/USD, EURUSD, etc.
- Prices: Numbers with optional thousands separators
- Multiple take profit levels supported

**Setup Telegram Bot:**
1. Talk to @BotFather on Telegram
2. Create new bot with `/newbot`
3. Copy the bot token
4. Set webhook URL (requires programming)
5. Add bot to your channel/group as admin

### MT4/MT5 Signal Format

For MT4/MT5, you need a bridge EA (Expert Advisor) that sends HTTP requests:

```json
{
  "action": "buy",
  "symbol": "EURUSD",
  "price": 1.0850,
  "stop_loss": 1.0830,
  "take_profit": 1.0900,
  "quantity": 0.1,
  "magic_number": 12345,
  "comment": "EA Signal"
}
```

**Required Bridge Software:**
- MetaAPI Cloud
- HTTP Request EA
- Custom webhook EA

---

## Signal Filtering

Filters allow you to automatically accept or reject signals based on criteria.

### Creating Filters

Navigate to **Signals** → **Filters** → **Add Filter**

### Filter Types

#### 1. Symbol Filter
Control which symbols are traded:
```json
{
  "mode": "whitelist",
  "symbols": ["BTCUSDT", "ETHUSD", "EURUSD"]
}
```
Or blacklist specific symbols:
```json
{
  "mode": "blacklist",
  "symbols": ["DOGEUSDT", "SHIBUSD"]
}
```

#### 2. Timeframe Filter
Only accept signals from specific timeframes:
```json
{
  "timeframes": ["5m", "15m", "1h", "4h"]
}
```

#### 3. Signal Type Filter
Filter by signal type:
```json
{
  "types": ["buy", "sell"]
}
```

#### 4. Risk Filter
Limit risk parameters:
```json
{
  "max_leverage": 10,
  "max_quantity": 1.0,
  "min_stop_loss_distance": 20,
  "max_position_value": 10000
}
```

#### 5. Time Filter
Only trade during specific hours (UTC):
```json
{
  "trading_hours": {
    "start": 9,
    "end": 17
  },
  "trading_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

### Filter Priority

Filters are applied in order:
1. Source-specific filters (if assigned to a source)
2. Global filters (no source assigned)
3. All filters must pass for a signal to be accepted

---

## Auto-Execution

### Enabling Auto-Execution

The auto-executor runs in the background when you're connected to a broker.

**Requirements:**
- Active broker connection
- Selected trading account
- At least one active signal source
- Valid signals in "received" status

### Execution Flow

1. **Signal Received** → Webhook receives signal
2. **Validation** → Checks required fields
3. **Filtering** → Applies active filters
4. **Execution** → Places order with broker
5. **Confirmation** → Updates signal status

### Manual Execution

You can also manually execute signals:
1. Go to **Signals** page
2. Find signal with "received" status
3. Click **Execute** button
4. Confirm execution

### Execution Logs

Every signal has detailed execution logs:
- Timestamp of each step
- Validation results
- Filter decisions
- Order placement details
- Success/failure reasons

View logs by clicking on any signal in the Signals page.

---

## Testing Webhooks

### Using cURL

Test your TradingView webhook:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/receive-tradingview-signal?id=YOUR_WEBHOOK_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "buy",
    "symbol": "BTCUSDT",
    "price": 50000,
    "stop_loss": 49000,
    "take_profit": 52000,
    "quantity": 0.1
  }'
```

Test your Telegram webhook:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/receive-telegram-signal?id=YOUR_WEBHOOK_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "text": "BUY BTCUSDT\nEntry: 50000\nSL: 49000\nTP: 52000\nQty: 0.1",
      "chat": {"id": 123456, "type": "channel"}
    }
  }'
```

### Using Postman

1. Create new POST request
2. Set URL to your webhook endpoint
3. Set Headers: `Content-Type: application/json`
4. Add JSON body with signal data
5. Send request
6. Check Signals page for received signal

### Troubleshooting

**Signal not appearing:**
- Check webhook URL is correct
- Verify signal source is active
- Check Supabase Edge Function logs
- Ensure JSON format is valid

**Signal not executing:**
- Verify broker connection is active
- Check account is selected
- Review signal validation errors
- Check filter settings
- Review execution logs

**Webhook errors:**
- 404: Invalid webhook ID
- 400: Invalid JSON format
- 500: Server error (check logs)

---

## Best Practices

### Security
- Keep webhook URLs private
- Use filters to limit exposure
- Test with small quantities first
- Monitor execution logs regularly

### Performance
- Limit signal frequency to avoid overload
- Use appropriate filters to reduce noise
- Archive old signals periodically

### Risk Management
- Always set stop loss levels
- Use leverage filters
- Limit maximum position size
- Diversify signal sources

---

## API Reference

### Signal Service Methods

```typescript
// Create signal source
await signalService.createSignalSource(name, type, config)

// Get all signals
await signalService.getSignals({ status, sourceId, limit })

// Update signal status
await signalService.updateSignalStatus(id, status, orderId)

// Create filter
await signalService.createFilter(name, type, rules)

// Apply filters to signal
await signalService.applyFilters(signal, filters)
```

### Webhook Endpoints

**TradingView:**
```
POST /functions/v1/receive-tradingview-signal?id={webhook_id}
```

**Telegram:**
```
POST /functions/v1/receive-telegram-signal?id={webhook_id}
```

---

## Support

For issues or questions:
1. Check the execution logs
2. Review this documentation
3. Test webhooks manually
4. Check Supabase Edge Function logs
5. Verify broker connection status

---

## Future Enhancements

Planned features:
- Discord signal integration
- WhatsApp signal parsing
- Signal performance analytics
- Backtesting signals before execution
- Multiple take profit level management
- Trailing stop loss automation
- Risk-based position sizing
- Signal reputation scoring
