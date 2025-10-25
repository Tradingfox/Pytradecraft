# AI-Powered Signal Interpretation & Execution Workflow

## Overview

This system uses artificial intelligence (local LLM like Qwen) to intelligently interpret trading signals, calculate optimal order parameters, execute orders, monitor positions, and send notifications throughout the entire process.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SIGNAL RECEIVED                                 │
│         (TradingView / Telegram / MT4/MT5)                          │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: AI INTERPRETATION                                           │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Parse raw signal text                                        │ │
│ │ • Extract trading parameters (symbol, action, prices)          │ │
│ │ • Calculate position size based on risk management             │ │
│ │ • Validate all required fields                                 │ │
│ │ • Assign confidence score (0-1)                                │ │
│ │ • Generate reasoning for interpretation                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: ORDER CREATION                                              │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Create structured order(s) for selected accounts            │ │
│ │ • Apply account filters if specified                          │ │
│ │ • Set priority level (HIGH/MEDIUM/LOW)                        │ │
│ │ • Store orders in database with PENDING status                │ │
│ │ • Link orders to signal and AI interpretation                 │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: ORDER EXECUTION                                             │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Submit orders to broker API                                  │ │
│ │ • Update order status to SUBMITTED                             │ │
│ │ • Store broker order ID                                        │ │
│ │ • Send notification: "Order Submitted"                         │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: ORDER MONITORING                                            │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Poll broker for order status updates                        │ │
│ │ • Track partial fills and average fill price                  │ │
│ │ • Update order status (PARTIAL_FILL, FILLED, CANCELLED)       │ │
│ │ • Send notification on status change                          │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: ORDER MODIFICATION (Optional)                               │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Modify price, stop loss, or take profit                     │ │
│ │ • Cancel order if needed                                       │ │
│ │ • Close position manually or via signal                       │ │
│ │ • Log all modifications with reason                           │ │
│ │ • Send modification notification                              │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: COMPLETION & NOTIFICATION                                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ • Order filled or cancelled                                    │ │
│ │ • Send final notification with execution details              │ │
│ │ • Update live dashboard                                        │ │
│ │ • Store complete execution history                            │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. AI Signal Interpreter (`aiSignalInterpreter.ts`)

Interprets raw trading signals using AI or fallback logic.

**Features:**
- Supports local Qwen LLM via OpenAI-compatible API
- Fallback to rule-based interpretation if LLM unavailable
- Calculates position size based on risk percentage
- Validates all interpretation fields
- Assigns confidence scores

**Configuration:**
```env
VITE_LLM_ENDPOINT=http://localhost:8000/v1
VITE_LLM_MODEL=qwen
VITE_LLM_API_KEY=optional_api_key
```

**Usage:**
```typescript
const result = await aiSignalInterpreter.interpretSignal(signal, {
  default_risk_percentage: 1,
  default_stop_loss_pips: 50,
  default_take_profit_ratio: 2,
  max_position_size: 10,
  preferred_accounts: ['account1', 'account2']
});
```

**Output Format:**
```json
{
  "signal_id": "uuid",
  "instrument": "BTCUSDT",
  "action": "BUY",
  "order_type": "MARKET",
  "quantity": 0.5,
  "price": 50000,
  "stop_loss": 49000,
  "take_profit": 52000,
  "risk_percentage": 1,
  "priority": "HIGH",
  "confidence_score": 0.95,
  "reasoning": "Clear buy signal with defined risk parameters"
}
```

### 2. Order Workflow Service (`orderWorkflowService.ts`)

Manages the complete order lifecycle from interpretation to execution.

**Key Methods:**

```typescript
// Process signal through AI workflow
await orderWorkflowService.processSignalWorkflow(
  signal,
  accountIds,
  brokerType,
  userPreferences
);

// Update order status
await orderWorkflowService.updateOrderStatus(
  orderId,
  'FILLED',
  undefined,
  brokerOrderId,
  filledQuantity,
  averageFillPrice
);

// Modify order
await orderWorkflowService.modifyOrder(
  orderId,
  'MODIFY_SL',
  { stop_loss: 48500 },
  'Trailing stop loss'
);

// Get orders with filters
const orders = await orderWorkflowService.getOrders({
  accountId: 'account1',
  status: 'FILLED',
  limit: 50
});
```

