import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { getHistoricalData } from '../services/tradingApiService';
import { HistoricalBar, Trade, Position, MarketDepth, MarketQuote, Contract } from '../types';
import LoadingSpinner from './LoadingSpinner';
import IndicatorModal from './IndicatorModal';

// Chart Types
export interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'bar' | 'area';
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  theme: 'dark' | 'light';
  preferRealtime: boolean; // New setting to prefer real-time data over historical
}

export interface DrawingTool {
  type: 'line' | 'rectangle' | 'circle' | 'fibonacci' | 'trendline' | 'support' | 'resistance';
  points: { x: number; y: number; timestamp?: string; price?: number }[];
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  id: string;
}

export interface Indicator {
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

export interface ChartData {
  bars: HistoricalBar[];
  trades: Trade[];
  positions: Position[];
  drawings: DrawingTool[];
  indicators: Indicator[];
}

interface ChartProps {
  contractId?: string;
  height?: number;
  showDOM?: boolean;
  showToolbar?: boolean;
}

const Chart: React.FC<ChartProps> = ({ 
  contractId, 
  height = 600, 
  showDOM = true, 
  showToolbar = true 
}) => {
  const { 
    sessionToken, 
    selectedBroker, 
    selectedAccountId,
    marketHubConnection,
    marketHubStatus,
    subscribeToMarketData,
    unsubscribeFromMarketData,
    liveQuotes,
    liveMarketTrades,
    liveDepthUpdates,
    searchContracts
  } = useTradingContext();

  // Chart state
  const [chartData, setChartData] = useState<ChartData>({
    bars: [],
    trades: [],
    positions: [],
    drawings: [],
    indicators: []
  });
  const [settings, setSettings] = useState<ChartSettings>({
    chartType: 'candlestick',
    timeframe: '5m',
    showVolume: true,
    showGrid: true,
    showCrosshair: true,
    theme: 'dark',
    preferRealtime: true // Default to preferring real-time data
  });
  const [selectedContract, setSelectedContract] = useState<string>(contractId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // DOM state
  const [marketDepth, setMarketDepth] = useState<MarketDepth | null>(null);
  const [domSize, setDomSize] = useState(10);

  // Drawing tools state
  const [selectedTool, setSelectedTool] = useState<DrawingTool['type'] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingTool | null>(null);

  // Indicator state
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);

  // Canvas refs
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chart dimensions and scaling
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 600 });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [timeRange, setTimeRange] = useState({ start: 0, end: 1000 });

  // Real-time bar construction for TopStepX
  const [realtimeBars, setRealtimeBars] = useState<HistoricalBar[]>([]);
  const [currentBar, setCurrentBar] = useState<HistoricalBar | null>(null);
  const [lastBarTime, setLastBarTime] = useState<Date | null>(null);
  const [usingRealtimeData, setUsingRealtimeData] = useState(false);

  // Debug state
  const [lastQuoteReceived, setLastQuoteReceived] = useState<MarketQuote | null>(null);

  // Add refs to manage update cycles and avoid infinite loops
  const priceRangeNeedsUpdate = useRef(false);
  const barsRef = useRef<HistoricalBar[]>([]);
  const throttleTimerRef = useRef<number | null>(null);
  const loadChartDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const startStreamingRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Add state for contract search and dropdown
  const [searchText, setSearchText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Contract[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Popular contracts from TradingView.tsx
  const popularContracts = [
    'ES', 'NQ', 'YM', 'RTY', // US Indices
    'CL', 'NG', 'GC', 'SI', // Commodities
    'ZB', 'ZN', 'ZF', 'ZT', // Bonds
    'EUR', 'GBP', 'JPY', 'CAD', // Currencies
    '6E', '6B', '6J', '6C', // CME Currency Futures
    'CON.F.US.MNQ.M25', 'CON.F.US.ES.M25' // TopStepX Contract Format
  ];

  // Helper function to get bar interval in milliseconds
  const getBarIntervalMs = (timeframe: string): number => {
    switch (timeframe) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      case '1w': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };

  // Real-time streaming handlers - defined early to avoid hoisting issues
  const startStreaming = useCallback(async () => {
    if (!selectedContract) {
      setError('Cannot start streaming: Missing contract symbol');
      return;
    }

    if (!marketHubConnection) {
      setError('Cannot start streaming: Market hub connection not initialized');
      return;
    }

    // Check both the status and the actual connection state
    if (marketHubStatus !== 'connected' || marketHubConnection.state !== 'Connected') {
      setError(`Cannot start streaming: Market hub not properly connected (Status: ${marketHubStatus}, Connection state: ${marketHubConnection.state})`);
      return;
    }

    try {
      console.log(`🔄 Starting market stream for ${selectedContract}...`);
      setIsStreaming(true);

      // Add retry logic for subscribeToMarketData
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          // Check connection state again before each attempt
          if (marketHubConnection.state !== 'Connected') {
            throw new Error(`Cannot subscribe - connection is in ${marketHubConnection.state} state`);
          }

          await subscribeToMarketData(selectedContract);
          success = true;
          console.log(`📡 Started streaming data for ${selectedContract} (attempt ${retryCount + 1})`);
        } catch (subscribeErr) {
          retryCount++;
          console.warn(`⚠️ Attempt ${retryCount} failed: ${subscribeErr instanceof Error ? subscribeErr.message : String(subscribeErr)}`);

          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`⏱️ Waiting ${delay}ms before retry ${retryCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw subscribeErr; // Re-throw if all retries failed
          }
        }
      }

      // Initialize with empty bars when starting fresh
      if (realtimeBars.length === 0 && usingRealtimeData) {
        console.log(`📊 Starting fresh with real-time bars`);
        setChartData(prev => ({ ...prev, bars: [] }));
      }
    } catch (err) {
      console.error('❌ Error starting stream:', err);
      setError(`Failed to start streaming: ${err instanceof Error ? err.message : String(err)}`);
      setIsStreaming(false);
    }
  }, [selectedContract, marketHubConnection, marketHubStatus, subscribeToMarketData, realtimeBars.length, usingRealtimeData]);

  // Store the function in the ref
  useEffect(() => {
    startStreamingRef.current = startStreaming;
  }, [startStreaming]);

  const stopStreaming = useCallback(async () => {
    if (!isStreaming) return;

    try {
      await unsubscribeFromMarketData();
      setIsStreaming(false);
      console.log(`📡 Stopped streaming data`);
    } catch (err) {
      console.error('❌ Error stopping stream:', err);
      setError(`Failed to stop streaming: ${err instanceof Error ? err.message : String(err)}`);
      // Force isStreaming to false even if the unsubscribe fails
      setIsStreaming(false);
    }
  }, [isStreaming, unsubscribeFromMarketData]);

  // Real-time bar building logic
  const processQuoteIntoBar = useCallback((quote: MarketQuote, timestamp: number, timeframeMs: number): HistoricalBar => {
    // Check if the quote has the necessary data
    // Handle both MarketQuote and QuoteData types
    const price = ('last' in quote) ? 
      (quote as MarketQuote).last : 
      (quote as QuoteData).lastPrice || 0;

    if (price === undefined || price === 0) {
      console.error('Quote missing price:', quote);
    }

    // Create a properly formatted bar object
    return {
      timestamp: new Date(timestamp).toISOString(),
      dateTime: new Date(timestamp).toISOString(),
      open: price,
      high: price,
      low: price,
      close: price,
      volume: quote.volume || 0
    };
  }, []);

  // Load chart data - with real-time and historical modes
  const loadChartData = useCallback(async () => {
    if (!selectedContract || !sessionToken) {
      setError('Missing contract symbol or session token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`📊 Loading chart data for ${selectedContract}, broker: ${selectedBroker}`);

      // For TopStepX, we can use real-time data if market hub is connected
      if (selectedBroker === 'topstepx' && marketHubStatus === 'connected') {
        console.log('📈 Using real-time data mode for TopStepX');

        // Clear any existing bars
        setRealtimeBars([]);
        setCurrentBar(null);
        setLastBarTime(null);

        // Set flag to indicate we're using real-time data
        setUsingRealtimeData(true);

        // Create placeholder initial data for chart sizing
        const placeholderBars: HistoricalBar[] = [];

        // Get the latest quote to set initial price
        let initialPrice = 0;

        if (liveQuotes && liveQuotes.length > 0) {
          // Find a quote for our contract
          const contractQuote = liveQuotes.find(q => q.contractId === selectedContract);
          if (contractQuote && contractQuote.last !== undefined) {
            initialPrice = contractQuote.last;
            console.log(`Found initial price from live quotes: ${initialPrice}`);
          }
        }

        // If we couldn't get a price from quotes, use a default
        if (initialPrice === 0) {
          initialPrice = 1000; // Default placeholder value
          console.log(`Using default initial price: ${initialPrice}`);
        }

        // Create placeholder bar
        const now = Date.now();
        const barIntervalMs = getBarIntervalMs(settings.timeframe);

        // Placeholder for time range
        const startTime = now - (barIntervalMs * 100); // 100 empty bars

        const placeholderBar: HistoricalBar = {
          timestamp: new Date(startTime).toISOString(),
          dateTime: new Date(startTime).toISOString(),
          open: initialPrice,
          high: initialPrice,
          low: initialPrice,
          close: initialPrice,
          volume: 0
        };

        // Set initial chart data with placeholder
        setChartData({
          bars: [placeholderBar],
          trades: [],
          positions: [],
          drawings: [],
          indicators: []
        });

        // Set price range based on placeholder price
        setPriceRange({
          max: initialPrice * 1.1, // Add 10% padding
          min: Math.max(0, initialPrice * 0.9) // Ensure we don't go below 0
        });

        // Set time range
        setTimeRange({
          start: startTime,
          end: now + barIntervalMs // Add one interval for padding
        });

        // Auto-start streaming
        console.log('Starting real-time streaming...');
        await startStreaming();

        setIsLoading(false);

      } else {
        // Get historical data for other brokers or when market hub is not connected
        console.log('📈 Using historical data mode');
        setUsingRealtimeData(false);

        // Format interval for API request
        const interval = settings.timeframe.replace('m', 'min').replace('h', 'hour').replace('d', 'day').replace('w', 'week');

        // Get historical data
        const response = await getHistoricalData(sessionToken, selectedBroker, selectedAccountId, selectedContract, interval);

        if (!response.success) {
          setError(`Failed to load chart data: ${response.error}`);
          setIsLoading(false);
          return;
        }

        if (!response.data || response.data.length === 0) {
          setError('No historical data available for the selected contract');
          setIsLoading(false);
          return;
        }

        // Extract data
        const bars = response.data.map(bar => ({
          timestamp: bar.timestamp,
          dateTime: bar.dateTime || bar.timestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0
        }));

        console.log(`📊 Loaded ${bars.length} historical bars`);

        // Calculate price range
        const highValues = bars.map(bar => bar.high);
        const lowValues = bars.map(bar => bar.low);
        const maxPrice = Math.max(...highValues);
        const minPrice = Math.min(...lowValues);

        // Add padding (10%)
        const padding = (maxPrice - minPrice) * 0.1;

        // Set price range
        setPriceRange({
          max: maxPrice + padding,
          min: Math.max(0, minPrice - padding) // Ensure we don't go below 0
        });

        // Calculate time range
        const startTime = new Date(bars[0].timestamp).getTime();
        const endTime = new Date(bars[bars.length - 1].timestamp).getTime();
        const timeBuffer = (endTime - startTime) * 0.1; // Add 10% buffer

        setTimeRange({
          start: startTime - timeBuffer,
          end: endTime + timeBuffer
        });

        // Update chart data
        setChartData({
          bars,
          trades: [],
          positions: [],
          drawings: [],
          indicators: []
        });

        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(`Failed to load chart data: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  }, [
    sessionToken, 
    selectedBroker, 
    selectedAccountId, 
    selectedContract, 
    settings.timeframe, 
    getBarIntervalMs, 
    marketHubStatus, 
    liveQuotes, 
    startStreaming
  ]);

  // Store the function in the ref
  useEffect(() => {
    loadChartDataRef.current = loadChartData;
  }, [loadChartData]);

  // Process real-time quote updates to update chart
  useEffect(() => {
    if (!isStreaming || !liveQuotes || liveQuotes.length === 0 || !selectedContract) return;

    // Find the latest quote for our contract
    const latestQuote = liveQuotes.find(quote => quote.contractId === selectedContract);
    if (!latestQuote) return;

    // For TopStepX, build bars from real-time quotes
    if (selectedBroker === 'topstepx' && latestQuote.last !== undefined) {
      // Get current time and bar interval
      const now = new Date();
      const intervalMs = getBarIntervalMs(settings.timeframe);
      const barStartTime = new Date(Math.floor(now.getTime() / intervalMs) * intervalMs);

      console.log(`Processing quote: ${latestQuote.contractId}, Last: ${latestQuote.last}, Time: ${now.toISOString()}`);

      // Check if we need to start a new bar
      if (!currentBar || !lastBarTime || barStartTime.getTime() > lastBarTime.getTime()) {
        // Complete current bar if it exists
        if (currentBar) {
          console.log(`Completing bar: O:${currentBar.open} H:${currentBar.high} L:${currentBar.low} C:${currentBar.close}`);
          setRealtimeBars(prev => [...prev, currentBar]);
        }

        // Start a new bar
        const newBar = processQuoteIntoBar(latestQuote, barStartTime.getTime(), intervalMs);
        console.log(`Starting new bar at ${barStartTime.toISOString()}: O:${newBar.open} H:${newBar.high} L:${newBar.low} C:${newBar.close}`);

        setCurrentBar(newBar);
        setLastBarTime(barStartTime);
      } else {
        // Update the current bar
        setCurrentBar(prev => {
          if (!prev) return null;

          const updatedBar = {
            ...prev,
            high: Math.max(prev.high, latestQuote.last!),
            low: Math.min(prev.low, latestQuote.last!),
            close: latestQuote.last!,
            volume: (prev.volume || 0) + (latestQuote.volume || 0)
          };

          console.log(`Updating bar: O:${updatedBar.open} H:${updatedBar.high} L:${updatedBar.low} C:${updatedBar.close}`);
          return updatedBar;
        });
      }

      // Set latest quote for DOM display
      setLastQuoteReceived(latestQuote);
    } else if (selectedBroker !== 'topstepx' && chartData.bars.length > 0) {
      // For other brokers, just update the last bar with the latest price
      setChartData(prev => {
        const updatedBars = [...prev.bars];
        const lastBar = updatedBars[updatedBars.length - 1];

        if (!lastBar) return prev;

        const updatedLastBar = {
          ...lastBar,
          high: Math.max(lastBar.high, latestQuote.last!),
          low: Math.min(lastBar.low, latestQuote.last!),
          close: latestQuote.last!,
          volume: (lastBar.volume || 0) + (latestQuote.volume || 0)
        };

        updatedBars[updatedBars.length - 1] = updatedLastBar;

        return {
          ...prev,
          bars: updatedBars
        };
      });

      // Set latest quote for DOM display
      setLastQuoteReceived(latestQuote);
    }
  }, [liveQuotes, isStreaming, selectedContract, selectedBroker, settings.timeframe, currentBar, lastBarTime, processQuoteIntoBar, chartData.bars]);

  // Separate effect to handle price range calculations to avoid loops in drawChart
  useEffect(() => {
    // Skip if no bars to render
    if (!priceRangeNeedsUpdate.current) return;

    // Use bars from ref to avoid dependency on changing state
    const barsToCalculate = barsRef.current;
    if (barsToCalculate.length === 0) return;

    // Calculate price range
    const highValues = barsToCalculate.map(bar => bar.high);
    const lowValues = barsToCalculate.map(bar => bar.low);
    const maxPrice = Math.max(...highValues);
    const minPrice = Math.min(...lowValues);

    // Add padding to price range (10%)
    const pricePadding = (maxPrice - minPrice) * 0.1;
    const adjustedMaxPrice = maxPrice + pricePadding;
    const adjustedMinPrice = Math.max(0, minPrice - pricePadding); // Ensure we don't go below 0

    // Only update if there's a significant change (>1% difference)
    const isSignificantChange = 
      Math.abs(adjustedMaxPrice - priceRange.max) / priceRange.max > 0.01 || 
      Math.abs(adjustedMinPrice - priceRange.min) / Math.max(0.01, priceRange.min) > 0.01;

    if (isSignificantChange) {
      setPriceRange({
        max: adjustedMaxPrice,
        min: adjustedMinPrice
      });
      console.log('Updated price range:', { max: adjustedMaxPrice, min: adjustedMinPrice });
    }

    // Reset the flag after processing
    priceRangeNeedsUpdate.current = false;
  }, [priceRange]); // Only depend on priceRange for the calculation logic

  // Function to search contracts
  const handleContractSearch = useCallback(async () => {
    if (!sessionToken || !selectedBroker || !searchText.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchContracts(selectedBroker, {
        searchText: searchText.trim(),
        live: true
      });

      if (response.success && response.contracts) {
        setSearchResults(response.contracts);
      } else {
        console.error('Contract search failed:', response.errorMessage);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching contracts:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [sessionToken, selectedBroker, searchText, searchContracts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search when text changes
  useEffect(() => {
    if (searchText.trim().length >= 2) {
      const timer = setTimeout(() => {
        handleContractSearch();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchText, handleContractSearch]);

  // Function to draw a candlestick - moved up to avoid reference error
  const drawCandlestick = useCallback((ctx: CanvasRenderingContext2D, bar: HistoricalBar, x: number, width: number) => {
    if (!ctx || !bar) return;

    // Calculate y-coordinates based on price range
    const openY = ((priceRange.max - bar.open) / (priceRange.max - priceRange.min)) * chartDimensions.height;
    const highY = ((priceRange.max - bar.high) / (priceRange.max - priceRange.min)) * chartDimensions.height;
    const lowY = ((priceRange.max - bar.low) / (priceRange.max - priceRange.min)) * chartDimensions.height;
    const closeY = ((priceRange.max - bar.close) / (priceRange.max - priceRange.min)) * chartDimensions.height;

    // Determine if bullish or bearish
    const isBullish = bar.close >= bar.open;

    // Set colors based on candle direction
    const bodyColor = isBullish ? '#10B981' : '#EF4444'; // Green for bullish, Red for bearish

    // Draw the wick (high to low)
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, highY);
    ctx.lineTo(x + width / 2, lowY);
    ctx.stroke();

    // Draw the body (open to close)
    ctx.fillStyle = bodyColor;
    const bodyStart = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY)); // Ensure minimum height of 1px

    ctx.fillRect(x, bodyStart, width, bodyHeight);

    // Add outline to the body
    ctx.strokeStyle = settings.theme === 'dark' ? '#1F2937' : '#FFFFFF';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, bodyStart, width, bodyHeight);
  }, [priceRange, chartDimensions.height, settings.theme]);

  // Draw function - now drawCandlestick is defined before it's used
  const drawChart = useCallback(() => {
    const canvas = chartCanvasRef.current;

    // Use realtime bars for TopStepX, otherwise use historical data
    const barsToRender = selectedBroker === 'topstepx' && usingRealtimeData ? 
      [...realtimeBars, ...(currentBar ? [currentBar] : [])] : 
      chartData.bars;

    if (!canvas || barsToRender.length === 0) {
      console.log('📊 No bars to render, skipping drawChart');
      return;
    }

    // Update bars ref without causing re-renders
    barsRef.current = barsToRender;

    // Check if we need to update price range (but don't do it here)
    if (barsToRender.length > 0) {
      // Set the flag for the separate effect to handle
      priceRangeNeedsUpdate.current = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, chartDimensions.width, chartDimensions.height);

    // Set background
    ctx.fillStyle = settings.theme === 'dark' ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(0, 0, chartDimensions.width, chartDimensions.height);

    // Make sure canvas dimensions are valid
    if (chartDimensions.width <= 0 || chartDimensions.height <= 0) {
      console.error('Invalid chart dimensions:', chartDimensions);
      // Don't update state here - handle in a separate resize observer
      return;
    }

    // Draw grid
    if (settings.showGrid) {
      ctx.strokeStyle = settings.theme === 'dark' ? '#374151' : '#E5E7EB';
      ctx.lineWidth = 0.5;

      // Horizontal grid lines
      for (let i = 0; i <= 10; i++) {
        const y = (chartDimensions.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartDimensions.width, y);
        ctx.stroke();
      }

      // Vertical grid lines
      for (let i = 0; i <= 20; i++) {
        const x = (chartDimensions.width / 20) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartDimensions.height);
        ctx.stroke();
      }
    }

    // Log debug info less frequently to reduce console spam
    if (Math.random() < 0.05) { // Only log ~5% of the time
      console.log(`📊 Drawing ${barsToRender.length} bars on chart, type: ${settings.chartType}`);
    }

    // Draw bars/candles
    const barWidth = Math.max(1, Math.min(10, chartDimensions.width / barsToRender.length - 2));
    const barSpacing = chartDimensions.width / barsToRender.length;

    barsToRender.forEach((bar, index) => {
      const x = index * barSpacing;

      switch (settings.chartType) {
        case 'candlestick':
          drawCandlestick(ctx, bar, x, barWidth);
          break;
        case 'line':
          // Draw line chart
          if (index > 0) {
            const prevX = (index - 1) * barSpacing;
            const prevY = ((priceRange.max - barsToRender[index - 1].close) / (priceRange.max - priceRange.min)) * chartDimensions.height;
            const currentY = ((priceRange.max - bar.close) / (priceRange.max - priceRange.min)) * chartDimensions.height;

            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, currentY);
            ctx.stroke();
          }
          break;
      }
    });

    // Draw price labels on the right side
    ctx.fillStyle = settings.theme === 'dark' ? '#E5E7EB' : '#111827';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 10; i++) {
      const y = (chartDimensions.height / 10) * i;
      const price = priceRange.max - ((priceRange.max - priceRange.min) * (i / 10));
      ctx.fillText(price.toFixed(2), chartDimensions.width - 5, y + 4);
    }

    // Draw trade markers
    chartData.trades.forEach(trade => {
      // Find the bar time closest to this trade
      const tradeTime = new Date(trade.timestamp).getTime();
      const index = barsToRender.findIndex((bar, i, arr) => {
        if (i === arr.length - 1) return true; // Last bar
        const barTime = new Date(bar.timestamp).getTime();
        const nextBarTime = new Date(arr[i + 1].timestamp).getTime();
        return tradeTime >= barTime && tradeTime < nextBarTime;
      });

      if (index === -1) return;

      const x = index * barSpacing;
      const y = ((priceRange.max - trade.price) / (priceRange.max - priceRange.min)) * chartDimensions.height;

      ctx.fillStyle = trade.side === 'BUY' ? '#10B981' : '#EF4444';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw arrow
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(trade.side === 'BUY' ? '▲' : '▼', x, y + 3);
    });

    // Draw indicators
    indicators.filter(ind => ind.enabled).forEach(indicator => {
      if (indicator.data && indicator.data.length > 0) {
        ctx.strokeStyle = indicator.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        indicator.data.forEach((value, index) => {
          if (value !== null && value !== undefined) {
            const x = index * barSpacing;
            const y = ((priceRange.max - value) / (priceRange.max - priceRange.min)) * chartDimensions.height;

            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        });

        ctx.stroke();
      }
    });

    // Draw drawings
    chartData.drawings.forEach(drawing => {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.thickness;
      ctx.setLineDash(drawing.style === 'dashed' ? [5, 5] : drawing.style === 'dotted' ? [2, 2] : []);

      switch (drawing.type) {
        case 'line':
        case 'trendline':
          if (drawing.points.length >= 2) {
            ctx.beginPath();
            drawing.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.stroke();
          }
          break;
        case 'rectangle':
          if (drawing.points.length >= 2) {
            const [start, end] = drawing.points;
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
          }
          break;
        case 'circle':
          if (drawing.points.length >= 2) {
            const [center, edge] = drawing.points;
            const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;
      }

      ctx.setLineDash([]);
    });

    // Update canvas size to match container
    if (containerRef.current) {
      const container = containerRef.current;
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        setChartDimensions({ width: container.clientWidth, height: container.clientHeight });
      }
    }
  }, [
    chartData.bars,
    realtimeBars,
    currentBar,
    selectedBroker,
    usingRealtimeData,
    settings.chartType,
    settings.theme,
    settings.showGrid,
    priceRange,
    chartDimensions.width,
    chartDimensions.height,
    drawCandlestick
  ]);

  // Add a throttled effect to redraw the chart
  useEffect(() => {
    // Clear any existing timer
    if (throttleTimerRef.current !== null) {
      window.clearTimeout(throttleTimerRef.current);
    }

    // Set a new timer to redraw with a delay
    throttleTimerRef.current = window.setTimeout(() => {
      if (chartCanvasRef.current) {
        drawChart();
      }
      throttleTimerRef.current = null;
    }, 50); // 50ms throttle

    // Cleanup on unmount
    return () => {
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
      }
    };
  }, [
    chartData.bars,
    realtimeBars,
    currentBar,
    settings.chartType,
    priceRange,
    chartDimensions,
    drawChart
  ]);

  // Replace the direct call to loadChartData with a throttled version
  useEffect(() => {
    // Don't run if no input criteria are set
    if (!selectedContract || !sessionToken || !selectedBroker) return;

    // Add a small delay before loading to prevent rapid consecutive calls
    const loadTimer = setTimeout(() => {
      if (loadChartDataRef.current) {
        loadChartDataRef.current();
      }
    }, 100);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [
    // Only essential dependencies that should trigger a reload
    selectedContract,
    sessionToken,
    selectedBroker,
    settings.timeframe
    // loadChartData removed from dependencies to prevent infinite loop
  ]);

  // Auto-start streaming when conditions are met
  useEffect(() => {
    if (selectedContract && marketHubStatus === 'connected' && !isStreaming && usingRealtimeData) {
      // Auto-start streaming after chart data is loaded or when in real-time mode
      console.log(`🔄 Auto-starting streaming for ${selectedContract}`);
      if (startStreamingRef.current) {
        startStreamingRef.current();
      }
    }
  }, [selectedContract, marketHubStatus, isStreaming, usingRealtimeData]);

  // Effect to trigger drawChart whenever relevant data changes
  useEffect(() => {
    if (chartCanvasRef.current) {
      drawChart();
    }
  }, [drawChart, chartData.bars, realtimeBars, currentBar, settings.chartType, chartDimensions]);

  // Initialize chart
  useEffect(() => {
    if (contractId) {
      setSelectedContract(contractId);
    }
  }, [contractId]);

  // Clear realtime bars when timeframe changes
  useEffect(() => {
    if (selectedBroker === 'topstepx') {
      setRealtimeBars([]);
      setCurrentBar(null);
      setLastBarTime(null);
    }
  }, [settings.timeframe, selectedBroker]);

  useEffect(() => {
    // Use the ref to avoid dependency on loadChartData function
    if (loadChartDataRef.current) {
      loadChartDataRef.current();
    }
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setChartDimensions({ width: width - (showDOM ? 300 : 0), height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, showDOM]);

  // Mouse event handlers for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTool) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newDrawing: DrawingTool = {
      type: selectedTool,
      points: [{ x, y }],
      color: '#3B82F6',
      style: 'solid',
      thickness: 2,
      id: `drawing_${Date.now()}`
    };

    setCurrentDrawing(newDrawing);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentDrawing) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const updatedDrawing = {
      ...currentDrawing,
      points: currentDrawing.points.length === 1 
        ? [...currentDrawing.points, { x, y }]
        : [...currentDrawing.points.slice(0, -1), { x, y }]
    };

    setCurrentDrawing(updatedDrawing);
  };

  const handleMouseUp = () => {
    if (currentDrawing && isDrawing) {
      setChartData(prev => ({
        ...prev,
        drawings: [...prev.drawings, currentDrawing]
      }));
    }

    setIsDrawing(false);
    setCurrentDrawing(null);
    setSelectedTool(null);
  };

  // Indicator management
  const addIndicator = (indicator: Indicator) => {
    setIndicators(prev => [...prev, indicator]);
  };

  const removeIndicator = (id: string) => {
    setIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    ));
  };

  // Process real-time trade updates
  useEffect(() => {
    if (!isStreaming || !liveMarketTrades || liveMarketTrades.length === 0) return;

    // Filter trades for our contract
    const contractTrades = liveMarketTrades.filter(trade => trade.contractId === selectedContract);
    if (contractTrades.length === 0) return;

    // Add new trades to chart data
    setChartData(prev => ({
      ...prev,
      trades: [...contractTrades.map(trade => ({
        id: `${trade.contractId}-${trade.timestamp}`,
        contractId: trade.contractId!,
        side: trade.side || 'BUY',
        size: trade.size || 0,
        price: trade.price || 0,
        timestamp: trade.timestamp || new Date().toISOString(),
        accountId: selectedAccountId || ''
      })), ...prev.trades.slice(0, 50)] // Keep last 50 trades
    }));
  }, [liveMarketTrades, isStreaming, selectedContract, selectedAccountId]);

  // Auto-stop streaming when component unmounts or contract changes
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStreaming();
      }
    };
  }, [selectedContract, isStreaming, stopStreaming]); // Add dependencies

  return (
    <div className="space-y-4">
      {/* Chart Header with Contract Dropdown */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 relative">
          <div className="relative">
            <input
              type="text"
              value={searchText || selectedContract}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowDropdown(true);
              }}
              onClick={() => setShowDropdown(true)}
              placeholder="Enter contract symbol (e.g., ES, NQ)"
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 w-64"
              disabled={!sessionToken || !selectedBroker}
            />
            <button
              className="absolute right-2 top-2 text-gray-400"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              ▼
            </button>

            {/* Dropdown for contracts */}
            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto"
              >
                {/* Popular contracts section */}
                <div className="p-2 border-b border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Popular Contracts</h3>
                  <div className="flex flex-wrap gap-1">
                    {popularContracts.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => {
                          setSelectedContract(symbol);
                          setSearchText(symbol);
                          setShowDropdown(false);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search results */}
                <div className="p-2">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    {isSearching ? 'Searching...' : 'Search Results'}
                  </h3>
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map(contract => (
                        <div
                          key={contract.id}
                          onClick={() => {
                            setSelectedContract(contract.id);
                            setSearchText(contract.name);
                            setShowDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <div className="text-white font-medium">{contract.name}</div>
                          <div className="text-gray-400 text-xs">{contract.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : searchText.trim().length >= 2 && !isSearching ? (
                    <div className="text-gray-400 text-sm py-2">
                      No contracts found. Try a different search.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={loadChartData}
            disabled={isLoading || !selectedContract || !sessionToken || !selectedBroker}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load Chart'}
          </button>
          <button
            onClick={() => isStreaming ? stopStreaming() : startStreaming()}
            disabled={!selectedContract || !sessionToken || !selectedBroker || marketHubStatus !== 'connected'}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isStreaming 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${(!selectedContract || !sessionToken || !selectedBroker || marketHubStatus !== 'connected') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStreaming ? 'Stop Stream' : 'Start Stream'}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={settings.timeframe}
            onChange={(e) => setSettings(prev => ({ ...prev, timeframe: e.target.value as ChartSettings['timeframe'] }))}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            disabled={!sessionToken || !selectedBroker}
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="30m">30m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
          </select>

          <select
            value={settings.chartType}
            onChange={(e) => setSettings(prev => ({ ...prev, chartType: e.target.value as ChartSettings['chartType'] }))}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            disabled={!sessionToken || !selectedBroker}
          >
            <option value="candlestick">Candlestick</option>
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="area">Area</option>
          </select>
        </div>
      </div>

      {/* Debug Info - Fixed syntax */}
      {usingRealtimeData && lastQuoteReceived && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs font-mono">
          <div className="text-green-400">Last Quote: {new Date().toISOString()}</div>
          <div>Contract: {lastQuoteReceived.contractId}</div>
          <div>Last: {lastQuoteReceived.last}, Bid: {lastQuoteReceived.bid}, Ask: {lastQuoteReceived.ask}</div>
          <div>Bars: {realtimeBars.length}, Current Bar: {currentBar ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="text-red-400">❌</div>
            <div>
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* TopStepX Real-Time Mode Information */}
      {usingRealtimeData && sessionToken && selectedBroker === 'topstepx' && marketHubStatus === 'connected' && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-green-400 mt-1">📊</div>
            <div className="flex-1">
              <div className="font-medium mb-2">Real-Time Chart Mode</div>
              <div className="text-sm">
                Building chart from live market data stream. Charts will populate as new price data arrives.
                {realtimeBars.length > 0 && ` Currently showing ${realtimeBars.length} bars.`}
              </div>
              <div className="text-xs mt-2 text-green-300">
                No ProjectX API subscription needed. Your TopStepX account already has access to real-time data through the Market Hub.
              </div>
            </div>
          </div>
        </div>
      )}

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
                  : marketHubStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
              }`}></div>
              <div>
                <div className={`font-medium ${
                  marketHubStatus === 'connected' 
                    ? 'text-green-400' 
                    : marketHubStatus === 'connecting'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  Market Hub ({selectedBroker === 'projectx' ? 'ProjectX' : 'TopstepX'})
                </div>
                <div className="text-sm text-gray-300">
                  {marketHubStatus === 'connected' 
                    ? `Real-time data streaming ${isStreaming ? 'active' : 'available'}` 
                    : marketHubStatus === 'connecting'
                    ? 'Connecting to real-time data...'
                    : 'Real-time data unavailable - Connect in Broker Connect tab'
                  }
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

      {/* Drawing Toolbar */}
      {showToolbar && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-white font-medium">Drawing Tools:</h3>

            {['line', 'rectangle', 'circle', 'trendline', 'fibonacci', 'support', 'resistance'].map(tool => (
              <button
                key={tool}
                onClick={() => setSelectedTool(selectedTool === tool ? null : tool as DrawingTool['type'])}
                disabled={!sessionToken || !selectedBroker}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  selectedTool === tool
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                } ${(!sessionToken || !selectedBroker) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tool.charAt(0).toUpperCase() + tool.slice(1)}
              </button>
            ))}

            <button
              onClick={() => setChartData(prev => ({ ...prev, drawings: [] }))}
              disabled={!sessionToken || !selectedBroker}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Drawings
            </button>

            <button
              onClick={() => setShowIndicatorModal(true)}
              disabled={!sessionToken || !selectedBroker}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Indicator
            </button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="flex space-x-4">
        {/* Main Chart */}
        <div ref={containerRef} className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={chartCanvasRef}
                width={chartDimensions.width}
                height={chartDimensions.height}
                className="absolute top-0 left-0"
              />
              <canvas
                ref={overlayCanvasRef}
                width={chartDimensions.width}
                height={chartDimensions.height}
                className="absolute top-0 left-0 cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />

              {/* Chart Info Overlay */}
              <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded">
                <div className="text-sm">
                  <div>{selectedContract}</div>
                  <div>{settings.timeframe} • {settings.chartType}</div>
                  {(() => {
                    const barsToDisplay = selectedBroker === 'topstepx' ? 
                      [...realtimeBars, ...(currentBar ? [currentBar] : [])] : 
                      chartData.bars;
                    const lastBar = barsToDisplay[barsToDisplay.length - 1];
                    return lastBar ? (
                      <div>
                        O: {lastBar.open.toFixed(2)} |
                        H: {lastBar.high.toFixed(2)} |
                        L: {lastBar.low.toFixed(2)} |
                        C: {lastBar.close.toFixed(2)}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="absolute top-4 right-4 bg-green-600 text-white px-2 py-1 rounded text-sm flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  LIVE
                </div>
              )}
            </div>
          )}
        </div>

        {/* DOM Panel */}
        {showDOM && (
          <div className="w-72 bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">Depth of Market</h3>

            {marketDepth ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                  <div>Size</div>
                  <div>Price</div>
                  <div>Orders</div>
                </div>

                {/* Asks */}
                <div className="space-y-1">
                  {marketDepth.asks.slice(0, domSize).reverse().map((ask, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-white">{ask.size}</div>
                      <div className="text-red-400 font-medium">{ask.price.toFixed(2)}</div>
                      <div className="text-gray-400">{ask.orders}</div>
                    </div>
                  ))}
                </div>

                {/* Spread */}
                <div className="border-t border-b border-gray-600 py-2 text-center">
                  <div className="text-yellow-400 font-medium">
                    Spread: {((marketDepth.asks[0]?.price || 0) - (marketDepth.bids[0]?.price || 0)).toFixed(2)}
                  </div>
                </div>

                {/* Bids */}
                <div className="space-y-1">
                  {marketDepth.bids.slice(0, domSize).map((bid, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-white">{bid.size}</div>
                      <div className="text-green-400 font-medium">{bid.price.toFixed(2)}</div>
                      <div className="text-gray-400">{bid.orders}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm text-center py-8">
                Connect to view DOM data
              </div>
            )}

            {/* DOM Controls */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">DOM Size:</span>
                <select
                  value={domSize}
                  onChange={(e) => setDomSize(Number(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded transition-colors">
                Enable Chart Trading
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Indicator List */}
      {indicators.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4">Active Indicators</h3>
          <div className="space-y-2">
            {indicators.map(indicator => (
              <div key={indicator.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: indicator.color }}
                  ></div>
                  <span className="text-white">{indicator.name}</span>
                  <span className="text-gray-400 text-sm">({indicator.language})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleIndicator(indicator.id)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      indicator.enabled
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }`}
                  >
                    {indicator.enabled ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={() => removeIndicator(indicator.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicator Modal */}
      <IndicatorModal
        isOpen={showIndicatorModal}
        onClose={() => setShowIndicatorModal(false)}
        onAddIndicator={addIndicator}
      />
    </div>
  );
};

export default Chart;
