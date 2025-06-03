# Hybrid Chart Implementation for PyTradeCraft

## Overview

The HybridChart component was developed to address the issues with TopstepX historical data access, which requires a separate ProjectX API subscription. The hybrid chart solves this by providing a seamless transition between historical and real-time data modes.

## Key Features

### 1. Multiple Data Modes

- **Historical Mode**: Uses API-based historical data
- **Real-time Mode**: Constructs candlestick bars from market quotes in real-time
- **Hybrid Mode**: Combines historical data with real-time updates

### 2. Auto-Detection for TopstepX

The chart automatically detects when a user is connected to TopstepX and:
- Defaults to hybrid chart mode for TopstepX users
- Provides clear visual indication of the data mode being used
- Falls back gracefully to real-time data when historical data is unavailable

### 3. Real-time Bar Construction

- Builds OHLC (Open, High, Low, Close) bars from streaming market quotes
- Maintains accurate timeframes (1m, 5m, 15m, etc.)
- Automatically manages bar transitions when a timeframe completes

### 4. Visual Indicators

- Shows data source mode (historical, real-time, or hybrid)
- Displays streaming status indicator
- Provides clear error messages for missing historical data with helpful guidance

## Usage

1. **Standard Chart**: Use when you have access to historical data
   - Full access to technical indicators
   - Best for detailed technical analysis

2. **Hybrid Chart**: Use when historical data access is limited
   - Automatically falls back to real-time data
   - Recommended for TopstepX users without ProjectX API subscription

## Implementation Details

The chart implements several key features:

- **Data Management**: Separate state management for historical and real-time bars
- **Quote Processing**: Converts real-time quotes into OHLC bars based on timeframe
- **Canvas Drawing**: Custom rendering of candlesticks, volume, and grid
- **User Settings**: Controls for chart type, timeframe, and data preferences

## Best Practices

For TopstepX users:
1. Use the Hybrid Chart mode to avoid historical data issues
2. For extended trading sessions, start the chart early to build sufficient real-time data
3. Consider the ProjectX API subscription only if extensive historical data is required

## Future Enhancements

- Add more technical indicators for real-time data
- Implement chart trader functionality within the hybrid chart
- Optimize real-time data storage for longer sessions
