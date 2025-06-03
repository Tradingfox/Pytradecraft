import React, { useState } from 'react';
import { Algorithm, BacktestResult } from '../types';
import { runBacktest, saveBacktestResult } from '../services/backtestService';
import SectionPanel from './SectionPanel';
import LoadingSpinner from './LoadingSpinner';
import BacktestResultsChart from './BacktestResultsChart';
import BacktestMetricsTable from './BacktestMetricsTable';
import BacktestTradesTable from './BacktestTradesTable';
import { useTradingContext } from '../contexts/TradingContext';

interface BacktestPanelProps {
  algorithm: Algorithm | null;
  onBacktestComplete?: (result: BacktestResult) => void;
}

/**
 * Component for configuring and running backtests
 */
const BacktestPanel: React.FC<BacktestPanelProps> = ({ algorithm, onBacktestComplete }) => {
  const { sessionToken } = useTradingContext();

  // Backtest configuration state
  const [contractId, setContractId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days ago
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today
  );
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [interval, setInterval] = useState<string>('1d');

  // Backtest execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  // Available intervals for backtesting
  const intervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];

  // Function to run a backtest
  const handleRunBacktest = async () => {
    if (!algorithm) {
      setError('Please select an algorithm first');
      return;
    }

    if (!contractId) {
      setError('Please enter a contract ID');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      console.log('Starting backtest with parameters:', {
        algorithmId: algorithm.id,
        contractId,
        startDate,
        endDate,
        initialCapital,
        interval
      });

      const result = await runBacktest(
        algorithm,
        sessionToken,
        contractId,
        startDate,
        endDate,
        initialCapital,
        interval
      );

      setBacktestResult(result);

      // Save the result
      await saveBacktestResult(result);

      // Notify parent component
      if (onBacktestComplete) {
        onBacktestComplete(result);
      }

      console.log('Backtest completed successfully:', {
        algorithmId: algorithm.id,
        backtestId: result.id,
        trades: result.trades?.length || 0,
        profitLoss: result.profitLoss
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Backtest failed:', errorMessage);

      // Provide more user-friendly error messages
      let userMessage = `Error running backtest: ${errorMessage}`;

      // Add troubleshooting suggestions based on common errors
      if (errorMessage.includes('historical data') || errorMessage.includes('No data available')) {
        userMessage += '\n\nTroubleshooting tips:\n' +
          '• Verify the contract ID is correct\n' +
          '• Try a different date range\n' +
          '• Check if the selected interval is supported for this contract';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        userMessage += '\n\nTroubleshooting tips:\n' +
          '• Check your internet connection\n' +
          '• Try again in a few moments';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        userMessage += '\n\nTroubleshooting tips:\n' +
          '• Your session may have expired. Try logging in again';
      }

      setError(userMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="backtest-panel">
      <SectionPanel title="Backtest Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contract ID
            </label>
            <input
              type="text"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Enter TopstepX Contract ID"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Interval
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            >
              {intervals.map((int) => (
                <option key={int.value} value={int.value}>
                  {int.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Initial Capital
            </label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 whitespace-pre-line">
            {error}
          </div>
        )}

        <button
          onClick={handleRunBacktest}
          disabled={isRunning || !algorithm}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
        >
          {isRunning ? <LoadingSpinner size="sm" /> : 'Run Backtest'}
        </button>
      </SectionPanel>

      {backtestResult && (
        <>
          <SectionPanel title="Backtest Results" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-700 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-300 mb-1">Total Return</h4>
                <p className="text-xl font-bold text-white">{backtestResult.totalReturn}</p>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-300 mb-1">Sharpe Ratio</h4>
                <p className="text-xl font-bold text-white">{backtestResult.sharpeRatio.toFixed(2)}</p>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-300 mb-1">Max Drawdown</h4>
                <p className="text-xl font-bold text-white">{backtestResult.maxDrawdown}</p>
              </div>
            </div>

            <div className="h-64 mb-4">
              <BacktestResultsChart result={backtestResult} />
            </div>
          </SectionPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <SectionPanel title="Performance Metrics">
              <BacktestMetricsTable metrics={backtestResult.metrics} />
            </SectionPanel>

            <SectionPanel title="Trades">
              <BacktestTradesTable trades={backtestResult.trades} />
            </SectionPanel>
          </div>
        </>
      )}
    </div>
  );
};

export default BacktestPanel;
