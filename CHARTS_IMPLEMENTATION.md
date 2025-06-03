# Advanced Charts Implementation

## Overview
The Charts tab provides a comprehensive charting solution with professional trading features, real-time data streaming, advanced drawing tools, multi-language indicator support, and integrated DOM (Depth of Market) functionality.

## Key Features

### 📊 Chart Types
- **Candlestick Charts** (default) - Professional OHLC visualization
- **Line Charts** - Simple price line visualization
- **Bar Charts** - Traditional OHLC bars
- **Area Charts** - Filled area price visualization

### ⏱️ Multiple Timeframes
- **1m, 5m, 15m, 30m** - Intraday trading timeframes
- **1h, 4h** - Swing trading timeframes  
- **1d, 1w** - Position trading timeframes
- **Dynamic data loading** based on selected timeframe

### 🎨 Advanced Drawing Tools
- **Trendlines** - Draw trend analysis lines
- **Support/Resistance** - Mark key price levels
- **Fibonacci Retracements** - Technical analysis tool
- **Rectangles** - Price consolidation zones
- **Circles** - Custom area marking
- **Custom styling** - Colors, line styles, thickness

### 🔧 Multi-Language Indicator Support
- **Python Indicators** - Most popular for quant analysis
- **JavaScript Indicators** - Web-native execution
- **Java Indicators** - Enterprise-grade performance
- **C# Indicators** - .NET integration

#### Preset Indicators Included:
- **Simple Moving Average (SMA)** - Python & JavaScript
- **Relative Strength Index (RSI)** - Python
- **MACD** - Python with signal line and histogram
- **Bollinger Bands** - Java implementation
- **Exponential Moving Average (EMA)** - C# implementation

### 📈 Real-Time Features
- **Live Data Streaming** - Real-time price updates
- **Streaming Indicator** - Visual confirmation of live data
- **WebSocket Integration** - Low-latency data feeds
- **Auto-refresh** - Configurable update intervals

### 💹 Trading Integration
- **Trade History Overlay** - Past trades shown on chart
- **Position Markers** - Current positions visualization
- **P&L Tracking** - Real-time profit/loss display
- **Order Flow** - Buy/sell pressure analysis

### 📊 Depth of Market (DOM)
- **Real-Time Order Book** - Live bid/ask data
- **Market Depth** - Multiple price levels
- **Spread Monitoring** - Bid-ask spread tracking
- **Size Analysis** - Order size at each level
- **Configurable Depth** - 5, 10, 15, or 20 levels

### 🎛️ Chart Controls
- **Timeframe Selection** - Easy timeframe switching
- **Chart Type Toggle** - Quick chart type changes
- **Height Adjustment** - Customizable chart height
- **Grid Toggle** - Show/hide price grid
- **Volume Display** - Volume histogram overlay

## Technical Implementation

### Component Architecture
```
ChartsView.tsx (Main container)
├── Chart.tsx (Core charting component)
├── IndicatorModal.tsx (Custom indicator creation)
└── DOM Panel (Integrated order book)
```

### Canvas-Based Rendering
- **Dual Canvas System** - Separate layers for chart and overlays
- **Hardware Acceleration** - GPU-accelerated rendering
- **Responsive Design** - Automatic sizing and scaling
- **High-Performance Drawing** - Optimized for real-time updates

### Data Management
- **Historical Data API** - Fetch OHLCV data
- **Real-Time Streaming** - WebSocket data feeds
- **Trade Integration** - Live trade and position data
- **Caching Strategy** - Efficient data storage and retrieval

### Indicator Engine
```typescript
interface Indicator {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator';
  language: 'python' | 'javascript' | 'java' | 'csharp';
  code: string;
  parameters: Record<string, any>;
  enabled: boolean;
  color: string;
  data?: number[];
}
```

### Drawing Tools System
```typescript
interface DrawingTool {
  type: 'line' | 'rectangle' | 'circle' | 'fibonacci' | 'trendline' | 'support' | 'resistance';
  points: { x: number; y: number; timestamp?: string; price?: number }[];
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  id: string;
}
```

## Usage Guide

### Basic Chart Usage
1. **Connect to Broker** - Use Broker Connect tab first
2. **Enter Contract Symbol** - Type symbol (e.g., ES, NQ, RTY)
3. **Select Timeframe** - Choose appropriate timeframe
4. **Load Chart Data** - Click "Load Chart" button
5. **Start Streaming** - Enable real-time updates

### Drawing Tools
1. **Select Drawing Tool** - Click tool in toolbar
2. **Draw on Chart** - Click and drag on chart canvas
3. **Customize** - Modify colors, styles, thickness
4. **Manage Drawings** - Clear or modify existing drawings

### Custom Indicators
1. **Open Indicator Modal** - Click "Add Indicator" button
2. **Choose Language** - Select Python, JavaScript, Java, or C#
3. **Select Preset** - Use built-in indicators or create custom
4. **Write Code** - Implement calculation logic
5. **Set Parameters** - Configure indicator parameters
6. **Apply to Chart** - Indicator appears on chart

### DOM Integration
1. **Enable DOM Panel** - Check "Show DOM" option
2. **Configure Depth** - Select number of levels (5-20)
3. **Monitor Order Flow** - Watch real-time bid/ask data
4. **Chart Trading** - Future: place orders directly from DOM

