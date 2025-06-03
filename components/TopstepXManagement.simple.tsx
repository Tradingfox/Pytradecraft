import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { topstepXLoginApiKey, topstepXValidateSession } from '../services/tradingApiService';
import { searchAccounts } from '../services/tradingApiService';

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

const TopstepXManagement: React.FC = () => {
  const { 
    sessionToken, 
    updateTopstepXCredentials,
    topstepXUsername,
    topstepXApiKey,
    authenticateTopstepXDirect
  } = useTradingContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userName, setUserName] = useState(topstepXUsername || '');
  const [apiKey, setApiKey] = useState(topstepXApiKey || '');

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

  const resetAuthentication = () => {
    // Clear localStorage token
    localStorage.removeItem('topstepx_token');
    
    // Clear form
    setUserName('');
    setApiKey('');
    
    // Clear messages
    clearMessages();
    
    // Show reset message
    setSuccess('Authentication state reset. Please login again.');
    
    // If we have disconnection function in the future, we could call it here
  };

  const handleLogin = async () => {
    if (!userName || !apiKey) {
      setError('Please enter both username and API key');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      console.log('🔐 TopstepX Login attempt:', { userName, hasApiKey: !!apiKey });
      
      const response = await topstepXLoginApiKey({
        userName,
        apiKey
      });      console.log('📨 TopstepX Login response:', response);      if (response.success) {
        // Set credentials in context
        updateTopstepXCredentials({
          username: userName,
          apiKey: apiKey
        });
        
        // Store the token in localStorage for our test API calls
        if (response.token) {
          console.log('🔑 Setting token from login response:', { tokenLength: response.token.length });
          // Store token for our API calls
          localStorage.setItem('topstepx_token', response.token);
          
          // If the direct authentication function exists in the context, use it
          if (typeof authenticateTopstepXDirect === 'function') {
            try {
              console.log('🔄 Syncing token to TradingContext via direct authentication...');
              await authenticateTopstepXDirect(response.token);
              console.log('✅ Token synced to TradingContext successfully');
            } catch (error) {
              console.warn('⚠️ Could not sync token with TradingContext:', error);
            }
          }
          
          setSuccess(`Login successful! Token received (${response.token.substring(0, 10)}...)`);
        } else {
          setSuccess(`Login successful but no token received!`);
        }
      } else {
        const errorMsg = `Login failed: ${response.errorMessage || 'Unknown error'}`;
        console.error('❌ TopstepX Login failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = `Login error: ${err instanceof Error ? err.message : String(err)}`;
      console.error('💥 TopstepX Login exception:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };  const handleValidateSession = async () => {
    // Get the token from either the context or localStorage
    const tokenToUse = sessionToken || localStorage.getItem('topstepx_token');
    
    if (!tokenToUse) {
      setError('No session token available. Please login first.');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      console.log('🔍 Validating session token...', { tokenLength: tokenToUse.length });
      
      // Use the improved validation method
      const response = await topstepXValidateSession(tokenToUse);
      console.log('📨 Session validation response:', response);

      if (response.success) {
        setSuccess(`Session is valid! User: ${response.userInfo?.userName || 'Unknown'}`);
      } else {
        setError(`Session validation failed: ${response.errorMessage || 'Unknown error'}`);
        if (response.errorMessage?.toLowerCase().includes('unauthorized')) {
          setError(`Token invalid or expired. Please login again.`);
          localStorage.removeItem('topstepx_token');
        }
      }
    } catch (err) {
      const errorMsg = `Validation error: ${err instanceof Error ? err.message : String(err)}`;
      console.error('💥 Session validation exception:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };const handleTestAccounts = async () => {
    console.log('🎯 handleTestAccounts called!', { sessionToken: !!sessionToken });
    
    // Get the token from either the context or localStorage
    const tokenToUse = sessionToken || localStorage.getItem('topstepx_token');
    
    if (!tokenToUse) {
      console.log('❌ No session token available');
      setError('No session token available. Please login first.');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      console.log('🔍 Testing account search with token:', { tokenLength: tokenToUse.length });
      
      // Use the stored token directly for the API call
      const response = await searchAccounts('topstepx', tokenToUse, { onlyActiveAccounts: true });
      console.log('📨 Account search response:', response);

      if (response.success) {
        setSuccess(`Account search successful! Found ${response.accounts?.length || 0} accounts`);
      } else {
        setError(`Account search failed: ${response.errorMessage || 'Unknown error'}`);
        if (response.errorMessage?.toLowerCase().includes('unauthorized')) {
          setError(`Token invalid or expired. Please login again.`);
          localStorage.removeItem('topstepx_token');
        }
      }
    } catch (err) {
      const errorMsg = `Account search error: ${err instanceof Error ? err.message : String(err)}`;
      console.error('💥 Account search exception:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-6">TopstepX API Testing</h2>
        
        {/* Browser Extension Warning */}
        <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-4">
          <h4 className="font-semibold mb-1">🔧 Clean Testing Environment</h4>
          <p className="text-sm">
            For best results, test in incognito/private mode with extensions disabled to avoid interference.
          </p>
        </div>
        
        {/* Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}        {/* Authentication Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Authentication</h3>
            {/* Debug Info */}
          <div className="bg-blue-900/30 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg mb-4">
            <h4 className="font-semibold mb-1">🔍 API Endpoint Status</h4>
            <p className="text-sm">
              <strong>Auth Endpoint:</strong> /api/Auth/loginKey ✅<br/>
              <strong>Validate Method:</strong> Account Search ✅ (Primary validation method)<br/>
              <strong>Account Search:</strong> /api/Account/search ✅
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg"
                placeholder="Enter TopstepX username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg"
                placeholder="Enter API key"
              />
            </div>
          </div>          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
              <button
              onClick={handleValidateSession}
              disabled={loading || (!sessionToken && !localStorage.getItem('topstepx_token'))}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? 'Validating...' : 'Validate Session'}
            </button>            <button
              onClick={(e) => {
                e.preventDefault();
                console.log('🔴 Test Accounts button clicked!');
                if (typeof handleTestAccounts === 'function') {
                  console.log('✅ handleTestAccounts is a valid function');
                  handleTestAccounts();
                } else {
                  console.error('❌ handleTestAccounts is not a function:', typeof handleTestAccounts);
                }
              }}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? 'Testing...' : 'Test Accounts'}
            </button>
            <button
              onClick={resetAuthentication}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Reset Auth
            </button>
          </div>          {/* Session Info */}
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-300 mb-2">Session Status</h4>
            <div className={`flex items-center gap-2 ${sessionToken ? 'text-green-400' : 'text-yellow-400'}`}>
              <div className={`w-3 h-3 rounded-full ${sessionToken ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className="text-sm">
                Context Token: {sessionToken ? 
                  `${sessionToken.substring(0, 20)}...` : 
                  '⚠️ Not in context'}
              </p>
            </div>
            <div className={`flex items-center gap-2 mt-1 ${localStorage.getItem('topstepx_token') ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-3 h-3 rounded-full ${localStorage.getItem('topstepx_token') ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="text-sm">
                Local Storage Token: {localStorage.getItem('topstepx_token') ? 
                  `✅ Available (${localStorage.getItem('topstepx_token')?.substring(0, 10)}...)` : 
                  '❌ Not available'}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2 italic">
              {(sessionToken || localStorage.getItem('topstepx_token')) ? 
                'Authentication is available. You can test the API functionality.' : 
                'No authentication detected. Please login first.'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Enter your TopstepX username and API key</li>
            <li>Click "Login" to authenticate</li>
            <li>Use "Validate Session" to check if your session is still active</li>
            <li>Check the browser console (F12) for detailed logs</li>
            <li><strong>Use incognito/private mode for cleanest testing</strong></li>
          </ol>
        </div>
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <TopstepXManagement />
  </ErrorBoundary>
);

export default App;
