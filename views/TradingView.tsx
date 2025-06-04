import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import OrderManagement from '../components/OrderManagement';
import TradeHistory from '../components/TradeHistory';
import PositionManagement from '../components/PositionManagement';
import RiskManagement from '../components/RiskManagement';
import MarketData from '../components/MarketData';
import AlertsManagement from '../components/AlertsManagement';
import NewsAndEvents from '../components/NewsAndEvents';
import StrategyManagement from '../components/StrategyManagement';
import TopstepXManagement from '../components/TopstepXManagement.simple';
import LoadingSpinner from '../components/LoadingSpinner';
import { Contract } from '../types';

type TabType = 'trading' | 'risk' | 'market' | 'alerts' | 'news' | 'strategies' | 'topstepx';

const TradingView: React.FC = () => {
  const {
    selectedBroker,
    selectedAccountId,
    isAuthenticated,
    searchContracts,
    connectionStatusMessage,
    isLoading,
    liveQuotes, // Add liveQuotes
    marketStreamContractId, // Add marketStreamContractId
  } = useTradingContext();
  
  const [activeTab, setActiveTab] = useState<TabType>('topstepx'); // Start with TopstepX tab for testing
  const [searchText, setSearchText] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Reset selected contract when broker or account changes
  useEffect(() => {
    setSelectedContract(null);
    setContracts([]);
    setSearchText('');
  }, [selectedBroker, selectedAccountId]);

  const handleContractSearch = async () => {
    if (!selectedBroker || !isAuthenticated || !selectedAccountId) {
      setSearchError('Please connect to a broker and select an account first');
      return;
    }

    if (!searchText.trim()) {
      setSearchError('Please enter a search term');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      console.log('🔍 Starting contract search with:', {
        broker: selectedBroker,
        searchText: searchText.trim(),
        accountId: selectedAccountId
      });
      
      // Try with live: false first (like the working PowerShell example)
      const result = await searchContracts(selectedBroker, {
        searchText: searchText.trim(),
        live: false, // Try false first (PowerShell example)
      });

      if (result.success) {
        setContracts(result.contracts);
        if (result.contracts.length === 0) {
          console.log('🔍 No contracts with live: false, trying live: true...');
          
          // Try with live: true if live: false returns no results
          const resultLive = await searchContracts(selectedBroker, {
            searchText: searchText.trim(),
            live: true,
          });
          
          if (resultLive.success && resultLive.contracts.length > 0) {
            setContracts(resultLive.contracts);
          } else {
            setSearchError(`No contracts found for "${searchText.trim()}". Tried both live: false and live: true.`);
          }
        }
      } else {
        setSearchError(`API Error: ${result.errorMessage || 'Failed to search contracts'} (Code: ${result.errorCode})`);
      }
    } catch (error) {
      console.error('Contract search error:', error);
      setSearchError(`Error searching contracts: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectContract = (contract: Contract) => {
    setSelectedContract(contract);
  };
  const tabs = [
    { id: 'trading' as TabType, label: 'Trading', icon: '📈' },
    { id: 'risk' as TabType, label: 'Risk Management', icon: '⚠️' },
    { id: 'market' as TabType, label: 'Market Data', icon: '📊' },
    { id: 'alerts' as TabType, label: 'Alerts', icon: '🔔' },
    { id: 'news' as TabType, label: 'News & Events', icon: '📰' },
    { id: 'strategies' as TabType, label: 'Strategies', icon: '🎯' },
    { id: 'topstepx' as TabType, label: 'TopstepX API', icon: '🔗' },
  ];  const renderTabContent = () => {
    // TopstepX tab is always accessible
    if (activeTab === 'topstepx') {
      console.log('🌟 Rendering TopstepX Management Component');
      return (
        <div className="space-y-6">
          <TopstepXManagement />
          
          {/* Debug Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Selected Broker:</p>
                <p className="text-white">{selectedBroker || 'None'}</p>
              </div>
              <div>
                <p className="text-gray-400">Authenticated:</p>
                <p className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Selected Account:</p>
                <p className="text-white">{selectedAccountId || 'None'}</p>
              </div>
              <div>
                <p className="text-gray-400">Connection Status:</p>
                <p className="text-white">{connectionStatusMessage || 'No status'}</p>
              </div>
            </div>
            
            {/* Quick Contract Test */}
            {isAuthenticated && selectedAccountId && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-white font-medium mb-2">Quick Contract Search Test</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Enter contract symbol (e.g., ES)"
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleContractSearch}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    {isSearching ? 'Searching...' : 'Test Search'}
                  </button>
                </div>
                
                {searchError && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                    <strong>Error:</strong> {searchError}
                  </div>
                )}
                
                {contracts.length > 0 && (
                  <div className="bg-green-900/50 border border-green-500 text-green-200 px-3 py-2 rounded text-sm">
                    <strong>Success:</strong> Found {contracts.length} contract(s)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Other tabs require authentication and account selection
    if (!isAuthenticated || !selectedAccountId) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-400 mb-4">
              Please connect to a broker and select an account in the Settings panel to access this feature.
            </p>
            <p className="text-gray-400">
              Or use the <strong>TopstepX API</strong> tab for direct TopstepX trading functionality.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'trading':
        return (
          <div className="space-y-6">
            {/* Contract Search */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Contract Search</h2>

              {searchError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                  {searchError}
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  className="flex-1 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg"
                  placeholder="Search for a contract (e.g. ES, NQ, CL)"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContractSearch()}
                />
                <button
                  onClick={handleContractSearch}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Quick Contract Symbols */}
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Quick Search - Popular Contracts:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'ES', 'NQ', 'YM', 'RTY', // US Indices
                    'CL', 'NG', 'GC', 'SI', // Commodities
                    'ZB', 'ZN', 'ZF', 'ZT', // Bonds
                    'EUR', 'GBP', 'JPY', 'CAD', // Currencies
                    '6E', '6B', '6J', '6C' // CME Currency Futures
                  ].map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => {
                        setSearchText(symbol);
                        // Auto-search after setting the text
                        setTimeout(() => handleContractSearch(), 100);
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results */}
              {contracts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-left py-2">Exchange</th>
                        <th className="text-left py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(contract => (
                        <tr key={contract.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${selectedContract?.id === contract.id ? 'bg-blue-900/30' : ''}`}>
                          <td className="py-3 text-white">{contract.name}</td>
                          <td className="py-3 text-gray-300">{contract.description}</td>
                          <td className="py-3 text-gray-400">{contract.exchange || '-'}</td>
                          <td className="py-3">
                            <button
                              onClick={() => handleSelectContract(contract)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                selectedContract?.id === contract.id 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                              }`}
                            >
                              {selectedContract?.id === contract.id ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Contract Details */}
            {selectedContract && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Selected Contract</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Name</p>
                    <p className="text-base text-white">{selectedContract.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Description</p>
                    <p className="text-base text-white">{selectedContract.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Tick Size</p>
                    <p className="text-base text-white">{selectedContract.tickSize}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Tick Value</p>
                    <p className="text-base text-white">${selectedContract.tickValue}</p>
                  </div>
                  {selectedContract.exchange && (
                    <div>
                      <p className="text-sm font-medium text-gray-400">Exchange</p>
                      <p className="text-base text-white">{selectedContract.exchange}</p>
                    </div>
                  )}
                  {selectedContract.expirationDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-400">Expiration</p>
                      <p className="text-base text-white">{new Date(selectedContract.expirationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedContract.pointValue && (
                    <div>
                      <p className="text-sm font-medium text-gray-400">Point Value</p>
                      <p className="text-base text-white">${selectedContract.pointValue}</p>
                    </div>
                  )}
                </div>

                {/* Live Quote Display for TopstepX */}
                {selectedBroker === 'topstepx' && selectedContract && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg shadow">
                    <h3 className="text-md font-semibold text-sky-400 mb-2">
                      Live Quote ({selectedContract.name})
                    </h3>
                    {(() => {
                      const currentQuote = liveQuotes.find(q => q.id === selectedContract.id);
                      // Check if the selected contract is the one being streamed for live data
                      if (selectedContract.id !== marketStreamContractId) {
                        return <p className="text-xs text-yellow-400">Live data stream not active for this specific contract. Subscribe via Market Hub in TopstepX tab.</p>;
                      }
                      if (currentQuote) {
                        // Determine precision for formatting, default to 2 if not specified
                        const precision = typeof selectedContract.precision === 'number' ? selectedContract.precision : 2;
                        return (
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <div><span className="text-gray-400">Last:</span> <span className="text-white font-mono">{currentQuote.last?.toFixed(precision) ?? 'N/A'}</span></div>
                            <div><span className="text-gray-400">Bid:</span> <span className="text-blue-400 font-mono">{currentQuote.bid?.toFixed(precision) ?? 'N/A'}</span></div>
                            <div><span className="text-gray-400">Ask:</span> <span className="text-red-400 font-mono">{currentQuote.ask?.toFixed(precision) ?? 'N/A'}</span></div>
                            {currentQuote.timestamp && <div><span className="text-gray-400">Time:</span> <span className="text-white font-mono text-xs">{new Date(currentQuote.timestamp).toLocaleTimeString()}</span></div>}
                          </div>
                        );
                      }
                      return <p className="text-xs text-gray-500">Waiting for live data for {selectedContract.name}...</p>;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Trading Components */}
            <div className="space-y-6">
              {/* Order Entry & Active Management */}
              <OrderManagement selectedContract={selectedContract} />

              {/* Position & Trade History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PositionManagement selectedContract={selectedContract} />
                <TradeHistory selectedContract={selectedContract} />
              </div>

              {/* Live Market Data for Selected Contract */}
              {selectedContract && (
                <MarketData contractId={selectedContract.id} />
              )}
            </div>
          </div>
        );
      case 'risk':
        return <RiskManagement />;
      case 'market':
        return <MarketData />;
      case 'alerts':
        return <AlertsManagement />;      case 'news':
        return <NewsAndEvents />;
      case 'strategies':
        return <StrategyManagement />;
      default:
        return <div className="text-white">Tab not found</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Trading Platform</h1>
        <p className="text-gray-400">Comprehensive trading and portfolio management</p>
      </div>

      {/* Connection Status */}
      {connectionStatusMessage && (
        <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg mb-6">
          <p>{connectionStatusMessage}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center my-4">
          <LoadingSpinner />
        </div>
      )}      {!isAuthenticated && (
        <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-6">
          <p>Please connect to a broker in the Settings panel first, or use the TopstepX API tab for direct TopstepX access.</p>
        </div>
      )}

      {isAuthenticated && !selectedAccountId && (
        <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-6">
          <p>Please select a trading account in the Settings panel.</p>
        </div>
      )}

      {/* Always show tabs, but conditionally render content */}
      <div className="bg-gray-800 rounded-lg p-1 mb-6">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              disabled={tab.id !== 'topstepx' && (!isAuthenticated || !selectedAccountId)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TradingView;
