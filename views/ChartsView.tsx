import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation and useNavigate
import { useTradingContext } from '../contexts/TradingContext';
import Chart from '../components/Chart'; // Will be replaced
import HybridChart from '../components/HybridChart'; // Will be replaced
import TVLightweightChart from '../components/TVLightweightChart'; // Import the new chart
import SectionPanel from '../components/SectionPanel';
import ContractSearchInput from '../components/ContractSearchInput';
import { 
  searchTrades, 
  searchOpenPositions
} from '../services/tradingApiService';
import { Trade, Position, Contract, HistoricalBar, QuoteData } from '../types'; // Add HistoricalBar, QuoteData
import { SeriesMarker, Time } from 'lightweight-charts';


const VALID_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;
type ValidTimeframe = typeof VALID_TIMEFRAMES[number];

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
  const [selectedContractFull, setSelectedContractFull] = useState<Contract | null>(null); // To store the full contract object
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

  const location = useLocation(); // For reading route state
  const navigate = useNavigate(); // For clearing route state

  // Ensure refs are updated when state changes (though primary logic will pass state directly)
  useEffect(() => {
    currentBarRef.current = currentBar;
  }, [currentBar]);
  useEffect(() => {
    lastBarTimeRef.current = lastBarTime;
  }, [lastBarTime]);

  // Effect to handle incoming contractId from route state (e.g., from market overview widget)
  useEffect(() => {
    if (location.state?.selectedContractId) {
      const incomingContractId = location.state.selectedContractId as string;
      if (incomingContractId && incomingContractId !== selectedContractId) {
        console.log(`ChartsView: Received contractId from route state: ${incomingContractId}`);
        // Update the contract ID, which will trigger other useEffects to load data
        setSelectedContractId(incomingContractId);
        // The ContractSearchInput also needs to be updated if its text is tied to a different state.
        // For now, setting selectedContractId will drive data loading for the chart.
        // We might need to also update selectedContractFull if other parts rely on it immediately.
        // A simple way is to set it partially, or trigger a search if ContractSearchInput is the source of truth for it.
        setSelectedContractFull(prev => prev?.id === incomingContractId ? prev : { id: incomingContractId, name: incomingContractId } as Contract);


        // Clear the state from location to prevent re-triggering on refresh/navigation
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, selectedContractId, navigate]);

  const getTimeframeMs = useCallback((): number => {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    // 'w' and others can be complex due to market hours, not handled simply here
    return 5 * 60 * 1000; // Default to 5m if unknown
  }, [timeframe]);

  // Function to process live quotes into OHLC bars
  const processLiveQuoteForChart = useCallback((quote: QuoteData) => {
    if (!selectedContractId || quote.contractId !== selectedContractId) return;

    const price = quote.lastPrice || quote.bidPrice || quote.askPrice;
    if (typeof price !== 'number') return;

    const quoteTime = new Date(quote.timestamp).getTime();
    const intervalMs = getTimeframeMs();
    const barStartTimeEpoch = Math.floor(quoteTime / intervalMs) * intervalMs;

    setCurrentBar(prevCurrentBar => {
      if (!lastBarTimeRef.current || barStartTimeEpoch > lastBarTimeRef.current) {
        // New bar
        if (prevCurrentBar) { // If there was a previous bar, add it to realtimeBars
          setChartOhlcData(prevOhlc => {
            // Avoid duplicating the last historical bar if it's the same as new currentBar's start
            if (prevOhlc.length > 0 && new Date(prevOhlc[prevOhlc.length - 1].timestamp).getTime() === barStartTimeEpoch) {
              // This scenario should ideally be handled by merging, but for now, let's prevent duplicate if it's truly a new bar starting
              // This might happen if historical data ends exactly where a new bar would start.
              // More robust logic would merge historical with the first incoming tick of a new bar.
              // For now, we assume historical data is distinct from the live aggregation start.
            }
            return [...prevOhlc, prevCurrentBar];
          });
          setChartVolumeData(prevVolume => [...prevVolume, prevCurrentBar]); // Also add to volume
        }

        lastBarTimeRef.current = barStartTimeEpoch;
        setLastBarTime(barStartTimeEpoch); // Update state for useEffect dependency

        return {
          timestamp: new Date(barStartTimeEpoch).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: quote.bidSize || quote.askSize || 1, // Use sizes if available, else 1
        };
      } else if (prevCurrentBar && barStartTimeEpoch === lastBarTimeRef.current) {
        // Update current bar
        return {
          ...prevCurrentBar,
          high: Math.max(prevCurrentBar.high, price),
          low: Math.min(prevCurrentBar.low, price),
          close: price,
          volume: (prevCurrentBar.volume || 0) + (quote.bidSize || quote.askSize || 1),
        };
      }
      return prevCurrentBar; // No change
    });
  }, [selectedContractId, getTimeframeMs]);

  // useEffect for processing liveQuotes
  useEffect(() => {
    if (marketHubStatus === 'connected' && selectedContractId && marketStreamContractId === selectedContractId) {
      const latestQuote = liveQuotes.find(q => q.contractId === selectedContractId); // Or process all if multiple come
      if (latestQuote) {
        processLiveQuoteForChart(latestQuote);
      }
    }
  }, [liveQuotes, marketHubStatus, selectedContractId, marketStreamContractId, processLiveQuoteForChart]);

  // useEffect for subscribing/unsubscribing to market data
  useEffect(() => {
    if (selectedContractId && marketHubStatus === 'connected') {
      subscribeToMarketData(selectedContractId);
      // When subscribing to a new contract, reset real-time bar aggregation state
      setCurrentBar(null);
      setLastBarTime(null);
      // We might want to clear realtimeOhlcData here too, or let it append.
      // For now, historical data fetch handles clearing chartOhlcData.
    }
    // Cleanup function to unsubscribe when component unmounts or contractId changes
    return () => {
      if (marketStreamContractId && marketHubStatus === 'connected') { // Check if currently subscribed
        unsubscribeFromMarketData();
      }
    };
  }, [selectedContractId, marketHubStatus, subscribeToMarketData, unsubscribeFromMarketData, marketStreamContractId]);


  // Load trades and positions for the selected contract (for additional info, not primary chart data)
  const loadAssociatedTradingData = async () => {
    if (!selectedBroker || !sessionToken || !selectedAccountId || !selectedContractId) { // Use selectedContractId
      setTrades([]);
      setPositions([]);
      return;
    }

    setIsLoadingTrades(true);
    try {
      // Load recent trades for the contract
      const tradesResponse = await searchTrades(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId: selectedContractId, // Use selectedContractId
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
          p => p.contractId === selectedContractId // Use selectedContractId
        );
        setPositions(contractPositions);
      } else {
        setPositions([]);
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
      setTrades([]);
      setPositions([]);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  useEffect(() => {
    if (selectedContractId) {
      loadAssociatedTradingData();
      // Historical OHLC data loading will be handled by a different useEffect
      // dependent on selectedContractId and timeframe
    } else {
      setTrades([]);
      setPositions([]);
      setChartOhlcData([]);
      setChartVolumeData([]);
      setCurrentBar(null);
      setLastBarTime(null);
      clearHistoricalData(); // Clear context's historical data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractId, selectedBroker, sessionToken, selectedAccountId]); // loadAssociatedTradingData will be memoized

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

    // 3. Process live position updates for entry markers
    if (livePositionUpdates && selectedContractId) {
      livePositionUpdates
        .filter(pos => pos.contractId === selectedContractId && pos.size !== 0) // Active positions
        .forEach(pos => {
          newMarkers.push({
            time: (new Date(pos.creationTimestamp).getTime() / 1000) as Time, // Use creationTimestamp for entry
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

  }, [trades, liveTradeUpdates, livePositionUpdates, selectedContractId, selectedContractFull]);


  // Calculate Simple Moving Average (SMA)
  const calculateSMA = (data: HistoricalBar[], period: number): { time: Time; value: number }[] => {
    if (!data || data.length < period) return [];
    const smaValues: { time: Time; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.close, 0);
      smaValues.push({
        time: (new Date(data[i].timestamp).getTime() / 1000) as Time,
        value: sum / period,
      });
    }
    return smaValues;
  };

  // Prepare Line Series Data (e.g., SMA)
  useEffect(() => {
    const combinedOhlc = currentBar ? chartOhlcData.concat([currentBar]) : chartOhlcData;
    if (combinedOhlc.length > 0 && smaPeriod > 0) {
      const smaValues = calculateSMA(combinedOhlc, smaPeriod);
      if (smaValues.length > 0) {
        setChartLineSeriesData([{
          name: `SMA(${smaPeriod})`,
          data: smaValues,
          color: 'rgba(75, 192, 192, 1)'
        }]);
      } else {
        setChartLineSeriesData([]);
      }
    } else {
      setChartLineSeriesData([]);
    }
  }, [chartOhlcData, currentBar, smaPeriod]); // Recalculate when OHLC data, current bar, or smaPeriod changes

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
      setChartOhlcData(historicalData.bars);
      setChartVolumeData(historicalData.bars.filter(b => typeof b.volume === 'number'));
       // Set lastBarTime from the last historical bar to correctly start live aggregation
      if (historicalData.bars.length > 0) {
        const lastHistBarTime = new Date(historicalData.bars[historicalData.bars.length - 1].timestamp).getTime();
        setLastBarTime(lastHistBarTime);
        lastBarTimeRef.current = lastHistBarTime;

        // Check if the currentBar (if any) is older than or same as the last historical bar
        // This can happen if live updates came in before historical data fully loaded or if there's overlap
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
    // If historicalData is null (cleared) or for a different contract/timeframe, don't process.
    // ChartOhlcData would have been cleared by the fetchHistoricalData effect.
  }, [historicalData, selectedContractId, timeframe, currentBar]);


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
          <label htmlFor="smaPeriodInput" className="block text-sm font-medium text-gray-300 mb-1">SMA Period</label>
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
          {smaPeriod > 0 && <span className="ml-2">SMA({smaPeriod})</span>}
        </div>
      )}

      {/* Chart Mode Selector and TopStepX Info Banner can be removed or adapted if TVLightweightChart is the only one now */}
      {/* For now, let's comment them out to simplify */}
      {/*
      <SectionPanel title="Chart Engine Selection" className="bg-gray-800 border-gray-700"> ... </SectionPanel>
      {selectedBroker === 'topstepx' && chartMode === 'standard' && ( ... )}
      */}

      {/* Trading Data Summary */}
      {selectedContractId && ( // Use selectedContractId
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Trading Data for {selectedContractFull?.name || selectedContractId}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Positions:</span> {positions.length}
            </div>
            <div>
              <span className="text-gray-400">Recent Trades:</span> {trades.length}
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Component - Replaced with TVLightweightChart */}
      {selectedContractId ? (
        <SectionPanel title="Chart" className="bg-gray-800 border-gray-700">
          {isLoadingHistoricalData && <p className="text-center text-sky-400">Loading historical chart data...</p>}
          {historicalDataError && !isLoadingHistoricalData && <p className="text-center text-red-400">Error loading historical data: {historicalDataError}</p>}
          {!isLoadingHistoricalData && !historicalDataError && chartOhlcData.length === 0 && <p className="text-center text-gray-500">No chart data available for {selectedContractFull?.name || selectedContractId}. Try a different timeframe or contract.</p>}

          {(chartOhlcData.length > 0 || currentBar) && ( // Render chart if there's any data to show
            <TVLightweightChart
              ohlcData={currentBar ? chartOhlcData.concat([currentBar]) : chartOhlcData}
              volumeData={currentBar ? chartVolumeData.concat([currentBar]) : chartVolumeData}
              markersData={chartMarkersData}
              lineSeriesData={chartLineSeriesData}
              timeframe={timeframe}
              height={chartHeight}
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