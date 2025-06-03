import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { 
  getAccountDetails, 
  getAccountBalance, 
  getAccountMarginInfo, 
  getPortfolioSummary, 
  getPortfolioPerformance 
} from '../services/tradingApiService';
import { 
  AccountDetails, 
  AccountBalance, 
  AccountMargin, 
  PortfolioSummary, 
  PortfolioPerformanceData 
} from '../types';
import LoadingSpinner from './LoadingSpinner';

const PortfolioManagement: React.FC = () => {
  const { selectedAccountId, sessionToken, selectedBroker } = useTradingContext();
  
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  const [marginInfo, setMarginInfo] = useState<AccountMargin | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [performanceData, setPerformanceData] = useState<PortfolioPerformanceData[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1M');

  useEffect(() => {
    if (selectedAccountId && sessionToken && selectedBroker) {
      fetchPortfolioData();
    }
  }, [selectedAccountId, sessionToken, selectedBroker, selectedPeriod]);

  const fetchPortfolioData = async () => {
    if (!selectedAccountId || !sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const accountIdToUse = selectedAccountId;
      // Fetch all portfolio data in parallel
      const [detailsRes, balanceRes, marginRes, summaryRes, performanceRes] = await Promise.all([
        getAccountDetails(selectedBroker, sessionToken, accountIdToUse),
        getAccountBalance(selectedBroker, sessionToken, accountIdToUse),
        getAccountMarginInfo(selectedBroker, sessionToken, accountIdToUse),
        getPortfolioSummary(selectedBroker, sessionToken, accountIdToUse),
        getPortfolioPerformance(selectedBroker, sessionToken, { 
          accountId: accountIdToUse,
          period: selectedPeriod.toLowerCase() as 'daily' | 'weekly' | 'monthly'
          // startDate and endDate could be added here if needed for performance tracking
        })
      ]);

      if (detailsRes.success) {
        setAccountDetails(detailsRes.account);
      } else {
        console.error('Failed to fetch account details:', detailsRes.errorMessage);
        // Optionally set error state here
      }
      
      if (balanceRes.success) {
        setAccountBalance(balanceRes.balance);
      } else {
        console.error('Failed to fetch account balance:', balanceRes.errorMessage);
      }
      
      if (marginRes.success) {
        setMarginInfo(marginRes.margin);
      } else {
        console.error('Failed to fetch margin info:', marginRes.errorMessage);
      }
      
      if (summaryRes.success) {
        setPortfolioSummary(summaryRes.summary);
      } else {
        console.error('Failed to fetch portfolio summary:', summaryRes.errorMessage);
      }
      
      if (performanceRes.success) {
        setPerformanceData(performanceRes.data);
      } else {
        console.error('Failed to fetch portfolio performance:', performanceRes.errorMessage);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio data';
      setError(errorMessage);
      console.error(errorMessage, err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (!selectedAccountId) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Portfolio Management</h2>
        <p className="text-gray-400">Please select an account to view portfolio information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Portfolio Management</h2>
        <button
          onClick={fetchPortfolioData}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {accountBalance && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Balance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Balance:</span>
                <span className="text-white font-medium">
                  {formatCurrency(accountBalance.balance, accountBalance.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Equity:</span>
                <span className="text-white font-medium">
                  {formatCurrency(accountBalance.equity, accountBalance.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unrealized P&L:</span>
                <span className={`font-medium ${accountBalance.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(accountBalance.unrealizedPnL, accountBalance.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Realized P&L:</span>
                <span className={`font-medium ${accountBalance.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(accountBalance.realizedPnL, accountBalance.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {marginInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Margin Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Margin:</span>
                <span className="text-white font-medium">
                  {formatCurrency(marginInfo.totalMargin, marginInfo.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Used Margin:</span>
                <span className="text-white font-medium">
                  {formatCurrency(marginInfo.usedMargin, marginInfo.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Free Margin:</span>
                <span className="text-white font-medium">
                  {formatCurrency(marginInfo.freeMargin, marginInfo.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin Level:</span>
                <span className={`font-medium ${marginInfo.marginLevel > 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {marginInfo.marginLevel.toFixed(2)}%
                </span>
              </div>
              {marginInfo.marginCall && (
                <div className="text-red-400 text-sm font-medium">⚠️ Margin Call</div>
              )}
            </div>
          </div>
        )}

        {portfolioSummary && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total P&L:</span>
                <span className={`font-medium ${portfolioSummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(portfolioSummary.totalPnL, portfolioSummary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Daily P&L:</span>
                <span className={`font-medium ${portfolioSummary.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(portfolioSummary.dailyPnL, portfolioSummary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-white font-medium">
                  {formatPercentage(portfolioSummary.winRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades:</span>
                <span className="text-white font-medium">
                  {portfolioSummary.totalTrades}
                </span>
              </div>
            </div>
          </div>
        )}

        {accountDetails && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-medium">{accountDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white font-medium">{accountDetails.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${accountDetails.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {accountDetails.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Open Positions:</span>
                <span className="text-white font-medium">{accountDetails.openPositions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Open Orders:</span>
                <span className="text-white font-medium">{accountDetails.openOrders}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Chart */}
      {performanceData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Performance Chart</h3>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1"
            >
              <option value="1D">1 Day</option>
              <option value="1W">1 Week</option>
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
            </select>
          </div>
          
          <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Performance chart would be rendered here</p>
            <p className="text-gray-500 text-sm ml-2">({performanceData.length} data points)</p>
          </div>
        </div>
      )}

      {/* Detailed Metrics */}
      {portfolioSummary && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Detailed Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Profit Factor:</span>
                <span className="text-white font-medium">{portfolioSummary.profitFactor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sharpe Ratio:</span>
                <span className="text-white font-medium">{portfolioSummary.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Drawdown:</span>
                <span className="text-red-400 font-medium">
                  {formatCurrency(portfolioSummary.maxDrawdown, portfolioSummary.currency)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Winning Trades:</span>
                <span className="text-green-400 font-medium">{portfolioSummary.winningTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Losing Trades:</span>
                <span className="text-red-400 font-medium">{portfolioSummary.losingTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Average Win:</span>
                <span className="text-green-400 font-medium">
                  {formatCurrency(portfolioSummary.averageWin, portfolioSummary.currency)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Average Loss:</span>
                <span className="text-red-400 font-medium">
                  {formatCurrency(portfolioSummary.averageLoss, portfolioSummary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly P&L:</span>
                <span className={`font-medium ${portfolioSummary.monthlyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(portfolioSummary.monthlyPnL, portfolioSummary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Yearly P&L:</span>
                <span className={`font-medium ${portfolioSummary.yearlyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(portfolioSummary.yearlyPnL, portfolioSummary.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioManagement; 