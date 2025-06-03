import React, { useState } from 'react';
import { ChartIndicator, IndicatorType, IndicatorSourceType } from '../types';

interface IndicatorSelectorProps {
  availableIndicators: ChartIndicator[];
  activeIndicators: ChartIndicator[];
  onAddIndicator: (indicator: ChartIndicator) => void;
  onRemoveIndicator: (indicatorId: string) => void;
  onUpdateIndicator: (indicator: ChartIndicator) => void;
}

/**
 * Component for selecting and configuring chart indicators
 */
const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  availableIndicators,
  activeIndicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator
}) => {
  const [selectedType, setSelectedType] = useState<IndicatorType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ChartIndicator | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<ChartIndicator | null>(null);

  // Filter indicators by type (overlay, oscillator, or all)
  const filteredIndicators = selectedType === 'all'
    ? availableIndicators
    : availableIndicators.filter(indicator => indicator.type === selectedType);

  const handleAddIndicator = (indicator: ChartIndicator) => {
    const newIndicator = {
      ...indicator,
      id: `indicator-${Date.now()}`, // Generate a unique ID
      visible: true,
      settings: { ...indicator.settings } // Clone settings to avoid mutations
    };
    onAddIndicator(newIndicator);
    setShowAddModal(false);
  };

  const handleEditIndicator = (updatedIndicator: ChartIndicator) => {
    onUpdateIndicator(updatedIndicator);
    setEditingIndicator(null);
  };

  return (
    <div className="indicator-selector bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Indicators</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Indicator
        </button>
      </div>

      {/* Type filter buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1 rounded text-sm ${selectedType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedType(IndicatorType.OVERLAY)}
          className={`px-3 py-1 rounded text-sm ${selectedType === IndicatorType.OVERLAY ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Overlays
        </button>
        <button
          onClick={() => setSelectedType(IndicatorType.OSCILLATOR)}
          className={`px-3 py-1 rounded text-sm ${selectedType === IndicatorType.OSCILLATOR ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Oscillators
        </button>
      </div>

      {/* Active indicators list */}
      <div className="mb-4">
        <h4 className="text-sm text-gray-400 mb-2">Active Indicators</h4>
        {activeIndicators.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No active indicators</p>
        ) : (
          <ul className="space-y-2">
            {activeIndicators.map(indicator => (
              <li key={indicator.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span className="text-gray-200">{indicator.name}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingIndicator(indicator)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onUpdateIndicator({ ...indicator, visible: !indicator.visible })}
                    className={indicator.visible ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500 hover:text-gray-400'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onRemoveIndicator(indicator.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Indicator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-gray-800 p-6 rounded-lg z-10 w-96 max-w-full">
            <h3 className="text-xl font-medium text-white mb-4">Add Indicator</h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {filteredIndicators.map(indicator => (
                <button
                  key={indicator.name}
                  onClick={() => handleAddIndicator(indicator)}
                  className="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                >
                  <p className="font-medium">{indicator.name}</p>
                  <p className="text-xs text-gray-400">{indicator.type === IndicatorType.OVERLAY ? 'Overlay' : 'Oscillator'}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Indicator Modal */}
      {editingIndicator && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setEditingIndicator(null)}></div>
          <div className="bg-gray-800 p-6 rounded-lg z-10 w-96 max-w-full">
            <h3 className="text-xl font-medium text-white mb-4">Edit {editingIndicator.name}</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={editingIndicator.color}
                onChange={(e) => setEditingIndicator({...editingIndicator, color: e.target.value})}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Line Width</label>
              <input
                type="range"
                min="1"
                max="5"
                value={editingIndicator.lineWidth}
                onChange={(e) => setEditingIndicator({...editingIndicator, lineWidth: Number(e.target.value)})}
                className="w-full"
              />
              <div className="text-right text-sm text-gray-400">{editingIndicator.lineWidth}px</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Price Source</label>
              <select
                value={editingIndicator.sourceType}
                onChange={(e) => setEditingIndicator({...editingIndicator, sourceType: e.target.value as IndicatorSourceType})}
                className="w-full bg-gray-700 rounded p-2 text-white"
              >
                <option value={IndicatorSourceType.CLOSE}>Close</option>
                <option value={IndicatorSourceType.OPEN}>Open</option>
                <option value={IndicatorSourceType.HIGH}>High</option>
                <option value={IndicatorSourceType.LOW}>Low</option>
                <option value={IndicatorSourceType.HL2}>HL2 (High+Low)/2</option>
                <option value={IndicatorSourceType.HLC3}>HLC3 (High+Low+Close)/3</option>
                <option value={IndicatorSourceType.OHLC4}>OHLC4 (Open+High+Low+Close)/4</option>
              </select>
            </div>

            {/* Custom settings based on indicator type */}
            {editingIndicator.name === "Moving Average" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).period}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, period: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">MA Type</label>
                  <select
                    value={(editingIndicator.settings as any).maType}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, maType: e.target.value}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  >
                    <option value="sma">SMA</option>
                    <option value="ema">EMA</option>
                    <option value="wma">WMA</option>
                    <option value="vwma">VWMA</option>
                    <option value="hull">Hull MA</option>
                  </select>
                </div>
              </>
            )}

            {editingIndicator.name === "RSI" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).period}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, period: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Overbought Level</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={(editingIndicator.settings as any).overbought}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, overbought: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Oversold Level</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={(editingIndicator.settings as any).oversold}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, oversold: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
              </>
            )}

            {editingIndicator.name === "MACD" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Fast Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).fastPeriod}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, fastPeriod: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Slow Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).slowPeriod}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, slowPeriod: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Signal Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).signalPeriod}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, signalPeriod: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
              </>
            )}

            {editingIndicator.name === "Bollinger Bands" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Period</label>
                  <input
                    type="number"
                    min="1"
                    value={(editingIndicator.settings as any).period}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, period: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Standard Deviations</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={(editingIndicator.settings as any).deviations}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      settings: {...editingIndicator.settings, deviations: Number(e.target.value)}
                    })}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingIndicator(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditIndicator(editingIndicator)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorSelector;
