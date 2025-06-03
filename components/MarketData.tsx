import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { 
  getMarketQuote, 
  getMarketDepth, 
  getMarketTrades, 
  getOrderBook 
} from '../services/tradingApiService';
import { 
  MarketQuote, 
  MarketDepth, 
  MarketTrade, 
  OrderBook 
} from '../types';
import LoadingSpinner from './LoadingSpinner';

interface MarketDataProps {
  contractId?: string;
}

const MarketData: React.FC<MarketDataProps> = ({ contractId }) => {
  const { sessionToken, selectedBroker } = useTradingContext();
  
  const [selectedContractId, setSelectedContractId] = useState<string>(contractId || '');
  const [marketQuote, setMarketQuote] = useState<MarketQuote | null>(null);
  const [marketDepth, setMarketDepth] = useState<MarketDepth | null>(null);
  const [marketTrades, setMarketTrades] = useState<MarketTrade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedContractId && sessionToken && selectedBroker) {
      fetchMarketData();
    }
  }, [selectedContractId, sessionToken, selectedBroker]);

  useEffect(() => {
    if (autoRefresh && selectedContractId) {
      const interval = setInterval(() => {
        fetchMarketData();
      }, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, selectedContractId]);

  // When prop contractId changes, update state
  useEffect(() => {
    if (contractId) {
      setSelectedContractId(contractId);
    }
  }, [contractId]);

  const fetchMarketData = async () => {
    if (!selectedContractId || !sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all market data in parallel
      const [quoteRes, depthRes, tradesRes, orderBookRes] = await Promise.all([
        getMarketQuote(selectedBroker, sessionToken, { contractId: selectedContractId }),
        getMarketDepth(selectedBroker, sessionToken, { contractId: selectedContractId, levels: 10 }),
        getMarketTrades(selectedBroker, sessionToken, { contractId: selectedContractId, limit: 50 }),
        getOrderBook(selectedBroker, sessionToken, { contractId: selectedContractId, depth: 10 })
      ]);

      if (quoteRes.success) {
        setMarketQuote(quoteRes.quote);
      } else if (quoteRes.errorMessage) {
        console.log('Market Quote:', quoteRes.errorMessage);
      }
      
      if (depthRes.success) {
        setMarketDepth(depthRes.depth);
      } else if (depthRes.errorMessage) {
        console.log('Market Depth:', depthRes.errorMessage);
      }
      
      if (tradesRes.success) {
        setMarketTrades(tradesRes.trades);
      } else if (tradesRes.errorMessage) {
        console.log('Market Trades:', tradesRes.errorMessage);
      }
      
      if (orderBookRes.success) {
        setOrderBook(orderBookRes.orderBook);
      } else if (orderBookRes.errorMessage) {
        console.log('Order Book:', orderBookRes.errorMessage);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(4);
  };

  const formatVolume = (volume: number) => {
    return volume.toLocaleString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(4)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Market Data</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-white text-sm">
              Auto Refresh (5s)
            </label>
          </div>
          <button
            onClick={fetchMarketData}
            disabled={isLoading || !selectedContractId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Contract Selection (hide when contractId prop provided) */}
      {!contractId && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contract Selection</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              placeholder="Enter Contract ID (e.g., ES, NQ, YM)"
              className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            />
            <button
              onClick={fetchMarketData}
              disabled={!selectedContractId || isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Load Data
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* TopStepX Market Data Information */}
      {selectedBroker === 'topstepx' && (
        <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <div className="font-medium mb-1">TopStepX Market Data</div>
              <div className="text-sm">
                Market data for TopStepX is available through real-time WebSocket streams and the platform interface.
                For live quotes, depth, and trades, use the platform's built-in DOM and charts, or access real-time data feeds through the WebSocket connections.
              </div>
              <div className="text-xs mt-2 text-blue-300">
                The Market Data tab shows structural information - live data is available through the Trading tab and WebSocket feeds.
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {/* Market Quote */}
      {marketQuote && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Market Quote - {marketQuote.contractId}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-gray-400 text-sm">Bid</div>
              <div className="text-blue-400 text-xl font-bold">{formatPrice(marketQuote.bid)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Ask</div>
              <div className="text-red-400 text-xl font-bold">{formatPrice(marketQuote.ask)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Last</div>
              <div className="text-white text-xl font-bold">{formatPrice(marketQuote.last)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Change</div>
              <div className={`text-lg font-medium ${marketQuote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatChange(marketQuote.change, marketQuote.changePercent)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Volume</div>
              <div className="text-white text-lg font-medium">{formatVolume(marketQuote.volume)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Time</div>
              <div className="text-gray-300 text-sm">{formatTime(marketQuote.timestamp)}</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Open:</span>
              <span className="text-white">{formatPrice(marketQuote.open)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">High:</span>
              <span className="text-green-400">{formatPrice(marketQuote.high)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Low:</span>
              <span className="text-red-400">{formatPrice(marketQuote.low)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Close:</span>
              <span className="text-white">{formatPrice(marketQuote.close)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Depth */}
        {marketDepth && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Market Depth</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Bids */}
              <div>
                <h4 className="text-blue-400 font-medium mb-2">Bids</h4>
                <div className="space-y-1">
                  {marketDepth.bids.slice(0, 10).map((bid, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-blue-400">{formatPrice(bid.price)}</span>
                      <span className="text-white">{bid.size}</span>
                      <span className="text-gray-400">{bid.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Asks */}
              <div>
                <h4 className="text-red-400 font-medium mb-2">Asks</h4>
                <div className="space-y-1">
                  {marketDepth.asks.slice(0, 10).map((ask, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-red-400">{formatPrice(ask.price)}</span>
                      <span className="text-white">{ask.size}</span>
                      <span className="text-gray-400">{ask.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-gray-400 text-sm">
              Updated: {formatTime(marketDepth.timestamp)}
            </div>
          </div>
        )}

        {/* Order Book */}
        {orderBook && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Book</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Spread:</span>
                <span className="text-white font-medium">{formatPrice(orderBook.spread)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Bids */}
              <div>
                <h4 className="text-blue-400 font-medium mb-2">Bids</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Price</span>
                    <span>Size</span>
                    <span>Orders</span>
                  </div>
                  {orderBook.bids.slice(0, 8).map((bid, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-blue-400">{formatPrice(bid.price)}</span>
                      <span className="text-white">{bid.size}</span>
                      <span className="text-gray-400">{bid.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Asks */}
              <div>
                <h4 className="text-red-400 font-medium mb-2">Asks</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Price</span>
                    <span>Size</span>
                    <span>Orders</span>
                  </div>
                  {orderBook.asks.slice(0, 8).map((ask, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-red-400">{formatPrice(ask.price)}</span>
                      <span className="text-white">{ask.size}</span>
                      <span className="text-gray-400">{ask.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-gray-400 text-sm">
              Updated: {formatTime(orderBook.timestamp)}
            </div>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      {marketTrades.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Time</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Size</th>
                  <th className="text-center py-2">Side</th>
                </tr>
              </thead>
              <tbody>
                {marketTrades.slice(0, 20).map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-300">{formatTime(trade.timestamp)}</td>
                    <td className="py-2 text-right text-white font-medium">{formatPrice(trade.price)}</td>
                    <td className="py-2 text-right text-white">{trade.size}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.side === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!selectedContractId && !selectedBroker && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">No Broker Connected</h3>
          <p className="text-gray-400">Please connect to a broker first through the Broker Connect tab to view market data.</p>
        </div>
      )}
      
      {selectedBroker && !selectedContractId && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Enter Contract Symbol</h3>
          <p className="text-gray-400">Enter a contract ID above to view market data (e.g., ES, NQ, RTY, CL, GC)</p>
        </div>
      )}

      {/* WebSocket Live Data Integration for TopStepX */}
      {selectedBroker === 'topstepx' && selectedContractId && marketQuote && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Data Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded p-4 text-center">
              <div className="text-blue-400 text-sm">WebSocket Status</div>
              <div className="text-white font-medium">Available via Trading Context</div>
            </div>
            <div className="bg-gray-700 rounded p-4 text-center">
              <div className="text-green-400 text-sm">Real-time Quotes</div>
              <div className="text-white font-medium">Platform DOM & Charts</div>
            </div>
            <div className="bg-gray-700 rounded p-4 text-center">
              <div className="text-purple-400 text-sm">Historical Data</div>
              <div className="text-white font-medium">Available via API</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              For live market data with TopStepX, use the Trading tab with real-time WebSocket connections
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketData; 