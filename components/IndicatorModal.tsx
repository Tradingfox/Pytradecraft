import React, { useState } from 'react';
import { Indicator } from './Chart';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (indicator: Indicator) => void;
}

const IndicatorModal: React.FC<IndicatorModalProps> = ({ isOpen, onClose, onAddIndicator }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'overlay' as 'overlay' | 'oscillator',
    language: 'python' as 'python' | 'javascript' | 'java' | 'csharp',
    code: '',
    color: '#3B82F6',
    parameters: '{}'
  });

  const [presetIndicator, setPresetIndicator] = useState('');

  const presetIndicators = {
    sma_python: {
      name: 'Simple Moving Average',
      language: 'python',
      code: `
def calculate(prices, period=20):
    """Calculate Simple Moving Average"""
    if len(prices) < period:
        return []
    
    sma_values = []
    for i in range(period - 1, len(prices)):
        avg = sum(prices[i - period + 1:i + 1]) / period
        sma_values.append(avg)
    
    return sma_values

# Parameters: period (default: 20)
# Usage: calculate(close_prices, period=20)
`,
      parameters: '{"period": 20}'
    },
    rsi_python: {
      name: 'Relative Strength Index',
      language: 'python',
      code: `
def calculate(prices, period=14):
    """Calculate RSI"""
    if len(prices) < period + 1:
        return []
    
    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    rsi_values = []
    
    for i in range(period, len(deltas)):
        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        
        rsi_values.append(rsi)
        
        # Update averages
        gain = gains[i] if gains[i] > 0 else 0
        loss = losses[i] if losses[i] > 0 else 0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
    
    return rsi_values

# Parameters: period (default: 14)
# Returns values between 0-100
`,
      parameters: '{"period": 14}'
    },
    macd_python: {
      name: 'MACD',
      language: 'python',
      code: `
def calculate(prices, fast=12, slow=26, signal=9):
    """Calculate MACD"""
    if len(prices) < slow:
        return []
    
    # Calculate EMAs
    def ema(data, period):
        alpha = 2 / (period + 1)
        ema_values = [data[0]]
        for price in data[1:]:
            ema_values.append(alpha * price + (1 - alpha) * ema_values[-1])
        return ema_values
    
    fast_ema = ema(prices, fast)
    slow_ema = ema(prices, slow)
    
    # Calculate MACD line
    macd_line = [fast_ema[i] - slow_ema[i] for i in range(len(slow_ema))]
    
    # Calculate Signal line
    signal_line = ema(macd_line, signal)
    
    # Calculate Histogram
    histogram = [macd_line[i] - signal_line[i] for i in range(len(signal_line))]
    
    return {
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    }

# Parameters: fast (default: 12), slow (default: 26), signal (default: 9)
`,
      parameters: '{"fast": 12, "slow": 26, "signal": 9}'
    },
    sma_javascript: {
      name: 'Simple Moving Average (JS)',
      language: 'javascript',
      code: `
function calculate(prices, period = 20) {
    // Calculate Simple Moving Average
    if (prices.length < period) {
        return [];
    }
    
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smaValues.push(sum / period);
    }
    
    return smaValues;
}

// Parameters: period (default: 20)
// Usage: calculate(closePrices, 20)
`,
      parameters: '{"period": 20}'
    },
    bollinger_java: {
      name: 'Bollinger Bands (Java)',
      language: 'java',
      code: `
import java.util.*;

public class BollingerBands {
    public static Map<String, List<Double>> calculate(List<Double> prices, int period, double stdDev) {
        if (prices.size() < period) {
            return new HashMap<>();
        }
        
        List<Double> upperBand = new ArrayList<>();
        List<Double> middleBand = new ArrayList<>();
        List<Double> lowerBand = new ArrayList<>();
        
        for (int i = period - 1; i < prices.size(); i++) {
            // Calculate SMA
            double sum = 0;
            for (int j = i - period + 1; j <= i; j++) {
                sum += prices.get(j);
            }
            double sma = sum / period;
            
            // Calculate Standard Deviation
            double variance = 0;
            for (int j = i - period + 1; j <= i; j++) {
                variance += Math.pow(prices.get(j) - sma, 2);
            }
            double stdDeviation = Math.sqrt(variance / period);
            
            middleBand.add(sma);
            upperBand.add(sma + (stdDev * stdDeviation));
            lowerBand.add(sma - (stdDev * stdDeviation));
        }
        
        Map<String, List<Double>> result = new HashMap<>();
        result.put("upper", upperBand);
        result.put("middle", middleBand);
        result.put("lower", lowerBand);
        
        return result;
    }
}

// Parameters: period (default: 20), stdDev (default: 2.0)
`,
      parameters: '{"period": 20, "stdDev": 2.0}'
    },
    ema_csharp: {
      name: 'Exponential Moving Average (C#)',
      language: 'csharp',
      code: `
using System;
using System.Collections.Generic;
using System.Linq;

public class EMA
{
    public static List<double> Calculate(List<double> prices, int period = 20)
    {
        if (prices.Count < period)
            return new List<double>();
        
        var emaValues = new List<double>();
        double multiplier = 2.0 / (period + 1);
        
        // Initialize with SMA for first value
        double sma = prices.Take(period).Average();
        emaValues.Add(sma);
        
        // Calculate EMA for remaining values
        for (int i = period; i < prices.Count; i++)
        {
            double ema = (prices[i] * multiplier) + (emaValues.Last() * (1 - multiplier));
            emaValues.Add(ema);
        }
        
        return emaValues;
    }
}

// Parameters: period (default: 20)
// Usage: EMA.Calculate(closePrices, 20)
`,
      parameters: '{"period": 20}'
    }
  };

  const handlePresetChange = (preset: string) => {
    setPresetIndicator(preset);
    if (preset && presetIndicators[preset as keyof typeof presetIndicators]) {
      const indicator = presetIndicators[preset as keyof typeof presetIndicators];
      setFormData(prev => ({
        ...prev,
        name: indicator.name,
        language: indicator.language as any,
        code: indicator.code,
        parameters: indicator.parameters
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const parameters = JSON.parse(formData.parameters);
      
      const newIndicator: Indicator = {
        id: `indicator_${Date.now()}`,
        name: formData.name,
        type: formData.type,
        language: formData.language,
        code: formData.code,
        parameters,
        enabled: true,
        color: formData.color,
        data: [] // Will be calculated when applied
      };
      
      onAddIndicator(newIndicator);
      
      // Reset form
      setFormData({
        name: '',
        type: 'overlay',
        language: 'python',
        code: '',
        color: '#3B82F6',
        parameters: '{}'
      });
      setPresetIndicator('');
      
      onClose();
    } catch (error) {
      alert('Invalid JSON in parameters field');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Custom Indicator</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset Selection */}
          <div>
            <label className="block text-white font-medium mb-2">Choose Preset (Optional)</label>
            <select
              value={presetIndicator}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            >
              <option value="">-- Select a preset indicator --</option>
              <optgroup label="Python">
                <option value="sma_python">Simple Moving Average (Python)</option>
                <option value="rsi_python">RSI (Python)</option>
                <option value="macd_python">MACD (Python)</option>
              </optgroup>
              <optgroup label="JavaScript">
                <option value="sma_javascript">Simple Moving Average (JavaScript)</option>
              </optgroup>
              <optgroup label="Java">
                <option value="bollinger_java">Bollinger Bands (Java)</option>
              </optgroup>
              <optgroup label="C#">
                <option value="ema_csharp">Exponential Moving Average (C#)</option>
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Indicator Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Custom SMA"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'overlay' | 'oscillator' }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="overlay">Overlay (on price chart)</option>
                  <option value="oscillator">Oscillator (separate panel)</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Programming Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as any }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 bg-gray-700 border border-gray-600 rounded"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Parameters (JSON)</label>
                <textarea
                  value={formData.parameters}
                  onChange={(e) => setFormData(prev => ({ ...prev, parameters: e.target.value }))}
                  placeholder='{"period": 20, "multiplier": 2.0}'
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-24 font-mono text-sm"
                />
                <p className="text-gray-400 text-xs mt-1">
                  JSON object with indicator parameters. These will be passed to your calculation function.
                </p>
              </div>
            </div>

            {/* Code Editor */}
            <div>
              <label className="block text-white font-medium mb-2">Indicator Code</label>
              <textarea
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder={`// Enter your ${formData.language} code here\n// The main function should be named 'calculate'\n// and return an array of numbers or an object with named arrays`}
                className="w-full bg-gray-900 text-green-400 border border-gray-600 rounded px-3 py-2 font-mono text-sm"
                rows={20}
                required
              />
              <p className="text-gray-400 text-xs mt-1">
                Write your indicator calculation logic. The function will receive price data and parameters.
              </p>
            </div>
          </div>

          {/* Language-specific Guidelines */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">
              {formData.language.charAt(0).toUpperCase() + formData.language.slice(1)} Guidelines:
            </h3>
            <div className="text-gray-300 text-sm space-y-1">
              {formData.language === 'python' && (
                <>
                  <p>• Main function should be named <code className="bg-gray-800 px-1 rounded">calculate(prices, **kwargs)</code></p>
                  <p>• Return a list of numbers or a dictionary with named lists</p>
                  <p>• Use standard Python syntax and built-in functions</p>
                  <p>• Parameters are passed as keyword arguments</p>
                </>
              )}
              {formData.language === 'javascript' && (
                <>
                  <p>• Main function should be named <code className="bg-gray-800 px-1 rounded">calculate(prices, parameters)</code></p>
                  <p>• Return an array of numbers or an object with named arrays</p>
                  <p>• Use ES6+ syntax supported</p>
                  <p>• Parameters are passed as the second argument object</p>
                </>
              )}
              {formData.language === 'java' && (
                <>
                  <p>• Main method should be <code className="bg-gray-800 px-1 rounded">public static calculate(List&lt;Double&gt; prices, Map&lt;String, Object&gt; params)</code></p>
                  <p>• Return List&lt;Double&gt; or Map&lt;String, List&lt;Double&gt;&gt;</p>
                  <p>• Import required Java collections</p>
                  <p>• Use standard Java 11+ features</p>
                </>
              )}
              {formData.language === 'csharp' && (
                <>
                  <p>• Main method should be <code className="bg-gray-800 px-1 rounded">public static Calculate(List&lt;double&gt; prices, Dictionary&lt;string, object&gt; parameters)</code></p>
                  <p>• Return List&lt;double&gt; or Dictionary&lt;string, List&lt;double&gt;&gt;</p>
                  <p>• Using statements for System.Collections.Generic etc.</p>
                  <p>• Use .NET 6+ features</p>
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Indicator
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndicatorModal; 