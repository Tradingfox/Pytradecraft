import React, { useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  SeriesMarker,
  Time,
  UTCTimestamp,
  DeepPartial,
  ChartOptions,
  ColorType,
  SeriesOptionsMap,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
  PriceLineOptions,
  PriceLine,
  IPriceLine,
} from 'lightweight-charts';
import { HistoricalBar, Order, Position } from '../types'; // Assuming HistoricalBar matches CandlestickData structure somewhat

// Helper to convert HistoricalBar to CandlestickData
const adaptHistoricalBarToCandlestickData = (bar: HistoricalBar): CandlestickData | null => {
  // Validate required OHLC values
  if (bar.open === null || bar.open === undefined ||
      bar.high === null || bar.high === undefined ||
      bar.low === null || bar.low === undefined ||
      bar.close === null || bar.close === undefined ||
      !bar.timestamp) {
    console.warn('Invalid OHLC data found and filtered:', bar);
    return null;
  }

  // Additional type checking to ensure values are numbers
  if (typeof bar.open !== 'number' || isNaN(bar.open) ||
      typeof bar.high !== 'number' || isNaN(bar.high) ||
      typeof bar.low !== 'number' || isNaN(bar.low) ||
      typeof bar.close !== 'number' || isNaN(bar.close)) {
    console.warn('Non-numeric OHLC values found and filtered:', bar);
    return null;
  }

  // Ensure high is the highest value and low is the lowest value
  const actualHigh = Math.max(bar.open, bar.high, bar.low, bar.close);
  const actualLow = Math.min(bar.open, bar.low, bar.high, bar.close);
  
  if (bar.high !== actualHigh || bar.low !== actualLow) {
    console.warn('Inconsistent high/low values, correcting:', 
      { original: { high: bar.high, low: bar.low }, 
        corrected: { high: actualHigh, low: actualLow } });
    // Correct the values
    bar.high = actualHigh;
    bar.low = actualLow;
  }

  // Ensure timestamp is valid
  const timestamp = new Date(bar.timestamp).getTime();
  if (isNaN(timestamp) || timestamp <= 0) {
    console.warn('Invalid timestamp found and filtered:', bar.timestamp);
    return null;
  }

  return {
    time: (timestamp / 1000) as UTCTimestamp, // Ensure it's UTCTimestamp (seconds)
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    // Note: In v5, color handling is done through series options, not in data
  };
};

// Helper to convert HistoricalBar to HistogramData for volume
const adaptHistoricalBarToVolumeData = (bar: HistoricalBar): HistogramData | null => {
  // Validate required values
  if (bar.volume === null || bar.volume === undefined || !bar.timestamp) {
    return null;
  }

  // Additional type check to ensure volume is a number
  if (typeof bar.volume !== 'number' || isNaN(bar.volume)) {
    console.warn('Non-numeric volume value found and filtered:', bar);
    return null;
  }

  // Ensure timestamp is valid
  const timestamp = new Date(bar.timestamp).getTime();
  if (isNaN(timestamp) || timestamp <= 0) {
    return null;
  }

  return {
    time: (timestamp / 1000) as UTCTimestamp,
    value: bar.volume,
    // Note: In v5, color handling is done through series options, not in data
  };
};


export interface TVLightweightChartProps {
  ohlcData: HistoricalBar[];
  volumeData?: HistoricalBar[]; // Separate for clarity, could be part of ohlcData
  markersData?: SeriesMarker<Time>[];
  lineSeriesData?: { name: string; data: LineData[]; color: string; seriesOptions?: DeepPartial<SeriesOptionsMap['Line']> }[];
  timeframe?: string; // For display or context, not directly used by lib for bar aggregation here
  height?: number;
  theme?: 'dark' | 'light';
  onChartReady?: (chartApi: IChartApi, seriesApi: ISeriesApi<'Candlestick'>) => void;
  backgroundColor?: string;
  textColor?: string;
  upColor?: string;
  downColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
  // New props for working orders and positions
  workingOrders?: Order[];
  positions?: Position[];
  currentPrice?: number;
}

// Interface for tracking price lines
interface OrderPriceLine {
  id: string; // Order ID
  priceLine: IPriceLine;
  type: 'limit' | 'stop' | 'position';
}

