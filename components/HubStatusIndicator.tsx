import React from 'react';
import { HubConnectionStatus } from '../types';
import { useTradingContext } from '../../contexts/TradingContext'; // Import context

interface HubStatusIndicatorProps {
  hubName: "User Hub" | "Market Hub" | string; // More specific for known hubs, fallback to string
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

  const tooltipText = statusMessage || `${hubName}: ${status}. Click to attempt reconnect if disconnected/error.`;
  const { connectUserHub, connectMarketHub, userHubStatus, marketHubStatus } = useTradingContext();

  const isLoading = status === 'connecting' || status === 'disconnecting';

  const handleClick = () => {
    if (isLoading) return; // Don't do anything if already connecting/disconnecting

    if ((status === 'disconnected' || status === 'error')) {
      if (hubName === "User Hub") {
        console.log("Attempting to reconnect User Hub from indicator click...");
        connectUserHub();
      } else if (hubName === "Market Hub") {
        console.log("Attempting to reconnect Market Hub from indicator click...");
        connectMarketHub();
      }
    }
  };

  const canClickToReconnect = (status === 'disconnected' || status === 'error') && !isLoading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || !canClickToReconnect}
      className={`flex items-center space-x-2 p-1 rounded-md ${canClickToReconnect ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'} disabled:opacity-70 disabled:cursor-not-allowed`}
      title={tooltipText}
    >
      <div className={`w-3 h-3 rounded-full ${bgColor} ${pulse ? 'animate-pulse' : ''}`}></div>
      <span className="text-xs text-gray-300 hidden sm:inline">{hubName}</span>
      {/* Detailed status text can be shown here or only in tooltip - useful for screen readers too */}
      <span className="sr-only">{tooltipText}</span>
    </button>
  );
};

// Memoize the component as its props (hubName, status, statusMessage) might not change frequently,
// but context changes could cause re-renders if not memoized.
// However, since it now consumes context for connect functions, memoization here might be tricky
// if connectUserHub/connectMarketHub references change often (they shouldn't if properly memoized in context).
// For now, let's keep it simple. If performance issues arise, custom comparison for React.memo can be added.
// const MemoizedHubStatusIndicator = React.memo(HubStatusIndicator);
// export default MemoizedHubStatusIndicator;

export default HubStatusIndicator;
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
