import React, { useState, useEffect, useRef } from 'react'; 
import SectionPanel from '../components/SectionPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ConsoleOutput from '../components/ConsoleOutput';
import { useTradingContext } from '../contexts/TradingContext';
import { BrokerType, ProjectXAuthMode } from '../types';
import { PROJECTX_DEFAULT_APP_ID } from '../constants.tsx';
import { PROJECTX_API_BASE_URL } from '../constants.ts';
import { useScrollControl, usePreventScrollJump } from '../utils/scrollHelper';

const DeploymentsView: React.FC = () => {
  const {
    selectedBroker,
    projectXAuthMode,
    projectXUsername,
    projectXApiKey,
    projectXPassword,
    projectXDeviceId,
    projectXAppId,
    projectXVerifyKey,
    topstepXUsername,
    topstepXApiKey,
    isAuthenticated,
    connectionStatusMessage,
    isLoading,
    userAccounts,
    selectedAccountId,
    sessionToken: currentSessionToken,
    selectBroker,
    setProjectXAuthMode,
    updateProjectXCredentials,
    updateTopstepXCredentials,
    connectToBroker: connectToBrokerFromContext, 
    disconnectFromBroker,
    fetchUserAccounts,
    selectAccount,
    userHubStatus, 
    userHubStatusMessage, 
    connectUserHub, 
    disconnectUserHub, 
    liveAccountUpdates, 
    liveOrderUpdates,
    livePositionUpdates,
    liveTradeUpdates,

    // Market Hub State & Actions
    marketHubStatus,
    marketHubStatusMessage,
    marketStreamContractId,
    liveQuotes,
    liveMarketTrades,
    liveDepthUpdates,
    connectMarketHub,
    disconnectMarketHub,
    subscribeToMarketData,
    unsubscribeFromMarketData,

  } = useTradingContext();

  const [localPjxUsername, setLocalPjxUsername] = useState(projectXUsername);
  const [localPjxApiKey, setLocalPjxApiKey] = useState(projectXApiKey);
  const [localPjxPassword, setLocalPjxPassword] = useState(projectXPassword || '');
  const [localPjxDeviceId, setLocalPjxDeviceId] = useState(projectXDeviceId || '');
  const [localPjxAppId, setLocalPjxAppId] = useState(projectXAppId || PROJECTX_DEFAULT_APP_ID);
  const [localPjxVerifyKey, setLocalPjxVerifyKey] = useState(projectXVerifyKey || '');

  const [localTsUsername, setLocalTsUsername] = useState(topstepXUsername);
  const [localTsApiKey, setLocalTsApiKey] = useState(topstepXApiKey);

  const [marketContractInput, setMarketContractInput] = useState<string>("");

  const connectToBrokerRef = useRef(connectToBrokerFromContext);

  useEffect(() => { connectToBrokerRef.current = connectToBrokerFromContext; }, [connectToBrokerFromContext]);
  useEffect(() => setLocalPjxUsername(projectXUsername), [projectXUsername]);
  useEffect(() => setLocalPjxApiKey(projectXApiKey), [projectXApiKey]);
  useEffect(() => setLocalPjxPassword(projectXPassword || ''), [projectXPassword]);
  useEffect(() => setLocalPjxDeviceId(projectXDeviceId || ''), [projectXDeviceId]);
  useEffect(() => setLocalPjxAppId(projectXAppId || PROJECTX_DEFAULT_APP_ID), [projectXAppId]);
  useEffect(() => setLocalPjxVerifyKey(projectXVerifyKey || ''), [projectXVerifyKey]);
  useEffect(() => setLocalTsUsername(topstepXUsername), [topstepXUsername]);
  useEffect(() => setLocalTsApiKey(topstepXApiKey), [topstepXApiKey]);

  // Set up scroll position management for live feeds
  const { registerScrollContainer, handleScroll } = useScrollControl([
    liveQuotes, liveMarketTrades, liveDepthUpdates, 
    liveAccountUpdates, liveOrderUpdates, livePositionUpdates, liveTradeUpdates
  ]);

  // Prevent page scroll jumps when Market Hub updates
  const { restorePosition } = usePreventScrollJump();

  // Prevent Market Hub streaming data from causing page jumps
  useEffect(() => {
    // When data is received, restore page position
    if (liveQuotes.length > 0 || liveMarketTrades.length > 0 || liveDepthUpdates.length > 0) {
      restorePosition();
    }
  }, [liveQuotes, liveMarketTrades, liveDepthUpdates, restorePosition]);

  const handleConnect = () => {
    if (selectedBroker === 'projectx') {
      updateProjectXCredentials({ 
        userName: localPjxUsername, apiKey: localPjxApiKey, password: localPjxPassword,
        deviceId: localPjxDeviceId, appId: localPjxAppId, verifyKey: localPjxVerifyKey
      });
    } else if (selectedBroker === 'topstepx') {
      updateTopstepXCredentials({ username: localTsUsername, apiKey: localTsApiKey });
    }
    setTimeout(() => { connectToBrokerRef.current(); }, 0);
  };

  const selectedAccountDetails = userAccounts.find(acc => acc.id === selectedAccountId);

  const renderLiveFeed = (title: string, data: any[], itemKeyPrefix: string) => (
    <div className="mt-3">
        <h5 className="text-sm font-semibold text-gray-300 mb-1">{title} ({data.length > 0 ? `Last ${data.length}` : 'No new'}):</h5>
        {data.length === 0 ? <p className="text-xs text-gray-500 italic">No live updates yet.</p> : (
            <div 
                className="max-h-32 overflow-y-auto bg-gray-900 p-2 rounded border border-gray-700 text-xs custom-scrollbar"
                ref={registerScrollContainer(itemKeyPrefix)}
                onScroll={handleScroll(itemKeyPrefix)}
            >
                {data.map((item, index) => (
                    <pre key={`${itemKeyPrefix}-${index}`} className="whitespace-pre-wrap break-all mb-1 pb-1 border-b border-gray-750 text-gray-400">
                        {JSON.stringify(item, null, 2)}
                    </pre>
                ))}
            </div>
        )}
    </div>
  );

  const handleMarketDataSubscription = () => {
    if (marketContractInput.trim()) {
      subscribeToMarketData(marketContractInput.trim());
      // Restore scroll position after subscription
      setTimeout(restorePosition, 100);
    }
  };

  return (
    <div className="space-y-6">
      <SectionPanel title="Broker Connection Management">
        <div className="mb-4">
          <label htmlFor="brokerSelect" className="block text-sm font-medium text-gray-300 mb-1">Select Broker</label>
          <select
            id="brokerSelect" value={selectedBroker || ''}
            onChange={(e) => selectBroker(e.target.value as BrokerType | null)}
            className="w-full md:w-1/2 bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
            disabled={isLoading || isAuthenticated}
          >
            <option value="">-- Select Broker --</option>
            <option value="projectx">ProjectX (Demo)</option>
            <option value="topstepx">TopstepX</option>
          </select>
        </div>

        {selectedBroker === 'projectx' && !isAuthenticated && ( /* ProjectX Auth Inputs */
          <div className="p-4 bg-gray-800 rounded-md border border-gray-700">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">ProjectX Auth Mode:</label>
              <div className="flex space-x-4">
                {(['loginKey', 'loginApp'] as ProjectXAuthMode[]).map(mode => (
                  <button key={mode} onClick={() => setProjectXAuthMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${projectXAuthMode === mode ? 'bg-sky-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}>
                    {mode === 'loginKey' ? 'API Key Auth' : 'App Credentials Auth'}
                  </button>
                ))}
              </div>
            </div>
            {projectXAuthMode === 'loginKey' && (
              <div className="space-y-3">
                <input type="text" placeholder="ProjectX Username" value={localPjxUsername} onChange={e => setLocalPjxUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="password" placeholder="ProjectX API Key" value={localPjxApiKey} onChange={e => setLocalPjxApiKey(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
              </div>
            )}
            {projectXAuthMode === 'loginApp' && (
              <div className="space-y-3">
                <input type="text" placeholder="ProjectX Username" value={localPjxUsername} onChange={e => setLocalPjxUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="password" placeholder="ProjectX Password" value={localPjxPassword} onChange={e => setLocalPjxPassword(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="text" placeholder="Device ID (Optional)" value={localPjxDeviceId} onChange={e => setLocalPjxDeviceId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="text" placeholder="App ID" value={localPjxAppId} onChange={e => setLocalPjxAppId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="password" placeholder="Verify Key (Optional)" value={localPjxVerifyKey} onChange={e => setLocalPjxVerifyKey(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
              </div>
            )}
          </div>
        )}

        {selectedBroker === 'topstepx' && !isAuthenticated && ( /* TopstepX Auth Inputs */
            <div className="p-4 bg-gray-800 rounded-md border border-gray-700 space-y-3">
                <p className="text-gray-300 text-sm">Enter your TopstepX credentials:</p>
                <input type="text" placeholder="TopstepX Username (Informational)" value={localTsUsername} onChange={e => setLocalTsUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                <input type="password" placeholder="TopstepX API Key/Token" value={localTsApiKey} onChange={e => setLocalTsApiKey(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-sky-500" />
                 <p className="text-xs text-gray-400 mt-1">The API Key/Token will be used for authentication. Username is for your reference.</p>
            </div>
        )}

        {selectedBroker && ( /* Connect/Disconnect Buttons */
          <div className="mt-4 flex space-x-3">
            <button onClick={handleConnect} disabled={isLoading || isAuthenticated}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50">
              {isLoading && !isAuthenticated ? <LoadingSpinner size="sm" /> : 'Connect'}
            </button>
            <button onClick={disconnectFromBroker} disabled={isLoading && !isAuthenticated} 
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50">
              {isLoading && isAuthenticated ? <LoadingSpinner size="sm" /> : 'Disconnect'}
            </button>
          </div>
        )}
        {connectionStatusMessage && (
          <ConsoleOutput lines={connectionStatusMessage.split('\n')} title="Connection Status" height="auto" className="mt-4 text-sm" />
        )}
      </SectionPanel>

      {/* ProjectX Authentication Test Section */}
      {selectedBroker === 'projectx' && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
          <h3 className="text-blue-400 font-medium mb-2">🔍 ProjectX Authentication Debug</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p><strong>API Base URL:</strong> {PROJECTX_API_BASE_URL}</p>
            <p><strong>Auth Mode:</strong> {projectXAuthMode}</p>
            <p><strong>Username:</strong> {projectXUsername || 'Not set'}</p>
            <p><strong>API Key:</strong> {projectXApiKey ? `${projectXApiKey.substring(0, 8)}...` : 'Not set'}</p>
            {projectXAuthMode === 'loginApp' && (
              <>
                <p><strong>App ID:</strong> {projectXAppId}</p>
                <p><strong>Device ID:</strong> {projectXDeviceId || 'Not set'}</p>
                <p><strong>Password:</strong> {projectXPassword ? 'Set' : 'Not set'}</p>
                <p><strong>Verify Key:</strong> {projectXVerifyKey ? 'Set' : 'Not set'}</p>
              </>
            )}
            <div className="mt-3 p-2 bg-gray-800 rounded text-xs">
              <p className="text-yellow-400 mb-1">💡 Troubleshooting Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Ensure your ProjectX account is active and API access is enabled</li>
                <li>For loginKey mode: Use your ProjectX username and API key</li>
                <li>For loginApp mode: Use your ProjectX app credentials</li>
                <li>Check the browser console for detailed error messages</li>
                <li>Verify your credentials work with ProjectX's swagger documentation</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && selectedBroker && (
        <>
          <SectionPanel title="Account Information">
            <div className="flex items-center space-x-4 mb-4">
              <select value={selectedAccountId || ''}
                onChange={(e) => selectAccount(e.target.value ? (selectedBroker === 'projectx' ? Number(e.target.value) : e.target.value) : null)}
                className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
                disabled={userAccounts.length === 0 || isLoading} >
                <option value="">-- Select Account --</option>
                {userAccounts.map(acc => <option key={acc.id || `account-${acc.name}`} value={acc.id}>{acc.name} (ID: {acc.id})</option>)}
              </select>
              <button onClick={() => fetchUserAccounts()} disabled={isLoading}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                {isLoading && userAccounts.length === 0 ? <LoadingSpinner size="sm"/> : "Refresh Accounts"}
              </button>
            </div>
            {selectedAccountDetails ? ( /* Account Details Display */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><strong>Account Name:</strong> {selectedAccountDetails.name}</p>
                <p><strong>Account ID:</strong> {selectedAccountDetails.id}</p>
                <p><strong>Balance:</strong> {selectedAccountDetails.balance !== undefined ? `$${selectedAccountDetails.balance.toLocaleString()}` : 'N/A'}</p>
                <p><strong>Currency:</strong> {selectedAccountDetails.currency || 'N/A'}</p>
                <p><strong>Tradable:</strong> {selectedAccountDetails.canTrade ? 'Yes' : 'No'}</p>
                <p><strong>Visible:</strong> {selectedAccountDetails.isVisible ? 'Yes' : 'No'}</p>
              </div>
            ) : userAccounts.length > 0 && !selectedAccountId ? ( <p className="text-yellow-400">Please select an account to view details.</p>
            ): userAccounts.length === 0 && !isLoading ? ( <p className="text-gray-400">No accounts found. Check connection or connect User Hub for TopstepX.</p>
            ): ( <p className="text-gray-400">{isLoading && userAccounts.length === 0 ? 'Loading accounts...' : 'No accounts loaded or selected.'}</p>
            )}
          </SectionPanel>

          <SectionPanel title="Real-time Hub Connections (SignalR)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div> {/* User Hub Section */}
                <h4 className="text-lg font-semibold text-gray-200 mb-2">User Hub</h4>
                <div className="flex space-x-3 mb-3">
                    <button onClick={connectUserHub} disabled={userHubStatus === 'connected' || userHubStatus === 'connecting' || !currentSessionToken}
                      className="bg-sky-600 hover:bg-sky-500 text-white py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                      {userHubStatus === 'connecting' ? <LoadingSpinner size="sm" /> : 'Connect User Hub'}
                    </button>
                    <button onClick={disconnectUserHub} disabled={userHubStatus === 'disconnected' || userHubStatus === 'disconnecting'}
                      className="bg-red-600 hover:bg-red-500 text-white py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                       {userHubStatus === 'disconnecting' ? <LoadingSpinner size="sm" /> : 'Disconnect User Hub'}
                    </button>
                </div>
                <ConsoleOutput lines={userHubStatusMessage ? userHubStatusMessage.split('\n') : [`Status: ${userHubStatus}`]} title="User Hub Status" height="auto" className="text-sm"/>
                {userHubStatus === 'connected' && (
                  <>
                    {renderLiveFeed("Live Account Updates", liveAccountUpdates, "acc")}
                    {renderLiveFeed("Live Order Updates", liveOrderUpdates, "ord")}
                    {renderLiveFeed("Live Position Updates", livePositionUpdates, "pos")}
                    {renderLiveFeed("Live Trade Updates", liveTradeUpdates, "trd")}
                  </>
                )}
              </div>
              <div> {/* Market Hub Section */}
                <h4 className="text-lg font-semibold text-gray-200 mb-2">Market Hub ({selectedBroker === 'projectx' ? 'ProjectX' : selectedBroker === 'topstepx' ? 'TopstepX' : 'Real-Time Data'})</h4>
                 {selectedBroker !== 'topstepx' && selectedBroker !== 'projectx' && <p className="text-xs text-gray-500 mb-2">Market Hub streaming is available for TopstepX and ProjectX.</p>}
                 {selectedBroker === 'topstepx' && (
                   <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-2">
                     <p className="text-xs text-blue-300 mb-1">📋 <strong>TopStepX Notes:</strong></p>
                     <ul className="text-xs text-gray-300 space-y-1">
                       <li>• Real-time streaming: ✅ Available</li>
                       <li>• Historical data: ❌ Requires ProjectX API subscription</li>
                       <li>• Charts functionality: Limited without ProjectX API</li>
                     </ul>
                   </div>
                 )}
                <div className="flex space-x-3 mb-3">
                    <button onClick={() => {
                      connectMarketHub();
                      // Restore scroll position after connection
                      setTimeout(restorePosition, 300);
                    }} disabled={marketHubStatus === 'connected' || marketHubStatus === 'connecting' || !currentSessionToken || (selectedBroker !== 'topstepx' && selectedBroker !== 'projectx')}
                      className="bg-teal-600 hover:bg-teal-500 text-white py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                      {marketHubStatus === 'connecting' ? <LoadingSpinner size="sm" /> : 'Connect Market Hub'}
                    </button>
                    <button onClick={() => {
                      disconnectMarketHub();
                      // Restore scroll position after disconnection
                      setTimeout(restorePosition, 300);
                    }} disabled={marketHubStatus === 'disconnected' || marketHubStatus === 'disconnecting' || (selectedBroker !== 'topstepx' && selectedBroker !== 'projectx')}
                      className="bg-orange-600 hover:bg-orange-500 text-white py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                       {marketHubStatus === 'disconnecting' ? <LoadingSpinner size="sm" /> : 'Disconnect Market Hub'}
                    </button>
                </div>
                <ConsoleOutput lines={marketHubStatusMessage ? marketHubStatusMessage.split('\n') : [`Status: ${marketHubStatus}`]} title="Market Hub Status" height="auto" className="text-sm"/>
                {marketHubStatus === 'connected' && (
                  <div className="mt-3 space-y-2">
                     <div className="flex space-x-2 items-center">
                        <input type="text" placeholder="Contract ID (e.g., CON.F.US.NQ.M25)" value={marketContractInput} onChange={e => setMarketContractInput(e.target.value)} 
                               className="flex-grow bg-gray-700 p-2 rounded border border-gray-600 text-sm" />
                        <button onClick={handleMarketDataSubscription} disabled={!marketContractInput.trim()}
                                className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-md text-sm transition disabled:opacity-50">
                            {marketStreamContractId === marketContractInput.trim() ? "Resubscribe" : "Subscribe"}
                        </button>
                         {marketStreamContractId && 
                            <button onClick={() => {
                                unsubscribeFromMarketData();
                                // Restore scroll position after unsubscription
                                setTimeout(restorePosition, 100);
                            }} 
                                    className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-3 rounded-md text-sm transition">
                                Unsubscribe
                            </button>}
                     </div>
                    {marketStreamContractId && <p className="text-xs text-sky-400">Streaming: {marketStreamContractId}</p>}
                    {renderLiveFeed("Live Quotes", liveQuotes, "quote")}
                    {renderLiveFeed("Live Market Trades", liveMarketTrades, "mktrd")}
                    {renderLiveFeed("Live Market Depth", liveDepthUpdates, "depth")}
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Trading Actions (Placeholders)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h5 className="text-md font-semibold text-gray-300 mb-2">Contract Search</h5>
                    <p className="text-gray-400 text-xs mb-2">Search for contracts (e.g., "NQ", "ES", "CON.F.US.ENQ.H25").</p>
                    <div className="flex space-x-2">
                        <input type="text" placeholder="Enter contract symbol or ID" className="flex-grow bg-gray-700 p-2 rounded border border-gray-600" />
                        <button className="bg-sky-600 hover:bg-sky-500 text-white py-2 px-3 rounded-md text-sm opacity-50 cursor-not-allowed">Search</button>
                    </div>
                </div>
                <div>
                    <h5 className="text-md font-semibold text-gray-300 mb-2">Order Entry</h5>
                    <p className="text-gray-400 text-xs mb-2">Place new orders.</p>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <input type="text" placeholder="Contract ID" className="bg-gray-700 p-2 rounded border col-span-2"/>
                        <select className="bg-gray-700 p-2 rounded border"><option>Market</option><option>Limit</option></select>
                        <select className="bg-gray-700 p-2 rounded border"><option>Buy</option><option>Sell</option></select>
                        <input type="number" placeholder="Quantity" className="bg-gray-700 p-2 rounded border"/>
                        <input type="number" placeholder="Limit Price" className="bg-gray-700 p-2 rounded border"/>
                    </div>
                    <button className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-md text-sm opacity-50 cursor-not-allowed">Place Order</button>
                </div>
            </div>
             <div className="mt-6">
                <h5 className="text-md font-semibold text-gray-300 mb-2">Current Orders & Positions</h5>
                <p className="text-gray-400 text-xs mb-2">View open orders, history, and current positions.</p>
                <div className="text-center text-gray-500 py-4 border border-dashed border-gray-700 rounded-md">Placeholder: Orders & Positions display area.</div>
             </div>
          </SectionPanel>
        </>
      )}
    </div>
  );
};

export default DeploymentsView;