## Broker Integration

### TopStepX Features
- **Historical Data** - API-based historical bars
- **WebSocket Streaming** - Real-time price feeds
- **Trade Integration** - Live trade and position data
- **DOM Support** - Real-time order book data
- **Chart Trading** - Direct order placement (coming soon)

### ProjectX Features
- **Full API Support** - Complete market data access
- **Real-Time Feeds** - WebSocket market data
- **Advanced Features** - Full feature set availability

## Configuration Options

### Chart Settings
```typescript
interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'bar' | 'area';
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  theme: 'dark' | 'light';
}
```

### Performance Settings
- **Chart Height** - 400px to 800px
- **DOM Size** - 5 to 20 levels
- **Update Frequency** - 1s to 30s intervals
- **Data Retention** - Configurable history length

## Development Guidelines

### Adding New Indicator Languages
1. **Add Language Support** - Update language enum
2. **Create Code Templates** - Add preset examples
3. **Implement Executor** - Language-specific execution
4. **Add Guidelines** - Usage documentation

### Custom Drawing Tools
1. **Define Tool Type** - Add to DrawingTool interface
2. **Implement Drawing Logic** - Canvas rendering code
3. **Add Tool Button** - UI integration
4. **Handle Interactions** - Mouse event handling

### Performance Optimization
- **Canvas Optimization** - Efficient rendering techniques
- **Data Management** - Smart caching and updates
- **Memory Management** - Proper cleanup and disposal
- **Real-Time Efficiency** - Optimized streaming updates

## Future Enhancements

### Chart Trading Features
- **Order Placement** - Direct from chart interface
- **Bracket Orders** - Stop loss and take profit
- **One-Click Trading** - Quick order execution
- **Order Modification** - Drag to modify orders

### Advanced Analytics
- **Volume Profile** - Price-volume analysis
- **Market Profile** - Time-price-opportunity
- **Order Flow Analysis** - Trade-by-trade analysis
- **Sentiment Indicators** - Market sentiment metrics

### Enhanced Indicators
- **Indicator Marketplace** - Community indicators
- **Backtesting Integration** - Strategy testing
- **Alert System** - Custom indicator alerts
- **Multi-Timeframe** - Cross-timeframe analysis

### Data Sources
- **Multiple Exchanges** - Cross-exchange data
- **Alternative Data** - News, sentiment, social
- **Historical Archive** - Extended historical data
- **Real-Time News** - Integrated news feeds

## API Reference

### Chart Component Props
```typescript
interface ChartProps {
  contractId?: string;     // Contract symbol to display
  height?: number;         // Chart height in pixels
  showDOM?: boolean;       // Show DOM panel
  showToolbar?: boolean;   // Show drawing toolbar
}
```

### Key Methods
- `loadChartData()` - Load historical data
- `addIndicator(indicator)` - Add custom indicator
- `removeIndicator(id)` - Remove indicator
- `addDrawing(drawing)` - Add drawing tool
- `clearDrawings()` - Clear all drawings

### Event Handlers
- `onDataUpdate` - New data received
- `onTradeUpdate` - Trade executed
- `onPositionUpdate` - Position changed
- `onIndicatorUpdate` - Indicator recalculated

## Troubleshooting

### Common Issues
1. **No Data Loading** - Check broker connection and symbol
2. **Indicators Not Working** - Verify code syntax and parameters
3. **Drawing Tools Not Responding** - Ensure tool is selected
4. **DOM Not Updating** - Check WebSocket connection

### Performance Issues
1. **Slow Rendering** - Reduce chart height or data points
2. **Memory Usage** - Clear old data and indicators
3. **Network Issues** - Check connection stability
4. **CPU Usage** - Reduce update frequency

## Bug Fixes & Resolved Issues

### Critical Issues Resolved (January 2025)

1. **TopStepX Historical Data API Integration**
   - **Issue**: 404 errors when loading chart data due to incorrect API endpoint
   - **Fix**: Updated endpoint from `/api/v1/historical-data` to `/api/HistoricalData/retrieveBars`
   - **Fix**: Changed from GET with query parameters to POST with JSON body
   - **Fix**: Added proper request headers (`Accept: text/plain`)
   - **Fix**: Implemented data format conversion for TopStepX response structure

2. **Enhanced Error Handling**
   - **Added**: Specific error messages for different HTTP status codes (401, 404, 400)
   - **Added**: Connection status warning when broker not connected
   - **Added**: Disabled UI elements when no broker session active
   - **Added**: Comprehensive console logging for debugging

3. **User Experience Improvements**
   - **Added**: Visual indicators for connection status
   - **Added**: Better loading states and error feedback
   - **Added**: Graceful handling of authentication failures
   - **Added**: Clear instructions for broker connection

## Conclusion

The Advanced Charts feature provides a professional-grade charting solution with comprehensive trading tools, multi-language indicator support, and real-time data integration. It's designed for serious traders who need advanced analysis capabilities combined with a user-friendly interface.

**Recent Updates**: All critical bugs have been resolved, including the TopStepX API integration issues that were causing 404 errors. The charts now work correctly with proper authentication and data loading.

The modular architecture allows for easy extension and customization, while the performance optimizations ensure smooth operation even with real-time data feeds and multiple indicators running simultaneously. 