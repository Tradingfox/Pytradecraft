import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { 
  TopstepXContract,
  TopstepXRetrieveBarRequest,
  TopstepXAggregateBarModel,
  TopstepXOrderTypeEnum,
  TopstepXOrderSideEnum,
  TopstepXTimeInForceEnum,
  PlaceOrderRequest
} from '../types';
import {
  topstepXLoginApiKey,
  topstepXLoginApp,
  topstepXValidateSession,
  topstepXLogout,
  topstepXSearchContracts,
  topstepXRetrieveBars,
  topstepXPlaceOrder,
  topstepXSearchOrders,
  topstepXSearchPositions,
  topstepXSearchHalfTrades
} from '../services/tradingApiService';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TopstepX Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            <h3 className="font-bold">Component Error Detected</h3>
            <p>Error: {this.state.error?.message}</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Status indicator component for API operations
const StatusIndicator: React.FC<{
  operation: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  clearAfter?: number; // Time in ms to clear success/error status
  className?: string;
}> = ({ operation, status, clearAfter = 5000, className = '' }) => {
  
  // Return the appropriate icon based on status
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <span className="animate-spin inline-block" title="Loading...">⟳</span>
        );
      case 'success':
        return (
          <span className="text-green-500" title="Operation succeeded">✓</span>
        );
      case 'error':
        return (
          <span className="text-red-500" title="Operation failed">✗</span>
        );
      default:
        return null;
    }
  };

  return (
    <span className={`ml-2 inline-flex items-center ${className}`}>
      {getIcon()}
    </span>
  );
};

