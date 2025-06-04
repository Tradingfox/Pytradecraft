import React from 'react';
import { HubConnectionStatus } from '../types'; // Assuming HubConnectionStatus is in types

interface HubStatusIndicatorProps {
  hubName: string;
  status: HubConnectionStatus;
  statusMessage: string | null;
}

const HubStatusIndicator: React.FC<HubStatusIndicatorProps> = ({ hubName, status, statusMessage }) => {
  let bgColor = 'bg-gray-400'; // Default for 'idle' or unknown
  let pulse = false;

  switch (status) {
    case 'connected':
      bgColor = 'bg-green-500';
      break;
    case 'connecting':
      bgColor = 'bg-yellow-500';
      pulse = true;
      break;
    case 'disconnected':
      bgColor = 'bg-red-500';
      break;
    case 'error':
      bgColor = 'bg-red-700'; // Brighter/darker red for error
      break;
    case 'disconnecting':
      bgColor = 'bg-gray-500';
      break;
    default:
      bgColor = 'bg-gray-400'; // A default color for any other unforeseen status
  }

  const tooltipText = statusMessage || `${hubName}: ${status}`;

  return (
    <div className="flex items-center space-x-2" title={tooltipText}>
      <div className={`w-3 h-3 rounded-full ${bgColor} ${pulse ? 'animate-pulse' : ''}`}></div>
      <span className="text-xs text-gray-300 hidden sm:inline">{hubName}</span>
      {/* Detailed status text can be shown here or only in tooltip */}
      {/* <span className={`text-xs ${
        status === 'connected' ? 'text-green-400' :
        status === 'connecting' ? 'text-yellow-400' :
        status === 'disconnected' ? 'text-red-400' :
        status === 'error' ? 'text-red-600' :
        'text-gray-400'
      }`}>{status}</span> */}
    </div>
  );
};

export default HubStatusIndicator;