### 3. AI Signal Executor Component (`AISignalExecutor.tsx`)

Background service that monitors for new signals and processes them automatically.

**Features:**
- Checks for new signals every 5 seconds
- Processes signals through AI workflow
- Tracks execution statistics
- Visual indicator of workflow status
- Auto-reconnects on broker connection

**Usage:**
```tsx
<AISignalExecutor
  autoExecute={true}
  useAI={true}
/>
```

## Setting Up Local Qwen LLM

### Option 1: Using vLLM (Recommended)

1. **Install vLLM:**
```bash
pip install vllm
```

2. **Start Qwen Server:**
```bash
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --port 8000 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.9
```

3. **Test API:**
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

4. **Configure PyTradeCraft:**
Create `.env` file:
```env
VITE_LLM_ENDPOINT=http://localhost:8000/v1
VITE_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
```

### Option 2: Using LM Studio

1. **Download LM Studio:** https://lmstudio.ai/

2. **Download Qwen Model:**
   - Open LM Studio
   - Search for "Qwen"
   - Download "Qwen2.5-7B-Instruct" or similar

3. **Start Server:**
   - Go to "Local Server" tab
   - Select Qwen model
   - Click "Start Server"
   - Default port: 1234

4. **Configure PyTradeCraft:**
```env
VITE_LLM_ENDPOINT=http://localhost:1234/v1
VITE_LLM_MODEL=qwen2.5-7b-instruct
```

### Option 3: Using Ollama

1. **Install Ollama:** https://ollama.ai/

2. **Pull Qwen Model:**
```bash
ollama pull qwen2.5:7b
```

3. **Start Server:**
```bash
ollama serve
```

4. **Configure with OpenAI Compatibility:**
```env
VITE_LLM_ENDPOINT=http://localhost:11434/v1
VITE_LLM_MODEL=qwen2.5:7b
```

## Database Schema

### `ai_signal_interpretations`
Stores AI interpretation results for audit and analysis.

```sql
- signal_id: Link to original signal
- raw_signal_text: Original text processed
- ai_model: Model used (qwen, gpt, etc.)
- interpretation: JSON output from AI
- confidence_score: AI confidence (0-1)
- validation_status: Status of validation
```

### `trading_orders`
Complete order records with execution details.

```sql
- signal_id: Link to signal
- interpretation_id: Link to AI interpretation
- user_id: Owner
- account_id: Trading account
- broker_type: Broker platform
- instrument: Trading symbol
- action: BUY/SELL/CLOSE
- order_type: MARKET/LIMIT/STOP
- quantity, price, stop_loss, take_profit
- status: PENDING → SUBMITTED → FILLED
- broker_order_id: Broker's order ID
- filled_quantity: Actual filled amount
- average_fill_price: Average execution price
```

### `order_modifications`
Track all order changes for compliance and analysis.

```sql
- order_id: Link to order
- modification_type: What changed
- previous_values: Before modification
- new_values: After modification
- reason: Why modified
```

### `notifications`
All notifications sent to users.

```sql
- user_id: Recipient
- type: EMAIL/PUSH/SMS/IN_APP
- category: SIGNAL_RECEIVED/ORDER_EXECUTED/etc.
- title, message: Notification content
- status: PENDING/SENT/FAILED
```

## Notification System

### Configuration

Users can configure notification preferences:

```typescript
{
  email_enabled: true,
  push_enabled: true,
  email_address: "trader@example.com",
  notify_on_signal_received: true,
  notify_on_order_executed: true,
  notify_on_order_filled: true,
  notify_on_order_modified: true,
  notify_on_errors: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00"
}
```

### Notification Types

1. **Signal Received:** New signal interpreted successfully
2. **Order Executed:** Order submitted to broker
3. **Order Filled:** Order completely filled
4. **Order Failed:** Order execution failed
5. **Alert:** Important system messages

