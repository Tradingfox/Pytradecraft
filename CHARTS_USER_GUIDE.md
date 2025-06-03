# PyTradeCraft Updated Charts Feature

## Overview of Chart Modes

PyTradeCraft now offers two different charting engines to accommodate various data access scenarios:

### 1. Standard Chart
- Uses historical data from your broker's API
- Provides full technical analysis capabilities
- Works best with complete historical data access

### 2. Hybrid Chart
- Can work with both historical and real-time data
- Falls back to real-time-only mode when historical data is unavailable
- Constructs bars from market quotes in real-time
- Perfect for TopstepX users without ProjectX API subscription

## TopstepX Users - Important Notice

If you're using TopstepX and experiencing chart loading issues, this is likely due to historical data access limitations. TopstepX requires a separate ProjectX API subscription ($14.50-$29/month) to access historical data.

**Solution Options:**

1. **Subscribe to ProjectX API** - For full historical data access
2. **Use Hybrid Chart** - Works with real-time data only (recommended)

## How to Use the Hybrid Chart

1. Select "Hybrid Chart" from the Chart Engine Selection panel
2. Enter your contract ID
3. Select your preferred timeframe and chart type
4. Click "Load Chart" to attempt loading historical data first
5. Click "Start Stream" to begin real-time data collection

The chart will automatically:
- Try to load historical data if available
- Fall back to real-time data if historical data is unavailable
- Show clear visual indicators of which data mode is active

## Data Modes Explained

- **Historical Mode**: Shows historical data only from the API
- **Real-time Mode**: Shows bars constructed from live market quotes
- **Hybrid Mode**: Combines historical data with real-time updates

## Tips for Best Results

- For TopstepX users without ProjectX API: Use Hybrid chart mode
- For real-time charts: Start streaming early to build sufficient bar data
- Select appropriate timeframes based on your trading style
- Enable "Prefer real-time data" for the most up-to-date price action

## Troubleshooting

- If charts show no data, check your market data connection status
- If you can see real-time quotes but no chart data, try switching to Hybrid mode
- For TopstepX users seeing "Historical data not available" errors, use Hybrid mode
