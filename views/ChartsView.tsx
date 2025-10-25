import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import Chart from '../components/Chart'; // Will be replaced
import HybridChart from '../components/HybridChart'; // Will be replaced
import TVLightweightChart from '../components/TVLightweightChart'; // Import the new chart
import SectionPanel from '../components/SectionPanel';
import ContractSearchInput from '../components/ContractSearchInput';
import { 
  searchTrades, 
  searchOpenPositions,
  searchOpenOrders
} from '../services/tradingApiService';
import { Trade, Position, Contract, HistoricalBar, QuoteData, Order } from '../types'; // Add HistoricalBar, QuoteData, Order
import { SeriesMarker, Time } from 'lightweight-charts';
import { marketDataAdapter } from '../services/marketDataAdapter';

// Import icons - using the direct SVG components to avoid Heroicons dependency issues
const ArrowTrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M15.22 6.268a.75.75 0 0 1 .44.44l1.5 4.5a.75.75 0 0 1-1.42.47l-.94-2.819-4.458 7.43a.75.75 0 0 1-1.146.12l-3.5-3.5a.75.75 0 0 1 1.061-1.06l2.926 2.925 4.088-6.814-2.82-.94a.75.75 0 0 1 .47-1.42l4.5 1.5Z" clipRule="evenodd" />
  </svg>
);

const ArrowTrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M1.72 5.47a.75.75 0 0 1 1.06 0L9 11.69l3.756-3.756a.75.75 0 0 1 .985-.066l7.5 6a.75.75 0 0 1-.781 1.28l-7.5-6-4.005 4.005a.75.75 0 0 1-1.066-.008L1.72 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" />
  </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
  </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={props.className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
  </svg>
);

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;
type ValidTimeframe = typeof VALID_TIMEFRAMES[number];

// Available indicator types
const AVAILABLE_INDICATORS = [
  { id: 'sma', name: 'Simple Moving Average (SMA)', type: 'line' },
  { id: 'ema', name: 'Exponential Moving Average (EMA)', type: 'line' },
  { id: 'bb', name: 'Bollinger Bands', type: 'bands' },
  { id: 'rsi', name: 'Relative Strength Index (RSI)', type: 'oscillator' },
  { id: 'macd', name: 'MACD', type: 'oscillator' },
  { id: 'vwap', name: 'Volume Weighted Average Price', type: 'line' }
];

