# Real-Time Streaming Implementation

## Overview

This document describes the comprehensive real-time streaming implementation for the PyTradeCraft application using ProjectX and TopstepX SignalR hubs. The implementation provides live market data, quotes, trades, and depth of market (DOM) updates directly to the Charts component.

## Architecture

### SignalR Integration

The application uses Microsoft SignalR for real-time communication with both ProjectX and TopstepX market data hubs:

- **ProjectX Market Hub**: `wss://gateway-rtc-demo.s2f.projectx.com/hubs/market`
- **TopstepX Market Hub**: `https://rtc.topstepx.com/hubs/market`

### Key Components

1. **TradingContext** - Central state management for real-time connections
2. **Chart Component** - Consumes real-time data for live chart updates
3. **ProjectX/TopstepX Services** - Handle broker-specific SignalR connections
4. **DeploymentsView** - Market hub connection management UI

## Implementation Details

### 1. Constants Configuration

```typescript
// ProjectX SignalR URLs
export const PROJECTX_MARKET_HUB_URL = 'wss://gateway-rtc-demo.s2f.projectx.com/hubs/market';

// TopstepX SignalR URLs  
export const TOPSTEPX_MARKET_HUB_URL = 'https://rtc.topstepx.com/hubs/market';
```

### 2. SignalR Service Functions

#### ProjectX Market Hub Connection
```typescript
export const buildProjectXMarketHubConnection = (token: string): HubConnection => {
    return new HubConnectionBuilder()
        .withUrl(PROJECTX_MARKET_HUB_URL, {
            accessTokenFactory: () => token,
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true
        })
        .withAutomaticReconnect()
        .build();
};
```

#### Market Data Subscription
```typescript
export const subscribeToProjectXMarketData = async (
    connection: HubConnection, 
    contractId: string
): Promise<void> => {
    await connection.invoke('SubscribeContractQuotes', contractId);
    await connection.invoke('SubscribeContractTrades', contractId);
    await connection.invoke('SubscribeContractMarketDepth', contractId);
};
```

### 3. TradingContext Integration

The TradingContext manages real-time connections and provides unified access to streaming data:

```typescript
// Market hub connection state
const [marketHubConnection, setMarketHubConnection] = useState<HubConnection | null>(null);
const [marketHubStatus, setMarketHubStatus] = useState<HubConnectionStatus>('disconnected');

// Real-time data state
const [liveQuotes, setLiveQuotes] = useState<QuoteData[]>([]);
const [liveMarketTrades, setLiveMarketTrades] = useState<MarketTradeData[]>([]);
const [liveDepthUpdates, setLiveDepthUpdates] = useState<MarketDepthUpdate[]>([]);
```

#### Broker-Agnostic Connection Logic
```typescript
const connectMarketHubInternal = useCallback(async () => {
    // Support both ProjectX and TopstepX
    if (selectedBroker === 'topstepx') {
        const newConnection = buildTopstepXMarketHubConnection(sessionToken);
        setupTopstepXMarketHubHandlers(newConnection, /* handlers */);
    } else if (selectedBroker === 'projectx') {
        const newConnection = buildProjectXMarketHubConnection(sessionToken);
        setupProjectXMarketHubHandlers(newConnection, /* handlers */);
    }
}, [selectedBroker, sessionToken]);
```

### 4. Chart Component Real-Time Integration

#### Live Data Processing
```typescript
// Process real-time quote updates
useEffect(() => {
    if (!isStreaming || !liveQuotes || liveQuotes.length === 0) return;

    const latestQuote = liveQuotes.find(quote => quote.contractId === selectedContract);
    if (!latestQuote) return;

    // Update current bar with latest price
    if (chartData.bars.length > 0 && latestQuote.last) {
        setChartData(prev => {
            const updatedBars = [...prev.bars];
            const lastBar = updatedBars[updatedBars.length - 1];
            
            const updatedLastBar = {
                ...lastBar,
                close: latestQuote.last!,
                high: Math.max(lastBar.high, latestQuote.last!),
                low: Math.min(lastBar.low, latestQuote.last!),
                timestamp: new Date().toISOString()
            };
            
            updatedBars[updatedBars.length - 1] = updatedLastBar;
            return { ...prev, bars: updatedBars };
        });
    }
}, [liveQuotes, isStreaming, selectedContract]);
```

#### DOM (Depth of Market) Updates
```typescript
// Update market depth for DOM display
if (showDOM && latestQuote.bid && latestQuote.ask) {
    setMarketDepth({
        contractId: selectedContract,
        bids: [{ price: latestQuote.bid, size: latestQuote.bidSize || 0, orders: 1 }],
        asks: [{ price: latestQuote.ask, size: latestQuote.askSize || 0, orders: 1 }],
        timestamp: new Date().toISOString()
    });
}
```

### 5. Streaming Controls

#### Auto-Start Streaming
```typescript
// Auto-start streaming when conditions are met
useEffect(() => {
    if (selectedContract && marketHubStatus === 'connected' && !isStreaming && chartData.bars.length > 0) {
        startStreaming();
    }
}, [selectedContract, marketHubStatus, isStreaming, chartData.bars.length, startStreaming]);
```

#### Manual Controls
```typescript
const startStreaming = useCallback(async () => {
    if (!selectedContract || !marketHubConnection || marketHubStatus !== 'connected') {
        setError('Cannot start streaming: Missing contract symbol or market hub not connected');
        return;
    }

    try {
        setIsStreaming(true);
        await subscribeToMarketData(selectedContract);
        console.log(`📡 Started streaming data for ${selectedContract}`);
    } catch (err) {
        console.error('❌ Error starting stream:', err);
        setError(`Failed to start streaming: ${err instanceof Error ? err.message : String(err)}`);
        setIsStreaming(false);
    }
}, [selectedContract, marketHubConnection, marketHubStatus, subscribeToMarketData]);
```

