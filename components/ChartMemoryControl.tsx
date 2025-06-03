import React, { useState, useRef } from 'react';
import { ChartMemorySettings } from '../types';

interface ChartMemoryControlProps {
  onSaveSettings: (settings: Partial<ChartMemorySettings>) => void;
  onLoadSettings: () => Partial<ChartMemorySettings> | null;
  onSaveChart: () => void;
  onLoadChart: () => void;
}

/**
 * Component for saving and loading chart settings with MCP Memory integration
 */
const ChartMemoryControl: React.FC<ChartMemoryControlProps> = ({
  onSaveSettings,
  onLoadSettings,
  onSaveChart,
  onLoadChart
}) => {
  const [showSavedSettings, setShowSavedSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const saveNameRef = useRef<HTMLInputElement>(null);

  // Function to save current chart settings with a name
  const handleSaveSettings = () => {
    const name = saveNameRef.current?.value || `Chart Settings ${new Date().toLocaleString()}`;
    onSaveSettings({
      viewPreferences: {
        timeframe: 'current_timeframe',
        chartType: 'current_type',
        showVolume: true,
        theme: 'dark',
        gridLines: true,
        crosshair: true,
        scaleType: 'linear'
      }
    });
    setShowSavedSettings(false);
  };

  // Function to load saved settings by name
  const handleLoadSettings = () => {
    const settings = onLoadSettings();
    if (settings) {
      // Apply loaded settings
      console.log('Loaded settings:', settings);
    }
    setShowSavedSettings(false);
  };

  return (
    <div className="chart-memory-control">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-white">Chart Memory</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSavedSettings(!showSavedSettings)}
            className="p-1 rounded bg-gray-700 hover:bg-gray-600"
            title="Saved Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {showSavedSettings && (
        <div className="bg-gray-700 p-3 rounded-md mb-3">
          <h4 className="text-sm text-gray-200 font-medium mb-2">Chart Settings</h4>

          <div className="mb-3">
            <input
              ref={saveNameRef}
              type="text"
              placeholder="Settings Name"
              className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm text-gray-200"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSaveSettings}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm"
            >
              Save Current
            </button>
            <button
              onClick={handleLoadSettings}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 px-2 rounded text-sm"
            >
              Load Saved
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSaveChart}
          className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Chart
        </button>
        <button
          onClick={onLoadChart}
          className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Load Chart
        </button>
      </div>
    </div>
  );
};

export default ChartMemoryControl;
