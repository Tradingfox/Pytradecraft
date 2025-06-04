import React from 'react';
import { useTradingContext } from '../../contexts/TradingContext';
import SectionPanel from '../SectionPanel';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { HubConnectionStatus } from '../../types';

const MarketOverviewWidget: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const {
    liveQuotes,
    marketStreamContractId,
    selectedBroker, // To know if a broker is selected
    isAuthenticated,
    marketHubStatus,
    userAccounts, // To get contract precision if available via selectedContract on other views
    selectedAccountId,
  } = useTradingContext();

  const getStatusColor = (status: HubConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
      case 'disconnecting':
        return 'text-yellow-400';
      case 'disconnected':
        return 'text-red-400';
      case 'error':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  // Attempt to find contract details for precision (simplified)
  // In a real app, you might have a global way to get contract details by ID
  const currentContractDetails = userAccounts.length > 0 && selectedAccountId && marketStreamContractId
    ? { id: marketStreamContractId, precision: 2 } // Placeholder, ideally fetch full contract details
    : { id: marketStreamContractId, precision: 2 };


  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return 'N/A';
    return price.toFixed(currentContractDetails?.precision || 2);
  };

  let content;

  if (!isAuthenticated || !selectedBroker) {
    content = (
      <p className="text-gray-400 text-sm text-center py-4">
        Please connect to a broker to view market data.
      </p>
    );
  } else if (marketHubStatus !== 'connected') {
    content = (
      <div className="text-center py-4">
        <p className="text-sm">
            <span className="text-gray-400 font-medium">Market Hub: </span>
            <span className={getStatusColor(marketHubStatus)}>{marketHubStatus}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">Market data feed is not currently connected. Check connection or visit Charts to subscribe.</p>
         <Link to="/charts" className="mt-2 text-sm text-sky-400 hover:text-sky-300 underline">
            Go to Charts
          </Link>
      </div>
    );
  } else if (!marketStreamContractId) {
    content = (
      <div className="text-center py-4">
        <p className="text-gray-400 text-sm">No active market data stream.</p>
        <Link to="/charts" className="mt-1 text-sm text-sky-400 hover:text-sky-300 underline">
          View charts to activate a stream.
        </Link>
      </div>
    );
  } else {
    const currentQuote = liveQuotes.find(q => q.contractId === marketStreamContractId);
    if (currentQuote) {
      const handleContractClick = () => {
        if (marketStreamContractId) {
          navigate('/charts', { state: { selectedContractId: marketStreamContractId } });
        }
      };

      content = (
        <div className="space-y-2 text-sm">
          <div
            className="hover:bg-gray-700 p-1 rounded-md cursor-pointer"
            onClick={handleContractClick}
            title={`View chart for ${marketStreamContractId}`}
          >
            <span className="text-gray-400 font-medium">Streaming: </span>
            <span className="text-sky-400 font-semibold underline">{marketStreamContractId}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1"> {/* Added pl-1 for alignment if needed */}
            <div>
              <span className="text-gray-500">Last:</span>
              <span className="text-gray-200 ml-1 font-mono">{formatPrice(currentQuote.lastPrice)}</span>
            </div>
            <div>
              <span className="text-gray-500">Bid:</span>
              <span className="text-blue-400 ml-1 font-mono">{formatPrice(currentQuote.bidPrice)}</span>
            </div>
            <div>
              <span className="text-gray-500">Ask:</span>
              <span className="text-red-400 ml-1 font-mono">{formatPrice(currentQuote.askPrice)}</span>
            </div>
            {currentQuote.timestamp && (
                 <div>
                    <span className="text-gray-500">Time:</span>
                    <span className="text-gray-300 ml-1 font-mono text-xs">{new Date(currentQuote.timestamp).toLocaleTimeString()}</span>
                </div>
            )}
          </div>
        </div>
      );
    } else {
      content = (
        <p className="text-gray-400 text-sm text-center py-4">
          Waiting for live data for {marketStreamContractId}...
        </p>
      );
    }
  }

  return (
    <SectionPanel title="Market Overview">
      {content}
    </SectionPanel>
  );
};

export default MarketOverviewWidget;
