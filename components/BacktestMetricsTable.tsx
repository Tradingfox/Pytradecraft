import React from 'react';
import { BacktestMetric } from '../types';

interface BacktestMetricsTableProps {
  metrics: BacktestMetric[];
}

/**
 * Component for displaying backtest performance metrics in a table
 */
const BacktestMetricsTable: React.FC<BacktestMetricsTableProps> = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        No metrics available
      </div>
    );
  }

  return (
    <div className="backtest-metrics-table overflow-auto max-h-64">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Metric
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              Value
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-700 divide-y divide-gray-600">
          {metrics.map((metric, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-200">
                {metric.name}
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-right text-gray-200">
                {formatMetricValue(metric.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Helper function to format metric values based on their type
 */
const formatMetricValue = (value: string | number): string => {
  if (typeof value === 'number') {
    // Format numbers with 2 decimal places
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Check if the string is a percentage
  if (typeof value === 'string' && value.endsWith('%')) {
    // Return as is, it's already formatted
    return value;
  }
  
  // Check if the string is a currency value
  if (typeof value === 'string' && value.startsWith('$')) {
    // Return as is, it's already formatted
    return value;
  }
  
  // Default case, return as is
  return value;
};

export default BacktestMetricsTable;