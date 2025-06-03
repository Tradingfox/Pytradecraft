/**
 * Utility functions for calculating technical indicators
 */

import { HistoricalBar } from '../types';

/**
 * Calculate Simple Moving Average (SMA)
 * @param data Array of price data
 * @param period Length of the moving average
 * @param sourceFn Function to extract the source value from each data point (default: close price)
 * @returns Array of SMA values
 */
export function calculateSMA(
  data: HistoricalBar[],
  period: number,
  sourceFn: (bar: HistoricalBar) => number = (bar) => bar.close
): number[] {
  const result: number[] = [];

  if (data.length === 0 || period <= 0) {
    return result;
  }

  let sum = 0;

  // Initial calculation
  for (let i = 0; i < data.length; i++) {
    const sourceValue = sourceFn(data[i]);
    sum += sourceValue;

    if (i >= period - 1) {
      result.push(sum / period);
      sum -= sourceFn(data[i - (period - 1)]);
    } else {
      result.push(NaN); // Not enough data yet
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data Array of price data
 * @param period Length of the moving average
 * @param sourceFn Function to extract the source value from each data point (default: close price)
 * @returns Array of EMA values
 */
export function calculateEMA(
  data: HistoricalBar[],
  period: number,
  sourceFn: (bar: HistoricalBar) => number = (bar) => bar.close
): number[] {
  const result: number[] = [];

  if (data.length === 0 || period <= 0) {
    return result;
  }

  // Calculate initial SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += sourceFn(data[i]);
  }

  // Calculate the multiplier
  const multiplier = 2 / (period + 1);

  // Set first EMA value
  let ema = sum / Math.min(period, data.length);

  // Calculate EMA for each data point
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN); // Not enough data yet
    } else {
      if (i === period - 1) {
        // First EMA (SMA)
        result.push(ema);
      } else {
        // Calculate next EMA
        ema = (sourceFn(data[i]) - ema) * multiplier + ema;
        result.push(ema);
      }
    }
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param data Array of price data
 * @param period RSI period (typically 14)
 * @param sourceFn Function to extract the source value from each data point (default: close price)
 * @returns Array of RSI values
 */
export function calculateRSI(
  data: HistoricalBar[],
  period: number = 14,
  sourceFn: (bar: HistoricalBar) => number = (bar) => bar.close
): number[] {
  const result: number[] = [];

  if (data.length <= period) {
    return Array(data.length).fill(NaN);
  }

  // Calculate price changes
  const changes: number[] = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(sourceFn(data[i]) - sourceFn(data[i - 1]));
  }

  // Calculate initial averages
  let sumGain = 0;
  let sumLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      sumGain += changes[i];
    } else {
      sumLoss += Math.abs(changes[i]);
    }
  }

  // Calculate first RS and RSI
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  // Push NaN for the first values where RSI can't be calculated
  for (let i = 0; i < period; i++) {
    result.push(NaN);
  }

  // Calculate first RSI
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  let rsi = 100 - (100 / (1 + rs));
  result.push(rsi);

  // Calculate remaining RSI values using Wilder's smoothing method
  for (let i = period + 1; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    rsi = 100 - (100 / (1 + rs));

    result.push(rsi);
  }

  return result;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * @param data Array of price data
 * @param fastPeriod Fast EMA period (typically 12)
 * @param slowPeriod Slow EMA period (typically 26)
 * @param signalPeriod Signal EMA period (typically 9)
 * @param sourceFn Function to extract the source value from each data point (default: close price)
 * @returns Object containing MACD line, signal line, and histogram values
 */
export function calculateMACD(
  data: HistoricalBar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
  sourceFn: (bar: HistoricalBar) => number = (bar) => bar.close
): { macd: number[], signal: number[], histogram: number[] } {
  const result = {
    macd: Array(data.length).fill(NaN),
    signal: Array(data.length).fill(NaN),
    histogram: Array(data.length).fill(NaN)
  };

  if (data.length <= slowPeriod) {
    return result;
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(data, fastPeriod, sourceFn);
  const slowEMA = calculateEMA(data, slowPeriod, sourceFn);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = fastEMA.map((fast, index) => {
    if (isNaN(fast) || isNaN(slowEMA[index])) {
      return NaN;
    }
    return fast - slowEMA[index];
  });

  // Create data structure for calculating signal line
  const macdData: { macd: number }[] = macdLine.map(value => ({ macd: value }));

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(
    macdData as any,
    signalPeriod,
    (bar: { macd: number }) => bar.macd
  );

  // Calculate histogram (MACD line - signal line)
  const histogram = macdLine.map((macd, index) => {
    if (isNaN(macd) || isNaN(signalLine[index])) {
      return NaN;
    }
    return macd - signalLine[index];
  });

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
}

/**
 * Calculate Bollinger Bands
 * @param data Array of price data
 * @param period SMA period (typically 20)
 * @param multiplier Standard deviation multiplier (typically 2)
 * @param sourceFn Function to extract the source value from each data point (default: close price)
 * @returns Object containing upper band, middle band (SMA), and lower band values
 */
export function calculateBollingerBands(
  data: HistoricalBar[],
  period: number = 20,
  multiplier: number = 2,
  sourceFn: (bar: HistoricalBar) => number = (bar) => bar.close
): { upper: number[], middle: number[], lower: number[] } {
  const result = {
    upper: Array(data.length).fill(NaN),
    middle: Array(data.length).fill(NaN),
    lower: Array(data.length).fill(NaN)
  };

  if (data.length < period) {
    return result;
  }

  // Calculate SMA (middle band)
  const sma = calculateSMA(data, period, sourceFn);

  // Calculate standard deviation and bands
  for (let i = period - 1; i < data.length; i++) {
    let sumSquaredDeviation = 0;

    // Calculate sum of squared deviations
    for (let j = 0; j < period; j++) {
      const value = sourceFn(data[i - j]);
      const deviation = value - sma[i];
      sumSquaredDeviation += deviation * deviation;
    }

    // Calculate standard deviation
    const stdDev = Math.sqrt(sumSquaredDeviation / period);

    // Set band values
    result.middle[i] = sma[i];
    result.upper[i] = sma[i] + (multiplier * stdDev);
    result.lower[i] = sma[i] - (multiplier * stdDev);
  }

  return result;
}

/**
 * Calculate Average True Range (ATR)
 * @param data Array of price data
 * @param period ATR period (typically 14)
 * @returns Array of ATR values
 */
export function calculateATR(
  data: HistoricalBar[],
  period: number = 14
): number[] {
  const result: number[] = [];

  if (data.length <= 1) {
    return Array(data.length).fill(NaN);
  }

  // Calculate True Range series
  const trValues: number[] = [];

  // First TR uses high-low
  trValues.push(data[0].high - data[0].low);

  // Calculate remaining TR values
  for (let i = 1; i < data.length; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    const previousClose = data[i - 1].close;

    // True Range is the greatest of:
    // 1. Current High - Current Low
    // 2. |Current High - Previous Close|
    // 3. |Current Low - Previous Close|
    const tr = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - previousClose),
      Math.abs(currentLow - previousClose)
    );

    trValues.push(tr);
  }

  // Calculate ATR using Wilder's smoothing method
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else if (i === period) {
      // First ATR is simple average of TR values
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += trValues[i - j];
      }
      result.push(sum / period);
    } else {
      // Subsequent ATR values use smoothing
      result.push((result[i - 1] * (period - 1) + trValues[i]) / period);
    }
  }

  return result;
}