const TopstepXManagement: React.FC = () => {
  const { 
    sessionToken, 
    selectedAccountId,
    updateTopstepXCredentials,
    topstepXUsername,
    topstepXApiKey,
    authenticateTopstepXDirect
  } = useTradingContext();

  // State for different sections
  const [activeTab, setActiveTab] = useState<'auth' | 'contracts' | 'historical' | 'orders' | 'positions' | 'trades'>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // API operation status tracking
  const [apiStatuses, setApiStatuses] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    login: 'idle',
    validateSession: 'idle',
    logout: 'idle',
    searchContracts: 'idle',
    historicalData: 'idle',
    placeOrder: 'idle',
    searchOrders: 'idle',
    cancelOrder: 'idle',
    searchPositions: 'idle',
    closePosition: 'idle',
    searchTrades: 'idle'
  });

  // Authentication form state
  const [authMode, setAuthMode] = useState<'apiKey' | 'app'>('apiKey');
  const [authData, setAuthData] = useState({
    userName: topstepXUsername || '',
    apiKey: topstepXApiKey || '',
    password: '',
    deviceId: '',
    appId: '',
    verifyKey: ''
  });

  // Contract search state
  const [contractSearch, setContractSearch] = useState({
    searchText: '',
    live: true,
    productType: undefined as number | undefined,
    exchange: '',
    symbolRoot: '',
    contractGroup: '',
    contractName: ''
  });
  const [contracts, setContracts] = useState<TopstepXContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<TopstepXContract | null>(null);

  // Historical data state
  const [historicalRequest, setHistoricalRequest] = useState<TopstepXRetrieveBarRequest>({
    contractId: '',
    live: true,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    endTime: new Date().toISOString(),
    unit: 2, // Minutes
    unitNumber: 1,
    limit: 100,
    includePartialBar: false
  });
  const [historicalBars, setHistoricalBars] = useState<TopstepXAggregateBarModel[]>([]);

  // Order management state
  const [orderForm, setOrderForm] = useState<PlaceOrderRequest>({
    accountId: selectedAccountId || '',
    contractId: '',
    type: TopstepXOrderTypeEnum.MARKET,
    side: TopstepXOrderSideEnum.BUY,
    size: 1,
    limitPrice: undefined,
    stopPrice: undefined,
    timeInForce: TopstepXTimeInForceEnum.DAY,
    customTag: 'PytradeCraft'
  });
  const [orders, setOrders] = useState<any[]>([]);

  // Position management state
  const [positions, setPositions] = useState<any[]>([]);
  // Trade history state
  const [tradeSearch, setTradeSearch] = useState({
    accountId: String(selectedAccountId || ''),
    startTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    endTimestamp: new Date().toISOString(),
    contractId: '',
    orderId: ''
  });  const [trades, setTrades] = useState<any[]>([]);

  // Update form data when account or context changes
  useEffect(() => {
    if (selectedAccountId) {
      setOrderForm(prev => ({ ...prev, accountId: selectedAccountId.toString() }));
      setTradeSearch(prev => ({ ...prev, accountId: selectedAccountId.toString() }));
    }
  }, [selectedAccountId]);

  // Clear browser extension errors from console
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out known extension errors
      const message = args.join(' ');
      if (message.includes('inpage.js') || message.includes('extension')) {
        return; // Suppress extension errors
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Sync existing token from localStorage when component mounts
  useEffect(() => {
    const localToken = localStorage.getItem('topstepx_token');
    
    // If we have a token in localStorage but not in context, and we have the function to update the context
    if (localToken && !sessionToken && typeof authenticateTopstepXDirect === 'function') {
      console.log('🔄 Found token in localStorage, syncing to context...');
      authenticateTopstepXDirect(localToken)
        .then(() => console.log('✅ Token from localStorage synced to context successfully'))
        .catch(err => console.warn('⚠️ Error syncing token to context:', err));
    }
  }, [sessionToken, authenticateTopstepXDirect]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };
  // Reset authentication function for the UI
  const handleResetAuthentication = () => {
    // Clear localStorage token
    localStorage.removeItem('topstepx_token');
    
    // Clear form
    setAuthData({
      userName: '',
      apiKey: '',
      password: '',
      deviceId: '',
      appId: '',
      verifyKey: ''
    });
    
    // Clear messages
    clearMessages();
    
    // Show reset message
    setSuccess('Authentication state reset. Please login again.');
  };  // Authentication functions
  const handleLogin = async () => {
    setLoading(true);
    clearMessages();
    setApiStatuses(prev => ({ ...prev, login: 'loading' }));
    
    try {
      console.log('🔐 TopstepX Login attempt:', {
        mode: authMode,
        userName: authData.userName,
        hasApiKey: !!authData.apiKey,
        hasPassword: !!authData.password
      });

      let response;
      if (authMode === 'apiKey') {
        console.log('📡 Making API Key login request...');
        response = await topstepXLoginApiKey({
          userName: authData.userName,
          apiKey: authData.apiKey
        });
      } else {
        console.log('📡 Making App login request...');
        response = await topstepXLoginApp({
          userName: authData.userName,
          password: authData.password,
          deviceId: authData.deviceId,
          appId: authData.appId,
          verifyKey: authData.verifyKey
        });
      }

      console.log('📨 TopstepX Login response:', response);

      if (response.success) {
        setApiStatuses(prev => ({ ...prev, login: 'success' }));
        updateTopstepXCredentials({
          username: authData.userName,
          apiKey: authData.apiKey
        });
        setSuccess(`Login successful! Token: ${response.token.substring(0, 20)}...`);
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setApiStatuses(prev => ({ ...prev, login: 'idle' }));
        }, 5000);
      } else {
        setApiStatuses(prev => ({ ...prev, login: 'error' }));
        const errorMsg = `Login failed: ${response.errorMessage || 'Unknown error'}`;
        console.error('❌ TopstepX Login failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      setApiStatuses(prev => ({ ...prev, login: 'error' }));
      const errorMsg = `Login error: ${err instanceof Error ? err.message : String(err)}`;
      console.error('💥 TopstepX Login exception:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  const handleValidateSession = async () => {
    if (!sessionToken) {
      setError('No session token available');
      return;
    }

    setLoading(true);
    clearMessages();
    setApiStatuses(prev => ({ ...prev, validateSession: 'loading' }));

    try {
      const response = await topstepXValidateSession(sessionToken);
      if (response.success) {
        setApiStatuses(prev => ({ ...prev, validateSession: 'success' }));
        setSuccess(`Session is valid. User: ${response.userInfo?.userName || 'Unknown'}`);
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setApiStatuses(prev => ({ ...prev, validateSession: 'idle' }));
        }, 5000);
      } else {
        setApiStatuses(prev => ({ ...prev, validateSession: 'error' }));
        setError(`Session validation failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setApiStatuses(prev => ({ ...prev, validateSession: 'error' }));
      setError(`Validation error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    if (!sessionToken) {
      setError('No session token available');
      return;
    }

    setLoading(true);
    clearMessages();
    setApiStatuses(prev => ({ ...prev, logout: 'loading' }));

    try {
      const response = await topstepXLogout(sessionToken);
      if (response.success) {
        setApiStatuses(prev => ({ ...prev, logout: 'success' }));
        setSuccess('Logout successful');
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setApiStatuses(prev => ({ ...prev, logout: 'idle' }));
        }, 5000);
      } else {
        setApiStatuses(prev => ({ ...prev, logout: 'error' }));
        setError(`Logout failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setApiStatuses(prev => ({ ...prev, logout: 'error' }));
      setError(`Logout error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Contract search functions  const handleSearchContracts = async () => {
    if (!sessionToken) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    clearMessages();
    setApiStatuses(prev => ({ ...prev, searchContracts: 'loading' }));

    try {
      const response = await topstepXSearchContracts(sessionToken, contractSearch);
      if (response.success) {
        setApiStatuses(prev => ({ ...prev, searchContracts: 'success' }));
        setContracts(response.contracts);
        setSuccess(`Found ${response.contracts.length} contracts`);
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setApiStatuses(prev => ({ ...prev, searchContracts: 'idle' }));
        }, 5000);
      } else {
        setApiStatuses(prev => ({ ...prev, searchContracts: 'error' }));
        setError(`Contract search failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setApiStatuses(prev => ({ ...prev, searchContracts: 'error' }));
      setError(`Search error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  // Historical data functions
  const handleGetHistoricalData = async () => {
    if (!sessionToken) {
      setError('Please login first');
      return;
    }

    if (!historicalRequest.contractId) {
      setError('Please select a contract first');
      return;
    }

    setLoading(true);
    clearMessages();
    setApiStatuses(prev => ({ ...prev, historicalData: 'loading' }));

    try {
      const response = await topstepXRetrieveBars(sessionToken, historicalRequest);
      if (response.success) {
        setHistoricalBars(response.bars);
        setSuccess(`Retrieved ${response.bars.length} bars`);
        setApiStatuses(prev => ({ ...prev, historicalData: 'success' }));
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setApiStatuses(prev => ({ ...prev, historicalData: 'idle' }));
        }, 5000);
      } else {
        setError(`Historical data failed: ${response.errorMessage || 'Unknown error'}`);
        setApiStatuses(prev => ({ ...prev, historicalData: 'error' }));
      }
    } catch (err) {
      setError(`Historical data error: ${err instanceof Error ? err.message : String(err)}`);
      setApiStatuses(prev => ({ ...prev, historicalData: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Order management functions
  const handlePlaceOrder = async () => {
    if (!sessionToken) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const response = await topstepXPlaceOrder(sessionToken, orderForm);
      if (response.success) {
        setSuccess(`Order placed successfully! Order ID: ${response.orderId}`);
        await handleSearchOrders(); // Refresh orders
      } else {
        setError(`Order placement failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Order error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrders = async () => {
    if (!sessionToken || !selectedAccountId) {
      setError('Please login and select an account first');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const response = await topstepXSearchOrders(sessionToken, {
        accountId: selectedAccountId.toString()
      });
      if (response.success) {
        setOrders(response.orders);
        setSuccess(`Found ${response.orders.length} orders`);
      } else {
        setError(`Order search failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Order search error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Position management functions
  const handleSearchPositions = async () => {
    if (!sessionToken || !selectedAccountId) {
      setError('Please login and select an account first');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const response = await topstepXSearchPositions(sessionToken, {
        accountId: selectedAccountId.toString()
      });
      if (response.success) {
        setPositions(response.positions);
        setSuccess(`Found ${response.positions.length} positions`);
      } else {
        setError(`Position search failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Position search error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Trade history functions
  const handleSearchTrades = async () => {
    if (!sessionToken || !selectedAccountId) {
      setError('Please login and select an account first');
      return;
    }

    setLoading(true);
    clearMessages();    try {
      const searchParams = {
        ...tradeSearch,
        accountId: String(tradeSearch.accountId) // Convert to string
      };
      const response = await topstepXSearchHalfTrades(sessionToken, searchParams);
      if (response.success) {
        setTrades(response.halfTrades);
        setSuccess(`Found ${response.halfTrades.length} trades`);
      } else {
        setError(`Trade search failed: ${response.errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Trade search error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">TopstepX API Management</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'auth', label: 'Authentication', icon: '🔐' },
            { id: 'contracts', label: 'Contracts', icon: '📋' },
            { id: 'historical', label: 'Historical Data', icon: '📊' },
            { id: 'orders', label: 'Orders', icon: '📝' },
            { id: 'positions', label: 'Positions', icon: '💼' },
            { id: 'trades', label: 'Trades', icon: '💰' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Operation Status Indicators */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(apiStatuses).map(([operation, status]) => 
          status !== 'idle' ? (
            <div 
              key={operation} 
              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                status === 'loading' ? 'bg-blue-100 text-blue-800' : 
                status === 'success' ? 'bg-green-100 text-green-800' : 
                'bg-red-100 text-red-800'
              }`}
            >
              <span className="font-medium capitalize">{operation}</span>
              <span className="ml-2">
                {status === 'loading' && <span className="animate-spin inline-block">⟳</span>}
                {status === 'success' && <span className="text-green-500">✓</span>}
                {status === 'error' && <span className="text-red-500">✗</span>}
              </span>
            </div>
          ) : null
        )}
      </div>

      {/* Authentication Tab */}
      {activeTab === 'auth' && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Authentication Mode</h3>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="authMode"
                  value="apiKey"
                  checked={authMode === 'apiKey'}
                  onChange={(e) => setAuthMode(e.target.value as any)}
                  className="mr-2"
                />
                API Key Login
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="authMode"
                  value="app"
                  checked={authMode === 'app'}
                  onChange={(e) => setAuthMode(e.target.value as any)}
                  className="mr-2"
                />
                App Login
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={authData.userName}
                  onChange={(e) => setAuthData(prev => ({ ...prev, userName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {authMode === 'apiKey' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={authData.apiKey}
                    onChange={(e) => setAuthData(prev => ({ ...prev, apiKey: e.target