## User Interface

### Market Hub Status Indicator

The Chart component displays a comprehensive status indicator showing:

- **Connection Status**: Connected (green), Connecting (yellow), Disconnected (red)
- **Broker Type**: ProjectX or TopstepX
- **Streaming Status**: Live streaming active or ready
- **Visual Indicators**: Animated pulse for active connections

```typescript
{/* Market Hub Status */}
{sessionToken && selectedBroker && (
    <div className={`px-4 py-3 rounded-lg mb-4 ${
        marketHubStatus === 'connected' 
            ? 'bg-green-900/50 border border-green-500' 
            : marketHubStatus === 'connecting'
            ? 'bg-yellow-900/50 border border-yellow-500'
            : 'bg-red-900/50 border border-red-500'
    }`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                    marketHubStatus === 'connected' 
                        ? 'bg-green-400 animate-pulse' 
                        : 'bg-red-400'
                }`}></div>
                <div>
                    <div className="font-medium text-green-400">
                        Market Hub ({selectedBroker === 'projectx' ? 'ProjectX' : 'TopstepX'})
                    </div>
                    <div className="text-sm text-gray-300">
                        Real-time data streaming {isStreaming ? 'active' : 'available'}
                    </div>
                </div>
            </div>
            {marketHubStatus === 'connected' && (
                <div className="text-sm text-gray-400">
                    {isStreaming ? '📡 LIVE' : '⏸️ Ready'}
                </div>
            )}
        </div>
    </div>
)}
```

### Streaming Controls

- **Start/Stop Stream Button**: Manual control over streaming
- **Auto-Connection**: Automatically connects when broker is authenticated
- **Visual Feedback**: Live indicator shows when streaming is active

## Data Flow

1. **Authentication**: User connects to ProjectX or TopstepX
2. **Hub Connection**: Market hub automatically connects when authenticated
3. **Chart Loading**: Historical data loads first
4. **Stream Activation**: Real-time streaming starts automatically after chart loads
5. **Live Updates**: Chart updates in real-time with new price data
6. **DOM Updates**: Depth of market shows live bid/ask data

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- User-friendly error messages
- Graceful degradation when streaming unavailable

### Data Validation
- Validates incoming quote data before processing
- Handles missing or malformed data gracefully
- Maintains chart stability during connection issues

## Performance Optimizations

### Efficient Updates
- Only updates chart when price data actually changes
- Batches multiple updates to prevent excessive re-renders
- Limits stored trade history to prevent memory leaks

### Memory Management
- Automatic cleanup on component unmount
- Proper SignalR connection disposal
- Limited data retention for real-time feeds

## Supported Features

### Real-Time Data Types
- **Quotes**: Bid, Ask, Last price updates
- **Trades**: Market trade events with size and price
- **Market Depth**: Level 1 DOM data (bid/ask)
- **Chart Updates**: Live candlestick bar updates

### Chart Integration
- **Live Bars**: Current bar updates with real-time prices
- **Price Range**: Dynamic price scaling with live data
- **Visual Indicators**: Clear streaming status display
- **Trade Markers**: Real-time trade events on chart

### Broker Support
- **ProjectX**: Full SignalR integration with ProjectX Gateway
- **TopstepX**: Native TopstepX market hub support
- **Unified Interface**: Same API for both brokers

## Configuration

### Environment Variables
```typescript
// ProjectX Configuration
PROJECTX_MARKET_HUB_URL=wss://gateway-rtc-demo.s2f.projectx.com/hubs/market

// TopstepX Configuration  
TOPSTEPX_MARKET_HUB_URL=https://rtc.topstepx.com/hubs/market
```

### Connection Parameters
```typescript
// WebSocket Configuration
{
    accessTokenFactory: () => token,
    transport: HttpTransportType.WebSockets,
    skipNegotiation: true,
    timeout: 10000
}
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Verify authentication token is valid
   - Check network connectivity
   - Ensure WebSocket support in browser

2. **No Data Updates**
   - Confirm contract symbol is valid
   - Check subscription status in console
   - Verify market hub connection is active

3. **Performance Issues**
   - Monitor console for excessive updates
   - Check memory usage in browser dev tools
   - Verify proper cleanup on component unmount

### Debug Information

The implementation includes comprehensive logging:
- Connection status changes
- Subscription events
- Data update events
- Error conditions

## Future Enhancements

### Planned Features
- **Level 2 DOM**: Full market depth display
- **Multiple Contracts**: Simultaneous streaming for multiple symbols
- **Historical Replay**: Replay historical data with streaming simulation
- **Advanced Indicators**: Real-time indicator calculations
- **Alert System**: Price-based alerts and notifications

### Performance Improvements
- **Data Compression**: Optimize data transfer
- **Selective Updates**: Only update visible chart areas
- **Background Processing**: Web Workers for heavy calculations

## Conclusion

The real-time streaming implementation provides a robust, scalable foundation for live market data in the PyTradeCraft application. It supports both ProjectX and TopstepX brokers with a unified interface, comprehensive error handling, and optimal performance characteristics.

The implementation follows best practices for SignalR integration, React state management, and real-time data processing, ensuring a smooth and responsive user experience for live trading applications. 