const ChartsView: React.FC = () => {
  const {
    selectedBroker,
    sessionToken,
    selectedAccountId,
    fetchHistoricalData, // For OHLC
    historicalData,      // Result from fetchHistoricalData
    isLoadingHistoricalData,
    historicalDataError,
    clearHistoricalData,
    liveQuotes,          // For real-time updates
    liveTradeUpdates,    // For markers
    subscribeToMarketData,
    unsubscribeFromMarketData,
    marketStreamContractId,
    marketHubStatus
  } = useTradingContext();

  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedContractFull, setSelectedContractFull] = useState<Contract | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]); // For markers potentially, or separate display
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [chartHeight, setChartHeight] = useState(600);
  const [showDOM, setShowDOM] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true); // May not be relevant for TVLightweightChart
  
  const [timeframe, setTimeframe] = useState<ValidTimeframe>('5m');
  const [smaPeriod, setSmaPeriod] = useState<number>(20); // State for SMA period

  // State for TVLightweightChart data
  const [chartOhlcData, setChartOhlcData] = useState<HistoricalBar[]>([]);
  const [chartVolumeData, setChartVolumeData] = useState<HistoricalBar[]>([]); // For volume series
  const [chartMarkersData, setChartMarkersData] = useState<SeriesMarker<Time>[]>([]);
  const [chartLineSeriesData, setChartLineSeriesData] = useState<{ name: string; data: { time: Time; value: number }[]; color: string }[]>([]);

  // Real-time aggregation states
  const [currentBar, setCurrentBar] = useState<HistoricalBar | null>(null);
  const [lastBarTime, setLastBarTime] = useState<number | null>(null); // Store as timestamp (ms)
  const currentBarRef = useRef<HistoricalBar | null>(null);
  const lastBarTimeRef = useRef<number | null>(null);

  // Additional state for orders and enhanced features
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['sma']);
  const [showPositionsPanel, setShowPositionsPanel] = useState(true);
  const [showOrdersPanel, setShowOrdersPanel] = useState(true);
  const [chartTools, setChartTools] = useState({
    crosshair: true,
    drawingMode: false
  });

  // Ensure refs are updated when state changes (though primary logic will pass state directly)
  useEffect(() => {
    currentBarRef.current = currentBar;
  }, [currentBar]);
  useEffect(() => {
    lastBarTimeRef.current = lastBarTime;
  }, [lastBarTime]);

  const getTimeframeMs = useCallback((): number => {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    // 'w' and others can be complex due to market hours, not handled simply here
    return 5 * 60 * 1000; // Default to 5m if unknown
  }, [timeframe]);

  // Function to validate a single bar of OHLC data
  const validateHistoricalBar = (bar: HistoricalBar): boolean => {
    // Check for null or undefined values
    if (bar.open === null || bar.open === undefined ||
        bar.high === null || bar.high === undefined ||
        bar.low === null || bar.low === undefined ||
        bar.close === null || bar.close === undefined ||
        !bar.timestamp) {
      console.warn('Invalid OHLC data found:', bar);
      return false;
    }

    // Check for NaN values
    if (isNaN(bar.open) || isNaN(bar.high) || isNaN(bar.low) || isNaN(bar.close)) {
      console.warn('NaN value found in OHLC data:', bar);
      return false;
    }

    // Check that high is the highest value
    if (bar.high < bar.low || bar.high < bar.open || bar.high < bar.close) {
      console.warn('Inconsistent high value in OHLC data:', bar);
      return false;
    }

    // Check that low is the lowest value
    if (bar.low > bar.high || bar.low > bar.open || bar.low > bar.close) {
      console.warn('Inconsistent low value in OHLC data:', bar);
      return false;
    }

    // Check for valid timestamp
    const timestamp = new Date(bar.timestamp).getTime();
    if (isNaN(timestamp) || timestamp <= 0) {
      console.warn('Invalid timestamp in OHLC data:', bar.timestamp);
      return false;
    }

    return true;
  };

  // Function to process live quotes into OHLC bars
  const processLiveQuoteForChart = useCallback((quote: QuoteData) => {
    if (!selectedContractId || quote.contractId !== selectedContractId) return;

    // Use bestBid and bestAsk instead of bidPrice and askPrice
    const price = quote.lastPrice || quote.bestBid || quote.bestAsk || quote.bidPrice || quote.askPrice;
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn('Invalid price in live quote:', quote);
      return;
    }

    // Log incoming tick data for debugging
    console.log('Processing tick:', { price, timestamp: quote.timestamp });

    const quoteTime = new Date(quote.timestamp).getTime();
    if (isNaN(quoteTime) || quoteTime <= 0) {
      console.warn('Invalid timestamp in live quote:', quote.timestamp);
      return;
    }

    const intervalMs = getTimeframeMs();
    const barStartTimeEpoch = Math.floor(quoteTime / intervalMs) * intervalMs;

    setCurrentBar(prevCurrentBar => {
      if (!lastBarTimeRef.current || barStartTimeEpoch > lastBarTimeRef.current) {
        // New bar
        console.log('Creating new bar at:', new Date(barStartTimeEpoch).toISOString());
        
        if (prevCurrentBar && validateHistoricalBar(prevCurrentBar)) { // If there was a previous bar, add it to the chart data
          console.log('Adding completed bar to chart:', prevCurrentBar);

          marketDataAdapter.updateRealtimeBar(selectedContractId, timeframe, {
            timestamp: new Date(prevCurrentBar.timestamp),
            open: prevCurrentBar.open,
            high: prevCurrentBar.high,
            low: prevCurrentBar.low,
            close: prevCurrentBar.close,
            volume: prevCurrentBar.volume,
          }).catch(err => console.error('Failed to cache completed bar:', err));

          setChartOhlcData(prevOhlc => {
            // Check if we already have this bar in our data to avoid duplicates
            const exists = prevOhlc.some(bar => 
              new Date(bar.timestamp).getTime() === new Date(prevCurrentBar.timestamp).getTime()
            );
            
            if (exists) {
              console.log('Bar already exists, not adding duplicate');
              return prevOhlc;
            }
            
            // Create a new array with the sorted bars to ensure time ordering
            const newData = [...prevOhlc, prevCurrentBar].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            // Deduplicate the data
            const uniqueData: HistoricalBar[] = [];
            const seenTimestamps = new Set<number>();
            
            newData.forEach(bar => {
              const timestamp = new Date(bar.timestamp).getTime();
              if (!seenTimestamps.has(timestamp)) {
                seenTimestamps.add(timestamp);
                uniqueData.push(bar);
              }
            });
            
            return uniqueData;
          });
          
          setChartVolumeData(prevVolume => {
            // Only add to volume data if we have a valid volume value
            if (typeof prevCurrentBar.volume !== 'number' || isNaN(prevCurrentBar.volume)) {
              return prevVolume;
            }
            
            // Check if we already have this bar in our data
            const exists = prevVolume.some(bar => 
              new Date(bar.timestamp).getTime() === new Date(prevCurrentBar.timestamp).getTime()
            );
            
            if (exists) {
              console.log('Volume bar already exists, not adding duplicate');
              return prevVolume;
            }
            
            // Create a new array with the sorted bars
            const newData = [...prevVolume, prevCurrentBar].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            // Deduplicate the data
            const uniqueData: HistoricalBar[] = [];
            const seenTimestamps = new Set<number>();
            
            newData.forEach(bar => {
              const timestamp = new Date(bar.timestamp).getTime();
              if (!seenTimestamps.has(timestamp)) {
                seenTimestamps.add(timestamp);
                uniqueData.push(bar);
              }
            });
            
            return uniqueData;
          });
        }

        lastBarTimeRef.current = barStartTimeEpoch;
        setLastBarTime(barStartTimeEpoch);

        // Create a new bar with the current price
        const newBar: HistoricalBar = {
          timestamp: new Date(barStartTimeEpoch).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 1, // Start with volume of 1 for the first tick
        };
        
        // Validate the new bar before using it
        if (!validateHistoricalBar(newBar)) {
          console.warn('Created invalid bar, not using it:', newBar);
          return prevCurrentBar;
        }
        
        // Immediately add the new bar to the chart data if it doesn't already exist
        // This ensures the chart immediately shows the new candle being formed
        setChartOhlcData(prevOhlc => {
          // Check if we already have a bar with this timestamp
          const exists = prevOhlc.some(bar => 
            new Date(bar.timestamp).getTime() === barStartTimeEpoch
          );
          
          if (exists) {
            // If the bar exists, we should update it instead of just ignoring
            return prevOhlc.map(bar => {
              if (new Date(bar.timestamp).getTime() === barStartTimeEpoch) {
                return newBar; // Replace with our new bar
              }
              return bar;
            });
          }
          
          // Add the new bar and ensure the array is sorted
          return [...prevOhlc, newBar].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        
        // Also add to volume data
        setChartVolumeData(prevVolume => {
          // Check if we already have a volume bar with this timestamp
          const exists = prevVolume.some(bar => 
            new Date(bar.timestamp).getTime() === barStartTimeEpoch
          );
          
          if (exists) {
            // If the bar exists, we should update it instead of just ignoring
            return prevVolume.map(bar => {
              if (new Date(bar.timestamp).getTime() === barStartTimeEpoch) {
                return newBar; // Replace with our new bar for volume
              }
              return bar;
            });
          }
          
          // Add the new bar and ensure the array is sorted
          return [...prevVolume, newBar].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        
        return newBar;
      } else if (prevCurrentBar && barStartTimeEpoch === lastBarTimeRef.current) {
        // Update current bar
        console.log('Updating current bar:', { 
          high: Math.max(prevCurrentBar.high, price),
          low: Math.min(prevCurrentBar.low, price),
          close: price
        });
        
        const updatedBar: HistoricalBar = {
          ...prevCurrentBar,
          high: Math.max(prevCurrentBar.high, price),
          low: Math.min(prevCurrentBar.low, price),
          close: price,
          volume: (prevCurrentBar.volume || 0) + 1,  // Increment volume by 1 for each tick
        };

        // Validate the updated bar
        if (!validateHistoricalBar(updatedBar)) {
          console.warn('Created invalid updated bar, not using it:', updatedBar);
          return prevCurrentBar;
        }

        // Update the last bar in the chart data to show real-time updates
        setChartOhlcData(prevOhlc => {
          if (prevOhlc.length === 0) return [updatedBar]; // If empty, add the updated bar
          
          const newOhlcData = [...prevOhlc];
          
          // Find the bar with matching timestamp
          const barIndex = newOhlcData.findIndex(bar => 
            new Date(bar.timestamp).getTime() === barStartTimeEpoch
          );
          
          // Only update if we found the bar
          if (barIndex !== -1) {
            newOhlcData[barIndex] = updatedBar;
          } else {
            // If not found, this might be a new bar
            newOhlcData.push(updatedBar);
            // Ensure data remains sorted
            newOhlcData.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          }
          
          return newOhlcData;
        });

        // Also update volume data
        setChartVolumeData(prevVolume => {
          if (prevVolume.length === 0) return [updatedBar]; // If empty, add the updated bar
          
          const newVolumeData = [...prevVolume];
          
          // Find the bar with matching timestamp
          const barIndex = newVolumeData.findIndex(bar => 
            new Date(bar.timestamp).getTime() === barStartTimeEpoch
          );
          
          // Only update if we found the bar
          if (barIndex !== -1) {
            newVolumeData[barIndex] = updatedBar;
          } else {
            // If not found, this might be a new bar
            newVolumeData.push(updatedBar);
            // Ensure data remains sorted
            newVolumeData.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          }
          
          return newVolumeData;
        });
        
        return updatedBar;
      }
      return prevCurrentBar; // No change
    });
  }, [selectedContractId, getTimeframeMs]);

  // useEffect for processing liveQuotes
  useEffect(() => {
    if (marketHubStatus === 'connected' && selectedContractId && marketStreamContractId === selectedContractId) {
      const latestQuotes = liveQuotes.filter(q => q.contractId === selectedContractId);
      
      if (latestQuotes.length > 0) {
        console.log(`Processing ${latestQuotes.length} new quotes`);
        // Process each quote sequentially to ensure proper candle formation
        latestQuotes.forEach(quote => {
          processLiveQuoteForChart(quote);
        });
      }
    }
  }, [liveQuotes, marketHubStatus, selectedContractId, marketStreamContractId, processLiveQuoteForChart]);

  // useEffect for subscribing/unsubscribing to market data
  useEffect(() => {
    if (selectedContractId && marketHubStatus === 'connected') {
      console.log('Subscribing to market data for:', selectedContractId);
      subscribeToMarketData(selectedContractId);
      // When subscribing to a new contract, reset real-time bar aggregation state
      setCurrentBar(null);
      setLastBarTime(null);
    }
    // Cleanup function to unsubscribe when component unmounts or contractId changes
    return () => {
      if (marketStreamContractId && marketHubStatus === 'connected') { // Check if currently subscribed
        console.log('Unsubscribing from market data for:', marketStreamContractId);
        unsubscribeFromMarketData();
      }
    };
  }, [selectedContractId, marketHubStatus, subscribeToMarketData, unsubscribeFromMarketData, marketStreamContractId]);

  // Simulate tick data for testing if no live data is coming in
  const simulateTickData = useCallback(() => {
    if (!selectedContractId || !currentBar) return;
    
    console.log('Simulating tick data');
    
    // Create a synthetic quote based on the last known price
    const lastPrice = currentBar.close;
    const randomOffset = (Math.random() - 0.5) * lastPrice * 0.001; // Random price change within 0.1%
    const newPrice = lastPrice + randomOffset;
    
    const syntheticQuote: QuoteData = {
      contractId: selectedContractId,
      timestamp: new Date().toISOString(),
      lastPrice: newPrice,
      bestBid: newPrice - 0.01,
      bestAsk: newPrice + 0.01,
      bidSize: Math.floor(Math.random() * 10) + 1,
      askSize: Math.floor(Math.random() * 10) + 1
    };
    
    // Process this synthetic quote
    processLiveQuoteForChart(syntheticQuote);
  }, [selectedContractId, currentBar, processLiveQuoteForChart]);

  // Add debug controls
  const [simulationActive, setSimulationActive] = useState(false);
  
  // Effect to handle simulation
  useEffect(() => {
    if (!simulationActive) return;
    
    const interval = setInterval(() => {
      simulateTickData();
    }, 1000); // Simulate a tick every second
    
    return () => clearInterval(interval);
  }, [simulationActive, simulateTickData]);

  // Load orders for the selected contract
  const loadOrders = async () => {
    if (!selectedBroker || !sessionToken || !selectedAccountId || !selectedContractId) {
      setOrders([]);
      return;
    }

    setIsLoadingOrders(true);
    try {
      const ordersResponse = await searchOpenOrders(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId: selectedContractId
      });

      if (ordersResponse.success && ordersResponse.orders) {
        setOrders(ordersResponse.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Enhanced loadAssociatedTradingData to also load orders
  const loadAssociatedTradingData = async () => {
    if (!selectedBroker || !sessionToken || !selectedAccountId || !selectedContractId) {
      setTrades([]);
      setPositions([]);
      setOrders([]);
      return;
    }

    setIsLoadingTrades(true);
    setIsLoadingOrders(true);
    try {
      // Load recent trades for the contract
      const tradesResponse = await searchTrades(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId: selectedContractId,
        limit: 100
      });

      if (tradesResponse.success && tradesResponse.trades) {
        setTrades(tradesResponse.trades);
      } else {
        setTrades([]);
      }

      // Load open positions
      const positionsResponse = await searchOpenPositions(selectedBroker, sessionToken, {
        accountId: selectedAccountId
      });

      if (positionsResponse.success && positionsResponse.positions) {
        // Filter positions for the selected contract
        const contractPositions = positionsResponse.positions.filter(
          p => p.contractId === selectedContractId
        );
        setPositions(contractPositions);
      } else {
        setPositions([]);
      }

      // Load open orders
      await loadOrders();
    } catch (error) {
      console.error('Failed to load trading data:', error);
      setTrades([]);
      setPositions([]);
      setOrders([]);
    } finally {
      setIsLoadingTrades(false);
      setIsLoadingOrders(false);
    }
  };

  // Consolidated useEffect for preparing all chart markers
  useEffect(() => {
    const newMarkers: SeriesMarker<Time>[] = [];

    // 1. Process historical trades (already in `trades` state)
    if (trades && selectedContractId) {
      trades
        .filter(trade => trade.contractId === selectedContractId)
        .forEach(trade => {
          newMarkers.push({
            time: (new Date(trade.creationTimestamp).getTime() / 1000) as Time,
            position: trade.side === 0 ? 'belowBar' : 'aboveBar',
            color: trade.side === 0 ? '#26a69a' : '#ef5350', // Green for buy, Red for sell
            shape: trade.side === 0 ? 'arrowUp' : 'arrowDown',
            text: `H: ${trade.side === 0 ? 'Buy' : 'Sell'} @ ${trade.price.toFixed(selectedContractFull?.precision || 2)} (${trade.size})`,
            size: 1,
          });
        });
    }

    // 2. Process live trade updates from context
    if (liveTradeUpdates && selectedContractId) {
      liveTradeUpdates
        .filter(trade => trade.contractId === selectedContractId)
        .forEach(trade => {
          newMarkers.push({
            time: (new Date(trade.creationTimestamp).getTime() / 1000) as Time,
            position: trade.side === 0 ? 'belowBar' : 'aboveBar',
            color: trade.side === 0 ? '#4CAF50' : '#F44336', // Slightly different colors for live trades
            shape: trade.side === 0 ? 'arrowUp' : 'arrowDown',
            text: `L: ${trade.side === 0 ? 'Buy' : 'Sell'} @ ${trade.price.toFixed(selectedContractFull?.precision || 2)} (${trade.size})`,
            id: `liveTrade-${trade.id}`, // Add unique ID for live trades
            size: 1.2, // Slightly larger
          });
        });
    }

    // 3. Process positions for entry markers (instead of livePositionUpdates which isn't defined)
    if (positions && selectedContractId) {
      positions
        .filter(pos => pos.contractId === selectedContractId && pos.size !== 0) // Active positions
        .forEach(pos => {
          newMarkers.push({
            time: (new Date(pos.creationTimestamp || Date.now()).getTime() / 1000) as Time, // Use creationTimestamp for entry, fallback to Date.now()
            position: pos.type === 1 ? 'belowBar' : 'aboveBar', // Long (1) below, Short (0) above
            color: pos.type === 1 ? '#1E88E5' : '#FFC107', // Blue for long entry, Amber for short entry
            shape: pos.type === 1 ? 'circle' : 'circle', // Circle to differentiate from trades
            text: `${pos.type === 1 ? 'Long' : 'Short'} Entry @ ${pos.averagePrice.toFixed(selectedContractFull?.precision || 2)} (Sz: ${pos.size})`,
            id: `pos-${pos.id}`, // Unique ID for position marker
            size: 1.5, // Larger for visibility
          });
        });
    }

    // Sort all markers by time
    newMarkers.sort((a, b) => (a.time as number) - (b.time as number));

    // Deduplicate markers based on ID if present, or a combination of time, text, shape, color for others
    // This is a simple deduplication, more sophisticated logic might be needed if IDs are not always unique or if updates are frequent
    const uniqueMarkers = newMarkers.filter((marker, index, self) =>
        marker.id ? self.findIndex(m => m.id === marker.id) === index :
        self.findIndex(m =>
            m.time === marker.time &&
            m.text === marker.text && // crude way to check uniqueness for non-IDed markers
            m.shape === marker.shape &&
            m.color === marker.color
        ) === index
    );

    setChartMarkersData(uniqueMarkers);

  }, [trades, liveTradeUpdates, positions, selectedContractId, selectedContractFull]);

  // Calculate Simple Moving Average (SMA)
  const calculateSMA = (data: HistoricalBar[], period: number): { time: Time; value: number }[] => {
    if (!data || data.length < period) return [];
    
    // First filter invalid data and sort by timestamp
    const validData = data
      .filter(validateHistoricalBar)
      .sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    
    if (validData.length < period) {
      console.warn(`Not enough valid data for SMA calculation. Need ${period}, have ${validData.length}`);
      return [];
    }
    
    const smaValues: { time: Time; value: number }[] = [];
    for (let i = period - 1; i < validData.length; i++) {
      const sum = validData.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.close, 0);
      const timestamp = new Date(validData[i].timestamp).getTime();
      smaValues.push({
        time: (timestamp / 1000) as Time,
        value: sum / period,
      });
    }
    return smaValues;
  };

  // Calculate EMA for line series
  const calculateEMA = (data: HistoricalBar[], period: number): { time: Time; value: number }[] => {
    if (!data || data.length < period) return [];
    
    // First filter invalid data and sort by timestamp
    const validData = data
      .filter(validateHistoricalBar)
      .sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    
    if (validData.length < period) {
      console.warn(`Not enough valid data for EMA calculation. Need ${period}, have ${validData.length}`);
      return [];
    }
    
    const emaValues: { time: Time; value: number }[] = [];
    let multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let prevEMA = validData.slice(0, period).reduce((acc, bar) => acc + bar.close, 0) / period;
    
    // Calculate EMA for each bar after the initial period
    for (let i = period - 1; i < validData.length; i++) {
      const timestamp = new Date(validData[i].timestamp).getTime();
      if (i === period - 1) {
        // For the first point, use SMA
        emaValues.push({
          time: (timestamp / 1000) as Time,
          value: prevEMA
        });
      } else {
        // For subsequent points, use EMA formula
        prevEMA = (validData[i].close - prevEMA) * multiplier + prevEMA;
        emaValues.push({
          time: (timestamp / 1000) as Time,
          value: prevEMA
        });
      }
    }
    
    return emaValues;
  };

  // Enhanced version to generate multiple indicator series
  useEffect(() => {
    const combinedOhlc = currentBar ? chartOhlcData.concat([currentBar]) : chartOhlcData;
    if (combinedOhlc.length > 0) {
      const newLineSeriesData = [];
      
      // SMA indicator
      if (activeIndicators.includes('sma') && smaPeriod > 0) {
        const smaValues = calculateSMA(combinedOhlc, smaPeriod);
        if (smaValues.length > 0) {
          newLineSeriesData.push({
            name: `SMA(${smaPeriod})`,
            data: smaValues,
            color: 'rgba(75, 192, 192, 1)'
          });
        }
      }
      
      // EMA indicator
      if (activeIndicators.includes('ema') && smaPeriod > 0) {
        const emaValues = calculateEMA(combinedOhlc, smaPeriod);
        if (emaValues.length > 0) {
          newLineSeriesData.push({
            name: `EMA(${smaPeriod})`,
            data: emaValues,
            color: 'rgba(255, 159, 64, 1)'
          });
        }
      }
      
      setChartLineSeriesData(newLineSeriesData);
    } else {
      setChartLineSeriesData([]);
    }
  }, [chartOhlcData, currentBar, smaPeriod, activeIndicators]);

  // Toggle indicator
  const toggleIndicator = (indicatorId: string) => {
    setActiveIndicators(prev => 
      prev.includes(indicatorId)
        ? prev.filter(id => id !== indicatorId)
        : [...prev, indicatorId]
    );
  };

  // Calculate total PNL for all positions
  const calculateTotalPnL = (): number => {
    return positions.reduce((total, position) => {
      const pnl = position.profitAndLoss || 0;
      return total + pnl;
    }, 0);
  };

  // Format a number to currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Get order status text
  const getOrderStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Working';
      case 2: return 'Rejected';
      case 3: return 'Filled';
      case 4: return 'Canceled';
      default: return 'Unknown';
    }
  };

  // Get order type text
  const getOrderTypeText = (type: number): string => {
    switch (type) {
      case 1: return 'Limit';
      case 2: return 'Market';
      case 3: return 'Stop';
      case 4: return 'Stop Limit';
      default: return 'Unknown';
    }
  };

  // Get order side text
  const getOrderSideText = (side: number): string => {
    return side === 0 ? 'Buy' : 'Sell';
  };

  // Fetch historical OHLC data when contract or timeframe changes
  useEffect(() => {
    if (selectedContractId && timeframe && sessionToken && selectedBroker) {
      const endDate = new Date();
      const startDate = new Date();
      // Adjust historical fetch range based on timeframe for relevance
      if (timeframe.includes('m') || timeframe.includes('h')) {
        startDate.setDate(endDate.getDate() - 7); // 7 days for intraday
      } else if (timeframe.includes('d')) {
        startDate.setDate(endDate.getDate() - 365); // 1 year for daily
      } else {
        startDate.setDate(endDate.getDate() - (365 * 5)); // 5 years for weekly/monthly (if supported)
      }

      fetchHistoricalData({
        contractId: selectedContractId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: timeframe,
        includeAfterHours: true,
      });
      // Reset real-time components when historical data is re-fetched
      setCurrentBar(null);
      setLastBarTime(null);
    } else {
      setChartOhlcData([]); // Clear chart if no contract/timeframe
      setChartVolumeData([]);
      setCurrentBar(null);
      setLastBarTime(null);
    }
  }, [selectedContractId, timeframe, sessionToken, selectedBroker, fetchHistoricalData]);

  // Process fetched historical data from context
  useEffect(() => {
    if (historicalData?.success && historicalData.bars && historicalData.contractId === selectedContractId && historicalData.interval === timeframe) {
      // Only update if the fetched data corresponds to the current selection
      // First validate, sort and deduplicate the historical data by timestamp
      const validData = historicalData.bars.filter(validateHistoricalBar);

      if (validData.length < historicalData.bars.length) {
        console.warn(`Filtered ${historicalData.bars.length - validData.length} invalid bars from historical data`);
      }

      const sortedData = [...validData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Remove duplicates by timestamp
      const uniqueData: HistoricalBar[] = [];
      const seenTimestamps = new Set<number>();
      
      sortedData.forEach(bar => {
        const timestamp = new Date(bar.timestamp).getTime();
        if (!seenTimestamps.has(timestamp)) {
          seenTimestamps.add(timestamp);
          uniqueData.push(bar);
        } else {
          console.warn(`Duplicate timestamp found and removed: ${bar.timestamp}`);
        }
      });
      
      console.log(`Historical data processed: ${uniqueData.length} bars (was ${historicalData.bars.length})`);
      setChartOhlcData(uniqueData);
      
      // Also filter volume data for uniqueness
      const volumeBars = uniqueData.filter(b => typeof b.volume === 'number' && !isNaN(b.volume));
      setChartVolumeData(volumeBars);
      
      // Set lastBarTime from the last historical bar to correctly start live aggregation
      if (uniqueData.length > 0) {
        const lastHistBarTime = new Date(uniqueData[uniqueData.length - 1].timestamp).getTime();
        setLastBarTime(lastHistBarTime);
        lastBarTimeRef.current = lastHistBarTime;

        // Check if the currentBar (if any) is older than or same as the last historical bar
        if (currentBar && new Date(currentBar.timestamp).getTime() <= lastHistBarTime) {
          setCurrentBar(null); // Discard current live bar if it's now covered by historical data
        }
      } else {
        // No historical data, reset lastBarTime for live aggregation to start fresh
        setLastBarTime(null);
        lastBarTimeRef.current = null;
      }
    } else if (!historicalData?.success && historicalData?.errorMessage && historicalData?.contractId === selectedContractId && historicalData?.interval === timeframe) {
      setChartOhlcData([]);
      setChartVolumeData([]);
      setLastBarTime(null); // Reset for live data if historical fails
      lastBarTimeRef.current = null;
    }
  }, [historicalData, selectedContractId, timeframe, currentBar]);

  // Function to get the current market price for the selected contract
  const getCurrentMarketPrice = (): number | undefined => {
    // Try to get price from live quotes first
    const latestQuote = liveQuotes.find(q => q.contractId === selectedContractId);
    if (latestQuote) {
      return latestQuote.lastPrice || latestQuote.bestBid || latestQuote.bestAsk;
    }
    
    // Fallback to the latest price from OHLC data
    if (chartOhlcData.length > 0) {
      return chartOhlcData[chartOhlcData.length - 1].close;
    }

    // Fallback to current bar if it exists
    if (currentBar) {
      return currentBar.close;
    }

    // Last fallback to position market price
    if (positions.length > 0 && positions[0].marketPrice) {
      return positions[0].marketPrice;
    }

    return undefined;
  };

  // Update position's PNL based on current market price
  const updatePositionsPnL = (positionsToUpdate: Position[]): Position[] => {
    const currentPrice = getCurrentMarketPrice();
    
    if (!currentPrice) return positionsToUpdate;
    
    return positionsToUpdate.map(position => {
      // Skip if no size or already has PNL
      if (position.size === 0) return position;
      
      const priceDifference = position.type === 1 
        ? currentPrice - position.averagePrice  // Long position
        : position.averagePrice - currentPrice; // Short position
      
      const pnl = priceDifference * position.size;
      const pnlPercent = (priceDifference / position.averagePrice) * 100;
      
      return {
        ...position,
        marketPrice: currentPrice,
        profitAndLoss: pnl,
        profitAndLossPercent: pnlPercent
      };
    });
  };

  // Update positions PNL when market data changes
  useEffect(() => {
    if (positions.length > 0) {
      const updatedPositions = updatePositionsPnL(positions);
      setPositions(updatedPositions);
    }
  }, [liveQuotes, currentBar]);

  // Enhanced refresh function to update chart data and trading information
  const refreshChartData = useCallback(async () => {
    if (!selectedContractId || !selectedBroker || !sessionToken) return;
    
    // Refresh historical data
    const endDate = new Date();
    const startDate = new Date();
    
    if (timeframe.includes('m') || timeframe.includes('h')) {
      startDate.setDate(endDate.getDate() - 7); // 7 days for intraday
    } else if (timeframe.includes('d')) {
      startDate.setDate(endDate.getDate() - 365); // 1 year for daily
    } else {
      startDate.setDate(endDate.getDate() - (365 * 5)); // 5 years for weekly/monthly
    }

    try {
      // Clear current data first
      clearHistoricalData();
      setCurrentBar(null);
      setLastBarTime(null);
      
      // Fetch new data
      await fetchHistoricalData({
        contractId: selectedContractId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: timeframe,
        includeAfterHours: true,
      });
      
      // Reload trading data
      await loadAssociatedTradingData();
    } catch (error) {
      console.error("Error refreshing chart data:", error);
    }
  }, [selectedContractId, selectedBroker, sessionToken, timeframe, fetchHistoricalData, clearHistoricalData, loadAssociatedTradingData]);

  if (!selectedBroker || !sessionToken) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <h2 className="text-xl font-medium text-gray-200 mb-2">Authentication Required</h2>
          <p className="text-gray-400">Please select a broker and log in to access charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-200">Advanced Charting</h1>
        <div className="w-full md:w-1/3 lg:w-1/4">
          <ContractSearchInput
            selectedBroker={selectedBroker}
            onContractSelect={(contract: Contract) => {
              setSelectedContractId(contract.id);
              setSelectedContractFull(contract);
              console.log('Contract selected in ChartsView:', contract);
            }}
            placeholder="Search contract for chart..."
            enableAutoSearch={true}
            showQuickSearch={true}
          />
        </div>
        <div className="w-full md:w-auto">
          <label htmlFor="timeframeSelect" className="block text-sm font-medium text-gray-300 mb-1">Timeframe</label>
          <select
            id="timeframeSelect"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as ValidTimeframe)}
            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          >
            {VALID_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label htmlFor="smaPeriodInput" className="block text-sm font-medium text-gray-300 mb-1">Indicator Period</label>
          <input
            type="number"
            id="smaPeriodInput"
            value={smaPeriod}
            onChange={(e) => setSmaPeriod(Math.max(1, parseInt(e.target.value, 10) || 1))} // Ensure positive integer
            min="1"
            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            placeholder="e.g., 20"
          />
        </div>
      </div>
      
      {selectedContractFull && (
        <div className="mt-2 text-sm text-gray-400">
          Displaying chart for: <span className="font-semibold text-sky-400">{selectedContractFull.name} ({selectedContractFull.description})</span>
          <span className="ml-2">Timeframe: {timeframe.toUpperCase()}</span>
          {activeIndicators.length > 0 && <span className="ml-2">Indicators: {activeIndicators.map(id => id.toUpperCase()).join(', ')}</span>}
        </div>
      )}

      {/* Active Positions Panel */}
      {selectedContractId && showPositionsPanel && (
        <SectionPanel 
          title={
            <div className="flex justify-between items-center w-full">
              <span>Active Positions</span>
              <div className="flex items-center">
                <button
                  onClick={() => loadAssociatedTradingData()}
                  className="p-1 text-gray-400 hover:text-white transition-colors mr-2"
                  title="Refresh positions"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowPositionsPanel(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Hide panel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          } 
          className="bg-gray-800 border-gray-700"
        >
          {isLoadingTrades ? (
            <p className="text-center text-sky-400 py-3">Loading positions...</p>
          ) : positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Size</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Entry Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Current Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">PnL</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">PnL %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {positions.map((position, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          position.type === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {position.type === 1 ? (
                            <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                          )}
                          {position.type === 1 ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{position.size}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(position.averagePrice)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {position.marketPrice ? formatCurrency(position.marketPrice) : 'N/A'}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm ${
                        (position.profitAndLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.profitAndLoss !== undefined ? formatCurrency(position.profitAndLoss) : 'N/A'}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm ${
                        (position.profitAndLossPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.profitAndLossPercent !== undefined 
                          ? `${position.profitAndLossPercent.toFixed(2)}%` 
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-750">
                    <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-300">Total PnL:</td>
                    <td className={`px-3 py-2 font-medium ${
                      calculateTotalPnL() >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(calculateTotalPnL())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-3">No active positions for this contract.</p>
          )}
        </SectionPanel>
      )}

      {/* Working Orders Panel */}
      {selectedContractId && showOrdersPanel && (
        <SectionPanel 
          title={
            <div className="flex justify-between items-center w-full">
              <span>Working Orders</span>
              <div className="flex items-center">
                <button
                  onClick={() => loadOrders()}
                  className="p-1 text-gray-400 hover:text-white transition-colors mr-2"
                  title="Refresh orders"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowOrdersPanel(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Hide panel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          } 
          className="bg-gray-800 border-gray-700"
        >
          {isLoadingOrders ? (
            <p className="text-center text-sky-400 py-3">Loading orders...</p>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Side</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Size</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {orders.map((order, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {getOrderTypeText(order.type)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.side === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {getOrderSideText(order.side)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {order.size}
                        {order.filledSize ? ` (${order.filledSize} filled)` : ''}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {order.limitPrice ? formatCurrency(order.limitPrice) : 'Market'}
                        {order.stopPrice ? ` / Stop: ${formatCurrency(order.stopPrice)}` : ''}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 1 ? 'bg-blue-100 text-blue-800' : 
                          order.status === 3 ? 'bg-green-100 text-green-800' : 
                          order.status === 4 ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {new Date(order.creationTimestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-3">No working orders for this contract.</p>
          )}
        </SectionPanel>
      )}

      {/* Chart Tools and Indicators */}
      {selectedContractId && (
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Show/Hide Panels Buttons */}
          {!showPositionsPanel && (
            <button 
              onClick={() => setShowPositionsPanel(true)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors flex items-center"
            >
              <ChartBarIcon className="h-4 w-4 mr-1" />
              Show Positions
            </button>
          )}
          {!showOrdersPanel && (
            <button 
              onClick={() => setShowOrdersPanel(true)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors flex items-center"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Show Orders
            </button>
          )}
          
          {/* Refresh Button */}
          <button 
            onClick={refreshChartData}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>

          {/* Debug Button - For testing real-time candle formation */}
          <button 
            onClick={() => setSimulationActive(!simulationActive)}
            className={`px-3 py-1 rounded-md transition-colors flex items-center ${
              simulationActive 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {simulationActive ? 'Stop Simulation' : 'Simulate Ticks'}
          </button>
          
          {/* Indicator Toggle Buttons */}
          {AVAILABLE_INDICATORS.slice(0, 3).map(indicator => (
            <button 
              key={indicator.id}
              onClick={() => toggleIndicator(indicator.id)}
              className={`px-3 py-1 rounded-md transition-colors flex items-center ${
                activeIndicators.includes(indicator.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {indicator.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Main Chart Component */}
      {selectedContractId ? (
        <SectionPanel title="Chart" className="bg-gray-800 border-gray-700">
          {isLoadingHistoricalData && <p className="text-center text-sky-400">Loading historical chart data...</p>}
          {historicalDataError && !isLoadingHistoricalData && <p className="text-center text-red-400">Error loading historical data: {historicalDataError}</p>}
          {!isLoadingHistoricalData && !historicalDataError && chartOhlcData.length === 0 && <p className="text-center text-gray-500">No chart data available for {selectedContractFull?.name || selectedContractId}. Try a different timeframe or contract.</p>}

          {(chartOhlcData.length > 0 || currentBar) && (
            <TVLightweightChart
              ohlcData={currentBar ? chartOhlcData.concat([currentBar]) : chartOhlcData}
              volumeData={currentBar ? chartVolumeData.concat([currentBar]) : chartVolumeData}
              markersData={chartMarkersData}
              lineSeriesData={chartLineSeriesData}
              timeframe={timeframe}
              height={chartHeight}
              workingOrders={orders}
              positions={positions}
              currentPrice={getCurrentMarketPrice()}
              // theme can be passed if needed, defaults to 'dark'
            />
          )}
        </SectionPanel>
      ) : (
        <SectionPanel title="Chart" className="bg-gray-800 border-gray-700">
          <p className="text-center text-gray-500 py-10">Please select a contract to display the chart.</p>
        </SectionPanel>
      )}

      {/* Chart Features Info - Can be kept or removed */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Chart Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Standard Chart</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Advanced technical indicators</li>
              <li>Drawing tools with persistent storage</li>
              <li>Full DOM (Depth of Market) view</li>
              <li>Multi-timeframe analysis</li>
              <li>Trade visualization overlay</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Hybrid Chart</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Optimized for real-time data streaming</li>
              <li>Lower latency updates</li>
              <li>Reduced CPU/memory footprint</li>
              <li>Better performance for high-frequency data</li>
              <li>Specialized for TopstepX integration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timeframes Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Available Timeframes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-700 p-3 rounded">1 minute</div>
          <div className="bg-gray-700 p-3 rounded">5 minutes</div>
          <div className="bg-gray-700 p-3 rounded">15 minutes</div>
          <div className="bg-gray-700 p-3 rounded">30 minutes</div>
          <div className="bg-gray-700 p-3 rounded">1 hour</div>
          <div className="bg-gray-700 p-3 rounded">4 hours</div>
          <div className="bg-gray-700 p-3 rounded">1 day</div>
          <div className="bg-gray-700 p-3 rounded">1 week</div>
        </div>
      </div>
    </div>
  );
};

export default ChartsView;