### Email Notifications (Future)

Will be implemented via Supabase Edge Function:
- Send via SendGrid, AWS SES, or Resend
- HTML templates with order details
- Batch daily summaries

### Push Notifications (Future)

Will be implemented via:
- Firebase Cloud Messaging (FCM)
- Apple Push Notification Service (APNS)
- Web Push API for browser notifications

## Risk Management

### Position Sizing

AI calculates position size based on:
```
Risk Amount = Account Balance × Risk Percentage
Position Size = Risk Amount / (Entry Price - Stop Loss)
```

With limits:
- Maximum position size cap
- Minimum position size (0.01)
- Account balance checks

### Validation Rules

Every order is validated for:
- Valid instrument/symbol
- Valid action (BUY/SELL/CLOSE)
- Valid order type
- Positive quantity
- Price required for limit/stop orders
- Confidence score within range (0-1)

### Error Handling

If AI interpretation fails:
1. Mark signal for manual review
2. Send notification to user
3. Log detailed error information
4. Provide fallback interpretation if possible

## Monitoring Dashboard

### Real-Time Updates

The dashboard shows:
- Active orders with live status
- Recent signals and interpretations
- Execution statistics
- Error logs
- Notification history

### Order Status Flow

```
PENDING → SUBMITTED → PARTIAL_FILL → FILLED
                    ↓
                  CANCELLED
                    ↓
                  REJECTED
                    ↓
                  FAILED
```

### Metrics Tracked

- Total signals received
- Successful interpretations
- Orders executed
- Fill rate
- Average execution time
- P&L per signal (if tracked)

## API Endpoints

### Process Signal
```typescript
POST /api/signals/{id}/process
Body: {
  accountIds: string[],
  brokerType: string,
  userPreferences: object
}
```

### Get Orders
```typescript
GET /api/orders?accountId=xxx&status=FILLED&limit=50
```

### Modify Order
```typescript
PUT /api/orders/{id}/modify
Body: {
  modificationType: "MODIFY_SL",
  newValues: { stop_loss: 48500 },
  reason: "Trailing stop"
}
```

### Get Notifications
```typescript
GET /api/notifications?limit=50
```

## Best Practices

### 1. Start with Small Position Sizes
Begin with low risk percentages (0.5-1%) until confident in AI interpretation.

### 2. Monitor AI Confidence Scores
Only auto-execute signals with confidence > 0.8 for high-risk instruments.

### 3. Use Account Filters
Separate demo and live accounts, only auto-execute on demo initially.

### 4. Review AI Interpretations
Regularly check AI interpretation accuracy and adjust prompts if needed.

### 5. Set Up Alerts
Configure notifications for all failed orders and low-confidence signals.

### 6. Log Everything
All signals, interpretations, orders, and modifications are logged for analysis.

## Troubleshooting

### AI Not Responding
- Check LLM endpoint is accessible: `curl http://localhost:8000/v1/models`
- Verify model is loaded correctly
- Check API key if required
- Review browser console for errors

### Orders Not Executing
- Verify broker connection is active
- Check account is selected
- Review order validation errors
- Ensure sufficient account balance

### Notifications Not Sending
- Check notification preferences are enabled
- Verify user email is configured
- Review notification logs in database
- Check quiet hours settings

### Low Confidence Scores
- Review signal clarity and completeness
- Adjust AI prompt for better interpretation
- Consider using more detailed signal format
- Check for missing required fields

## Future Enhancements

- Email and SMS notification delivery
- Advanced position sizing algorithms
- Machine learning for signal quality prediction
- Backtesting AI interpretations
- Multi-take-profit level management
- Automated trailing stops
- Portfolio-level risk management
- Signal performance analytics
- Custom AI prompt templates
- Integration with additional LLMs (GPT-4, Claude, etc.)

## Support

For issues with the AI workflow:
1. Check AI interpretation logs in database
2. Review order execution logs
3. Verify LLM configuration
4. Test with example signals
5. Check notification preferences
