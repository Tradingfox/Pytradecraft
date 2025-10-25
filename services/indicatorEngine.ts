import { HistoricalBar } from '../types';

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  language: 'javascript' | 'python' | 'csharp' | 'wasm';
  code: string;
  parameters: IndicatorParameter[];
  outputs: IndicatorOutput[];
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'custom';
}

export interface IndicatorParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface IndicatorOutput {
  name: string;
  type: 'line' | 'histogram' | 'cloud' | 'marker';
  color?: string;
  lineWidth?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface IndicatorResult {
  timestamp: number;
  values: Record<string, number>;
}

export interface IndicatorState {
  id: string;
  indicatorId: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  zIndex: number;
}

export class IndicatorEngine {
  private indicators: Map<string, IndicatorDefinition> = new Map();
  private wasmModules: Map<string, WebAssembly.Instance> = new Map();

  constructor() {
    this.registerBuiltInIndicators();
  }

  private registerBuiltInIndicators(): void {
    this.registerIndicator({
      id: 'sma',
      name: 'Simple Moving Average',
      description: 'Calculates the arithmetic mean of prices over a specified period',
      language: 'javascript',
      code: `
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
      `,
      parameters: [
        { name: 'period', type: 'number', default: 20, min: 1, max: 200, step: 1 }
      ],
      outputs: [
        { name: 'sma', type: 'line', color: '#2196F3', lineWidth: 2 }
      ],
      category: 'trend'
    });

    this.registerIndicator({
      id: 'ema',
      name: 'Exponential Moving Average',
      description: 'Weighted moving average that gives more weight to recent prices',
      language: 'javascript',
      code: `
        function calculate(bars, params) {
          const period = params.period || 20;
          const multiplier = 2 / (period + 1);
          const results = [];

          let ema = bars.slice(0, period).reduce((acc, bar) => acc + bar.close, 0) / period;
          results.push({
            timestamp: bars[period - 1].timestamp,
            values: { ema }
          });

          for (let i = period; i < bars.length; i++) {
            ema = (bars[i].close - ema) * multiplier + ema;
            results.push({
              timestamp: bars[i].timestamp,
              values: { ema }
            });
          }

          return results;
        }
      `,
      parameters: [
        { name: 'period', type: 'number', default: 20, min: 1, max: 200, step: 1 }
      ],
      outputs: [
        { name: 'ema', type: 'line', color: '#FF9800', lineWidth: 2 }
      ],
      category: 'trend'
    });

    this.registerIndicator({
      id: 'rsi',
      name: 'Relative Strength Index',
      description: 'Momentum oscillator measuring speed and magnitude of price changes',
      language: 'javascript',
      code: `
        function calculate(bars, params) {
          const period = params.period || 14;
          const results = [];

          if (bars.length < period + 1) return results;

          const changes = bars.slice(1).map((bar, i) => bar.close - bars[i].close);

          let avgGain = changes.slice(0, period)
            .filter(c => c > 0)
            .reduce((acc, c) => acc + c, 0) / period;

          let avgLoss = -changes.slice(0, period)
            .filter(c => c < 0)
            .reduce((acc, c) => acc + c, 0) / period;

          for (let i = period; i < bars.length; i++) {
            const change = bars[i].close - bars[i - 1].close;
            avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            results.push({
              timestamp: bars[i].timestamp,
              values: {
                rsi,
                overbought: 70,
                oversold: 30
              }
            });
          }

          return results;
        }
      `,
      parameters: [
        { name: 'period', type: 'number', default: 14, min: 2, max: 100, step: 1 }
      ],
      outputs: [
        { name: 'rsi', type: 'line', color: '#9C27B0', lineWidth: 2 },
        { name: 'overbought', type: 'line', color: '#F44336', lineWidth: 1, style: 'dashed' },
        { name: 'oversold', type: 'line', color: '#4CAF50', lineWidth: 1, style: 'dashed' }
      ],
      category: 'momentum'
    });

    this.registerIndicator({
      id: 'bollinger',
      name: 'Bollinger Bands',
      description: 'Volatility bands placed above and below a moving average',
      language: 'javascript',
      code: `
        function calculate(bars, params) {
          const period = params.period || 20;
          const stdDev = params.stdDev || 2;
          const results = [];

          for (let i = period - 1; i < bars.length; i++) {
            const slice = bars.slice(i - period + 1, i + 1);
            const closes = slice.map(bar => bar.close);
            const sma = closes.reduce((acc, val) => acc + val, 0) / period;

            const variance = closes.reduce((acc, val) =>
              acc + Math.pow(val - sma, 2), 0) / period;
            const sd = Math.sqrt(variance);

            results.push({
              timestamp: bars[i].timestamp,
              values: {
                middle: sma,
                upper: sma + (sd * stdDev),
                lower: sma - (sd * stdDev)
              }
            });
          }

          return results;
        }
      `,
      parameters: [
        { name: 'period', type: 'number', default: 20, min: 2, max: 100, step: 1 },
        { name: 'stdDev', type: 'number', default: 2, min: 1, max: 5, step: 0.1 }
      ],
      outputs: [
        { name: 'middle', type: 'line', color: '#2196F3', lineWidth: 1 },
        { name: 'upper', type: 'line', color: '#F44336', lineWidth: 1 },
        { name: 'lower', type: 'line', color: '#4CAF50', lineWidth: 1 }
      ],
      category: 'volatility'
    });

    this.registerIndicator({
      id: 'macd',
      name: 'MACD',
      description: 'Moving Average Convergence Divergence - trend following momentum indicator',
      language: 'javascript',
      code: `
        function calculateEMA(bars, period, startIndex) {
          const multiplier = 2 / (period + 1);
          let ema = bars.slice(startIndex, startIndex + period)
            .reduce((acc, bar) => acc + bar.close, 0) / period;

          const results = [ema];
          for (let i = startIndex + period; i < bars.length; i++) {
            ema = (bars[i].close - ema) * multiplier + ema;
            results.push(ema);
          }
          return results;
        }

        function calculate(bars, params) {
          const fastPeriod = params.fastPeriod || 12;
          const slowPeriod = params.slowPeriod || 26;
          const signalPeriod = params.signalPeriod || 9;
          const results = [];

          if (bars.length < slowPeriod) return results;

          const fastEMA = calculateEMA(bars, fastPeriod, 0);
          const slowEMA = calculateEMA(bars, slowPeriod, 0);

          const macdLine = fastEMA.slice(slowPeriod - fastPeriod).map((fast, i) =>
            fast - slowEMA[i]
          );

          const signalLine = [];
          let signalEMA = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
          signalLine.push(signalEMA);

          const signalMultiplier = 2 / (signalPeriod + 1);
          for (let i = signalPeriod; i < macdLine.length; i++) {
            signalEMA = (macdLine[i] - signalEMA) * signalMultiplier + signalEMA;
            signalLine.push(signalEMA);
          }

          for (let i = slowPeriod - 1 + signalPeriod - 1; i < bars.length; i++) {
            const idx = i - (slowPeriod - 1);
            const macd = macdLine[idx];
            const signal = signalLine[idx - (signalPeriod - 1)];
            const histogram = macd - signal;

            results.push({
              timestamp: bars[i].timestamp,
              values: { macd, signal, histogram }
            });
          }

          return results;
        }
      `,
      parameters: [
        { name: 'fastPeriod', type: 'number', default: 12, min: 2, max: 100, step: 1 },
        { name: 'slowPeriod', type: 'number', default: 26, min: 2, max: 100, step: 1 },
        { name: 'signalPeriod', type: 'number', default: 9, min: 2, max: 100, step: 1 }
      ],
      outputs: [
        { name: 'macd', type: 'line', color: '#2196F3', lineWidth: 2 },
        { name: 'signal', type: 'line', color: '#FF9800', lineWidth: 2 },
        { name: 'histogram', type: 'histogram', color: '#4CAF50', lineWidth: 1 }
      ],
      category: 'momentum'
    });

    this.registerIndicator({
      id: 'vwap',
      name: 'VWAP',
      description: 'Volume Weighted Average Price',
      language: 'javascript',
      code: `
        function calculate(bars, params) {
          const results = [];
          let cumulativePV = 0;
          let cumulativeV = 0;

          for (let i = 0; i < bars.length; i++) {
            const typical = (bars[i].high + bars[i].low + bars[i].close) / 3;
            const pv = typical * (bars[i].volume || 1);

            cumulativePV += pv;
            cumulativeV += (bars[i].volume || 1);

            const vwap = cumulativePV / cumulativeV;

            results.push({
              timestamp: bars[i].timestamp,
              values: { vwap }
            });
          }

          return results;
        }
      `,
      parameters: [],
      outputs: [
        { name: 'vwap', type: 'line', color: '#FF5722', lineWidth: 2 }
      ],
      category: 'volume'
    });
  }

