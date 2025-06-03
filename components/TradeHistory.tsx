import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { Contract } from '../types';
import { getOrderSideText } from '../utils/orderHelpers';

interface TradeHistoryProps {
  selectedContract?: Contract | null;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ selectedContract }) => {
  const {
    selectedAccountId,
    fetchTrades,
    liveTradeUpdates
  } = useTradingContext();

  // Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load trades on component mount
  useEffect(() => {
    if (selectedAccountId) {
      loadTrades();
    }
  }, [selectedAccountId, selectedContract]);

  const loadTrades = async () => {
    if (!selectedAccountId) {
      setError('Please select an account first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: { 
        startTimestamp?: string; 
        endTimestamp?: string; 
        contractId?: string 
      } = {};

      if (startDate) {
        params.startTimestamp = new Date(startDate).toISOString();
      }

      if (endDate) {
        params.endTimestamp = new Date(endDate).toISOString();
      }

      if (selectedContract?.id) {
        params.contractId = selectedContract.id;
      }

      await fetchTrades(params);
    } catch (error) {
      setError(`Error fetching trades: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTrades();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const calculateTotalPnL = (): number => {
    return liveTradeUpdates.reduce((total, trade) => 
      total + (trade.profitAndLoss || 0), 0);
  };

  return (
    <div className="trade-history">
      <h2 className="text-xl font-bold mb-4">Trade History</h2>

      {/* Filter Form */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Filter Trades</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract</label>
              <input
                type="text"
                className="w-full p-2 border rounded bg-gray-100"
                value={selectedContract?.name || ''}
                disabled
                placeholder="Select a contract to filter"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedAccountId || isLoading}
            >
              {isLoading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </form>
      </div>

      {/* Trades Table */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Trades</h3>
          <div className="flex items-center">
            <span className="mr-4">
              Total P&L: 
              <span className={`font-bold ml-1 ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${calculateTotalPnL().toFixed(2)}
              </span>
            </span>
            <button
              onClick={loadTrades}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        {liveTradeUpdates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveTradeUpdates
                  .filter(trade => !trade.voided) // Filter out voided trades
                  .map(trade => (
                    <tr key={trade.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(trade.creationTimestamp)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {trade.contractId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${trade.side === 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {getOrderSideText(trade.side)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.size}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">${trade.price.toFixed(2)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {trade.profitAndLoss !== null && trade.profitAndLoss !== undefined ? (
                          <span className={`${trade.profitAndLoss >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            ${trade.profitAndLoss.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.orderId}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {isLoading ? 'Loading trades...' : 'No trades found for the selected filters'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TradeHistory;
