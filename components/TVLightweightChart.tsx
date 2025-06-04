import React, { useEffect, useRef, useLayoutEffect } from 'react';
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
} from 'lightweight-charts';
import { HistoricalBar } from '../types'; // Assuming HistoricalBar matches CandlestickData structure somewhat

// Helper to convert HistoricalBar to CandlestickData
const adaptHistoricalBarToCandlestickData = (bar: HistoricalBar): CandlestickData => ({
  time: (new Date(bar.timestamp).getTime() / 1000) as UTCTimestamp, // Ensure it's UTCTimestamp (seconds)
  open: bar.open,
  high: bar.high,
  low: bar.low,
  close: bar.close,
});

// Helper to convert HistoricalBar to HistogramData for volume
const adaptHistoricalBarToVolumeData = (bar: HistoricalBar): HistogramData => ({
  time: (new Date(bar.timestamp).getTime() / 1000) as UTCTimestamp,
  value: bar.volume,
  // Optional: Color based on price movement
  // color: bar.close >= bar.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)',
});


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
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lineSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const defaultBackgroundColor = theme === 'dark' ? '#131722' : '#FFFFFF';
  const defaultTextColor = theme === 'dark' ? '#D1D4DC' : '#333333';

  const chartBackgroundColor = backgroundColor || defaultBackgroundColor;
  const chartTextColor = textColor || defaultTextColor;

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
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#333' : '#DDD',
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderVisible: false,
      wickUpColor: wickUpColor,
      wickDownColor: wickDownColor,
    });
    candlestickSeriesRef.current = candlestickSeries;

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
      lineSeriesRefs.current.clear();
    };
  }, [height, theme, chartBackgroundColor, chartTextColor, upColor, downColor, wickUpColor, wickDownColor, onChartReady]);

  // Update OHLC data
  useEffect(() => {
    if (candlestickSeriesRef.current && ohlcData) {
      const adaptedData = ohlcData.map(adaptHistoricalBarToCandlestickData);
      candlestickSeriesRef.current.setData(adaptedData);
      if (ohlcData.length > 0 && chartRef.current) {
         // chartRef.current.timeScale().fitContent(); // Fit content on new data
      }
    }
  }, [ohlcData]);

  // Update Volume data
  useEffect(() => {
    if (chartRef.current && volumeData) {
      if (!volumeSeriesRef.current) {
        const volumeSeries = chartRef.current.addHistogramSeries({
          color: '#26a69a', // Default color, can be dynamic
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '', // Set to an empty string or a specific ID if needed for overlay
          // Overlay on main price scale - might need adjustment if volume scale is very different
        });
        // Attempt to overlay volume on the main chart - this usually requires putting it on a separate price scale
        // For simplicity, let's assume it can share or needs its own (which might place it below)
        // To truly overlay, you might need to configure priceScaleId and other options carefully.
        // A common practice is to render volume on a separate pane, which is default if priceScaleId is not main.
        // chartRef.current.priceScale('').applyOptions({ scaleMargins: { bottom: 0.25 } }); // Make space for volume
        // candlestickSeriesRef.current?.priceScale().applyOptions({ scaleMargins: { top: 0.75 } });

        volumeSeriesRef.current = volumeSeries;
      }
      const adaptedVolumeData = volumeData.map(adaptHistoricalBarToVolumeData);
      volumeSeriesRef.current.setData(adaptedVolumeData);
    } else if (volumeSeriesRef.current && !volumeData) {
      // Remove volume series if data is removed
      if (chartRef.current && volumeSeriesRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }
    }
  }, [volumeData]);

  // Update Markers
  useEffect(() => {
    if (candlestickSeriesRef.current && markersData) {
      candlestickSeriesRef.current.setMarkers(markersData);
    } else if (candlestickSeriesRef.current && !markersData) {
      candlestickSeriesRef.current.setMarkers([]); // Clear markers if undefined
    }
  }, [markersData]);

  // Update Line Series (Indicators)
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
          lineSeriesRefs.current.get(ls.name)?.setData(ls.data);
        } else if (chartRef.current) {
          const newSeries = chartRef.current.addLineSeries({
            color: ls.color,
            lineWidth: 2,
            ...ls.seriesOptions,
          });
          newSeries.setData(ls.data);
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


  // Fit content initially and perhaps on major data changes
  useEffect(() => {
    if (chartRef.current && ohlcData && ohlcData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [ohlcData]);


  return <div ref={chartContainerRef} style={{ height: `${height}px`, width: '100%' }} />;
};

export default TVLightweightChart;
