import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TVLightweightChart from './TVLightweightChart';
import { HistoricalBar, Order, Position } from '../types';
import { globalIndicatorEngine, IndicatorState, IndicatorDefinition } from '../services/indicatorEngine';
import { chartStateService, ChartState, DrawingObject } from '../services/chartStateService';
import { SeriesMarker, Time } from 'lightweight-charts';
import { useDebounce } from '../utils/performanceUtils';

interface AdvancedChartProps {
  contractId: string;
  ohlcData: HistoricalBar[];
  orders?: Order[];
  positions?: Position[];
  currentPrice?: number;
  height?: number;
  onStateChange?: (state: ChartState) => void;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  contractId,
  ohlcData,
  orders = [],
  positions = [],
  currentPrice,
  height = 600,
  onStateChange
}) => {
  const [chartState, setChartState] = useState<ChartState | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorState[]>([]);
  const [indicators Line, setIndicatorLineData] = useState<Array<{
    name: string;
    data: { time: Time; value: number }[];
    color: string;
  }>>([]);
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<IndicatorDefinition[]>([]);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [stateName, setStateName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const debouncedOhlcData = useDebounce(ohlcData, 100);

  useEffect(() => {
    loadChartState();
    loadAvailableIndicators();
  }, [contractId]);

  const loadChartState = async () => {
    setIsLoading(true);
    const result = await chartStateService.loadChartState(contractId);

    if (result.success && result.state) {
      setChartState(result.state);
      setActiveIndicators(result.state.indicators || []);
      setDrawings(result.state.drawings || []);
    }
    setIsLoading(false);
  };

  const loadAvailableIndicators = async () => {
    const builtIn = globalIndicatorEngine.getAllIndicators();
    const customResult = await chartStateService.loadCustomIndicators();

    if (customResult.success && customResult.indicators) {
      setAvailableIndicators([...builtIn, ...customResult.indicators]);
    } else {
      setAvailableIndicators(builtIn);
    }
  };

  useEffect(() => {
    if (debouncedOhlcData.length === 0 || activeIndicators.length === 0) {
      setIndicatorLineData([]);
      return;
    }

    calculateIndicators();
  }, [debouncedOhlcData, activeIndicators]);

  const calculateIndicators = async () => {
    const results = await globalIndicatorEngine.calculateMultipleIndicators(
      activeIndicators,
      debouncedOhlcData
    );

    const lineData: Array<{
      name: string;
      data: { time: Time; value: number }[];
      color: string;
    }> = [];

    results.forEach((indicatorResults, stateId) => {
      const state = activeIndicators.find(s => s.id === stateId);
      if (!state) return;

      const indicator = globalIndicatorEngine.getIndicator(state.indicatorId);
      if (!indicator) return;

      indicator.outputs.forEach(output => {
        if (output.type === 'line') {
          const data = indicatorResults.map(result => ({
            time: (new Date(result.timestamp).getTime() / 1000) as Time,
            value: result.values[output.name]
          })).filter(d => !isNaN(d.value));

          lineData.push({
            name: `${indicator.name}(${JSON.stringify(state.parameters)})`,
            data,
            color: output.color || '#2196F3'
          });
        }
      });
    });

    setIndicatorLineData(lineData);
  };

  const addIndicator = (indicatorId: string) => {
    const indicator = globalIndicatorEngine.getIndicator(indicatorId);
    if (!indicator) return;

    const defaultParams = indicator.parameters.reduce((acc, param) => {
      acc[param.name] = param.default;
      return acc;
    }, {} as Record<string, unknown>);

    const newState: IndicatorState = {
      id: `${indicatorId}_${Date.now()}`,
      indicatorId,
      parameters: defaultParams,
      enabled: true,
      zIndex: activeIndicators.length
    };

    setActiveIndicators(prev => [...prev, newState]);
  };

  const removeIndicator = (stateId: string) => {
    setActiveIndicators(prev => prev.filter(s => s.id !== stateId));
  };

  const toggleIndicator = (stateId: string) => {
    setActiveIndicators(prev =>
      prev.map(s => s.id === stateId ? { ...s, enabled: !s.enabled } : s)
    );
  };

  const updateIndicatorParameter = (stateId: string, paramName: string, value: unknown) => {
    setActiveIndicators(prev =>
      prev.map(s =>
        s.id === stateId
          ? { ...s, parameters: { ...s.parameters, [paramName]: value } }
          : s
      )
    );
  };

  const saveCurrentState = async () => {
    if (!chartState) return;

    const stateToSave: ChartState = {
      ...chartState,
      name: stateName || chartState.name,
      indicators: activeIndicators,
      drawings
    };

    const result = await chartStateService.saveChartState(stateToSave);

    if (result.success) {
      setShowSaveDialog(false);
      setStateName('');
      if (onStateChange) {
        onStateChange(stateToSave);
      }
    } else {
      alert(`Failed to save chart state: ${result.error}`);
    }
  };

  const volumeData = useMemo(() => {
    return debouncedOhlcData.filter(bar => bar.volume && bar.volume > 0);
  }, [debouncedOhlcData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading chart state...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
        >
          {showIndicatorPanel ? 'Hide' : 'Show'} Indicators
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
        >
          Save State
        </button>

        <button
          onClick={loadChartState}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
        >
          Reset to Default
        </button>

        {/* Active Indicator Pills */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {activeIndicators.filter(s => s.enabled).map(state => {
            const indicator = globalIndicatorEngine.getIndicator(state.indicatorId);
            return (
              <div
                key={state.id}
                className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm flex items-center gap-2"
              >
                <span>{indicator?.name}</span>
                <button
                  onClick={() => toggleIndicator(state.id)}
                  className="hover:text-yellow-400 transition-colors"
                  title="Toggle visibility"
                >
                  👁️
                </button>
                <button
                  onClick={() => removeIndicator(state.id)}
                  className="hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicator Panel */}
      {showIndicatorPanel && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-3 text-gray-200">Available Indicators</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {availableIndicators.map(indicator => (
              <div
                key={indicator.id}
                className="p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => addIndicator(indicator.id)}
              >
                <div className="font-medium text-gray-200">{indicator.name}</div>
                <div className="text-sm text-gray-400 mt-1">{indicator.description}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Category: {indicator.category}
                </div>
              </div>
            ))}
          </div>

          {/* Parameter Controls for Active Indicators */}
          {activeIndicators.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3 text-gray-200">Active Indicator Parameters</h4>
              <div className="space-y-4">
                {activeIndicators.map(state => {
                  const indicator = globalIndicatorEngine.getIndicator(state.indicatorId);
                  if (!indicator || indicator.parameters.length === 0) return null;

                  return (
                    <div key={state.id} className="p-3 bg-gray-700 rounded">
                      <div className="font-medium text-gray-200 mb-2">{indicator.name}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {indicator.parameters.map(param => (
                          <div key={param.name}>
                            <label className="block text-sm text-gray-400 mb-1">
                              {param.name}
                              {param.description && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({param.description})
                                </span>
                              )}
                            </label>
                            {param.type === 'number' && (
                              <input
                                type="number"
                                value={state.parameters[param.name] as number}
                                onChange={(e) => updateIndicatorParameter(
                                  state.id,
                                  param.name,
                                  parseFloat(e.target.value)
                                )}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                              />
                            )}
                            {param.type === 'boolean' && (
                              <input
                                type="checkbox"
                                checked={state.parameters[param.name] as boolean}
                                onChange={(e) => updateIndicatorParameter(
                                  state.id,
                                  param.name,
                                  e.target.checked
                                )}
                                className="form-checkbox h-4 w-4"
                              />
                            )}
                            {param.type === 'color' && (
                              <input
                                type="color"
                                value={state.parameters[param.name] as string}
                                onChange={(e) => updateIndicatorParameter(
                                  state.id,
                                  param.name,
                                  e.target.value
                                )}
                                className="w-full h-8 rounded"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Save Chart State</h3>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="Enter state name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={saveCurrentState}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setStateName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <TVLightweightChart
        ohlcData={debouncedOhlcData}
        volumeData={volumeData}
        lineSeriesData={indicatorLineData}
        workingOrders={orders}
        positions={positions}
        currentPrice={currentPrice}
        height={height}
        theme={chartState?.chart_settings.theme || 'dark'}
      />
    </div>
  );
};

export default AdvancedChart;