  registerIndicator(indicator: IndicatorDefinition): void {
    this.indicators.set(indicator.id, indicator);
  }

  getIndicator(id: string): IndicatorDefinition | undefined {
    return this.indicators.get(id);
  }

  getAllIndicators(): IndicatorDefinition[] {
    return Array.from(this.indicators.values());
  }

  getIndicatorsByCategory(category: string): IndicatorDefinition[] {
    return Array.from(this.indicators.values())
      .filter(ind => ind.category === category);
  }

  async calculateIndicator(
    indicatorId: string,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): Promise<IndicatorResult[]> {
    const indicator = this.indicators.get(indicatorId);
    if (!indicator) {
      throw new Error(`Indicator ${indicatorId} not found`);
    }

    try {
      switch (indicator.language) {
        case 'javascript':
          return this.executeJavaScript(indicator, bars, parameters);
        case 'python':
          return this.executePython(indicator, bars, parameters);
        case 'csharp':
          return this.executeCSharp(indicator, bars, parameters);
        case 'wasm':
          return this.executeWasm(indicator, bars, parameters);
        default:
          throw new Error(`Unsupported language: ${indicator.language}`);
      }
    } catch (error) {
      console.error(`Error calculating indicator ${indicatorId}:`, error);
      throw error;
    }
  }

