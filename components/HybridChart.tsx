import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { getHistoricalData } from '../services/tradingApiService';
import { HistoricalBar, QuoteData } from '../types';
import LoadingSpinner from './LoadingSpinner';

// Chart settings types
interface ChartSettings {
  chartType: 'candlestick' | 'line';
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  showVolume: boolean;
  preferRealtime: boolean; // Prefer real-time data over historical when available
}

interface HybridChartProps {
  contractId?: string;
  height?: number;
  showDOM?: boolean;
  showToolbar?: boolean;
}

/**
 * HybridChart Component
 * An enhanced chart component that can fallback to real-time data when
 * historical data is not available (especially for TopstepX)
 */
const HybridChart: React.FC<HybridChartProps> = ({ 
  contractId, 
  height = 600
  // showDOM and showToolbar are defined in props but not used in this implementation
}) => {
  // Protection against Web3 provider interactions
  useEffect(() => {
    // Prevent unintended interactions with inpage.js (MetaMask/Web3 providers)
    const disableWeb3Injection = () => {
      // Store original ethereum if it exists
      const originalEthereum = window.ethereum;

      // Define a protected property to intercept Web3 provider access attempts
      Object.defineProperty(window, 'ethereum', {
        get: function() {
          // Only return ethereum object if explicitly requested by our app
          // This prevents unintended access from chart libraries or other components
          const stack = new Error().stack || '';
          if (stack.includes('pytradecraft') && !stack.includes('chart')) {
            return originalEthereum;
          }
          return null;
        },
        set: function(val) {
          // Allow setting but keep our reference updated
          originalEthereum = val;
        },
        configurable: true
      });

      // Also intercept any message channel related to web3
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin, transfer) {
        // Only pass through messages that aren't related to web3/wallet connections
        if (typeof message === 'object' && message !== null) {
          if (message.type && (
              String(message.type).includes('WALLET_') ||
              String(message.type).includes('web3') ||
              String(message.type).includes('metamask')
          )) {
            // Block these messages to prevent errors
            console.debug('Blocked web3-related message:', message.type);
            return;
          }
        }
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      };
    };

    // Execute the protection
    disableWeb3Injection();

    // Cleanup function
    return () => {
      // Restore original behavior when component unmounts
      delete window.ethereum;
      window.postMessage = window.originalPostMessage || window.postMessage;
    };
  }, []);

  const {
    sessionToken, 
    selectedBroker, 
    selectedAccountId,
    marketHubStatus,
    subscribeToMarketData,
    unsubscribeFromMarketData,
    liveQuotes
  } = useTradingContext();

  // Chart state
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    chartType: 'candlestick',
    timeframe: '5m',
    showVolume: true,
    preferRealtime: selectedBroker === 'topstepx' // Auto-enable for TopstepX
  });

  const [selectedContract, setSelectedContract] = useState<string>(contractId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Historical chart data
  const [historicalBars, setHistoricalBars] = useState<HistoricalBar[]>([]);

  // Real-time chart data
  const [realtimeBars, setRealtimeBars] = useState<HistoricalBar[]>([]);
  const [currentBar, setCurrentBar] = useState<HistoricalBar | null>(null);
  const [lastBarTime, setLastBarTime] = useState<Date | null>(null);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [dataMode, setDataMode] = useState<'historical' | 'realtime' | 'hybrid'>('historical');

  // Canvas refs
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Chart dimensions
  const [chartDimensions, setChartDimensions] = useState({ 
    width: 800, 
    height: height - 100 // Leave room for controls
  });

  // Price range for scaling
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });

  /**
   * Helper to get milliseconds for the selected timeframe
   */
  const getTimeframeMs = useCallback((): number => {
    switch (chartSettings.timeframe) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      case '1w': return 7 * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }, [chartSettings.timeframe]);

  /**
   * Start streaming market data
   */
  const startStreaming = useCallback(async () => {
    if (!selectedContract || marketHubStatus !== 'connected') {
      setError('Cannot stream market data: Either contract not selected or market hub not connected');
      return;
    }

    try {
      setIsStreaming(true);
      console.log(`🔄 Starting market data stream for ${selectedContract}...`);

      // Subscribe to market data for the selected contract
      await subscribeToMarketData(selectedContract);

      // Clear current real-time data when starting fresh
      setRealtimeBars([]);
      setCurrentBar(null);
      setLastBarTime(null);

      setInfo('Real-time market data streaming active');
    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError(`Failed to start streaming: ${err instanceof Error ? err.message : String(err)}`);
      setIsStreaming(false);
    }
  }, [selectedContract, marketHubStatus, subscribeToMarketData]);

  /**
   * Stop streaming market data
   */
  const stopStreaming = useCallback(async () => {
    if (!isStreaming) return;

    try {
      await unsubscribeFromMarketData();
      setIsStreaming(false);
      setInfo('Real-time market data streaming stopped');
    } catch (err) {
      console.error('Failed to stop streaming:', err);
      // Force to false even if there was an error
      setIsStreaming(false);
    }
  }, [isStreaming, unsubscribeFromMarketData]);

  // Refs to track current state without causing re-renders
  const currentBarRef = useRef<HistoricalBar | null>(null);
  const lastBarTimeRef = useRef<Date | null>(null);

  // Update refs when state changes
  useEffect(() => {
    currentBarRef.current = currentBar;
    lastBarTimeRef.current = lastBarTime;
  }, [currentBar, lastBarTime]);

  /**
   * Process a real-time quote into a candlestick bar
   */  
  const processQuote = useCallback((quote: QuoteData) => {
    // Skip if we don't have a valid price
    if (!quote.bidPrice && !quote.askPrice && !quote.lastPrice) return;

    // Use last price if available, otherwise mid price
    const price = quote.lastPrice || ((quote.bidPrice || 0) + (quote.askPrice || 0)) / 2;

    // Skip if no valid price
    if (!price) return;

    const now = new Date();
    const intervalMs = getTimeframeMs();
    const barStartTime = new Date(Math.floor(now.getTime() / intervalMs) * intervalMs);

    // If we don't have a current bar or this is a new bar period
    if (!currentBarRef.current || !lastBarTimeRef.current || barStartTime.getTime() > lastBarTimeRef.current.getTime()) {
      // Save the current bar if it exists
      if (currentBarRef.current) {
        setRealtimeBars(prev => [...prev, currentBarRef.current!]);
      }
        // Create a new bar
      const newBar: HistoricalBar = {
        timestamp: barStartTime.toISOString(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1 // Use a placeholder volume since QuoteData doesn't have volume
      };

      setCurrentBar(newBar);
      setLastBarTime(barStartTime);

    } else {
      // Update the current bar
      setCurrentBar(prev => {
        if (!prev) return null;
          return {
          ...prev,
          high: Math.max(prev.high, price),
          low: Math.min(prev.low, price),
          close: price,
          volume: (prev.volume || 0) + 1 // Increment volume by 1 for each update
        };
      });
    }
  }, [getTimeframeMs]); // Remove currentBar and lastBarTime from dependencies

  /**
   * Load historical chart data
   */
  const loadHistoricalData = useCallback(async () => {
    if (!selectedContract || !sessionToken || !selectedBroker || !selectedAccountId) {
      setError('Missing required parameters (contract, session, broker, account)');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setInfo(null);

      // Format timeframe for API
      const interval = chartSettings.timeframe
        .replace('m', 'min')
        .replace('h', 'hour')
        .replace('d', 'day')
        .replace('w', 'week');

      // For TopstepX, show info about potential limitations
      if (selectedBroker === 'topstepx') {
        setInfo('TopstepX historical data requires ProjectX API access. Will attempt to load data, but may fall back to real-time data only.');
      }      // Get historical data
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Get 30 days of data

      const response = await getHistoricalData(
        selectedBroker,
        sessionToken,
        {
          contractId: selectedContract,
          startDate: startDate.toISOString(),
          endDate: endDate,
          interval: interval,
          includeAfterHours: true
        }
      );

      if (!response.success) {
        setHistoricalBars([]);

        // Special handling for TopstepX to automatically fall back to real-time data
        if (selectedBroker === 'topstepx' && marketHubStatus === 'connected') {
          setError('Historical data not available. Falling back to real-time data only.');
          setDataMode('realtime');

          // Auto-start streaming if not already
          if (!isStreaming) {
            await startStreaming();
          }
        } else {
          setError(`Failed to load historical data: ${response.errorMessage || 'Unknown error'}`);
          setDataMode('historical');
        }

        setIsLoading(false);
        return;
      }

      if (!response.bars || response.bars.length === 0) {
        setHistoricalBars([]);
        setError('No historical data available for the selected contract');

        // Fall back to real-time if appropriate
        if (chartSettings.preferRealtime && marketHubStatus === 'connected') {
          setDataMode('realtime');
          if (!isStreaming) {
            await startStreaming();
          }
        } else {
          setDataMode('historical');
        }

        setIsLoading(false);
        return;
      }

      // Success - we have historical data
      setHistoricalBars(response.bars);
      setDataMode(chartSettings.preferRealtime ? 'hybrid' : 'historical');

      // Calculate price range for scaling
      const highValues = response.bars.map(bar => bar.high);
      const lowValues = response.bars.map(bar => bar.low);
      const maxPrice = Math.max(...highValues);
      const minPrice = Math.min(...lowValues);

      // Add padding (10%)
      const padding = (maxPrice - minPrice) * 0.1;
      setPriceRange({
        max: maxPrice + padding,
        min: Math.max(0, minPrice - padding) // Ensure we don't go below 0
      });

      setInfo(`Loaded ${response.bars.length} historical bars`);

      // Start streaming if we're in hybrid mode
      if (chartSettings.preferRealtime && marketHubStatus === 'connected') {
        if (!isStreaming) {
          await startStreaming();
        }
      }

    } catch (err) {
      console.error('Error loading historical data:', err);
      setError(`Failed to load historical data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedContract, 
    sessionToken, 
    selectedBroker, 
    selectedAccountId, 
    chartSettings.timeframe,
    chartSettings.preferRealtime,
    marketHubStatus,
    isStreaming,
    startStreaming
  ]);

  // Ref to track the last time we updated the price range
  const lastPriceUpdateRef = useRef<number>(0);

  /**
   * Calculate price range based on bars - with debounce to prevent too frequent updates
   */
  useEffect(() => {
    // Debounce price range updates to prevent excessive re-renders
    // Only update price range if it's been at least 500ms since the last update
    const now = Date.now();
    if (now - lastPriceUpdateRef.current < 500 && lastPriceUpdateRef.current !== 0) {
      return;
    }

    // Determine which bars to use based on data mode
    let barsToRender: HistoricalBar[] = [];

    if (dataMode === 'historical') {
      barsToRender = historicalBars;
    } else if (dataMode === 'realtime') {
      barsToRender = [...realtimeBars];
      if (currentBar) barsToRender.push(currentBar);
    } else if (dataMode === 'hybrid') {
      barsToRender = [...historicalBars, ...realtimeBars];
      if (currentBar) barsToRender.push(currentBar);
    }

    if (barsToRender.length === 0) return;

    // Calculate updated price range
    const highValues = barsToRender.map(bar => bar.high);
    const lowValues = barsToRender.map(bar => bar.low);
    const maxPrice = Math.max(...highValues);
    const minPrice = Math.min(...lowValues);

    // Add padding (10%)
    const padding = (maxPrice - minPrice) * 0.1;
    setPriceRange({
      max: maxPrice + padding,
      min: Math.max(0, minPrice - padding) // Ensure we don't go below 0
    });

    // Update the last update timestamp
    lastPriceUpdateRef.current = now;
  }, [dataMode, historicalBars, realtimeBars, currentBar]);

  /**
   * Memoize the drawChart dependencies to prevent unnecessary re-renders
   */
  const memoizedChartData = useMemo(() => {
    return {
      historicalBars,
      realtimeBars,
      currentBar,
      dataMode,
      chartType: chartSettings.chartType,
      showVolume: chartSettings.showVolume
    };
  }, [historicalBars, realtimeBars, currentBar, dataMode, chartSettings.chartType, chartSettings.showVolume]);

  /**
   * Draw the chart on canvas
   */
  const drawChart = useCallback(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    canvas.width = chartDimensions.width;
    canvas.height = chartDimensions.height;

    // Determine which bars to use based on data mode
    let barsToRender: HistoricalBar[] = [];

    if (memoizedChartData.dataMode === 'historical') {
      barsToRender = memoizedChartData.historicalBars;
    } else if (memoizedChartData.dataMode === 'realtime') {
      barsToRender = [...memoizedChartData.realtimeBars];
      if (memoizedChartData.currentBar) barsToRender.push(memoizedChartData.currentBar);
    } else if (memoizedChartData.dataMode === 'hybrid') {
      barsToRender = [...memoizedChartData.historicalBars, ...memoizedChartData.realtimeBars];
      if (memoizedChartData.currentBar) barsToRender.push(memoizedChartData.currentBar);
    }

    if (barsToRender.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#6B7280';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No chart data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Sort bars by timestamp if needed
    barsToRender.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Draw chart background
    ctx.fillStyle = '#1F2937'; // dark blue-gray background
    ctx.fillRect(0, 0, chartDimensions.width, chartDimensions.height);

    // Draw background grid with improved styling
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 0.5;

    // Draw horizontal grid lines (price levels) with alternating opacity
    for (let i = 0; i <= 10; i++) {
      const y = (chartDimensions.height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartDimensions.width, y);

      // Make every other line lighter for better visual hierarchy
      ctx.globalAlpha = i % 2 === 0 ? 0.8 : 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Draw vertical grid lines (time periods) with alternating opacity
    for (let i = 0; i <= 10; i++) {
      const x = (chartDimensions.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartDimensions.height);

      // Make every other line lighter for better visual hierarchy
      ctx.globalAlpha = i % 2 === 0 ? 0.8 : 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Add border to chart area
    ctx.strokeStyle = '#4B5563'; // gray-600
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, chartDimensions.width, chartDimensions.height);

    // Draw price labels
    ctx.fillStyle = '#E5E7EB'; // gray-200
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 10; i++) {
      const y = (chartDimensions.height / 10) * i;
      const price = priceRange.max - ((priceRange.max - priceRange.min) * (i / 10));
      ctx.fillText(price.toFixed(2), chartDimensions.width - 5, y + 4);
    }

    // Draw bars/candles
    const totalBars = barsToRender.length;

    // Adjust bar width based on timeframe and available data
    let timeframeMultiplier = 1;
    switch (chartSettings.timeframe) {
      case '1m': timeframeMultiplier = 0.6; break; // Thinner bars for 1-minute timeframe (high frequency)
      case '5m': timeframeMultiplier = 0.8; break;
      case '15m': timeframeMultiplier = 1.0; break;
      case '30m': timeframeMultiplier = 1.1; break;
      case '1h': timeframeMultiplier = 1.2; break;
      case '4h': timeframeMultiplier = 1.3; break;
      case '1d': timeframeMultiplier = 1.4; break;
      case '1w': timeframeMultiplier = 1.6; break; // Wider bars for weekly timeframe (low frequency)
    }

    // Calculate optimal bar width based on available space and timeframe
    const optimalBarWidth = (chartDimensions.width / totalBars) * 0.8; // 80% of available space per bar
    const barWidth = Math.max(2, Math.min(16, optimalBarWidth * timeframeMultiplier)); // Constrain between 2 and 16 pixels
    const barSpacing = chartDimensions.width / Math.max(totalBars, 1);

    // Calculate wick width based on bar width
    const wickWidth = Math.max(1, barWidth * 0.1);

    barsToRender.forEach((bar, index) => {
      const x = index * barSpacing;
      const centerX = x + barSpacing / 2; // Center point for the candlestick

      if (memoizedChartData.chartType === 'candlestick') {
        // Calculate screen Y coordinates for OHLC values
        const open = ((priceRange.max - bar.open) / (priceRange.max - priceRange.min)) * chartDimensions.height;
        const close = ((priceRange.max - bar.close) / (priceRange.max - priceRange.min)) * chartDimensions.height;
        const high = ((priceRange.max - bar.high) / (priceRange.max - priceRange.min)) * chartDimensions.height;
        const low = ((priceRange.max - bar.low) / (priceRange.max - priceRange.min)) * chartDimensions.height;

        // Determine if candle is bullish (up) or bearish (down)
        const isUp = bar.close >= bar.open;

        // Set colors based on candle direction with improved contrast
        const wickColor = isUp ? '#E5E7EB' : '#D1D5DB'; // Lighter wicks for bullish, darker for bearish
        const baseColor = isUp ? '#10B981' : '#EF4444'; // Green for bullish, red for bearish
        const borderColor = isUp ? '#059669' : '#DC2626'; // Darker borders for definition

        // Draw upper and lower wicks with smooth anti-aliasing
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = wickWidth;
        ctx.lineCap = 'round'; // Round line caps for smoother wicks

        // Reset any shadows from previous drawing operations
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw upper wick if exists (if high > max(open, close))
        const upperWickTop = high;
        const upperWickBottom = Math.min(open, close);
        if (upperWickBottom > upperWickTop) { // Only draw if there is a wick
          ctx.beginPath();
          ctx.moveTo(centerX, upperWickTop);
          ctx.lineTo(centerX, upperWickBottom);
          ctx.stroke();
        }

        // Draw lower wick if exists (if low < min(open, close))
        const lowerWickTop = Math.max(open, close);
        const lowerWickBottom = low;
        if (lowerWickTop < lowerWickBottom) { // Only draw if there is a wick
          ctx.beginPath();
          ctx.moveTo(centerX, lowerWickTop);
          ctx.lineTo(centerX, lowerWickBottom);
          ctx.stroke();
        }

        // Calculate body dimensions with proper positioning
        const bodyTop = Math.min(open, close);
        const bodyBottom = Math.max(open, close);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop); // Ensure at least 1px height for visibility
        const bodyX = centerX - barWidth / 2;

        // Add subtle shadow for depth perception
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0.5;
        ctx.shadowOffsetY = 0.5;

        // Fill body
        ctx.fillStyle = baseColor;
        ctx.fillRect(bodyX, bodyTop, barWidth, bodyHeight);

        // Add border for definition
        ctx.shadowColor = 'transparent'; // Disable shadow for border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.5; // Thin border
        ctx.strokeRect(bodyX, bodyTop, barWidth, bodyHeight);

        // Draw doji line for very small bodies (when open and close are nearly equal)
        if (bodyHeight < 0.5 && barWidth > 3) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bodyX - 1, bodyTop);
          ctx.lineTo(bodyX + barWidth + 1, bodyTop);
          ctx.stroke();
        }

      } else if (memoizedChartData.chartType === 'line') {
        // Draw enhanced line chart
        if (index > 0) {
          const prevX = (index - 1) * barSpacing;
          const prevY = ((priceRange.max - barsToRender[index - 1].close) / (priceRange.max - priceRange.min)) * chartDimensions.height;
          const currentY = ((priceRange.max - bar.close) / (priceRange.max - priceRange.min)) * chartDimensions.height;

          // Create gradient for line
          const gradient = ctx.createLinearGradient(prevX, prevY, x, currentY);
          gradient.addColorStop(0, '#3B82F6'); // blue-500
          gradient.addColorStop(1, '#60A5FA'); // blue-400

          // Add shadow for depth
          ctx.shadowColor = 'rgba(59, 130, 246, 0.5)'; // blue with opacity
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Draw line with gradient
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prevX + barWidth / 2, prevY);
          ctx.lineTo(x + barWidth / 2, currentY);
          ctx.stroke();

          // Reset shadow
          ctx.shadowColor = 'transparent';

          // Draw point at current price for emphasis (only for last few points)
          if (index > barsToRender.length - 5) {
            ctx.fillStyle = '#60A5FA'; // blue-400
            ctx.beginPath();
            ctx.arc(x + barWidth / 2, currentY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Add highlight for current point
            if (index === barsToRender.length - 1) {
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(x + barWidth / 2, currentY, 4, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }

      // Draw enhanced volume bars if enabled
      if (memoizedChartData.showVolume && bar.volume) {
        const maxVolume = Math.max(1, Math.max(...barsToRender.map(b => b.volume || 0)));
        const volHeight = ((bar.volume / maxVolume) * (chartDimensions.height * 0.1));

        // Determine if bar is up or down
        const isUp = bar.close >= bar.open;

        // Create gradient for volume bars
        const gradient = ctx.createLinearGradient(
          x, 
          chartDimensions.height - volHeight, 
          x, 
          chartDimensions.height
        );

        if (isUp) {
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');  // green-500 with opacity
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');  // green-500 with less opacity
        } else {
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');   // red-500 with opacity
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');   // red-500 with less opacity
        }

        // Fill with gradient
        ctx.fillStyle = gradient;

        // Draw volume bar with rounded top
        const barX = x;
        const barY = chartDimensions.height - volHeight;
        const radius = Math.min(barWidth / 2, 2); // Radius for rounded corners

        ctx.beginPath();
        ctx.moveTo(barX + radius, barY);
        ctx.lineTo(barX + barWidth - radius, barY);
        ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
        ctx.lineTo(barX + barWidth, chartDimensions.height);
        ctx.lineTo(barX, chartDimensions.height);
        ctx.lineTo(barX, barY + radius);
        ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
        ctx.closePath();
        ctx.fill();

        // Add subtle border
        ctx.strokeStyle = isUp ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // Add data mode indicator with semi-transparent background
    ctx.fillStyle = 'rgba(31, 41, 55, 0.7)'; // dark background with opacity
    ctx.fillRect(5, 5, 200, isStreaming ? 60 : 30); // Background for status text

    ctx.fillStyle = '#D1D5DB'; // gray-300 - brighter text
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    const modeText = memoizedChartData.dataMode === 'historical' 
      ? 'Historical Data' 
      : memoizedChartData.dataMode === 'realtime'
        ? 'Real-time Data Only'
        : 'Hybrid: Historical + Real-time';

    ctx.fillText(modeText, 10, 20);

    // Show streaming status if active with pulsing effect
    if (isStreaming) {
      // Create pulsing effect for live indicator
      const now = Date.now();
      const pulse = Math.sin(now / 300) * 0.3 + 0.7; // Pulsing opacity between 0.4 and 1.0

      ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`; // green-500 with pulsing opacity
      ctx.fillText('● Live', 10, 40);

      // Add timestamp of last update
      ctx.fillStyle = '#9CA3AF'; // gray-400
      ctx.fillText(`Last update: ${new Date().toLocaleTimeString()}`, 10, 58);
    }

  }, [
    chartDimensions, 
    memoizedChartData, 
    priceRange,
    isStreaming
  ]);

  /**
   * Process incoming quotes to update real-time bars
   */
  useEffect(() => {
    if (!isStreaming || !selectedContract) return;

    // Find quotes for our contract
    const quote = liveQuotes.find(q => q.contractId === selectedContract);
    if (!quote) return;

    // Process quote into bars
    processQuote(quote);

  }, [isStreaming, selectedContract, liveQuotes, processQuote]);

  /**
   * Draw chart when data or settings change
   */
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  /**
   * Handle resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        const { width } = chartContainerRef.current.getBoundingClientRect();
        setChartDimensions(prev => ({ ...prev, width }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Initialize with contract id if provided
   */
  useEffect(() => {
    if (contractId) {
      setSelectedContract(contractId);
    }
  }, [contractId]);

  /**
   * Monitor market hub connection status and restart streaming if needed
   */
  useEffect(() => {
    // If market hub reconnects and we were previously streaming, restart streaming
    if (marketHubStatus === 'connected' && !isStreaming && selectedContract && chartSettings.preferRealtime) {
      console.log('Market hub reconnected, restarting streaming...');
      startStreaming().catch(err => {
        console.error('Failed to restart streaming after reconnection:', err);
        setError(`Failed to restart streaming: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    // If market hub disconnects while streaming, show error
    if (marketHubStatus !== 'connected' && isStreaming) {
      setIsStreaming(false);
      setError('Market hub disconnected. Streaming paused. Will resume when connection is restored.');
    }
  }, [marketHubStatus, isStreaming, selectedContract, chartSettings.preferRealtime, startStreaming]);

  /**
   * Clean up streaming on unmount
   */
  useEffect(() => {
    return () => {
      if (isStreaming) {
        unsubscribeFromMarketData().catch(console.error);
      }
    };
  }, [isStreaming, unsubscribeFromMarketData]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex flex-col space-y-4">
        {/* Settings and controls */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              placeholder="Enter contract ID"
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white w-36"
            />

            <select
              value={chartSettings.timeframe}
              onChange={(e) => setChartSettings(prev => ({ 
                ...prev, 
                timeframe: e.target.value as ChartSettings['timeframe'] 
              }))}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
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
              value={chartSettings.chartType}
              onChange={(e) => setChartSettings(prev => ({ 
                ...prev, 
                chartType: e.target.value as ChartSettings['chartType'] 
              }))}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
            >
              <option value="candlestick">Candlestick</option>
              <option value="line">Line</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={chartSettings.preferRealtime}
                onChange={(e) => setChartSettings(prev => ({
                  ...prev,
                  preferRealtime: e.target.checked
                }))}
                className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
              />
              <span>Prefer real-time data</span>
            </label>

            <label className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={chartSettings.showVolume}
                onChange={(e) => setChartSettings(prev => ({
                  ...prev,
                  showVolume: e.target.checked
                }))}
                className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
              />
              <span>Show volume</span>
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={loadHistoricalData}
              disabled={isLoading || !selectedContract || !sessionToken}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Load Chart'}
            </button>

            <button
              onClick={isStreaming ? stopStreaming : startStreaming}
              disabled={!selectedContract || marketHubStatus !== 'connected'}
              className={`px-4 py-2 rounded-md transition-colors ${
                isStreaming 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:bg-gray-600`}
            >
              {isStreaming ? 'Stop Stream' : 'Start Stream'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
            {error}

            {selectedBroker === 'topstepx' && error.includes('Historical data not available') && (
              <div className="mt-2 text-sm">
                <p>
                  <strong>Note:</strong> TopstepX historical data requires a ProjectX API subscription.
                </p>
                <p className="mt-1">
                  Options: 1) Subscribe to ProjectX API ($14.50-$29/month), or 2) Use real-time data streaming instead.
                </p>
              </div>
            )}
          </div>
        )}

        {info && (
          <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-md">
            {info}
          </div>
        )}

        {/* Chart canvas */}
        <div 
          ref={chartContainerRef}
          className="relative bg-gray-900 border border-gray-700 rounded-md overflow-hidden"
          style={{ height: chartDimensions.height }}
        >
          <canvas
            ref={chartCanvasRef}
            width={chartDimensions.width}
            height={chartDimensions.height}
            className="w-full h-full"
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
              <LoadingSpinner />
            </div>
          )}
        </div>

        {/* Data stats */}
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-300">
          <div>
            <span className="font-medium">Data Mode:</span>{" "}
            {dataMode === 'historical' ? 'Historical Only' : 
             dataMode === 'realtime' ? 'Real-time Only' :
             'Hybrid (Historical + Real-time)'}
          </div>
          <div>
            <span className="font-medium">Historical Points:</span>{" "}
            {historicalBars.length}
          </div>
          <div>
            <span className="font-medium">Real-time Points:</span>{" "}
            {realtimeBars.length + (currentBar ? 1 : 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HybridChart;
