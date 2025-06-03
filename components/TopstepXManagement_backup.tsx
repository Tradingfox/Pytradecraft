import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Search, 
  Calendar,
  TrendingUp,
  BarChart,
  Activity,
  DollarSign,
  Clock,
  User,
  Settings,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
type ApiOperationStatus = {
  operation: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  timestamp: number;
};

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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Status indicator component
const StatusIndicator: React.FC<{ 
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}> = ({ status, message }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon()}
      {message && (
        <span className={`text-sm ${
          status === 'error' ? 'text-red-600' : 
          status === 'success' ? 'text-green-600' : 
          status === 'loading' ? 'text-blue-600' : 
          'text-gray-600'
        }`}>
          {message}
        </span>
      )}
    </div>
  );
};

// Main component
const TopstepXManagement: React.FC = () => {
  const { state, dispatch } = useTradingContext();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // API operation tracking
  const [apiOperations, setApiOperations] = useState<ApiOperationStatus[]>([]);
  
  // Contract search state
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contracts, setContracts] = useState<TopstepXContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<TopstepXContract | null>(null);
  
  // Historical data state
  const [historicalData, setHistoricalData] = useState<TopstepXAggregateBarModel[]>([]);
  const [barRequest, setBarRequest] = useState<TopstepXRetrieveBarRequest>({
    contractId: '',
    fromDate: '',
    toDate: '',
    interval: '1Day'
  });
  
  // Order management state
  const [orderForm, setOrderForm] = useState<PlaceOrderRequest>({
    contractId: '',
    orderType: TopstepXOrderTypeEnum.Market,
    side: TopstepXOrderSideEnum.Buy,
    quantity: 1,
    timeInForce: TopstepXTimeInForceEnum.Day
  });
  const [orders, setOrders] = useState<any[]>([]);
  
  // Position and trade state
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  
  // Search parameters
  const [searchParams, setSearchParams] = useState({
    fromDate: '',
    toDate: '',
    page: 1,
    pageSize: 50
  });

  // Utility functions
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const addApiOperation = useCallback((operation: string, status: ApiOperationStatus['status']) => {
    setApiOperations(prev => [
      ...prev.slice(-9), // Keep last 10 operations
      { operation, status, timestamp: Date.now() }
    ]);
  }, []);

  const handleError = useCallback((error: any, operation: string) => {
    const message = error?.response?.data?.message || error?.message || 'Unknown error occurred';
    setError(`${operation}: ${message}`);
    addApiOperation(operation, 'error');
    setLoading(false);
  }, [addApiOperation]);

  const handleSuccess = useCallback((message: string, operation: string) => {
    setSuccessMessage(message);
    addApiOperation(operation, 'success');
    setLoading(false);
  }, [addApiOperation]);

  // Authentication functions
  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    clearMessages();
    setLoading(true);
    addApiOperation('Login', 'loading');

    try {
      const response = await topstepXLoginApiKey(apiKey);
      if (response?.sessionToken) {
        setSessionToken(response.sessionToken);
        setIsAuthenticated(true);
        handleSuccess('Successfully logged in to TopstepX', 'Login');
      } else {
        throw new Error('No session token received');
      }
    } catch (error) {
      handleError(error, 'Login');
    }
  };

  const handleLogout = async () => {
    if (!sessionToken) return;

    clearMessages();
    setLoading(true);
    addApiOperation('Logout', 'loading');

    try {
      await topstepXLogout(sessionToken);
      setSessionToken(null);
      setIsAuthenticated(false);
      setSelectedAccountId('');
      handleSuccess('Successfully logged out', 'Logout');
    } catch (error) {
      handleError(error, 'Logout');
    }
  };

  const validateSession = async () => {
    if (!sessionToken) return;

    clearMessages();
    setLoading(true);
    addApiOperation('Validate Session', 'loading');

    try {
      const isValid = await topstepXValidateSession(sessionToken);
      if (isValid) {
        handleSuccess('Session is valid', 'Validate Session');
      } else {
        setIsAuthenticated(false);
        setSessionToken(null);
        setError('Session has expired. Please log in again.');
        addApiOperation('Validate Session', 'error');
      }
    } catch (error) {
      handleError(error, 'Validate Session');
    }
  };

  // Contract search functions
  const handleSearchContracts = async () => {
    if (!sessionToken || !contractSearchQuery.trim()) {
      setError('Please enter a contract search query');
      return;
    }

    clearMessages();
    setLoading(true);
    addApiOperation('Search Contracts', 'loading');

    try {
      const searchResults = await topstepXSearchContracts(sessionToken, contractSearchQuery);
      setContracts(searchResults || []);
      handleSuccess(`Found ${searchResults?.length || 0} contracts`, 'Search Contracts');
    } catch (error) {
      handleError(error, 'Search Contracts');
    }
  };

  // Historical data functions
  const handleRetrieveBars = async () => {
    if (!sessionToken || !barRequest.contractId) {
      setError('Please select a contract and set date range');
      return;
    }

    clearMessages();
    setLoading(true);
    addApiOperation('Retrieve Bars', 'loading');

    try {
      const bars = await topstepXRetrieveBars(sessionToken, barRequest);
      setHistoricalData(bars || []);
      handleSuccess(`Retrieved ${bars?.length || 0} bars`, 'Retrieve Bars');
    } catch (error) {
      handleError(error, 'Retrieve Bars');
    }
  };

  // Order management functions
  const handlePlaceOrder = async () => {
    if (!sessionToken || !orderForm.contractId) {
      setError('Please select a contract and fill order details');
      return;
    }

    clearMessages();
    setLoading(true);
    addApiOperation('Place Order', 'loading');

    try {
      const order = await topstepXPlaceOrder(sessionToken, orderForm);
      handleSuccess('Order placed successfully', 'Place Order');
      // Refresh orders
      await handleSearchOrders();
    } catch (error) {
      handleError(error, 'Place Order');
    }
  };

  const handleSearchOrders = async () => {
    if (!sessionToken) return;

    clearMessages();
    setLoading(true);
    addApiOperation('Search Orders', 'loading');

    try {
      const orderResults = await topstepXSearchOrders(sessionToken, {
        fromDate: searchParams.fromDate,
        toDate: searchParams.toDate,
        page: searchParams.page,
        pageSize: searchParams.pageSize
      });
      setOrders(orderResults || []);
      handleSuccess(`Found ${orderResults?.length || 0} orders`, 'Search Orders');
    } catch (error) {
      handleError(error, 'Search Orders');
    }
  };

  // Position and trade functions
  const handleSearchPositions = async () => {
    if (!sessionToken) return;

    clearMessages();
    setLoading(true);
    addApiOperation('Search Positions', 'loading');

    try {
      const positionResults = await topstepXSearchPositions(sessionToken, {
        fromDate: searchParams.fromDate,
        toDate: searchParams.toDate,
        page: searchParams.page,
        pageSize: searchParams.pageSize
      });
      setPositions(positionResults || []);
      handleSuccess(`Found ${positionResults?.length || 0} positions`, 'Search Positions');
    } catch (error) {
      handleError(error, 'Search Positions');
    }
  };

  const handleSearchTrades = async () => {
    if (!sessionToken) return;

    clearMessages();
    setLoading(true);
    addApiOperation('Search Trades', 'loading');

    try {
      const tradeResults = await topstepXSearchHalfTrades(sessionToken, {
        fromDate: searchParams.fromDate,
        toDate: searchParams.toDate,
        page: searchParams.page,
        pageSize: searchParams.pageSize
      });
      setTrades(tradeResults || []);
      handleSuccess(`Found ${tradeResults?.length || 0} trades`, 'Search Trades');
    } catch (error) {
      handleError(error, 'Search Trades');
    }
  };

  // Auto-validate session on mount
  useEffect(() => {
    if (sessionToken) {
      validateSession();
    }
  }, [sessionToken]);

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TopstepX Management</h1>
          <p className="text-gray-600">Manage your TopstepX trading account and operations</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Authentication Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Authentication
            </h2>
          </div>
          <div className="p-6">
            {!isAuthenticated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your TopstepX API key"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading || !apiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  Login
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Authenticated</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={validateSession}
                      disabled={loading}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Validate
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={loading}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Trading Interface - Only show if authenticated */}
        {isAuthenticated && (
          <>
            {/* Contract Search Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Contract Search
                </h2>
              </div>
              <div className="p-6">
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    value={contractSearchQuery}
                    onChange={(e) => setContractSearchQuery(e.target.value)}
                    placeholder="Search contracts (e.g., ES, NQ, CL)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearchContracts}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </button>
                </div>

                {contracts.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Symbol</th>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Exchange</th>
                          <th className="px-4 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contracts.map((contract, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-4 py-2 font-mono">{contract.symbol}</td>
                            <td className="px-4 py-2">{contract.name}</td>
                            <td className="px-4 py-2">{contract.exchange}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => setSelectedContract(contract)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedContract && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900">Selected Contract</h3>
                    <p className="text-blue-800">{selectedContract.symbol} - {selectedContract.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Data Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <BarChart className="w-5 h-5 mr-2" />
                  Historical Data
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract ID
                    </label>
                    <input
                      type="text"
                      value={barRequest.contractId}
                      onChange={(e) => setBarRequest({...barRequest, contractId: e.target.value})}
                      placeholder="Enter contract ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="datetime-local"
                      value={barRequest.fromDate}
                      onChange={(e) => setBarRequest({...barRequest, fromDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="datetime-local"
                      value={barRequest.toDate}
                      onChange={(e) => setBarRequest({...barRequest, toDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRetrieveBars}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Retrieve Data
                </button>

                {historicalData.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Retrieved {historicalData.length} bars</h3>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Open</th>
                            <th className="px-4 py-2 text-left">High</th>
                            <th className="px-4 py-2 text-left">Low</th>
                            <th className="px-4 py-2 text-left">Close</th>
                            <th className="px-4 py-2 text-left">Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.slice(0, 10).map((bar, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="px-4 py-2">{new Date(bar.dateTime).toLocaleDateString()}</td>
                              <td className="px-4 py-2">{bar.open}</td>
                              <td className="px-4 py-2">{bar.high}</td>
                              <td className="px-4 py-2">{bar.low}</td>
                              <td className="px-4 py-2">{bar.close}</td>
                              <td className="px-4 py-2">{bar.volume}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Management Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Order Management
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract ID
                    </label>
                    <input
                      type="text"
                      value={orderForm.contractId}
                      onChange={(e) => setOrderForm({...orderForm, contractId: e.target.value})}
                      placeholder="Enter contract ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Side
                    </label>
                    <select
                      value={orderForm.side}
                      onChange={(e) => setOrderForm({...orderForm, side: e.target.value as TopstepXOrderSideEnum})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={TopstepXOrderSideEnum.Buy}>Buy</option>
                      <option value={TopstepXOrderSideEnum.Sell}>Sell</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({...orderForm, quantity: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Type
                    </label>
                    <select
                      value={orderForm.orderType}
                      onChange={(e) => setOrderForm({...orderForm, orderType: e.target.value as TopstepXOrderTypeEnum})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={TopstepXOrderTypeEnum.Market}>Market</option>
                      <option value={TopstepXOrderTypeEnum.Limit}>Limit</option>
                    </select>
                  </div>
                </div>

                {orderForm.orderType === TopstepXOrderTypeEnum.Limit && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderForm.limitPrice || ''}
                      onChange={(e) => setOrderForm({...orderForm, limitPrice: parseFloat(e.target.value) || undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Place Order
                  </button>
                  <button
                    onClick={handleSearchOrders}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 flex items-center"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Orders
                  </button>
                </div>

                {orders.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Orders ({orders.length})</h3>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Order ID</th>
                            <th className="px-4 py-2 text-left">Symbol</th>
                            <th className="px-4 py-2 text-left">Side</th>
                            <th className="px-4 py-2 text-left">Quantity</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="px-4 py-2 font-mono">{order.orderId}</td>
                              <td className="px-4 py-2">{order.symbol}</td>
                              <td className="px-4 py-2">{order.side}</td>
                              <td className="px-4 py-2">{order.quantity}</td>
                              <td className="px-4 py-2">{order.orderType}</td>
                              <td className="px-4 py-2">{order.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Positions and Trades Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Positions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Positions
                  </h2>
                </div>
                <div className="p-6">
                  <button
                    onClick={handleSearchPositions}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center mb-4"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Positions
                  </button>

                  {positions.length > 0 && (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Symbol</th>
                            <th className="px-4 py-2 text-left">Position</th>
                            <th className="px-4 py-2 text-left">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((position, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="px-4 py-2">{position.symbol}</td>
                              <td className="px-4 py-2">{position.quantity}</td>
                              <td className="px-4 py-2">{position.pnl}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Trades */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Trades
                  </h2>
                </div>
                <div className="p-6">
                  <button
                    onClick={handleSearchTrades}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 flex items-center mb-4"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Trades
                  </button>

                  {trades.length > 0 && (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Trade ID</th>
                            <th className="px-4 py-2 text-left">Symbol</th>
                            <th className="px-4 py-2 text-left">Quantity</th>
                            <th className="px-4 py-2 text-left">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="px-4 py-2 font-mono">{trade.tradeId}</td>
                              <td className="px-4 py-2">{trade.symbol}</td>
                              <td className="px-4 py-2">{trade.quantity}</td>
                              <td className="px-4 py-2">{trade.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Parameters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Search Parameters
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={searchParams.fromDate}
                      onChange={(e) => setSearchParams({...searchParams, fromDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={searchParams.toDate}
                      onChange={(e) => setSearchParams({...searchParams, toDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page Size
                    </label>
                    <select
                      value={searchParams.pageSize}
                      onChange={(e) => setSearchParams({...searchParams, pageSize: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={searchParams.page}
                      onChange={(e) => setSearchParams({...searchParams, page: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* API Operations Log */}
            {apiOperations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Recent API Operations</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {apiOperations.slice(-5).map((op, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{op.operation}</span>
                        <div className="flex items-center gap-2">
                          <StatusIndicator status={op.status} />
                          <span className="text-gray-500">
                            {new Date(op.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default TopstepXManagement;