  private executeJavaScript(
    indicator: IndicatorDefinition,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): IndicatorResult[] {
    const func = new Function('bars', 'params', indicator.code + '\nreturn calculate(bars, params);');
    return func(bars, parameters);
  }

  private async executePython(
    indicator: IndicatorDefinition,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): Promise<IndicatorResult[]> {
    throw new Error('Python execution requires backend service - use WebAssembly compilation instead');
  }

  private async executeCSharp(
    indicator: IndicatorDefinition,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): Promise<IndicatorResult[]> {
    throw new Error('C# execution requires backend service - use WebAssembly compilation instead');
  }

  private async executeWasm(
    indicator: IndicatorDefinition,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): Promise<IndicatorResult[]> {
    let instance = this.wasmModules.get(indicator.id);

    if (!instance) {
      const wasmBinary = await this.compileToWasm(indicator);
      const module = await WebAssembly.compile(wasmBinary);
      instance = await WebAssembly.instantiate(module);
      this.wasmModules.set(indicator.id, instance);
    }

    return this.callWasmFunction(instance, bars, parameters);
  }

  private async compileToWasm(indicator: IndicatorDefinition): Promise<Uint8Array> {
    throw new Error('WASM compilation not yet implemented - requires AssemblyScript or similar');
  }

  private callWasmFunction(
    instance: WebAssembly.Instance,
    bars: HistoricalBar[],
    parameters: Record<string, unknown>
  ): IndicatorResult[] {
    throw new Error('WASM execution not yet implemented');
  }

  async calculateMultipleIndicators(
    indicatorStates: IndicatorState[],
    bars: HistoricalBar[]
  ): Promise<Map<string, IndicatorResult[]>> {
    const results = new Map<string, IndicatorResult[]>();

    for (const state of indicatorStates.filter(s => s.enabled)) {
      try {
        const result = await this.calculateIndicator(
          state.indicatorId,
          bars,
          state.parameters
        );
        results.set(state.id, result);
      } catch (error) {
        console.error(`Failed to calculate indicator ${state.indicatorId}:`, error);
      }
    }

    return results;
  }

  validateIndicatorCode(code: string, language: string): { valid: boolean; error?: string } {
    try {
      if (language === 'javascript') {
        new Function('bars', 'params', code + '\nreturn calculate(bars, params);');
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid code'
      };
    }
  }
}

export const globalIndicatorEngine = new IndicatorEngine();
