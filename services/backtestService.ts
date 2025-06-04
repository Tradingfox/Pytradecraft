import { Algorithm, BacktestResult, HistoricalDataRequest, HistoricalBar, EquityDataPoint, SimulatedTrade } from '../types';
import { getHistoricalData } from './tradingApiService';
import { runMockBacktest } from './mockTradingService';

// Placeholder for authentication token retrieval
const getAuthToken = () => 'dummy-auth-token';

/**
 * Service for running backtests on trading algorithms
 */

/**
 * Process historical data and generate a backtest result
 * @param algorithm The algorithm being tested
 * @param historicalBars The historical price bars
 * @param startDate Start date for backtest
 * @param endDate End date for backtest
 * @param initialCapital Initial capital for backtest
 * @param contractId The contract ID being tested
 * @returns BacktestResult with performance metrics
 */
export const processHistoricalData = (
  algorithm: Algorithm,
  historicalBars: HistoricalBar[],
  startDate: string,
  endDate: string,
  initialCapital: number,
  contractId: string
): BacktestResult => {
  console.log(`Processing ${historicalBars.length} historical bars for algorithm ${algorithm.name}`);

  // Initialize backtest state
  const equityCurve: EquityDataPoint[] = [];
  const trades: SimulatedTrade[] = [];
  const logs: string[] = [`Backtest started for ${algorithm.name} from ${startDate} to ${endDate} with $${initialCapital.toLocaleString()}`];

  let currentEquity = initialCapital;
  let cash = initialCapital;
  let position = 0; // Current position size (positive for long, negative for short)
  let entryPrice = 0; // Price at which position was entered

  // Simple algorithm simulation based on price movements
  // In a real implementation, this would execute the algorithm's code against the historical data
  historicalBars.forEach((bar, index) => {
    const timestamp = new Date(bar.timestamp);
    const dateStr = timestamp.toISOString().split('T')[0];

    // Skip the first bar as we need at least one previous bar for comparison
    if (index > 0) {
      const prevBar = historicalBars[index - 1];

      // Simple trend-following logic (buy when price increases, sell when it decreases)
      // This is a placeholder for actual algorithm execution
      if (bar.close > prevBar.close && position <= 0) {
        // Buy signal
        const quantity = Math.floor(cash / bar.close * 0.95) / 100; // Use 95% of available cash, scaled down
        if (quantity > 0) {
          // Close any existing short position
          if (position < 0) {
            const closeShortPnl = (entryPrice - bar.close) * Math.abs(position);
            logs.push(`${dateStr}: Closing short position of ${Math.abs(position).toFixed(2)} units at $${bar.close.toFixed(2)}, P&L: $${closeShortPnl.toFixed(2)}`);

            trades.push({
              id: `trade-${Date.now()}-${index}-cover`,
              timestamp: bar.timestamp,
              symbol: contractId,
              type: 'BUY', // Buy to cover
              quantity: Math.abs(position),
              price: bar.close,
              pnl: closeShortPnl
            });

            cash += closeShortPnl;
            position = 0;
          }

          // Enter new long position
          cash -= quantity * bar.close;
          position = quantity;
          entryPrice = bar.close;

          logs.push(`${dateStr}: BUY ${quantity.toFixed(2)} units of ${contractId} @ $${bar.close.toFixed(2)}`);

          trades.push({
            id: `trade-${Date.now()}-${index}-buy`,
            timestamp: bar.timestamp,
            symbol: contractId,
            type: 'BUY',
            quantity: quantity,
            price: bar.close
          });
        }
      } else if (bar.close < prevBar.close && position >= 0) {
        // Sell signal
        if (position > 0) {
          // Close existing long position
          const closeLongPnl = (bar.close - entryPrice) * position;
          logs.push(`${dateStr}: Closing long position of ${position.toFixed(2)} units at $${bar.close.toFixed(2)}, P&L: $${closeLongPnl.toFixed(2)}`);

          trades.push({
            id: `trade-${Date.now()}-${index}-sell`,
            timestamp: bar.timestamp,
            symbol: contractId,
            type: 'SELL',
            quantity: position,
            price: bar.close,
            pnl: closeLongPnl
          });

          cash += position * bar.close;
          position = 0;
        }

        // Enter new short position (if supported)
        const shortQuantity = Math.floor(cash / bar.close * 0.95) / 100; // Use 95% of available cash, scaled down
        if (shortQuantity > 0) {
          position = -shortQuantity;
          entryPrice = bar.close;

          logs.push(`${dateStr}: SHORT ${shortQuantity.toFixed(2)} units of ${contractId} @ $${bar.close.toFixed(2)}`);

          trades.push({
            id: `trade-${Date.now()}-${index}-short`,
            timestamp: bar.timestamp,
            symbol: contractId,
            type: 'SELL', // Sell to short
            quantity: shortQuantity,
            price: bar.close
          });
        }
      }
    }

    // Calculate current equity (cash + position value)
    const positionValue = position * bar.close;
    currentEquity = cash + positionValue;

    // Add to equity curve (not every bar to keep the data size reasonable)
    if (index % Math.max(1, Math.floor(historicalBars.length / 100)) === 0) {
      equityCurve.push({
        date: dateStr,
        value: parseFloat(currentEquity.toFixed(2))
      });
    }
  });

  // Close any open position at the end of the backtest
  if (position !== 0) {
    const lastBar = historicalBars[historicalBars.length - 1];
    const lastDate = new Date(lastBar.timestamp).toISOString().split('T')[0];

    if (position > 0) {
      // Close long position
      const finalPnl = (lastBar.close - entryPrice) * position;
      logs.push(`${lastDate}: Closing final long position of ${position.toFixed(2)} units at $${lastBar.close.toFixed(2)}, P&L: $${finalPnl.toFixed(2)}`);

      trades.push({
        id: `trade-${Date.now()}-final-sell`,
        timestamp: lastBar.timestamp,
        symbol: contractId,
        type: 'SELL',
        quantity: position,
        price: lastBar.close,
        pnl: finalPnl
      });

      cash += position * lastBar.close;
    } else {
      // Close short position
      const finalPnl = (entryPrice - lastBar.close) * Math.abs(position);
      logs.push(`${lastDate}: Closing final short position of ${Math.abs(position).toFixed(2)} units at $${lastBar.close.toFixed(2)}, P&L: $${finalPnl.toFixed(2)}`);

      trades.push({
        id: `trade-${Date.now()}-final-cover`,
        timestamp: lastBar.timestamp,
        symbol: contractId,
        type: 'BUY', // Buy to cover
        quantity: Math.abs(position),
        price: lastBar.close,
        pnl: finalPnl
      });

      cash += finalPnl;
    }

    position = 0;
    currentEquity = cash;

    // Add final equity point
    equityCurve.push({
      date: lastDate,
      value: parseFloat(currentEquity.toFixed(2))
    });
  }

  // Calculate performance metrics
  const finalEquity = parseFloat(currentEquity.toFixed(2));
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

  // Calculate drawdown
  let maxEquity = initialCapital;
  let maxDrawdown = 0;

  equityCurve.forEach(point => {
    if (point.value > maxEquity) {
      maxEquity = point.value;
    }

    const drawdown = ((maxEquity - point.value) / maxEquity) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Calculate Sharpe ratio (simplified)
  let returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].value - equityCurve[i-1].value) / equityCurve[i-1].value;
    returns.push(dailyReturn);
  }

  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized

  // Calculate win rate
  const winningTrades = trades.filter(trade => trade.pnl !== undefined && trade.pnl > 0).length;
  const losingTrades = trades.filter(trade => trade.pnl !== undefined && trade.pnl < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  // Calculate Gross Profit and Gross Loss
  const grossProfit = trades
    .filter(trade => trade.pnl !== undefined && trade.pnl > 0)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  const grossLoss = trades
    .filter(trade => trade.pnl !== undefined && trade.pnl < 0)
    .reduce((sum, trade) => sum + Math.abs(trade.pnl || 0), 0); // Sum of absolute values of losses

  // Profit Factor
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 1) : parseFloat((grossProfit / grossLoss).toFixed(2)); // Handle division by zero

  // Average Winning Trade
  const avgWinningTrade = winningTrades > 0 ? parseFloat((grossProfit / winningTrades).toFixed(2)) : 0;

  // Average Losing Trade
  const avgLosingTrade = losingTrades > 0 ? parseFloat((grossLoss / losingTrades).toFixed(2)) : 0;


  logs.push(`Backtest finished. Final Equity: $${finalEquity.toLocaleString()}`);
  logs.push(`Gross Profit: $${grossProfit.toFixed(2)}, Gross Loss: $${grossLoss.toFixed(2)}, Profit Factor: ${profitFactor === Infinity ? 'Infinity' : profitFactor}`);
  logs.push(`Avg Win: $${avgWinningTrade.toFixed(2)} (x${winningTrades}), Avg Loss: $${avgLosingTrade.toFixed(2)} (x${losingTrades})`);


  return {
    id: `backtest-${Date.now()}`,
    algorithmId: algorithm.id,
    algorithmName: algorithm.name,
    startDate,
    endDate,
    initialCapital,
    finalEquity,
    totalReturn: `${totalReturn.toFixed(2)}%`,
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: `${maxDrawdown.toFixed(2)}%`,
    equityCurve,
    metrics: [
      { name: 'Total Return', value: `${totalReturn.toFixed(2)}%` },
      { name: 'Sharpe Ratio', value: sharpeRatio.toFixed(2) },
      { name: 'Max Drawdown', value: `${maxDrawdown.toFixed(2)}%` },
      { name: 'Number of Trades', value: trades.length.toString() },
      { name: 'Winning Trades %', value: `${winRate.toFixed(1)}%` },
      { name: 'Profit Factor', value: profitFactor === Infinity ? 'Infinity' : profitFactor.toString() },
      { name: 'Avg Winning Trade', value: `$${avgWinningTrade.toFixed(2)}` },
      { name: 'Avg Losing Trade', value: `$${avgLosingTrade.toFixed(2)}` },
      { name: 'Gross Profit', value: `$${grossProfit.toFixed(2)}` },
      { name: 'Gross Loss', value: `$${grossLoss.toFixed(2)}` },
    ],
    logs,
    trades,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Run a backtest for an algorithm using TopstepX historical data
 * @param algorithm The algorithm to backtest
 * @param sessionToken TopstepX session token
 * @param contractId Contract ID to backtest on
 * @param startDate Start date for backtest
 * @param endDate End date for backtest
 * @param initialCapital Initial capital for backtest
 * @param interval Data interval (e.g., '1m', '5m', '1h', '1d')
 * @returns Promise with backtest result
 */
export const runBacktest = async (
  algorithm: Algorithm,
  sessionToken: string | null,
  contractId: string,
  startDate: string,
  endDate: string,
  initialCapital: number,
  interval: string = '1d'
): Promise<BacktestResult> => {
  try {
    // If no session token, fall back to mock backtest
    if (!sessionToken) {
      console.log('No session token provided, using mock backtest');
      return runMockBacktest(algorithm, startDate, endDate, initialCapital);
    }

    // Fetch historical data from TopstepX
    const historicalDataRequest: HistoricalDataRequest = {
      contractId,
      startDate,
      endDate,
      interval,
      includeAfterHours: true
    };

    console.log('Fetching historical data for backtest:', historicalDataRequest);
    const historicalData = await getHistoricalData('topstepx', sessionToken, historicalDataRequest);

    if (!historicalData.success || !historicalData.bars || historicalData.bars.length === 0) {
      console.error('Failed to fetch historical data:', historicalData.errorMessage);
      throw new Error(`Failed to fetch historical data: ${historicalData.errorMessage || 'Unknown error'}`);
    }

    console.log(`Retrieved ${historicalData.bars.length} bars for backtest from TopstepX API`);

    // Process the real historical data to generate backtest results
    const result = processHistoricalData(
      algorithm,
      historicalData.bars,
      startDate,
      endDate,
      initialCapital,
      contractId
    );

    return result;
  } catch (error) {
    console.error('Error running backtest:', error);
    throw error;
  }
};

/**
 * Save a backtest result to the database
 * @param backtestResult The backtest result to save
 * @returns Promise with the saved backtest result
 */
export const saveBacktestResult = async (backtestResult: BacktestResult): Promise<BacktestResult> => {
  const token = getAuthToken();
  const { algorithmId } = backtestResult; // Extract algorithmId from backtestResult

  if (!algorithmId) {
    console.error('Algorithm ID is missing in backtestResult');
    throw new Error('Algorithm ID is required to save backtest result');
  }

  try {
    const response = await fetch(`/api/algorithms/${algorithmId}/backtests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(backtestResult),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error saving backtest result:', errorData);
      throw new Error(errorData.error || `Failed to save backtest result: ${response.statusText}`);
    }

    const savedResult: BacktestResult = await response.json();
    console.log('Backtest result saved successfully:', savedResult.id);
    return savedResult;
  } catch (error) {
    console.error('Error in saveBacktestResult:', error);
    throw error; // Re-throw to be handled by the caller
  }
};

/**
 * Get backtest results for an algorithm
 * @param algorithmId The algorithm ID
 * @returns Promise with an array of backtest results
 */
export const getBacktestResults = async (algorithmId: string): Promise<BacktestResult[]> => {
  const token = getAuthToken();
  try {
    const response = await fetch(`/api/algorithms/${algorithmId}/backtests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error getting backtest results:', errorData);
      throw new Error(errorData.error || `Failed to get backtest results: ${response.statusText}`);
    }

    const results: BacktestResult[] = await response.json();
    console.log(`Fetched ${results.length} backtest results for algorithm:`, algorithmId);
    return results;
  } catch (error) {
    console.error('Error in getBacktestResults:', error);
    throw error;
  }
};

/**
 * Get a specific backtest result
 * @param backtestId The backtest result ID
 * @returns Promise with the backtest result
 */
export const getBacktestResult = async (backtestId: string): Promise<BacktestResult | null> => {
  const token = getAuthToken();
  try {
    const response = await fetch(`/api/algorithms/backtests/${backtestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Backtest result not found:', backtestId);
        return null;
      }
      const errorData = await response.json();
      console.error('Error getting backtest result:', errorData);
      throw new Error(errorData.error || `Failed to get backtest result: ${response.statusText}`);
    }

    const result: BacktestResult = await response.json();
    console.log('Fetched backtest result:', result.id);
    return result;
  } catch (error) {
    console.error('Error in getBacktestResult:', error);
    throw error;
  }
};
