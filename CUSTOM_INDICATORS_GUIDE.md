# Custom Indicators Development Guide

## Overview

PyTradeCraft supports custom indicators written in JavaScript, with plans to support Python, C#, and WebAssembly. This guide shows you how to create powerful custom indicators for your trading strategies.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Indicator Structure](#indicator-structure)
3. [JavaScript Indicators](#javascript-indicators)
4. [Python Indicators (Coming Soon)](#python-indicators)
5. [C# Indicators (Coming Soon)](#csharp-indicators)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## Quick Start

### Creating Your First Indicator

```javascript
function calculate(bars, params) {
  const period = params.period || 20;
  const results = [];

  for (let i = period - 1; i < bars.length; i++) {
    const sum = bars.slice(i - period + 1, i + 1)
      .reduce((acc, bar) => acc + bar.close, 0);

    results.push({
      timestamp: bars[i].timestamp,
      values: { sma: sum / period }
    });
  }

  return results;
}
```

### Indicator Definition

```typescript
{
  id: 'my_custom_sma',
  name: 'My Custom SMA',
  description: 'A customized Simple Moving Average',
  language: 'javascript',
  code: '/* your code here */',
  parameters: [
    {
      name: 'period',
      type: 'number',
      default: 20,
      min: 1,
      max: 200,
      step: 1,
      description: 'Number of periods for the average'
    }
  ],
  outputs: [
    {
      name: 'sma',
      type: 'line',
      color: '#2196F3',
      lineWidth: 2
    }
  ],
  category: 'trend'
}
```

---

## Indicator Structure

### Input Data (bars)

Each bar in the `bars` array contains:

```typescript
interface HistoricalBar {
  timestamp: string;  // ISO 8601 format
  open: number;       // Opening price
  high: number;       // Highest price
  low: number;        // Lowest price
  close: number;      // Closing price
  volume?: number;    // Trading volume (optional)
}
```

### Parameters

Define configurable parameters for your indicator:

```typescript
interface IndicatorParameter {
  name: string;              // Parameter name
  type: 'number' | 'string' | 'boolean' | 'color';
  default: any;              // Default value
  min?: number;              // Minimum value (for numbers)
  max?: number;              // Maximum value (for numbers)
  step?: number;             // Step size (for numbers)
  description?: string;      // Help text
}
```

### Output Format

Return an array of results:

```typescript
interface IndicatorResult {
  timestamp: number | string;  // Bar timestamp
  values: Record<string, number>;  // Output values
}

// Example
[
  {
    timestamp: "2024-01-01T00:00:00Z",
    values: {
      sma: 4567.89,
      upper: 4600.00,
      lower: 4535.78
    }
  },
  // ... more results
]
```

---

## JavaScript Indicators

### Basic Template

```javascript
function calculate(bars, params) {
  // Extract parameters with defaults
  const period = params.period || 20;

  // Initialize results array
  const results = [];

  // Calculate indicator values
  for (let i = period - 1; i < bars.length; i++) {
    // Your calculation logic here
    const value = /* ... */;

    results.push({
      timestamp: bars[i].timestamp,
      values: { myValue: value }
    });
  }

  return results;
}
```

### Advanced Features

#### Using Multiple Parameters

```javascript
function calculate(bars, params) {
  const fastPeriod = params.fastPeriod || 12;
  const slowPeriod = params.slowPeriod || 26;
  const signalPeriod = params.signalPeriod || 9;

  // Your logic here
}
```

#### Returning Multiple Values

```javascript
function calculate(bars, params) {
  const period = params.period || 20;
  const stdDev = params.stdDev || 2;
  const results = [];

  for (let i = period - 1; i < bars.length; i++) {
    const closes = bars.slice(i - period + 1, i + 1).map(b => b.close);
    const average = closes.reduce((a, b) => a + b, 0) / period;
    const variance = closes.reduce((acc, val) =>
      acc + Math.pow(val - average, 2), 0) / period;
    const sd = Math.sqrt(variance);

    results.push({
      timestamp: bars[i].timestamp,
      values: {
        middle: average,
        upper: average + (sd * stdDev),
        lower: average - (sd * stdDev)
      }
    });
  }

  return results;
}
```

#### Helper Functions

```javascript
// Define helper functions outside calculate()
function calculateEMA(values, period) {
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const results = [ema];
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    results.push(ema);
  }
  return results;
}

function calculate(bars, params) {
  const period = params.period || 20;
  const closes = bars.map(b => b.close);
  const emaValues = calculateEMA(closes, period);

  return bars.slice(period - 1).map((bar, i) => ({
    timestamp: bar.timestamp,
    values: { ema: emaValues[i] }
  }));
}
```

---

## Python Indicators

**Coming Soon**: Python indicators will be executed server-side or compiled to WebAssembly.

### Planned Structure

```python
import numpy as np
import pandas as pd

def calculate(bars: list[dict], params: dict) -> list[dict]:
    """
    Calculate indicator values

    Args:
        bars: List of OHLCV bar dictionaries
        params: Dictionary of parameters

    Returns:
        List of result dictionaries with timestamp and values
    """
    period = params.get('period', 20)

    # Convert to pandas for easier manipulation
    df = pd.DataFrame(bars)

    # Calculate indicator
    df['sma'] = df['close'].rolling(window=period).mean()

    # Format results
    results = []
    for idx, row in df.iterrows():
        if not pd.isna(row['sma']):
            results.append({
                'timestamp': row['timestamp'],
                'values': {'sma': float(row['sma'])}
            })

    return results
```

---

## C# Indicators

**Coming Soon**: C# indicators will be executed server-side or compiled to WebAssembly.

### Planned Structure

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public class CustomIndicator
{
    public List<IndicatorResult> Calculate(
        List<HistoricalBar> bars,
        Dictionary<string, object> parameters)
    {
        int period = parameters.ContainsKey("period")
            ? Convert.ToInt32(parameters["period"])
            : 20;

        var results = new List<IndicatorResult>();

        for (int i = period - 1; i < bars.Count; i++)
        {
            var slice = bars.Skip(i - period + 1).Take(period);
            double sum = slice.Sum(b => b.Close);
            double average = sum / period;

            results.Add(new IndicatorResult
            {
                Timestamp = bars[i].Timestamp,
                Values = new Dictionary<string, double>
                {
                    { "sma", average }
                }
            });
        }

        return results;
    }
}
```

---

## Best Practices

### Performance

1. **Avoid Nested Loops**: Use efficient algorithms
2. **Reuse Calculations**: Store intermediate results
3. **Limit Lookback**: Only calculate what's necessary
4. **Use Array Methods**: `map`, `reduce`, `filter` are optimized

### Error Handling

```javascript
function calculate(bars, params) {
  // Validate input
  if (!bars || bars.length === 0) {
    return [];
  }

  const period = params.period || 20;

  // Check minimum bars
  if (bars.length < period) {
    console.warn(`Not enough bars. Need ${period}, got ${bars.length}`);
    return [];
  }

  // Validate data
  const validBars = bars.filter(bar =>
    typeof bar.close === 'number' &&
    !isNaN(bar.close)
  );

  if (validBars.length < period) {
    console.warn('Not enough valid bars after filtering');
    return [];
  }

  // Your calculation logic
  const results = [];
  // ...

  return results;
}
```

### Documentation

Add comments to explain complex logic:

```javascript
/**
 * Calculates the Relative Strength Index (RSI)
 *
 * The RSI measures the magnitude of recent price changes to evaluate
 * overbought or oversold conditions in the price of a stock or asset.
 *
 * Calculation:
 * 1. Calculate average gains and losses over the period
 * 2. Calculate relative strength (RS) = Average Gain / Average Loss
 * 3. Calculate RSI = 100 - (100 / (1 + RS))
 */
function calculate(bars, params) {
  const period = params.period || 14;
  // ... implementation
}
```

---

## Examples

### 1. Supertrend Indicator

```javascript
function calculateATR(bars, period) {
  const tr = [];

  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    tr.push(Math.max(tr1, tr2, tr3));
  }

  const atr = [];
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr.push(sum / period);

  for (let i = period; i < tr.length; i++) {
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  }

  return atr;
}

function calculate(bars, params) {
  const period = params.period || 10;
  const multiplier = params.multiplier || 3;

  const atr = calculateATR(bars, period);
  const results = [];

  let trend = 1;
  let upperBand, lowerBand;

  for (let i = period; i < bars.length; i++) {
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const atrValue = atr[i - period];

    const basicUpperBand = hl2 + (multiplier * atrValue);
    const basicLowerBand = hl2 - (multiplier * atrValue);

    upperBand = basicUpperBand < (upperBand || Infinity)
      ? basicUpperBand
      : (bars[i].close > (upperBand || 0) ? basicUpperBand : upperBand);

    lowerBand = basicLowerBand > (lowerBand || -Infinity)
      ? basicLowerBand
      : (bars[i].close < (lowerBand || Infinity) ? basicLowerBand : lowerBand);

    const prevTrend = trend;
    trend = bars[i].close > upperBand ? 1 : bars[i].close < lowerBand ? -1 : prevTrend;

    const supertrendValue = trend === 1 ? lowerBand : upperBand;

    results.push({
      timestamp: bars[i].timestamp,
      values: {
        supertrend: supertrendValue,
        trend: trend
      }
    });
  }

  return results;
}
```

### 2. VWAP with Standard Deviation Bands

```javascript
function calculate(bars, params) {
  const stdDevMultiplier = params.stdDevMultiplier || 2;

  let cumulativePV = 0;
  let cumulativeV = 0;
  let cumulativePV2 = 0;
  const results = [];

  for (let i = 0; i < bars.length; i++) {
    const typical = (bars[i].high + bars[i].low + bars[i].close) / 3;
    const volume = bars[i].volume || 1;
    const pv = typical * volume;

    cumulativePV += pv;
    cumulativeV += volume;
    cumulativePV2 += typical * typical * volume;

    const vwap = cumulativePV / cumulativeV;
    const variance = (cumulativePV2 / cumulativeV) - (vwap * vwap);
    const stdDev = Math.sqrt(Math.max(variance, 0));

    results.push({
      timestamp: bars[i].timestamp,
      values: {
        vwap: vwap,
        upperBand: vwap + (stdDev * stdDevMultiplier),
        lowerBand: vwap - (stdDev * stdDevMultiplier)
      }
    });
  }

  return results;
}
```

### 3. Ichimoku Cloud

```javascript
function calculate(bars, params) {
  const tenkanPeriod = params.tenkanPeriod || 9;
  const kijunPeriod = params.kijunPeriod || 26;
  const senkouBPeriod = params.senkouBPeriod || 52;
  const displacement = params.displacement || 26;

  const results = [];

  for (let i = Math.max(tenkanPeriod, kijunPeriod, senkouBPeriod) - 1;
       i < bars.length; i++) {

    // Tenkan-sen (Conversion Line)
    const tenkanHigh = Math.max(...bars.slice(i - tenkanPeriod + 1, i + 1).map(b => b.high));
    const tenkanLow = Math.min(...bars.slice(i - tenkanPeriod + 1, i + 1).map(b => b.low));
    const tenkan = (tenkanHigh + tenkanLow) / 2;

    // Kijun-sen (Base Line)
    const kijunHigh = Math.max(...bars.slice(i - kijunPeriod + 1, i + 1).map(b => b.high));
    const kijunLow = Math.min(...bars.slice(i - kijunPeriod + 1, i + 1).map(b => b.low));
    const kijun = (kijunHigh + kijunLow) / 2;

    // Senkou Span A (Leading Span A)
    const senkouA = (tenkan + kijun) / 2;

    // Senkou Span B (Leading Span B)
    const senkouBHigh = Math.max(...bars.slice(i - senkouBPeriod + 1, i + 1).map(b => b.high));
    const senkouBLow = Math.min(...bars.slice(i - senkouBPeriod + 1, i + 1).map(b => b.low));
    const senkouB = (senkouBHigh + senkouBLow) / 2;

    // Chikou Span (Lagging Span) - current closing price plotted backwards
    const chikou = bars[i].close;

    results.push({
      timestamp: bars[i].timestamp,
      values: {
        tenkan,
        kijun,
        senkouA,
        senkouB,
        chikou
      }
    });
  }

  return results;
}
```

---

## Testing Your Indicator

### Unit Testing

```javascript
// Test data
const testBars = [
  { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 105, low: 99, close: 103, volume: 1000 },
  { timestamp: '2024-01-02T00:00:00Z', open: 103, high: 107, low: 102, close: 106, volume: 1200 },
  // ... more bars
];

const params = { period: 20 };

const results = calculate(testBars, params);

// Verify results
console.assert(results.length > 0, 'Should return results');
console.assert(results[0].values.sma, 'Should have SMA value');
console.log('Tests passed!');
```

---

## Sharing Your Indicators

1. Test thoroughly with real market data
2. Document parameters and usage
3. Set `is_public: true` to share with the community
4. Consider edge cases and error handling

---

## Support

For questions or issues:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Visit our [GitHub Issues](https://github.com/yourrepo/issues)
- Join our [Discord Community](https://discord.gg/yourserver)

Happy Trading! 📈
