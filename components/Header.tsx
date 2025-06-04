
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useTradingContext } from '../contexts/TradingContext'; // Import useTradingContext
import HubStatusIndicator from './HubStatusIndicator'; // Import HubStatusIndicator
import { GEMINI_API_KEY_INFO_URL } from '../constants.tsx';


interface HeaderProps {
  title: string;
}

const ApiKeyStatusIndicator: React.FC = () => {
  const { apiKeyStatus, checkApiKey } = useAppContext();

  let statusColor = 'bg-yellow-500';
  let statusText = 'Checking API Key...';

  if (apiKeyStatus === 'valid') {
    statusColor = 'bg-green-500';
    statusText = 'API Key OK';
  } else if (apiKeyStatus === 'missing') {
    statusColor = 'bg-red-500';
    statusText = 'API Key Missing';
  }
  
  return (
    <div className="flex items-center space-x-2">
       {apiKeyStatus === 'missing' && (
         <a 
            href={GEMINI_API_KEY_INFO_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:text-sky-300 underline"
          >
            Get API Key
          </a>
       )}
      <button onClick={() => checkApiKey()} className="text-xs text-gray-400 hover:text-white" title="Re-check API Key Status">
        {statusText}
      </button>
      <div className={`w-3 h-3 rounded-full ${statusColor}`} title={statusText}></div>
    </div>
  );
};


const Header: React.FC<HeaderProps> = ({ title }) => {
  const {
    userHubStatus, userHubStatusMessage,
    marketHubStatus, marketHubStatusMessage
  } = useTradingContext();

  return (
    <header className="bg-gray-850 p-4 shadow-md flex justify-between items-center border-b border-gray-700">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex items-center space-x-3 sm:space-x-4"> {/* Adjusted spacing for more items */}
        <HubStatusIndicator
          hubName="User"
          status={userHubStatus}
          statusMessage={userHubStatusMessage}
        />
        <HubStatusIndicator
          hubName="Market"
          status={marketHubStatus}
          statusMessage={marketHubStatusMessage}
        />
        <div className="hidden sm:block h-5 w-px bg-gray-600"></div> {/* Separator for larger screens */}
        <ApiKeyStatusIndicator />
        <img
          src="https://picsum.photos/seed/user/40/40" // Placeholder avatar
          alt="User Avatar"
          className="w-8 h-8 rounded-full"
        />
      </div>
    </header>
  );
};

export default Header;
