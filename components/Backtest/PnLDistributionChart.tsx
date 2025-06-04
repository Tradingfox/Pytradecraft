import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, HistogramData, ColorType, UTCTimestamp, TickMarkFormatter } from 'lightweight-charts';
import { SimulatedTrade } from '../../types'; // Adjust path as needed

interface PnLDistributionChartProps {
  trades: SimulatedTrade[];
  height?: number;
  theme?: 'dark' | 'light'; // For consistency with TVLightweightChart
}

const PnLDistributionChart: React.FC<PnLDistributionChartProps> = ({
  trades,
  height = 300,
  theme = 'dark',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !trades || trades.length === 0) {
      // Clear chart if no trades
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      return;
    }

    const pnlValues = trades.map(trade => trade.pnl).filter(pnl => typeof pnl === 'number') as number[];
    if (pnlValues.length === 0) {
        if (chartRef.current) { // Clear chart if no PnL values
            chartRef.current.remove();
            chartRef.current = null;
        }
        return;
    }

    // 1. Determine bins
    const minPnl = Math.min(...pnlValues);
    const maxPnl = Math.max(...pnlValues);
    const numBins = Math.min(Math.max(10, Math.floor(Math.sqrt(pnlValues.length))), 30); // Dynamic but capped
    const binSize = (maxPnl - minPnl) / numBins || 1; // Avoid division by zero if all PnLs are same

    const bins: { x0: number; x1: number; count: number; positive: boolean }[] = [];
    for (let i = 0; i < numBins; i++) {
      const x0 = minPnl + i * binSize;
      const x1 = minPnl + (i + 1) * binSize;
      bins.push({ x0, x1, count: 0, positive: x0 + binSize / 2 >= 0 });
    }
    // Ensure the last bin captures the max value correctly
    if (bins.length > 0) {
        bins[bins.length-1].x1 = Math.max(bins[bins.length-1].x1, maxPnl);
    }


    pnlValues.forEach(pnl => {
      let binIndex = Math.floor((pnl - minPnl) / binSize);
      if (binIndex >= numBins) binIndex = numBins - 1; // Put into last bin if it's the max value
      if (binIndex < 0) binIndex = 0; // Should not happen if minPnl is correct
      if (bins[binIndex]) {
        bins[binIndex].count++;
      }
    });

    const histogramData: HistogramData[] = bins.map((bin, index) => ({
      time: index as UTCTimestamp, // Using index as 'time' for non-time-series histogram
      value: bin.count,
      color: bin.x0 >= 0 ? 'rgba(38, 166, 154, 0.7)' : 'rgba(239, 83, 80, 0.7)', // Green for profit, Red for loss
    }));

    // Chart setup
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
        layout: {
          background: { type: ColorType.Solid, color: theme === 'dark' ? '#131722' : '#FFFFFF' },
          textColor: theme === 'dark' ? '#D1D4DC' : '#333333',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        },
        rightPriceScale: { // Y-axis (Number of Trades)
          borderColor: theme === 'dark' ? '#333' : '#DDD',
          // title: 'Number of Trades', // Title not directly supported, use external label
        },
        timeScale: { // X-axis (P&L Bins)
          borderColor: theme === 'dark' ? '#333' : '#DDD',
          tickMarkFormatter: (time: UTCTimestamp, tickType, locale) => {
            const binIndex = time as number;
            if (bins[binIndex]) {
              // Show the start of the bin range, or midpoint
              return bins[binIndex].x0.toFixed(pnlValues.some(p=>!Number.isInteger(p)) ? 2 : 0);
            }
            return '';
          },
        },
      });

      histogramSeriesRef.current = chartRef.current.addHistogramSeries({
        priceFormat: { type: 'volume' }, // Treat count as volume
      });
    } else {
      // Update chart size if container resized (simplified, real resize handled by window listener if added)
      chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth, height });
    }

    histogramSeriesRef.current?.setData(histogramData);
    chartRef.current?.timeScale().fitContent();

    // Cleanup
    return () => {
      // Chart removal is handled if trades become empty or component unmounts
      // No, chart should be removed on unmount always
      // if (chartRef.current) {
      //   chartRef.current.remove();
      //   chartRef.current = null;
      // }
    };

  }, [trades, height, theme]); // Re-run if trades, height, or theme change

  // More robust cleanup for when the component unmounts.
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);


  if (!trades || trades.filter(t => typeof t.pnl === 'number').length === 0) {
    return (
      <SectionPanel title="P&L Distribution">
        <div style={{ height: `${height}px` }} className="flex justify-center items-center text-gray-500">
          No P&L data available for distribution chart.
        </div>
      </SectionPanel>
    );
  }

  return (
    <SectionPanel title="P&L Distribution">
      <div ref={chartContainerRef} style={{ height: `${height}px`, width: '100%' }} />
      <p className="text-xs text-gray-500 text-center mt-1">X-axis: P&L per Trade (bin start) / Y-axis: Number of Trades</p>
    </SectionPanel>
  );
};

export default PnLDistributionChart;