const TVLightweightChart: React.FC<TVLightweightChartProps> = ({
  ohlcData,
  volumeData,
  markersData,
  lineSeriesData,
  timeframe, // Not used directly by chart rendering, but useful for parent
  height = 600,
  theme = 'dark',
  onChartReady,
  backgroundColor,
  textColor,
  upColor = '#26a69a', // Default green for TradingView
  downColor = '#ef5350', // Default red for TradingView
  wickUpColor = '#26a69a',
  wickDownColor = '#ef5350',
  // New props
  workingOrders = [],
  positions = [],
  currentPrice,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lineSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // Ref to track price lines for orders/positions
  const priceLineRefs = useRef<OrderPriceLine[]>([]);
  // Ref to track previous OHLC data for change detection
  const prevOhlcDataRef = useRef<HistoricalBar[]>([]);

  const defaultBackgroundColor = theme === 'dark' ? '#131722' : '#FFFFFF';
  const defaultTextColor = theme === 'dark' ? '#D1D4DC' : '#333333';

  const chartBackgroundColor = backgroundColor || defaultBackgroundColor;
  const chartTextColor = textColor || defaultTextColor;

  // Helper to calculate PNL for a position
  const calculatePositionPnL = (position: Position): number => {
    if (!currentPrice || !position) return 0;
    
    const priceDifference = position.type === 1 
      ? currentPrice - position.averagePrice  // Long position
      : position.averagePrice - currentPrice; // Short position
    
    return priceDifference * position.size;
  };

  // Helper to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Helper function to update series with a single bar or replace the entire dataset
  const updateSeriesData = useCallback((
    series: ISeriesApi<any> | null, 
    newBar: CandlestickData | HistogramData | null, 
    replaceAllData: CandlestickData[] | HistogramData[] | null = null
  ) => {
    if (!series) return;

    try {
      if (replaceAllData) {
        // Full data replacement
        series.setData(replaceAllData);
      } else if (newBar) {
        // Update a single bar - more efficient for real-time updates
        // This avoids issues with null values when updating the entire dataset
        series.update(newBar);
      }
    } catch (error) {
      console.error('Error updating series data:', error);
    }
  }, []);

  // Layout effect for chart creation and initial setup
  useLayoutEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: chartBackgroundColor },
        textColor: chartTextColor,
      },
      grid: {
        vertLines: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        horzLines: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false, // Adjust based on timeframe granularity
        borderColor: theme === 'dark' ? '#333' : '#DDD',
        rightOffset: 2, // Add some space to the right to see the latest candle better
        barSpacing: 6, // Adjust spacing between bars for better visibility
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#333' : '#DDD',
        autoScale: true,
        entireTextOnly: false,
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
      // Enable animations for smoother real-time updates
      handleScale: {
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });
    chartRef.current = chart;

    // Use addSeries with the SeriesType object for compatibility with lightweight-charts v5
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: upColor,
      downColor: downColor,
      borderVisible: false,
      wickUpColor: wickUpColor,
      wickDownColor: wickDownColor,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineColor: '#9B7DFF',
      priceLineStyle: 2, // Dashed
      lastPriceAnimation: 1, // Enable price animation: 0=None, 1=Continuous, 2=One-time
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Create markers plugin for the candlestick series
    if (candlestickSeries) {
      markersPluginRef.current = createSeriesMarkers(candlestickSeries);
    }

    if (onChartReady) {
      onChartReady(chart, candlestickSeries);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      markersPluginRef.current = null;
      lineSeriesRefs.current.clear();
      priceLineRefs.current = [];
    };
  }, [height, theme, chartBackgroundColor, chartTextColor, upColor, downColor, wickUpColor, wickDownColor, onChartReady]);

  // Update OHLC data with improved change detection and validation
  useEffect(() => {
    if (!candlestickSeriesRef.current || !ohlcData) return;
    
    // Skip update if data hasn't changed
    if (JSON.stringify(ohlcData) === JSON.stringify(prevOhlcDataRef.current)) {
      console.log('Skipping OHLC update - no change detected');
      return;
    }
    
    console.log(`Updating chart with ${ohlcData.length} bars`);
    prevOhlcDataRef.current = [...ohlcData];
    
    // Process data to ensure uniqueness by timestamp and validate data
    const adaptedData = ohlcData
      .map(adaptHistoricalBarToCandlestickData)
      .filter((bar): bar is CandlestickData => bar !== null) // Filter out null values
      // Sort data by timestamp in ascending order
      .sort((a, b) => (a.time as number) - (b.time as number));
    
    // Handle duplicate timestamps by keeping only the latest entry with each timestamp
    const uniqueData: CandlestickData[] = [];
    const timeMap = new Map<number, number>();
    
    adaptedData.forEach((item, index) => {
      const timeValue = item.time as number;
      if (!timeMap.has(timeValue) || index > timeMap.get(timeValue)!) {
        timeMap.set(timeValue, index);
      }
    });
    
    // Create array with unique timestamps
    Array.from(timeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([_, index]) => {
        uniqueData.push(adaptedData[index]);
      });
    
    console.log(`After deduplication: ${uniqueData.length} bars (was ${adaptedData.length})`);
    
    // Additional validation to make absolutely sure all data is valid
    const validatedData = uniqueData.filter(item => {
      const isValid = 
        typeof item.open === 'number' && !isNaN(item.open) &&
        typeof item.high === 'number' && !isNaN(item.high) &&
        typeof item.low === 'number' && !isNaN(item.low) &&
        typeof item.close === 'number' && !isNaN(item.close) &&
        typeof item.time === 'number' && !isNaN(item.time as number) &&
        // Ensure high is greater than or equal to all other values
        item.high >= item.low &&
        item.high >= item.open && 
        item.high >= item.close &&
        // Ensure low is less than or equal to all other values
        item.low <= item.open &&
        item.low <= item.close;
      
      if (!isValid) {
        console.warn('Filtered invalid data point:', item);
      }
      
      return isValid;
    });
    
    // Check if we have valid data to display
    if (validatedData.length === 0) {
      console.warn('No valid data to display after validation');
      return;
    }
    
    try {
      // If we have just one new bar or an update to the last bar, use update() instead of setData()
      if (validatedData.length === 1 || 
          (prevOhlcDataRef.current.length > 0 && validatedData.length - prevOhlcDataRef.current.length === 1)) {
        const latestBar = validatedData[validatedData.length - 1];
        updateSeriesData(candlestickSeriesRef.current, latestBar);
      } else {
        // Set the data with unique timestamps (full replacement)
        updateSeriesData(candlestickSeriesRef.current, null, validatedData);
      }
      
      // Apply dynamic styling to ensure candles are properly colored
      candlestickSeriesRef.current.applyOptions({
        upColor: upColor,
        downColor: downColor,
        wickUpColor: wickUpColor,
        wickDownColor: wickDownColor,
        borderVisible: false,
        lastValueVisible: true,
        priceLineVisible: true,
        lastPriceAnimation: 1,
      });
      
      if (ohlcData.length > 0 && chartRef.current) {
        // Only fit content when data is loaded initially or refreshed completely
        if (!priceLineRefs.current || priceLineRefs.current.length === 0) {
          chartRef.current.timeScale().fitContent();
        }
        
        // Scroll to the right to show the most recent data
        chartRef.current.timeScale().scrollToRealTime();
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
      console.error('Data that caused the error:', validatedData);
    }
  }, [ohlcData, upColor, downColor, wickUpColor, wickDownColor, updateSeriesData]);

  // Update Volume data with improved handling and validation
  useEffect(() => {
    if (!chartRef.current || !volumeData) return;
    
    const setupVolumeSeries = () => {
      if (volumeSeriesRef.current) return volumeSeriesRef.current;
      
      const volumeSeries = chartRef.current!.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume', // Use a separate scale for volume
        scaleMargins: {
          top: 0.8, // Position the volume series at the bottom 20% of the chart
          bottom: 0,
        },
      });
      
      // Configure the volume price scale
      chartRef.current!.priceScale('volume').applyOptions({
        autoScale: true,
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      return volumeSeries;
    };
    
    const volumeSeries = volumeSeriesRef.current || setupVolumeSeries();
    volumeSeriesRef.current = volumeSeries;
    
    // Process volume data to ensure uniqueness by timestamp
    const adaptedVolumeData = volumeData
      .map(adaptHistoricalBarToVolumeData)
      .filter((bar): bar is HistogramData => bar !== null) // Filter out null values
      // Sort data by timestamp in ascending order
      .sort((a, b) => (a.time as number) - (b.time as number));
    
    // Handle duplicate timestamps by keeping only the latest entry
    const timeMap = new Map<number, number>();
    
    adaptedVolumeData.forEach((item, index) => {
      const timeValue = item.time as number;
      if (!timeMap.has(timeValue) || index > timeMap.get(timeValue)!) {
        timeMap.set(timeValue, index);
      }
    });
    
    // Create array with unique timestamps
    const volumeDataToUse = Array.from(timeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, index]) => adaptedVolumeData[index]);
    
    // Final validation of volume data
    const validVolumeData = volumeDataToUse.filter(item => 
      typeof item.value === 'number' && !isNaN(item.value) && item.value >= 0 &&
      typeof item.time === 'number' && !isNaN(item.time as number)
    );
    
    if (validVolumeData.length === 0) {
      console.warn('No valid volume data to display after validation');
      return;
    }
    
    try {
      // If we have just one new bar or an update to the last bar, use update() instead of setData()
      if (validVolumeData.length === 1) {
        updateSeriesData(volumeSeries, validVolumeData[0]);
      } else {
        // Set the data with unique timestamps
        updateSeriesData(volumeSeries, null, validVolumeData);
      }
      
      // Apply volume coloring options at the series level
      volumeSeries.applyOptions({
        color: (data: HistogramData) => {
          // Find the corresponding OHLC data to determine color
          const timeKey = data.time;
          const matchingBar = ohlcData.find(bar => {
            const barTime = new Date(bar.timestamp).getTime() / 1000;
            return barTime === timeKey;
          });
          
          if (matchingBar && matchingBar.close >= matchingBar.open) {
            return 'rgba(38, 166, 154, 0.5)'; // Green/up volume
          }
          return 'rgba(239, 83, 80, 0.5)'; // Red/down volume
        }
      });
    } catch (error) {
      console.error('Error setting volume data:', error);
      // Don't throw error to prevent app crash
    }
    
  }, [volumeData, ohlcData, updateSeriesData]);

  // Update Markers
  useEffect(() => {
    if (markersPluginRef.current && markersData) {
      markersPluginRef.current.setMarkers(markersData);
    } else if (markersPluginRef.current && !markersData) {
      markersPluginRef.current.setMarkers([]); // Clear markers if undefined
    }
  }, [markersData]);

  // Update Line Series (Indicators) with duplicate timestamp handling
  useEffect(() => {
    if (chartRef.current && lineSeriesData) {
      const currentSeriesNames = new Set(lineSeriesData.map(ls => ls.name));

      // Remove old series
      lineSeriesRefs.current.forEach((series, name) => {
        if (!currentSeriesNames.has(name) && chartRef.current) {
          chartRef.current.removeSeries(series);
          lineSeriesRefs.current.delete(name);
        }
      });

      // Add or update series
      lineSeriesData.forEach(ls => {
        if (lineSeriesRefs.current.has(ls.name)) {
          // Handle duplicate timestamps
          const processedData = processDuplicateTimestamps([...ls.data]);
          lineSeriesRefs.current.get(ls.name)?.setData(processedData);
        } else if (chartRef.current) {
          const newSeries = chartRef.current.addSeries(LineSeries, {
            color: ls.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            ...ls.seriesOptions,
          });
          // Handle duplicate timestamps
          const processedData = processDuplicateTimestamps([...ls.data]);
          newSeries.setData(processedData);
          lineSeriesRefs.current.set(ls.name, newSeries);
        }
      });
    } else if (chartRef.current && !lineSeriesData && lineSeriesRefs.current.size > 0) {
      // Remove all line series if lineSeriesData is undefined
      lineSeriesRefs.current.forEach((series, name) => {
        if (chartRef.current) {
          chartRef.current.removeSeries(series);
        }
      });
      lineSeriesRefs.current.clear();
    }
  }, [lineSeriesData]);

  // Helper function to process duplicate timestamps in line series data with validation
  const processDuplicateTimestamps = (data: LineData[]): LineData[] => {
    // Validate each data point first
    const validData = data.filter(point => {
      const isValid = 
        typeof point.value === 'number' && !isNaN(point.value) &&
        typeof point.time === 'number' && !isNaN(point.time as number);
      
      if (!isValid) {
        console.warn('Filtered invalid line series point:', point);
      }
      
      return isValid;
    });
    
    // Sort the data by time
    const sortedData = validData.sort((a, b) => (a.time as number) - (b.time as number));
    
    // Handle duplicate timestamps by keeping only the latest entry
    const timeMap = new Map<number, number>();
    
    sortedData.forEach((item, index) => {
      const timeValue = item.time as number;
      if (!timeMap.has(timeValue) || index > timeMap.get(timeValue)!) {
        timeMap.set(timeValue, index);
      }
    });
    
    // Create array with unique timestamps
    return Array.from(timeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, index]) => sortedData[index]);
  };

  // New effect to handle working orders as price lines
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) return;

    // First, remove any existing price lines
    priceLineRefs.current.forEach(pl => {
      try {
        candlestickSeriesRef.current?.removePriceLine(pl.priceLine);
      } catch (e) {
        console.error('Error removing price line:', e);
      }
    });
    priceLineRefs.current = [];

    // Add order price lines
    workingOrders.forEach(order => {
      // Skip orders that don't have a price (like market orders)
      if (order.status !== 1) return; // Only show working orders (status=1)
      
      let price = null;
      let lineType: 'limit' | 'stop' = 'limit';
      let lineColor = '';
      let lineWidth = 1;
      let lineStyle = 0; // 0=solid, 1=dotted, 2=dashed, 3=large dashed
      let text = '';
      
      // Determine price and style based on order type
      if (order.type === 1 && order.limitPrice) { // Limit order
        price = order.limitPrice;
        lineType = 'limit';
        lineColor = order.side === 0 ? '#4CAF50' : '#F44336'; // Green for buy, red for sell
        text = `${order.side === 0 ? 'BUY' : 'SELL'} ${order.size} @ ${price.toFixed(2)}`;
      } else if (order.type === 3 && order.stopPrice) { // Stop order
        price = order.stopPrice;
        lineType = 'stop';
        lineColor = order.side === 0 ? '#8BC34A' : '#FF9800'; // Light green for buy stop, orange for sell stop
        lineStyle = 2; // Dashed
        text = `${order.side === 0 ? 'BUY STOP' : 'SELL STOP'} ${order.size} @ ${price.toFixed(2)}`;
      } else if (order.type === 4) { // Stop limit order
        if (order.stopPrice) {
          // Add stop price line
          const stopPriceLine = candlestickSeriesRef.current.createPriceLine({
            price: order.stopPrice,
            color: order.side === 0 ? '#8BC34A' : '#FF9800',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${order.side === 0 ? 'BUY STOP' : 'SELL STOP'} ${order.size} @ ${order.stopPrice.toFixed(2)}`,
          });
          priceLineRefs.current.push({
            id: `${order.id}-stop`,
            priceLine: stopPriceLine,
            type: 'stop',
          });
        }
        if (order.limitPrice) {
          price = order.limitPrice;
          lineType = 'limit';
          lineColor = order.side === 0 ? '#4CAF50' : '#F44336';
          text = `${order.side === 0 ? 'BUY LIMIT' : 'SELL LIMIT'} ${order.size} @ ${price.toFixed(2)}`;
        }
      }
      
      if (price !== null) {
        const priceLine = candlestickSeriesRef.current.createPriceLine({
          price,
          color: lineColor,
          lineWidth,
          lineStyle,
          axisLabelVisible: true,
          title: text,
        });
        
        priceLineRefs.current.push({
          id: order.id.toString(),
          priceLine,
          type: lineType,
        });
      }
    });

    // Add position lines with PNL info
    positions.forEach(position => {
      if (position.size === 0) return; // Skip closed positions
      
      // Entry price line
      const entryPriceLine = candlestickSeriesRef.current.createPriceLine({
        price: position.averagePrice,
        color: position.type === 1 ? '#2196F3' : '#FF9800', // Blue for long, orange for short
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `${position.type === 1 ? 'LONG' : 'SHORT'} ${position.size} @ ${position.averagePrice.toFixed(2)}`,
      });
      
      priceLineRefs.current.push({
        id: `${position.id}-entry`,
        priceLine: entryPriceLine,
        type: 'position',
      });
      
      // Add PNL line if we have current price
      if (currentPrice) {
        const pnl = calculatePositionPnL(position);
        const pnlText = formatCurrency(pnl);
        const pnlPct = ((pnl / (position.averagePrice * position.size)) * 100).toFixed(2);
        
        const pnlPriceLine = candlestickSeriesRef.current.createPriceLine({
          price: currentPrice,
          color: pnl >= 0 ? '#4CAF50' : '#F44336', // Green for profit, red for loss
          lineWidth: 1,
          lineStyle: 1, // Dotted
          axisLabelVisible: true,
          title: `PNL: ${pnlText} (${pnlPct}%)`,
        });
        
        priceLineRefs.current.push({
          id: `${position.id}-pnl`,
          priceLine: pnlPriceLine,
          type: 'position',
        });
      }
    });
    
  }, [workingOrders, positions, currentPrice]);

  // Enhance the chart update when current price changes
  useEffect(() => {
    if (currentPrice && candlestickSeriesRef.current) {
      // Update the candle appearance to match real-time price movement
      candlestickSeriesRef.current.applyOptions({
        lastPriceAnimation: 1, // Enable price animation: 0=None, 1=Continuous, 2=One-time
      });
      
      // Make sure the latest price is visible
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    }
  }, [currentPrice]);

  // Fit content initially and perhaps on major data changes
  useEffect(() => {
    if (chartRef.current && ohlcData && ohlcData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [ohlcData.length]);

  return <div ref={chartContainerRef} style={{ height: `${height}px`, width: '100%' }} />;
};

export default TVLightweightChart;
