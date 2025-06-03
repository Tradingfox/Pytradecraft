import React from 'react';
import { SimulatedTrade } from '../types';

interface BacktestTradesTableProps {
  trades: SimulatedTrade[];
}

/**
 * Component for displaying backtest trades in a table
 */
const BacktestTradesTable: React.FC<BacktestTradesTableProps> = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        No trades executed during this backtest
      </div>
    );
  }

  return (
    <div className="backtest-trades-table overflow-auto max-h-64">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Time
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Symbol
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Type
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Quantity
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Price
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              P&L
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-700 divide-y divide-gray-600">
          {trades.map((trade, index) => (
            <tr key={trade.id || index} className={index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-200">
                {formatDate(trade.timestamp)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-200">
                {trade.symbol}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    trade.type === 'BUY' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                  }`}
                >
                  {trade.type}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-200">
                {trade.quantity.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-200">
                ${trade.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                {trade.pnl !== undefined ? (
                  <span
                    className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}
                  >
                    ${trade.pnl.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Helper function to format date strings
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export default BacktestTradesTable;