# Quick Start: AI-Powered Signal Workflow

## Step-by-Step Setup

### 1. Set Up Local Qwen LLM (5 minutes)

**Using vLLM (Recommended):**

```bash
# Install vLLM
pip install vllm

# Download and start Qwen model
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --port 8000 \
  --max-model-len 32768
```

**Alternative - Using LM Studio (Easier):**
1. Download LM Studio from https://lmstudio.ai/
2. Download "Qwen2.5-7B-Instruct" from the models tab
3. Start server on port 1234
4. Done! ✅

### 2. Configure PyTradeCraft (1 minute)

Edit your `.env` file:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key

# Add LLM configuration
VITE_LLM_ENDPOINT=http://localhost:8000/v1
VITE_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VITE_ENABLE_AI_INTERPRETATION=true
```

### 3. Create a Signal Source (2 minutes)

1. Navigate to **Signals** page
2. Click **Add Signal Source**
3. Choose **TradingView**
4. Enter name: "My TradingView Alerts"
5. Copy the webhook URL provided

### 4. Set Up TradingView Alert (3 minutes)

1. Open TradingView chart
2. Click Alert (⏰) button
3. Set your conditions
4. Enable "Webhook URL"
5. Paste webhook URL from step 3
6. Add message (JSON format):

```json
{
  "action": "buy",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "stop_loss": {{low}},
  "take_profit": {{high}},
  "comment": "My Strategy"
}
```

7. Click Create

### 5. Test the Workflow (2 minutes)

**Test with cURL:**

```bash
curl -X POST 'YOUR_WEBHOOK_URL' \
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

**Check Results:**
1. Go to Signals page
2. See new signal with "received" status
3. Click on signal to view AI interpretation
4. Check confidence score and reasoning

### 6. Enable Auto-Execution (Optional)

⚠️ **WARNING:** Only enable after thorough testing with demo accounts!

1. Connect to broker (TopstepX or ProjectX)
2. Select trading account
3. AI workflow will automatically:
   - Interpret new signals
   - Calculate position sizes
   - Create and execute orders
   - Send notifications

## What Happens Next?

### When Signal is Received:

```
1. Signal arrives at webhook
   ↓
2. AI interprets signal (2-3 seconds)
   ✓ Extracts parameters
   ✓ Calculates position size
   ✓ Validates everything
   ✓ Assigns confidence score
   ↓
3. Order created in database
   ✓ Structured order format
   ✓ Linked to signal and AI interpretation
   ↓
4. Order executed on broker
   ✓ Submitted to broker API
   ✓ Status tracked in real-time
   ↓
5. Notifications sent
   ✓ Signal interpreted
   ✓ Order submitted
   ✓ Order filled
   ↓
6. Dashboard updated
   ✓ Live order status
   ✓ Execution details
   ✓ P&L tracking
```

## Example Workflows

### TradingView Strategy Signal

**Input Signal:**
```json
{
  "action": "buy",
  "symbol": "EURUSD",
  "price": 1.0850,
  "stop_loss": 1.0830,
  "take_profit": 1.0900,
  "timeframe": "15m",
  "comment": "RSI Oversold + MACD Cross"
}
```

**AI Interpretation:**
```json
{
  "instrument": "EURUSD",
  "action": "BUY",
  "order_type": "LIMIT",
  "quantity": 0.5,
  "price": 1.0850,
  "stop_loss": 1.0830,
  "take_profit": 1.0900,
  "risk_percentage": 1.0,
  "priority": "MEDIUM",
  "confidence_score": 0.92,
  "reasoning": "Clear buy signal with well-defined entry, stop loss, and take profit levels. Risk-reward ratio of 2.5:1 is favorable."
}
```

**Result:** Order created and executed on selected accounts

### Telegram Channel Signal

**Input Signal (text):**
```
🟢 LONG GBPUSD
Entry: 1.2500
Stop Loss: 1.2450
Take Profit 1: 1.2600
Take Profit 2: 1.2650
Leverage: 10x
```

**AI Interpretation:**
```json
{
  "instrument": "GBPUSD",
  "action": "BUY",
  "order_type": "MARKET",
  "quantity": 1.0,
  "stop_loss": 1.2450,
  "take_profit": 1.2600,
  "risk_percentage": 1.0,
  "priority": "HIGH",
  "confidence_score": 0.88,
  "reasoning": "Telegram signal with clear parameters. Multiple take profit levels detected. Leverage specified at 10x."
}
```

**Result:** Order created with calculated position size based on leverage

## Monitoring Your Orders

### Real-Time Dashboard

The AI Signal Executor widget (bottom-right corner) shows:
- ✅ Status: Active/Waiting
- 🕐 Last check timestamp
- 📊 Signals being processed
- 📈 Session statistics

### Order Status Flow

```
PENDING → SUBMITTED → FILLED ✅
                    ↓
                 CANCELLED 🚫
                    ↓
                 FAILED ❌
```

### View Order Details

1. Go to Signals page
2. Click on any signal
3. View:
   - Original signal data
   - AI interpretation
   - Orders created
   - Execution logs
   - Notifications sent

## Troubleshooting

### "AI Interpretation Failed"

**Check:**
1. Is LLM endpoint accessible? `curl http://localhost:8000/v1/models`
2. Is model loaded correctly?
3. Check browser console for errors

**Solution:**
- Restart LLM server
- Check `.env` configuration
- System will use fallback logic if LLM unavailable

### "Order Execution Failed"

**Check:**
1. Is broker connected?
2. Is account selected?
3. Does account have sufficient balance?
4. Are credentials valid?

**Solution:**
- Reconnect to broker
- Check account balance
- Review error message in order details

### Low Confidence Scores

**Reasons:**
- Incomplete signal data
- Ambiguous instructions
- Missing required fields

**Solution:**
- Improve signal format
- Add more details (prices, quantities)
- Use structured JSON format

## Best Practices

### 1. Start Small
- Begin with demo accounts
- Use low risk percentage (0.5-1%)
- Test with small position sizes

### 2. Monitor Closely
- Watch first 10-20 signals
- Review AI interpretations
- Check execution accuracy

### 3. Optimize Gradually
- Adjust risk parameters
- Fine-tune signal format
- Filter low-confidence signals

### 4. Use Multiple Accounts
- Separate demo and live
- Different strategies per account
- Apply account filters in signals

### 5. Review Regularly
- Check daily execution logs
- Analyze AI accuracy
- Review notification history

## Next Steps

1. ✅ Set up local LLM
2. ✅ Configure PyTradeCraft
3. ✅ Create signal sources
4. ✅ Test with demo signals
5. ⏳ Monitor executions
6. ⏳ Optimize parameters
7. ⏳ Go live with small sizes

## Support Resources

- **Signals Guide:** `SIGNALS_SYSTEM_GUIDE.md`
- **AI Workflow Guide:** `AI_SIGNAL_WORKFLOW_GUIDE.md`
- **Check Logs:** Browser Console + Supabase Logs
- **Test Webhooks:** Use cURL or Postman

## Safety Reminders

⚠️ **Important:**
- ALWAYS test on demo accounts first
- NEVER use maximum position sizes initially
- ALWAYS set stop losses
- NEVER ignore risk management
- ALWAYS monitor first executions
- NEVER assume AI is 100% accurate
- ALWAYS review interpretations
- NEVER trade with money you can't afford to lose

---

**You're all set!** Start receiving and automatically executing trading signals with AI-powered interpretation. 🚀
