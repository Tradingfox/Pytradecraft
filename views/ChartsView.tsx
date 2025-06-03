import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import Chart from '../components/Chart';
import HybridChart from '../components/HybridChart';
import SectionPanel from '../components/SectionPanel';
import { 
  searchTrades, 
  searchOpenPositions
} from '../services/tradingApiService';
import { Trade, Position } from '../types';

const ChartsView: React.FC = () => {
  const { selectedBroker, sessionToken, selectedAccountId } = useTradingContext();
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [chartHeight, setChartHeight] = useState(600);
  const [showDOM, setShowDOM] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  
  // Default to hybrid chart for TopstepX users since it better handles real-time data
  const [chartMode, setChartMode] = useState<'standard' | 'hybrid'>(
    selectedBroker === 'topstepx' ? 'hybrid' : 'standard'
  );

  // Load trades and positions for the selected contract
  const loadTradingData = async () => {
    if (!selectedBroker || !sessionToken || !selectedAccountId || !selectedContract) {
      return;
    }

    setIsLoadingTrades(true);
    try {
      // Load recent trades for the contract
      const tradesResponse = await searchTrades(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId: selectedContract,
        limit: 100
      });

      if (tradesResponse.success && tradesResponse.trades) {
        setTrades(tradesResponse.trades);
      }

      // Load open positions
      const positionsResponse = await searchOpenPositions(selectedBroker, sessionToken, {
        accountId: selectedAccountId
      });

      if (positionsResponse.success && positionsResponse.positions) {
        // Filter positions for the selected contract
        const contractPositions = positionsResponse.positions.filter(
          p => p.contractId === selectedContract
        );
        setPositions(contractPositions);
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  useEffect(() => {
    if (selectedContract) {
      loadTradingData();
    }
  }, [selectedContract, selectedBroker, sessionToken, selectedAccountId]);
  
  // Update chart mode when broker changes
  useEffect(() => {
    if (selectedBroker === 'topstepx') {
      setChartMode('hybrid');
    }
  }, [selectedBroker]);

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-200">Advanced Charting</h1>
        <div className="flex gap-2">
          <select 
            className="bg-gray-700 text-gray-200 px-3 py-1.5 rounded border border-gray-600"
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
          >
            <option value="">Select Contract</option>
            <option value="ES">ES - E-mini S&P 500</option>
            <option value="NQ">NQ - E-mini NASDAQ</option>
            <option value="YM">YM - E-mini Dow</option>
            <option value="CL">CL - Crude Oil</option>
          </select>
        </div>
      </div>

      {/* Chart Mode Selector */}
      <SectionPanel title="Chart Engine Selection" className="bg-gray-800 border-gray-700">
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setChartMode('standard')}
            className={`px-4 py-2 rounded ${chartMode === 'standard' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300'}`}
          >
            Standard Chart (Full Features)
          </button>
          <button 
            onClick={() => setChartMode('hybrid')}
            className={`px-4 py-2 rounded ${chartMode === 'hybrid' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300'}`}
          >
            Hybrid Chart (Optimized for Real-time Data)
          </button>
        </div>
      </SectionPanel>

      {/* TopStepX Info Banner */}
      {selectedBroker === 'topstepx' && chartMode === 'standard' && (
        <div className="bg-blue-900/30 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
          <h3 className="font-medium mb-1">Recommendation for TopstepX</h3>
          <p>For optimal performance with TopstepX real-time data, we recommend using the Hybrid Chart engine.</p>
        </div>
      )}

      {/* Trading Data Summary */}
      {selectedContract && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Trading Data</h3>
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

      {/* Main Chart Component */}
      {chartMode === 'standard' ? (
        <Chart
          contractId={selectedContract}
          height={chartHeight}
          showDOM={showDOM}
          showToolbar={showToolbar}
        />
      ) : (
        <HybridChart
          contractId={selectedContract}
          height={chartHeight}
        />
      )}

      {/* Chart Features Info */}
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