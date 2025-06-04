import React from 'react';
import { useNavigate } from 'react-router-dom';
import SectionPanel from '../SectionPanel'; // Adjust path as needed
import { useTradingContext } from '../../contexts/TradingContext'; // Adjust path as needed
import { HubConnectionStatus } from '../../types'; // Adjust path as needed

const SystemStatusWidget: React.FC = () => {
  const navigate = useNavigate();
  const {
    marketHubStatus,
    marketHubStatusMessage,
    userHubStatus,
    userHubStatusMessage,
    isAuthenticated,
    selectedBroker,
    connectionStatusMessage,
  } = useTradingContext();

  const getStatusColor = (status: HubConnectionStatus | 'authenticated' | 'unauthenticated'): string => {
    switch (status) {
      case 'connected':
      case 'authenticated':
        return 'text-green-400';
      case 'connecting':
      case 'disconnecting':
        return 'text-yellow-400';
      case 'disconnected':
      case 'unauthenticated':
        return 'text-red-400';
      case 'error':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <SectionPanel title="System Status">
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-400 font-medium">Market Hub: </span>
          {marketHubStatus === 'disconnected' || marketHubStatus === 'error' ? (
            <span
              onClick={() => navigate('/settings')}
              className={`${getStatusColor(marketHubStatus)} underline cursor-pointer hover:opacity-80`}
              title={marketHubStatusMessage || 'Click to check settings'}
            >
              {marketHubStatus}
            </span>
          ) : (
            <span className={getStatusColor(marketHubStatus)} title={marketHubStatusMessage || undefined}>
              {marketHubStatus}
            </span>
          )}
          {marketHubStatusMessage && <p className="text-xs text-gray-500 mt-0.5">{marketHubStatusMessage}</p>}
        </div>
        <div>
          <span className="text-gray-400 font-medium">User Hub: </span>
          {userHubStatus === 'disconnected' || userHubStatus === 'error' ? (
            <span
              onClick={() => navigate('/settings')}
              className={`${getStatusColor(userHubStatus)} underline cursor-pointer hover:opacity-80`}
              title={userHubStatusMessage || 'Click to check settings'}
            >
              {userHubStatus}
            </span>
          ) : (
            <span className={getStatusColor(userHubStatus)} title={userHubStatusMessage || undefined}>
              {userHubStatus}
            </span>
          )}
          {userHubStatusMessage && <p className="text-xs text-gray-500 mt-0.5">{userHubStatusMessage}</p>}
        </div>
        <div>
          <span className="text-gray-400 font-medium">Broker Connection: </span>
          {isAuthenticated && selectedBroker ? (
            <>
              <span className={getStatusColor('authenticated')} title={connectionStatusMessage || undefined}>
                Connected ({selectedBroker})
              </span>
              {(connectionStatusMessage && !connectionStatusMessage.toLowerCase().includes("success") &&
               !connectionStatusMessage.toLowerCase().includes("connected")) &&
                <p className="text-xs text-gray-500 mt-0.5">{connectionStatusMessage}</p>
              }
            </>
          ) : (
            <span
              onClick={() => navigate('/settings')}
              className={`${getStatusColor('unauthenticated')} underline cursor-pointer hover:opacity-80`}
              title={connectionStatusMessage || "Not connected - Click to check settings"}
            >
              Disconnected
            </span>
          )}
          {!isAuthenticated && connectionStatusMessage && <p className="text-xs text-gray-500 mt-0.5">{connectionStatusMessage}</p>}
        </div>
      </div>
    </SectionPanel>
  );
};

export default SystemStatusWidget;
