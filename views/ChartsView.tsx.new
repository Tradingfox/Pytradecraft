import React, { useState, useEffect } from 'react';
import Chart from '../components/Chart';
import HybridChart from '../components/HybridChart';
import { useTradingContext } from '../contexts/TradingContext';
import { searchTrades, searchOpenPositions } from '../services/tradingApiService';
import { Trade, Position } from '../types';
import SectionPanel from '../components/SectionPanel';

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
          pos => pos.contractId === selectedContract
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
        <h1 className="text-3xl font-bold text-white">Advanced Charts</h1>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Connect to a Broker</h2>
          <p className="text-gray-400 mb-4">
            To use the advanced charting features, please connect to a broker first through the Broker Connect tab.
          </p>
          <p className="text-gray-400">
            Once connected, you'll have access to:
          </p>
          <ul className="text-gray-400 mt-4 space-y-2 text-left max-w-md mx-auto">
            <li>• Real-time candlestick charts with multiple timeframes</li>
            <li>• Advanced drawing tools (trendlines, Fibonacci, etc.)</li>
            <li>• Custom indicators in Python, JavaScript, Java, and C#</li>
            <li>• Depth of Market (DOM) integration</li>
            <li>• Trade history overlay on charts</li>
            <li>• Chart trader functionality</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Advanced Charts</h1>
        
        {/* Chart Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-white text-sm">Height:</label>
            <select
              value={chartHeight}
              onChange={(e) => setChartHeight(Number(e.target.value))}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value={400}>400px</option>
              <option value={500}>500px</option>
              <option value={600}>600px</option>
              <option value={700}>700px</option>
              <option value={800}>800px</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showDOM"
              checked={showDOM}
              onChange={(e) => setShowDOM(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="showDOM" className="text-white text-sm">
              Show DOM
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showToolbar"
              checked={showToolbar}
              onChange={(e) => setShowToolbar(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="showToolbar" className="text-white text-sm">
              Show Toolbar
            </label>
          </div>
        </div>
      </div>

      {/* Chart Mode Selector */}
      <SectionPanel title="Chart Engine Selection" className="bg-gray-800 border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <button 
              onClick={() => setChartMode('standard')}
              className={`w-full p-4 rounded-lg border ${
                chartMode === 'standard' 
                  ? 'border-blue-500 bg-blue-900/30' 
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
              } transition-colors`}
            >
              <h3 className="text-white font-medium mb-2">Standard Chart</h3>
              <p className="text-sm text-gray-300">
                Full-featured chart with historical data and technical indicators.
                <span className="block mt-1 text-xs text-gray-400">
                  {selectedBroker === 'topstepx' 
                    ? 'Requires ProjectX API subscription for TopstepX historical data.' 
                    : 'Best for in-depth technical analysis with historical data.'}
                </span>
              </p>
            </button>
          </div>
          
          <div className="flex-1">
            <button 
              onClick={() => setChartMode('hybrid')}
              className={`w-full p-4 rounded-lg border ${
                chartMode === 'hybrid' 
                  ? 'border-green-500 bg-green-900/30' 
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
              } transition-colors`}
            >
              <h3 className="text-white font-medium mb-2">Hybrid Chart</h3>
              <p className="text-sm text-gray-300">
                Enhanced chart with real-time data streaming capabilities.
                <span className="block mt-1 text-xs text-gray-400">
                  {selectedBroker === 'topstepx' 
                    ? 'Recommended for TopstepX users without ProjectX API subscription.' 
                    : 'Great for real-time trading with live market data.'}
                </span>
              </p>
            </button>
          </div>
        </div>
      </SectionPanel>

      {/* TopStepX Info Banner */}
      {selectedBroker === 'topstepx' && chartMode === 'standard' && (
        <div className="bg-blue-900/30 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <div className="font-medium mb-1">TopStepX Historical Data Notice</div>
              <div className="text-sm">
                TopStepX historical data requires a separate ProjectX API subscription ($14.50-$29/month).
                Without this subscription, charts may not display historical data.
                Consider using the <span className="text-green-300 font-medium">Hybrid Chart</span> option which can function with real-time data only.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Data Summary */}
      {selectedContract && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">Trading Data Summary - {selectedContract}</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadTradingData}
                disabled={isLoadingTrades}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                {isLoadingTrades ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-sm">Recent Trades</div>
              <div className="text-white text-lg font-medium">{trades.length}</div>
              <div className="text-gray-400 text-xs">
                {trades.length > 0 && 'Latest trade available'}
              </div>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-sm">Open Positions</div>
              <div className="text-white text-lg font-medium">{positions.length}</div>
              <div className="text-gray-400 text-xs">
                {positions.length > 0 && `Total Size: ${positions.reduce((sum, pos) => sum + Math.abs(pos.size || 0), 0)}`}
              </div>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-sm">P&L Summary</div>
              <div className="text-white text-lg font-medium">
                {positions.length > 0 ? 'Positions open' : 'No positions'}
              </div>
              <div className="text-gray-400 text-xs">{positions.length} active positions</div>
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
        <h3 className="text-white font-medium mb-4">Chart Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h4 className="text-green-400 font-medium">Chart Types</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Candlestick (default)</li>
              <li>• Line Chart</li>
              <li>• Bar Chart</li>
              <li>• Area Chart</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-blue-400 font-medium">Drawing Tools</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Trendlines</li>
              <li>• Support/Resistance</li>
              <li>• Fibonacci Retracements</li>
              <li>• Rectangles & Circles</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-purple-400 font-medium">Indicators</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Python Indicators</li>
              <li>• JavaScript Indicators</li>
              <li>• Java Indicators</li>
              <li>• C# Indicators</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-yellow-400 font-medium">Trading Features</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Trade History Overlay</li>
              <li>• Position Markers</li>
              <li>• DOM Integration</li>
              <li>• Chart Trader (Coming Soon)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timeframes Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Available Timeframes</h3>
        <div className="flex flex-wrap gap-2">
          {['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].map(tf => (
            <span
              key={tf}
              className="bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm"
            >
              {tf}
            </span>
          ))}
        </div>
        <p className="text-gray-400 text-sm mt-3">
          Select different timeframes to analyze price action across various periods. 
          Historical data availability depends on your broker and subscription level.
        </p>
      </div>
    </div>
  );
};

export default ChartsView;
