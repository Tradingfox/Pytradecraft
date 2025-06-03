import React, { useState } from 'react';
import { DrawingToolType } from '../types';

interface DrawingToolbarProps {
  onSelectTool: (tool: DrawingToolType | null) => void;
  activeTool: DrawingToolType | null;
  onClearDrawings: () => void;
  onUndoDrawing: () => void;
  canUndo: boolean;
  drawingCount: number;
}

/**
 * Component for selecting and managing chart drawing tools
 */
const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onSelectTool,
  activeTool,
  onClearDrawings,
  onUndoDrawing,
  canUndo,
  drawingCount
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [lineWidth, setLineWidth] = useState(2);

  // Tool buttons with icons and descriptions
  const tools = [
    { type: DrawingToolType.TRENDLINE, label: 'Trendline', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
    { type: DrawingToolType.HORIZONTAL_LINE, label: 'Horizontal Line', icon: 'M22 12H2M22 12H2' },
    { type: DrawingToolType.VERTICAL_LINE, label: 'Vertical Line', icon: 'M12 2v20M12 2v20' },
    { type: DrawingToolType.RECTANGLE, label: 'Rectangle', icon: 'M3 3h18v18H3z' },
    { type: DrawingToolType.FIBONACCI, label: 'Fibonacci', icon: 'M3 3 L21 3 L21 6 L3 6 L3 3 M3 9 L16 9 L16 12 L3 12 L3 9 M3 15 L11 15 L11 18 L3 18 L3 15' },
    { type: DrawingToolType.TEXT, label: 'Text', icon: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 7h8m-8 3h6' },
    { type: DrawingToolType.ARROW, label: 'Arrow', icon: 'M5 12h14m-5-5l5 5-5 5' },
    { type: DrawingToolType.CHANNEL, label: 'Channel', icon: 'M3 6l18 6-18 6V6z' },
  ];

  const handleToolClick = (type: DrawingToolType) => {
    if (activeTool === type) {
      onSelectTool(null); // Deselect if already active
    } else {
      onSelectTool(type);
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    // Here you would also update the active drawing tool's color
    // This would need to be hooked up to a parent component
  };

  return (
    <div className="drawing-toolbar bg-gray-800 rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-white">Drawing Tools</h3>
        <div className="flex space-x-2">
          <button
            className={`p-1 rounded ${canUndo ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-700 opacity-50 cursor-not-allowed'}`}
            onClick={onUndoDrawing}
            disabled={!canUndo}
            title="Undo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className={`p-1 rounded ${drawingCount > 0 ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-700 opacity-50 cursor-not-allowed'}`}
            onClick={onClearDrawings}
            disabled={drawingCount === 0}
            title="Clear All"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 mb-3">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`p-2 flex flex-col items-center justify-center rounded text-xs ${
              activeTool === tool.type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => handleToolClick(tool.type)}
            title={tool.label}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} />
            </svg>
            <span className="truncate w-full text-center">{tool.label}</span>
          </button>
        ))}
      </div>

      {activeTool && (
        <>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">Color</label>
            <div className="flex space-x-1">
              {['#FFFFFF', '#FF6B6B', '#4CAF50', '#3498DB', '#F1C40F', '#9B59B6'].map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full ${color === currentColor ? 'ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
              <button
                className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-600"
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                +
              </button>
            </div>
            {showColorPicker && (
              <div className="mt-2">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-8 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Line Width: {lineWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Line Style</label>
            <div className="grid grid-cols-3 gap-1">
              <button className="p-1 bg-gray-700 rounded hover:bg-gray-600 border-b border-white">
                Solid
              </button>
              <button className="p-1 bg-gray-700 rounded hover:bg-gray-600 border-b border-dashed border-white">
                Dashed
              </button>
              <button className="p-1 bg-gray-700 rounded hover:bg-gray-600 border-b border-dotted border-white">
                Dotted
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DrawingToolbar;
