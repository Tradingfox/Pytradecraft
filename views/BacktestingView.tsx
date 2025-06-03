import React, { useState, useCallback } from 'react';
import SectionPanel from '../components/SectionPanel';
import BacktestChart from '../components/BacktestChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ConsoleOutput from '../components/ConsoleOutput';
import { Algorithm, BacktestResult, GeminiRequestStatus } from '../types';
import { MOCK_ALGORITHMS } from '../services/mockTradingService';
import { runBacktest } from '../services/backtestService';
import { analyzeBacktestResults, analyzeBacktestResultsWithContext } from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';
import { useTradingContext } from '../contexts/TradingContext';
import { GEMINI_API_KEY_INFO_URL } from '../constants';
import { SETTINGS_VIEW_URL } from '../constants.ts';


const BacktestingView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey } = useAppContext();
  const { sessionToken } = useTradingContext();
  const [algorithms] = useState<Algorithm[]>(MOCK_ALGORITHMS);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string>(algorithms.length > 0 ? algorithms[0].id : '');
  const [contractId, setContractId] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const [startDate, setStartDate] = useState<string>(oneYearAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(today);
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [interval, setInterval] = useState<string>('1d');

  const [backtestStatus, setBacktestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestLogs, setBacktestLogs] = useState<string[]>([]);

  const [geminiAnalysisStatus, setGeminiAnalysisStatus] = useState<GeminiRequestStatus>(GeminiRequestStatus.IDLE);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string[]>([]);
  const [analysisMethod, setAnalysisMethod] = useState<'standard' | 'context'>('standard');

  const handleRunBacktest = useCallback(async () => {
    const algorithm = algorithms.find(a => a.id === selectedAlgorithmId);
    if (!algorithm) {
      setBacktestLogs(prev => [...prev, 'Error: Selected algorithm not found.']);
      return;
    }

    if (!contractId) {
      setBacktestLogs(prev => [...prev, 'Error: Please enter a TopstepX Contract ID.']);
      return;
    }

    setBacktestStatus('running');
    setBacktestLogs([
      `Starting backtest for "${algorithm.name}"...`,
      `Contract ID: ${contractId}`,
      `Date Range: ${startDate} to ${endDate}`,
      `Initial Capital: $${initialCapital.toLocaleString()}`,
      `Interval: ${interval}`
    ]);
    setBacktestResult(null);
    setGeminiAnalysis([]);
    setGeminiAnalysisStatus(GeminiRequestStatus.IDLE);

    try {
      // Use the backtestService with real TopstepX data
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
      setBacktestLogs(prev => [...prev, ...result.logs, 'Backtest completed successfully.']);
      setBacktestStatus('completed');
    } catch (error) {
      console.error("Backtest error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBacktestLogs(prev => [...prev, `Backtest failed: ${errorMessage}`]);
      setBacktestStatus('error');
    }
  }, [selectedAlgorithmId, algorithms, contractId, startDate, endDate, initialCapital, interval, sessionToken]);

  const handleAnalyzeWithGemini = useCallback(async () => {
    if (!backtestResult) {
        setGeminiAnalysis(["Error: No backtest results to analyze."]);
        return;
    }
    if (!geminiApiKey || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') {
        setGeminiAnalysis(prev => [...prev, `Error: Gemini API Key is ${apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. Please set it in the [settings](${SETTINGS_VIEW_URL}). Get a new key: ${GEMINI_API_KEY_INFO_URL}`]);
        setGeminiAnalysisStatus(GeminiRequestStatus.ERROR);
        return;
    }

    setGeminiAnalysisStatus(GeminiRequestStatus.LOADING);
    setGeminiAnalysis([`Requesting ${analysisMethod} analysis from Gemini...`]);

    const summary = `
Algorithm: ${backtestResult.algorithmName}
Period: ${backtestResult.startDate} to ${backtestResult.endDate}
Initial Capital: $${backtestResult.initialCapital.toLocaleString()}
Final Equity: $${backtestResult.finalEquity.toLocaleString()}
Total Return: ${backtestResult.totalReturn}
Sharpe Ratio: ${backtestResult.sharpeRatio}
Max Drawdown: ${backtestResult.maxDrawdown}
Number of Trades: ${backtestResult.trades.length}
    `;

    try {
        let analysisText: string;

        if (analysisMethod === 'context') {
            analysisText = await analyzeBacktestResultsWithContext(geminiApiKey, summary);
            setGeminiAnalysis(prev => [...prev, "--- Gemini Context-Aware Analysis ---", analysisText, "--- End of Analysis ---"]);
        } else {
            analysisText = await analyzeBacktestResults(geminiApiKey, summary);
            setGeminiAnalysis(prev => [...prev, "--- Gemini Standard Analysis ---", analysisText, "--- End of Analysis ---"]);
        }

        setGeminiAnalysisStatus(GeminiRequestStatus.SUCCESS);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setGeminiAnalysis(prev => [...prev, `Error analyzing results with Gemini: ${errorMessage}`]);
        setGeminiAnalysisStatus(GeminiRequestStatus.ERROR);
    }
  }, [backtestResult, apiKeyStatus, geminiApiKey, analysisMethod]);


  return (
    <div className="space-y-6">
      <div className="bg-blue-900/50 border border-blue-500 text-blue-200 p-4 rounded-md mb-4">
        <h3 className="font-bold text-lg mb-2">Real TopstepX Data Integration</h3>
        <p className="mb-2">
          Backtesting now uses real TopstepX API historical data instead of mock data. To run a backtest:
        </p>
        <ol className="list-decimal list-inside ml-2 space-y-1">
          <li>Enter a valid TopstepX Contract ID (e.g., "ESM4", "NQM4", "CLM4")</li>
          <li>Select the desired interval for historical data</li>
          <li>Choose a date range and initial capital</li>
          <li>Click "Run Backtest" to execute the backtest with real market data</li>
        </ol>
        <p className="mt-2 text-sm">
          Note: You must be logged in to TopstepX to access historical data. The backtest will fall back to mock data if no session token is available.
        </p>
      </div>

      <SectionPanel title="Backtest Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="algorithmSelect" className="block text-sm font-medium text-gray-300 mb-1">Algorithm</label>
            <select 
              id="algorithmSelect"
              value={selectedAlgorithmId}
              onChange={(e) => setSelectedAlgorithmId(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
            >
              {algorithms.map(algo => <option key={algo.id} value={algo.id}>{algo.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="contractId" className="block text-sm font-medium text-gray-300 mb-1">TopstepX Contract ID</label>
            <input 
              type="text" 
              id="contractId" 
              value={contractId} 
              onChange={e => setContractId(e.target.value)} 
              placeholder="Enter TopstepX Contract ID" 
              className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500" 
            />
          </div>

          <div>
            <label htmlFor="interval" className="block text-sm font-medium text-gray-300 mb-1">Interval</label>
            <select 
              id="interval"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500" />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500" />
          </div>

          <div>
            <label htmlFor="initialCapital" className="block text-sm font-medium text-gray-300 mb-1">Initial Capital ($)</label>
            <input type="number" id="initialCapital" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500" />
          </div>

          <div className="lg:col-span-3">
            <button
              onClick={handleRunBacktest}
              disabled={backtestStatus === 'running'}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
            >
              {backtestStatus === 'running' ? <LoadingSpinner size="sm" message="Running Backtest..." /> : 'Run Backtest'}
            </button>
          </div>
        </div>
      </SectionPanel>

      {backtestStatus === 'running' && (
        <SectionPanel title="Backtest in Progress">
          <LoadingSpinner message="Simulating trades and calculating performance..." />
          <ConsoleOutput lines={backtestLogs} title="Live Logs" height="150px" className="mt-4"/>
        </SectionPanel>
      )}

      {backtestResult && backtestStatus === 'completed' && (
        <SectionPanel title={`Backtest Results: ${backtestResult.algorithmName}`}
          actions={
             <div className="flex items-center space-x-2">
               <select
                 value={analysisMethod}
                 onChange={(e) => setAnalysisMethod(e.target.value as 'standard' | 'context')}
                 className="bg-gray-700 text-white border border-gray-600 rounded-md px-2 py-1"
                 disabled={geminiAnalysisStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
               >
                 <option value="standard">Standard Analysis</option>
                 <option value="context">Context-aware Analysis</option>
               </select>
               <button
                  onClick={handleAnalyzeWithGemini}
                  disabled={geminiAnalysisStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition duration-150 ease-in-out disabled:opacity-50"
                >
                  {geminiAnalysisStatus === GeminiRequestStatus.LOADING ? <LoadingSpinner size="sm" /> : 'Analyze with Gemini'}
                </button>
             </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {backtestResult.metrics.map(metric => (
              <div key={metric.name} className="bg-gray-700 p-3 rounded-md shadow">
                <p className="text-sm text-gray-400">{metric.name}</p>
                <p className="text-lg font-semibold text-sky-400">{metric.value}</p>
              </div>
            ))}
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Equity Curve</h4>
          <BacktestChart data={backtestResult.equityCurve} />

           {(apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') && geminiAnalysisStatus !== GeminiRequestStatus.LOADING && (
                 <div className="mt-4 p-3 bg-yellow-800 border border-yellow-700 rounded-md text-yellow-200 text-sm">
                    Gemini analysis is disabled. API Key is {apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. 
                    Please update it in the <a href={SETTINGS_VIEW_URL} className="underline hover:text-yellow-100">settings</a>.
                    <a href={GEMINI_API_KEY_INFO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100 ml-1">Get a new key</a>.
                </div>
            )}
          <ConsoleOutput lines={geminiAnalysis} title="Gemini AI Analysis" height="150px" className="mt-6"/>
          <ConsoleOutput lines={backtestLogs} title="Full Backtest Logs" height="200px" className="mt-6"/>

          <h4 className="text-lg font-semibold text-white mt-6 mb-2">Simulated Trades ({backtestResult.trades.length})</h4>
          <div className="max-h-60 overflow-y-auto custom-scrollbar bg-gray-900 p-2 rounded border border-gray-700">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-750">
                    <tr>
                        <th scope="col" className="px-3 py-2">Timestamp</th>
                        <th scope="col" className="px-3 py-2">Symbol</th>
                        <th scope="col" className="px-3 py-2">Type</th>
                        <th scope="col" className="px-3 py-2">Qty</th>
                        <th scope="col" className="px-3 py-2">Price</th>
                        <th scope="col" className="px-3 py-2">P&L</th>
                    </tr>
                </thead>
                <tbody>
                    {backtestResult.trades.slice(0, 50).map(trade => ( // Display max 50 trades for performance
                        <tr key={trade.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                            <td className="px-3 py-2">{new Date(trade.timestamp).toLocaleString()}</td>
                            <td className="px-3 py-2">{trade.symbol}</td>
                            <td className={`px-3 py-2 font-semibold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</td>
                            <td className="px-3 py-2">{trade.quantity.toFixed(2)}</td>
                            <td className="px-3 py-2">${trade.price.toFixed(2)}</td>
                            <td className={`px-3 py-2 ${trade.pnl && trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {backtestResult.trades.length === 0 && <p className="p-3 text-center text-gray-500">No trades executed in this mock backtest.</p>}
             {backtestResult.trades.length > 50 && <p className="p-3 text-center text-xs text-gray-500">Displaying first 50 trades. Full list in logs or data export (not implemented).</p>}
          </div>
        </SectionPanel>
      )}

      {backtestStatus === 'error' && (
         <SectionPanel title="Backtest Error">
            <p className="text-red-400">The backtest encountered an error. Please check the logs.</p>
            <ConsoleOutput lines={backtestLogs} title="Error Logs" height="150px" className="mt-4"/>
        </SectionPanel>
      )}
    </div>
  );
};

export default BacktestingView;
