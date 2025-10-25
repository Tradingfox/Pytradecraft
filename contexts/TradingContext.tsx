import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { 
    BrokerType, TradingContextType, ProjectXAuthMode, 
    ProjectXLoginKeyRequest, ProjectXLoginAppRequest, TradingAccount,
    HubConnectionStatus, Order, Position, Trade,
    QuoteData, MarketTradeData, MarketDepthUpdate,
    HistoricalDataRequest, HistoricalDataResponse,
    PlaceOrderRequest, ModifyOrderRequest
} from '../types';
import { 
    projectXLoginKey, projectXLoginApp, searchAccounts as apiSearchAccounts, 
    topstepXLoginApiKey, getHistoricalData, placeOrder, cancelOrder, modifyOrder,
    searchOrders, searchOpenOrders, searchTrades, searchContracts, searchContractById,
    searchOpenPositions, closePosition as apiClosePosition, partialClosePosition as apiPartialClosePosition
} from '../services/tradingApiService';
import { 
    buildTopstepXUserHubConnection, buildTopstepXMarketHubConnection,
    setupTopstepXUserHubHandlers, setupTopstepXMarketHubHandlers,
    subscribeToTopstepXMarketData, unsubscribeFromTopstepXMarketData
} from '../services/topstepXService';
import { 
    buildProjectXMarketHubConnection, setupProjectXMarketHubHandlers,
    subscribeToProjectXMarketData, unsubscribeFromProjectXMarketData
} from '../services/tradingApiService';
import { PROJECTX_DEFAULT_APP_ID, PROJECTX_USER_HUB_URL } from '../constants.tsx';
import { integrateQuotesWithPositions, positionsNeedQuoteUpdate } from '../utils/tradingContextHelper';
import { marketDataAdapter } from '../services/marketDataAdapter';
import { OHLCVBar } from '../services/historicalDataService';

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [projectXAuthMode, setProjectXAuthMode] = useState<ProjectXAuthMode>('loginKey');

  const [projectXUsername, setProjectXUsername] = useState('');
  const [projectXApiKey, setProjectXApiKey] = useState('');
  const [projectXPassword, setProjectXPassword] = useState('');
  const [projectXDeviceId, setProjectXDeviceId] = useState('');
  const [projectXAppId, setProjectXAppId] = useState(PROJECTX_DEFAULT_APP_ID);
  const [projectXVerifyKey, setProjectXVerifyKey] = useState('');

  const [topstepXUsername, setTopstepXUsername] = useState(''); 
  const [topstepXApiKey, setTopstepXApiKey] = useState('');

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatusMessage, setConnectionStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [userAccounts, setUserAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | number | null>(null);

  // User Hub SignalR State
  const [userHubConnection, setUserHubConnection] = useState<HubConnection | null>(null);
  const [userHubStatus, setUserHubStatus] = useState<HubConnectionStatus>('disconnected');
  const [userHubStatusMessage, setUserHubStatusMessage] = useState<string | null>("User Hub: Not Connected.");

  const [liveAccountUpdates, setLiveAccountUpdates] = useState<TradingAccount[]>([]);
  const [liveOrderUpdates, setLiveOrderUpdates] = useState<Order[]>([]);
  const [livePositionUpdates, setLivePositionUpdates] = useState<Position[]>([]);
  const [liveTradeUpdates, setLiveTradeUpdates] = useState<Trade[]>([]);

  // Market Hub SignalR State
  const [marketHubConnection, setMarketHubConnection] = useState<HubConnection | null>(null);
  const [marketHubStatus, setMarketHubStatus] = useState<HubConnectionStatus>('disconnected');
  const [marketHubStatusMessage, setMarketHubStatusMessage] = useState<string | null>("Market Hub: Not Connected.");
  const [marketStreamContractId, setMarketStreamContractId] = useState<string | null>(null);

  const [liveQuotes, setLiveQuotes] = useState<QuoteData[]>([]);
  const [liveMarketTrades, setLiveMarketTrades] = useState<MarketTradeData[]>([]);
  const [liveDepthUpdates, setLiveDepthUpdates] = useState<MarketDepthUpdate[]>([]);

  // Historical Data Handler
  const [historicalData, setHistoricalData] = useState<HistoricalDataResponse | null>(null);
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState<boolean>(false);
  const [historicalDataError, setHistoricalDataError] = useState<string | null>(null);

  // Trade History Pagination State
  const [currentPageTrades, setCurrentPageTrades] = useState<number>(1);
  const [totalPagesTrades, setTotalPagesTrades] = useState<number>(0);
  const [totalTradesCount, setTotalTradesCount] = useState<number>(0);
  const [tradesLimitPerPage, setTradesLimitPerPage] = useState<number>(20); // Default limit

  const disconnectUserHubHandler = useCallback(async () => {
    if (userHubConnection) {
      setUserHubStatus('disconnecting');
      setUserHubStatusMessage('User Hub: Disconnecting...');
      try {
        await userHubConnection.stop();
        setUserHubStatus('disconnected');
        setUserHubStatusMessage('User Hub: Successfully disconnected.');
      } catch (err) {
        console.error('Error disconnecting User Hub:', err);
        setUserHubStatus('error');
        setUserHubStatusMessage(`User Hub: Error disconnecting - ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setUserHubConnection(null);
        setLiveAccountUpdates([]);
        setLiveOrderUpdates([]);
        setLivePositionUpdates([]);
        setLiveTradeUpdates([]);
      }
    }
  }, [userHubConnection]);

  const disconnectMarketHubHandler = useCallback(async () => {
    if (marketHubConnection) {
      setMarketHubStatus('disconnecting');
      setMarketHubStatusMessage('Market Hub: Disconnecting...');
      try {
        await marketHubConnection.stop();
        setMarketHubStatus('disconnected');
        setMarketHubStatusMessage('Market Hub: Successfully disconnected.');
      } catch (err) {
        console.error('Error disconnecting Market Hub:', err);
        setMarketHubStatus('error');
        setMarketHubStatusMessage(`Market Hub: Error disconnecting - ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setMarketHubConnection(null);
        setMarketStreamContractId(null); // Reset active stream on disconnect
        setLiveQuotes([]);
        setLiveMarketTrades([]);
        setLiveDepthUpdates([]);
      }
    }
  }, [marketHubConnection]);

  const updateProjectXCredentialsHandler = useCallback((credentials: Partial<ProjectXLoginKeyRequest & ProjectXLoginAppRequest>) => {
    if (credentials.userName !== undefined) setProjectXUsername(credentials.userName);
    if (credentials.apiKey !== undefined) setProjectXApiKey(credentials.apiKey);
    if (credentials.password !== undefined) setProjectXPassword(credentials.password);
    if (credentials.deviceId !== undefined) setProjectXDeviceId(credentials.deviceId);
    if (credentials.appId !== undefined) setProjectXAppId(credentials.appId);
    if (credentials.verifyKey !== undefined) setProjectXVerifyKey(credentials.verifyKey);
  }, []);

  const updateTopstepXCredentialsHandler = useCallback((credentials: { username?: string, apiKey?: string }) => {
    if (credentials.username !== undefined) setTopstepXUsername(credentials.username);
    if (credentials.apiKey !== undefined) setTopstepXApiKey(credentials.apiKey);
  }, []);

  // Function to directly authenticate with TopstepX from components
  const authenticateTopstepXDirectHandler = useCallback(async (token: string) => {
    console.log('🔑 Setting TopstepX token directly:', { tokenLength: token.length });
    setSessionToken(token);
    setIsAuthenticated(true);
    setConnectionStatusMessage('Successfully authenticated with TopstepX. Token set directly.');

    // Instead of using fetchUserAccountsHandler directly, we'll just set the broker
    // This will allow users to fetch accounts later if needed
    setSelectedBroker('topstepx');
  }, []);

  const selectBrokerHandler = (broker: BrokerType | null) => {
    if (broker !== selectedBroker) {
        disconnectFromBrokerHandler(); 
        setSelectedBroker(broker);
    }
  };

  const fetchUserAccountsHandler = useCallback(async (tokenToUse?: string, brokerToUse?: BrokerType) => {
    const currentToken = tokenToUse || sessionToken;
    const currentBroker = brokerToUse || selectedBroker;

    if (!currentToken || !currentBroker) {
        setConnectionStatusMessage('Cannot fetch accounts: Not authenticated or no broker selected.');
        return;
    }
    setIsLoading(true);
    setConnectionStatusMessage(`Fetching accounts for ${currentBroker}...`);
    try {
        const response = await apiSearchAccounts(currentBroker, currentToken, { onlyActiveAccounts: true });
        if (response.success && response.accounts) {
            setUserAccounts(response.accounts);
            setConnectionStatusMessage(`Successfully fetched ${response.accounts.length} active account(s).`);
            if (response.accounts.length > 0 && !selectedAccountId) {
              setSelectedAccountId(response.accounts[0].id); 
            } else if (response.accounts.length === 0) {
              setSelectedAccountId(null);
              setConnectionStatusMessage('No active accounts found.');
            }
        } else {
            throw new Error(response.errorMessage || 'Failed to fetch accounts.');
        }
    } catch (error) {
        console.error('Error fetching accounts:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setConnectionStatusMessage(`Error fetching accounts: ${errorMessage}`);
        setUserAccounts([]);
    } finally {
        setIsLoading(false);
    }
  }, [sessionToken, selectedBroker, selectedAccountId]);

  const connectToBrokerHandler = useCallback(async () => {
    if (!selectedBroker) {
      setConnectionStatusMessage('Please select a broker first.');
      return;
    }
    setIsLoading(true);
    setConnectionStatusMessage(`Connecting to ${selectedBroker}...`);
    try {
      let authResponse;
      if (selectedBroker === 'projectx') {
        if (projectXAuthMode === 'loginKey') {
          if (!projectXUsername || !projectXApiKey) throw new Error('ProjectX username and API key are required for loginKey auth.');
          authResponse = await projectXLoginKey({ userName: projectXUsername, apiKey: projectXApiKey });
        } else { 
          if (!projectXUsername || !projectXAppId) throw new Error('ProjectX username and App ID are required for loginApp auth.');
          authResponse = await projectXLoginApp({ userName: projectXUsername, password: projectXPassword, deviceId: projectXDeviceId, appId: projectXAppId, verifyKey: projectXVerifyKey });
        }
      } else if (selectedBroker === 'topstepx') {
        if (!topstepXApiKey) throw new Error('TopstepX API Key/Token is required.');
        // Username for TopstepX is informational for the user, API key is used for auth call
        authResponse = await topstepXLoginApiKey({ userName: topstepXUsername || '', apiKey: topstepXApiKey });
      } else {
        throw new Error('Unsupported broker for connection.');
      }

      if (authResponse.success && authResponse.token) {
        setSessionToken(authResponse.token);
        setIsAuthenticated(true);
        setConnectionStatusMessage(`Successfully authenticated with ${selectedBroker}. Token received.`);
        // Fetch accounts after successful authentication
        fetchUserAccountsHandler(authResponse.token, selectedBroker); 
      } else {
        throw new Error(authResponse.errorMessage || `Authentication failed for ${selectedBroker}.`);
      }
    } catch (error) {
      console.error(`Error connecting to ${selectedBroker}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Connection failed: ${errorMessage}`);
      setIsAuthenticated(false);
      setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBroker, projectXAuthMode, projectXUsername, projectXApiKey, projectXPassword, projectXDeviceId, projectXAppId, projectXVerifyKey, topstepXUsername, topstepXApiKey, fetchUserAccountsHandler]);

  const disconnectFromBrokerHandler = useCallback(async () => {
    setIsLoading(true); // Indicate loading state during disconnect
    await disconnectUserHubHandler();
    await disconnectMarketHubHandler();

    setSessionToken(null);
    setSessionExpiry(null); // Assuming sessionExpiry might be used later
    setIsAuthenticated(false);
    setUserAccounts([]);
    setSelectedAccountId(null);
    setConnectionStatusMessage(selectedBroker ? `Disconnected from ${selectedBroker}.` : 'Disconnected.');
    // setSelectedBroker(null); // Optionally reset selected broker
    setIsLoading(false);
    // Clear live data arrays
    setLiveAccountUpdates([]);
    setLiveOrderUpdates([]);
    setLivePositionUpdates([]);
    setLiveTradeUpdates([]);
    setLiveQuotes([]);
    setLiveMarketTrades([]);
    setLiveDepthUpdates([]);
    setMarketStreamContractId(null);

  }, [selectedBroker, disconnectUserHubHandler, disconnectMarketHubHandler]);


  const connectUserHubInternal = useCallback(async () => {
    if (!sessionToken || selectedBroker !== 'topstepx') { 
      setUserHubStatusMessage(selectedBroker !== 'topstepx' ? "User Hub: Only available for TopstepX." : "User Hub: Cannot connect. Missing session token.");
      setUserHubStatus(selectedBroker !== 'topstepx' ? 'disconnected' : 'error');
      return;
    }

    if (userHubConnection && userHubStatus !== 'disconnected' && userHubStatus !== 'error') {
      setUserHubStatusMessage("User Hub: Already connected or connecting.");
      return;
    }

    // Ensure clean disconnection before attempting new connection
    await disconnectUserHubHandler(); 

    setUserHubStatus('connecting');
    setUserHubStatusMessage('User Hub: Connecting...');

    try {
      // Use the specialized TopstepX user hub connection builder
      const newConnection = buildTopstepXUserHubConnection(sessionToken);

      // Set up event handlers using the TopstepX service
      setupTopstepXUserHubHandlers(newConnection, {
        onConnectionStatusChange: (status, message) => {
          setUserHubStatus(status);
          setUserHubStatusMessage(`User Hub: ${message}`);
        },
        onAccountUpdates: (accounts) => {
          if (accounts.length > 0) {
            setLiveAccountUpdates(accounts);
          }
        },
        onOrderUpdates: (orders) => {
          if (orders.length > 0) {
            setLiveOrderUpdates(prev => [...orders, ...prev.slice(0, Math.max(0, 50 - orders.length))]);
          }
        },
        onPositionUpdates: (positions) => {
          if (positions.length > 0) {
            setLivePositionUpdates(prev => [...positions, ...prev.slice(0, Math.max(0, 50 - positions.length))]);
          }
        },
        onTradeUpdates: (trades) => {
          if (trades.length > 0) {
            setLiveTradeUpdates(prev => [...trades, ...prev.slice(0, Math.max(0, 50 - trades.length))]);
          }
        }
      });

      // Add connection error handling
      newConnection.onclose((error) => {
        console.log('User Hub connection closed:', error);
        // Assuming withAutomaticReconnect is active on this connection.
        // Reflecting that SignalR is attempting to reconnect in the background.
        setUserHubStatus('connecting');
        setUserHubStatusMessage('User Hub: Connection lost. Attempting to reconnect...');
        // Keep setUserHubConnection(null) for now. If SignalR successfully reconnects,
        // onreconnected will set the new connection. If it fails all retries,
        // this status will remain 'connecting' until another action changes it.
        setUserHubConnection(null);
      });

      newConnection.onreconnecting((error) => {
        console.log('User Hub reconnecting:', error);
        setUserHubStatus('connecting');
        setUserHubStatusMessage('User Hub: Reconnecting...');
      });

      newConnection.onreconnected((connectionId) => {
        console.log('User Hub reconnected:', connectionId);
        setUserHubStatus('connected');
        setUserHubStatusMessage('User Hub: Reconnected successfully.');
      });

      await newConnection.start();
      setUserHubConnection(newConnection);
      setUserHubStatus('connected');
      setUserHubStatusMessage('User Hub: Successfully connected. Sending subscriptions...');

      // Send subscriptions after confirmed connection
      if (selectedAccountId) {
        try {
          await newConnection.invoke('SubscribeOrders', selectedAccountId);
          await newConnection.invoke('SubscribePositions', selectedAccountId);
          await newConnection.invoke('SubscribeTrades', selectedAccountId);
        } catch (invokeError) {
          console.warn('Error sending account-specific subscriptions:', invokeError);
          // Don't fail the entire connection for subscription errors
        }
      }

      try {
        await newConnection.invoke('SubscribeAccounts'); // Global subscription
        setUserHubStatusMessage(`User Hub: Connected and subscriptions sent (Account ID: ${selectedAccountId || 'Global'}).`);
      } catch (invokeError) {
        console.warn('Error sending global account subscription:', invokeError);
        setUserHubStatusMessage('User Hub: Connected but some subscriptions failed.');
      }

    } catch (err) {
      console.error('Error starting User Hub connection:', err);
      setUserHubStatus('error');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setUserHubStatusMessage(`User Hub: Failed to start - ${errorMsg}`);
      setUserHubConnection(null);

      // Don't retry automatically to prevent infinite loops
      // User can manually retry if needed
    }
  }, [sessionToken, selectedBroker, userHubConnection, userHubStatus, selectedAccountId, disconnectUserHubHandler]);


  const connectMarketHubInternal = useCallback(async () => {
    // If already connecting, don't start another connection attempt
    if (marketHubStatus === 'connecting') {
      console.log('Already connecting to market hub, ignoring duplicate request');
      return;
    }

    // If already connected, don't try to connect again
    if (marketHubStatus === 'connected' && marketHubConnection) {
      console.log('Market hub already connected, ignoring duplicate connection request');
      return;
    }

    // Reset any existing connection first
    if (marketHubConnection) {
      try {
        await marketHubConnection.stop();
        console.log(`Stopped existing market hub connection for ${selectedBroker}`);
      } catch (err) {
        console.warn('Error stopping existing market hub connection:', err);
        // Continue with reconnection attempt regardless
      }
      setMarketHubConnection(null);
    }

    if (!sessionToken) {
      setMarketHubStatus('disconnected');
      setMarketHubStatusMessage('Market Hub: Not connected (no session token)');
      return;
    }

    if (!selectedBroker) {
      setMarketHubStatus('disconnected');
      setMarketHubStatusMessage('Market Hub: Not connected (no broker selected)');
      return;
    }

    setMarketHubStatus('connecting');
    setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Connecting...`);

    // Store current broker and stream ID to use in closure
    const currentBroker = selectedBroker;
    const currentStreamContractId = marketStreamContractId;

    try {
      let newConnection: HubConnection;

      if (selectedBroker === 'topstepx') {
        newConnection = buildTopstepXMarketHubConnection(sessionToken);

        // Set up TopStepX event handlers
        setupTopstepXMarketHubHandlers(newConnection, {
          onConnectionStatusChange: (status, message) => {
            setMarketHubStatus(status);
            setMarketHubStatusMessage(`Market Hub (TopStepX): ${message}`);
          },
          onQuoteUpdates: (quotes) => {
            if (quotes.length > 0) {
              setLiveQuotes(prev => [...quotes, ...prev.slice(0, Math.max(0, 30 - quotes.length))]);
            }
          },
          onMarketTradeUpdates: (trades) => {
            if (trades.length > 0) {
              setLiveMarketTrades(prev => [...trades, ...prev.slice(0, Math.max(0, 30 - trades.length))]);
            }
          },
          onDepthUpdates: (depth) => {
            if (depth.length > 0) {
              setLiveDepthUpdates(prev => [...depth, ...prev.slice(0, Math.max(0, 10 - depth.length))]);
            }
          }
        });
      } else if (selectedBroker === 'projectx') {
        newConnection = buildProjectXMarketHubConnection(sessionToken);

        // Set up ProjectX event handlers  
        setupProjectXMarketHubHandlers(newConnection, {
          onConnectionStatusChange: (status, message) => {
            setMarketHubStatus(status);
            setMarketHubStatusMessage(`Market Hub (ProjectX): ${message}`);
          },
          onQuoteUpdates: (quotes) => {
            if (quotes.length > 0) {
              setLiveQuotes(prev => [...quotes, ...prev.slice(0, Math.max(0, 30 - quotes.length))]);
            }
          },
          onMarketTradeUpdates: (trades) => {
            if (trades.length > 0) {
              setLiveMarketTrades(prev => [...trades, ...prev.slice(0, Math.max(0, 30 - trades.length))]);
            }
          },
          onDepthUpdates: (depth) => {
            if (depth.length > 0) {
              setLiveDepthUpdates(prev => [...depth, ...prev.slice(0, Math.max(0, 10 - depth.length))]);
            }
          }
        });
      } else {
        throw new Error(`Unsupported broker for market hub: ${selectedBroker}`);
      }

      // Add event handlers for connection state changes
      newConnection.onclose(async (error) => {
        console.warn(`Market Hub connection closed unexpectedly: ${error ? error.message : 'Unknown reason'}`);
        setMarketHubStatus('disconnected');
        setMarketHubStatusMessage(`Market Hub (${currentBroker}): Connection closed unexpectedly. Will attempt to reconnect...`);

        // Store the current stream contract ID before reconnecting
        const streamContractId = marketStreamContractId;

        // Attempt to reconnect after a delay
        setTimeout(() => {
          // Use the ref to get the current version of connectMarketHubInternal
          if (reconnectMarketHubRef.current) {
            console.log('Attempting to reconnect to Market Hub...');
            reconnectMarketHubRef.current();
          }
        }, 2000); // Wait 2 seconds before reconnecting
      });

      await newConnection.start();
      setMarketHubConnection(newConnection);
      setMarketHubStatus('connected');
      setMarketHubStatusMessage(`Market Hub (${currentBroker}): Successfully connected. Ready to subscribe to contract data.`);

      // If we had an active subscription before, try to resubscribe
      if (currentStreamContractId) {
        try {
          if (currentBroker === 'topstepx') {
            await subscribeToTopstepXMarketData(newConnection, currentStreamContractId);
          } else if (currentBroker === 'projectx') {
            await subscribeToProjectXMarketData(newConnection, currentStreamContractId);
          }
          setMarketHubStatusMessage(`Market Hub (${currentBroker}): Connected and re-subscribed to ${currentStreamContractId}.`);
        } catch (err) {
          console.error(`Error re-subscribing to market data for ${currentStreamContractId}:`, err);
          // Don't set status to error, connection is fine, just resubscription failed
        }
      }

    } catch (err) {
      console.error(`Error starting ${currentBroker} Market Hub connection:`, err);
      setMarketHubStatus('error');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMarketHubStatusMessage(`Market Hub (${currentBroker}): Failed to start - ${errorMsg}`);
      setMarketHubConnection(null);
    }
  }, [sessionToken, selectedBroker]);

  // Add a ref to track the reconnection function
  const reconnectMarketHubRef = useRef<() => Promise<void>>();

  // Store the current version of connectMarketHubInternal in the ref
  useEffect(() => {
    reconnectMarketHubRef.current = connectMarketHubInternal;
  }, [connectMarketHubInternal]);

  // Create a separate unsubscribe handler
  const unsubscribeFromMarketDataHandler = useCallback(async (contractIdInput?: string) => {
    if (!marketHubConnection) {
      console.log("Market Hub: Not connected. Cannot unsubscribe from market data.");
      return;
    }

    // If no contract ID is provided, use the current one
    const contractId = contractIdInput || marketStreamContractId;
    if (!contractId) {
      console.log("Market Hub: No contract ID to unsubscribe from.");
      return;
    }

    try {
      setMarketHubStatusMessage(`Market Hub: Unsubscribing from ${contractId}...`);

      // Unsubscribe from the contract using the broker-specific service
      if (selectedBroker === 'topstepx') {
        await unsubscribeFromTopstepXMarketData(marketHubConnection, contractId);
      } else if (selectedBroker === 'projectx') {
        await unsubscribeFromProjectXMarketData(marketHubConnection, contractId);
      }

      // Only clear the stream contract ID if it matches what we're unsubscribing from
      if (marketStreamContractId === contractId) {
        setMarketStreamContractId(null);
      }

      setMarketHubStatusMessage(`Market Hub: Successfully unsubscribed from ${contractId}`);

      // Clear data arrays only if we're unsubscribing from the current stream
      if (marketStreamContractId === contractId) {
        setLiveQuotes([]);
        setLiveMarketTrades([]);
        setLiveDepthUpdates([]);
      }
    } catch (err) {
      console.error(`Error unsubscribing from ${contractId}:`, err);
      setMarketHubStatusMessage(`Market Hub: Error unsubscribing from ${contractId} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [marketHubConnection, marketStreamContractId, selectedBroker]);

  const subscribeToMarketDataHandler = useCallback(async (contractIdInput: string) => {
    if (marketHubStatus !== 'connected' || !marketHubConnection) {
        setMarketHubStatusMessage("Market Hub: Not connected. Cannot subscribe to market data.");
        return;
    }

    // If already subscribed to the same contract(s), re-subscribe
    if (marketStreamContractId === contractIdInput && contractIdInput !== "") {
      setMarketHubStatusMessage(`Market Hub: Re-subscribing to ${contractIdInput}...`);
    } 
    // If switching contracts, unsubscribe from current one first
    else if (marketStreamContractId) { 
      setMarketHubStatusMessage(`Market Hub: Unsubscribing from ${marketStreamContractId} and subscribing to ${contractIdInput}...`);
      try {
        // Use the unsubscribe handler to unsubscribe from the current contract
        await unsubscribeFromMarketDataHandler(marketStreamContractId);
      } catch (err) {
        console.error(`Error unsubscribing from ${marketStreamContractId}:`, err);
        // Log but proceed to subscribe to new one
      }
      // Clear data arrays
      setLiveQuotes([]);
      setLiveMarketTrades([]);
      setLiveDepthUpdates([]);
    } else {
      setMarketHubStatusMessage(`Market Hub: Subscribing to ${contractIdInput}...`);
    }

    setMarketStreamContractId(contractIdInput);

    try {
      // Guard against disconnection during subscription process
      if (marketHubConnection.state !== 'Connected') {
        console.warn(`Connection state changed during subscription process. Current state: ${marketHubConnection.state}`);

        // If the connection is in a reconnecting state, wait a bit
        if (marketHubConnection.state === 'Reconnecting') {
          setMarketHubStatusMessage(`Market Hub: Connection is reconnecting, waiting before subscribing...`);
          // Wait for up to 5 seconds for reconnection
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (marketHubConnection.state === 'Connected') {
              console.log(`Connection restored after waiting ${i+1} seconds`);
              break;
            }
          }
        }

        // If still not connected, throw an error
        if (marketHubConnection.state !== 'Connected') {
          throw new Error(`Cannot subscribe - connection is in ${marketHubConnection.state} state`);
        }
      }

      // Subscribe to market data using the broker-specific service with a timeout
      const subscriptionPromise = selectedBroker === 'topstepx'
        ? subscribeToTopstepXMarketData(marketHubConnection, contractIdInput)
        : subscribeToProjectXMarketData(marketHubConnection, contractIdInput);

      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Subscription timed out after 15 seconds')), 15000)
      );

      // Race the subscription against the timeout
      await Promise.race([subscriptionPromise, timeoutPromise]);

      setMarketHubStatusMessage(`Market Hub: Successfully subscribed to ${contractIdInput}`);
    } catch (error) {
      console.error(`Error subscribing to ${contractIdInput}:`, error);

      // Provide more specific error feedback
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Format user-friendly message based on error type
      let userMessage = `Failed to subscribe to ${contractIdInput}: `;

      if (errorMessage.includes('timed out')) {
        userMessage += 'Request timed out. The server might be busy or the connection unstable.';
      } else if (errorMessage.includes('Contract not found') || errorMessage.includes('Invalid contract')) {
        userMessage += 'Contract not found or invalid. Please check the symbol and try again.';
      } else if (errorMessage.includes('Not authorized') || errorMessage.includes('Permission denied')) {
        userMessage += 'Not authorized to access this contract data. Check your account permissions.';
      } else if (errorMessage.includes('Rate limit')) {
        userMessage += 'Rate limit exceeded. Please try again in a moment.';
      } else if (errorMessage.includes('message channel closed')) {
        userMessage += 'Connection interrupted. The system will attempt to reconnect automatically.';
        // If we got a message channel error, try to reconnect the hub
        setMarketHubStatus('connecting');
        // Use the ref to get the current version of connectMarketHubInternal
        if (reconnectMarketHubRef.current) {
          reconnectMarketHubRef.current();
        }
      } else {
        userMessage += errorMessage;
      }

      setMarketHubStatusMessage(`Market Hub: ${userMessage}`);

      // Don't set marketStreamContractId to null - the user may want to retry
    }
  }, [
    marketHubStatus, 
    marketHubConnection, 
    selectedBroker, 
    marketStreamContractId,
    setMarketStreamContractId,
    setLiveQuotes,
    setLiveMarketTrades,
    setLiveDepthUpdates
    // Removed connectMarketHubInternal from the dependency array
  ]);

  // Make sure connectMarketHub calls connectMarketHubInternal directly
  const connectMarketHub = useCallback(() => {
    // This function should only start a connection if not already connected/connecting
    if (marketHubStatus !== 'connected' && marketHubStatus !== 'connecting') {
      connectMarketHubInternal();
    }
  }, [marketHubStatus, connectMarketHubInternal]);

  // Historical Data Handler with caching
  const fetchHistoricalDataHandler = useCallback(async (request: HistoricalDataRequest) => {
    if (!sessionToken || !selectedBroker) {
      setHistoricalDataError('Authentication is required to fetch historical data');
      return;
    }

    setIsLoadingHistoricalData(true);
    setHistoricalDataError(null);

    try {
      marketDataAdapter.initialize(selectedBroker, sessionToken);

      const startTime = request.startDate ? new Date(request.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endTime = request.endDate ? new Date(request.endDate) : new Date();

      const cachedData = await marketDataAdapter.getHistoricalData(
        request.contractId,
        request.interval || '1d',
        startTime,
        endTime,
        { forceRefresh: false }
      );

      const response: HistoricalDataResponse = {
        contractId: request.contractId,
        interval: request.interval || '1d',
        bars: cachedData.map((bar) => ({
          timestamp: bar.timestamp.toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        })),
        success: true,
      };

      setHistoricalData(response);

      if (cachedData.length === 0) {
        setHistoricalDataError('No historical data available for this period');
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setHistoricalDataError(`Error fetching historical data: ${errorMessage}`);
      setHistoricalData(null);
    } finally {
      setIsLoadingHistoricalData(false);
    }
  }, [sessionToken, selectedBroker]);

  const clearHistoricalDataHandler = useCallback(() => {
    setHistoricalData(null);
    setHistoricalDataError(null);
  }, []);


  // Order Management Handlers
  const placeOrderHandler = useCallback(async (order: PlaceOrderRequest): Promise<{
    success: boolean;
    orderId?: string | number;
    errorMessage?: string;
  }> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      return {
        success: false,
        errorMessage: 'Cannot place order: Missing session token, broker selection, or account'
      };
    }

    // Make sure the order uses the selected account ID
    const orderWithAccount = {
      ...order,
      accountId: selectedAccountId
    };

    try {
      setIsLoading(true);
      const response = await placeOrder(selectedBroker, sessionToken, orderWithAccount);
      setIsLoading(false);

      if (response.success) {
        // Update UI status message
        setConnectionStatusMessage(`Order placed successfully. Order ID: ${response.orderId}`);
        return {
          success: true,
          orderId: response.orderId
        };
      } else {
        // Handle API error
        const errorMessage = response.errorMessage || 'Unknown error placing order';
        setConnectionStatusMessage(`Failed to place order: ${errorMessage}`);
        return {
          success: false,
          errorMessage
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error placing order: ${errorMessage}`);
      return {
        success: false,
        errorMessage
      };
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const cancelOrderHandler = useCallback(async (orderId: string | number): Promise<{
    success: boolean;
    errorMessage?: string;
  }> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      return {
        success: false,
        errorMessage: 'Cannot cancel order: Missing session token, broker selection, or account'
      };
    }

    try {
      setIsLoading(true);
      const response = await cancelOrder(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        orderId
      });
      setIsLoading(false);

      if (response.success) {
        setConnectionStatusMessage(`Order ${orderId} canceled successfully.`);
        return { success: true };
      } else {
        const errorMessage = response.errorMessage || 'Unknown error canceling order';
        setConnectionStatusMessage(`Failed to cancel order: ${errorMessage}`);
        return {
          success: false,
          errorMessage
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error canceling order: ${errorMessage}`);
      return {
        success: false,
        errorMessage
      };
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const modifyOrderHandler = useCallback(async (request: ModifyOrderRequest): Promise<{
    success: boolean;
    errorMessage?: string;
  }> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      return {
        success: false,
        errorMessage: 'Cannot modify order: Missing session token, broker selection, or account'
      };
    }

    // Make sure the request uses the selected account ID
    const requestWithAccount = {
      ...request,
      accountId: selectedAccountId
    };

    try {
      setIsLoading(true);
      const response = await modifyOrder(selectedBroker, sessionToken, requestWithAccount);
      setIsLoading(false);

      if (response.success) {
        setConnectionStatusMessage(`Order ${request.orderId} modified successfully.`);
        return { success: true };
      } else {
        const errorMessage = response.errorMessage || 'Unknown error modifying order';
        setConnectionStatusMessage(`Failed to modify order: ${errorMessage}`);
        return {
          success: false,
          errorMessage
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error modifying order: ${errorMessage}`);
      return {
        success: false,
        errorMessage
      };
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const fetchOrdersHandler = useCallback(async (params?: {
    startTimestamp?: string;
    endTimestamp?: string;
  }): Promise<void> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      setConnectionStatusMessage('Cannot fetch orders: Missing session token, broker selection, or account');
      return;
    }

    try {
      setIsLoading(true);
      const response = await searchOrders(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        ...params
      });
      setIsLoading(false);

      if (response.success) {
        // Store orders in liveOrderUpdates
        setLiveOrderUpdates(response.orders);
        setConnectionStatusMessage(`Successfully fetched ${response.orders.length} orders.`);
      } else {
        const errorMessage = response.errorMessage || 'Unknown error fetching orders';
        setConnectionStatusMessage(`Failed to fetch orders: ${errorMessage}`);
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error fetching orders: ${errorMessage}`);
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const fetchOpenOrdersHandler = useCallback(async (): Promise<void> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      setConnectionStatusMessage('Cannot fetch open orders: Missing session token, broker selection, or account');
      return;
    }

    try {
      setIsLoading(true);
      const response = await searchOpenOrders(selectedBroker, sessionToken, {
        accountId: selectedAccountId
      });
      setIsLoading(false);

      if (response.success) {
        // Store orders in liveOrderUpdates
        setLiveOrderUpdates(response.orders);
        setConnectionStatusMessage(`Successfully fetched ${response.orders.length} open orders.`);
      } else {
        const errorMessage = response.errorMessage || 'Unknown error fetching open orders';
        setConnectionStatusMessage(`Failed to fetch open orders: ${errorMessage}`);
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error fetching open orders: ${errorMessage}`);
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const fetchTradesHandler = useCallback(async (params?: {
    startTimestamp?: string;
    endTimestamp?: string;
    contractId?: string;
    page?: number;
    limit?: number;
  }): Promise<void> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      setConnectionStatusMessage('Cannot fetch trades: Missing session token, broker selection, or account');
      setLiveTradeUpdates([]);
      setTotalTradesCount(0);
      setTotalPagesTrades(0);
      setCurrentPageTrades(1);
      return;
    }

    const pageToFetch = params?.page || currentPageTrades; // Use provided page or current page from state
    const limitToFetch = params?.limit || tradesLimitPerPage; // Use provided limit or default from state

    try {
      setIsLoading(true); // Consider a specific isLoadingTrades state if needed
      const response = await searchTrades(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        startTimestamp: params?.startTimestamp,
        endTimestamp: params?.endTimestamp,
        contractId: params?.contractId,
        page: pageToFetch,
        limit: limitToFetch,
      });
      setIsLoading(false);

      if (response.success) {
        setLiveTradeUpdates(response.trades);
        // Assuming searchTrades response might now include pagination data
        setTotalTradesCount(response.totalItems || response.trades.length); // Fallback if totalItems not provided
        setTotalPagesTrades(response.totalPages || Math.ceil((response.totalItems || response.trades.length) / limitToFetch));
        setCurrentPageTrades(response.currentPage || pageToFetch);

        const message = `Successfully fetched ${response.trades.length} trades. ` +
                        (response.totalItems ? `(Page ${response.currentPage} of ${response.totalPages}, Total: ${response.totalItems})` : '');
        setConnectionStatusMessage(message);

      } else {
        const errorMessage = response.errorMessage || 'Unknown error fetching trades';
        setConnectionStatusMessage(`Failed to fetch trades: ${errorMessage}`);
        setLiveTradeUpdates([]);
        setTotalTradesCount(0);
        setTotalPagesTrades(0);
        // Don't reset currentPageTrades here, let user be on the page they tried to fetch
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error fetching trades: ${errorMessage}`);
      setLiveTradeUpdates([]);
      setTotalTradesCount(0);
      setTotalPagesTrades(0);
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage, currentPageTrades, tradesLimitPerPage]);


  // Position Management Handlers
  const fetchOpenPositionsHandler = useCallback(async (): Promise<void> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      setConnectionStatusMessage('Cannot fetch positions: Missing session token, broker selection, or account');
      return;
    }

    try {
      setIsLoading(true);
      const response = await searchOpenPositions(selectedBroker, sessionToken, {
        accountId: selectedAccountId
      });
      setIsLoading(false);

      if (response.success) {
        // Store positions in livePositionUpdates
        setLivePositionUpdates(response.positions);
        setConnectionStatusMessage(`Successfully fetched ${response.positions.length} open positions.`);
      } else {
        const errorMessage = response.errorMessage || 'Unknown error fetching positions';
        setConnectionStatusMessage(`Failed to fetch positions: ${errorMessage}`);
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error fetching positions: ${errorMessage}`);
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage]);

  const closePositionHandler = useCallback(async (contractId: string): Promise<{
    success: boolean;
    errorMessage?: string;
  }> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      return {
        success: false,
        errorMessage: 'Cannot close position: Missing session token, broker selection, or account'
      };
    }

    try {
      setIsLoading(true);
      const response = await apiClosePosition(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId
      });
      setIsLoading(false);

      if (response.success) {
        setConnectionStatusMessage(`Position for ${contractId} closed successfully.`);
        // Refresh positions list
        fetchOpenPositionsHandler();
        return { success: true };
      } else {
        const errorMessage = response.errorMessage || 'Unknown error closing position';
        setConnectionStatusMessage(`Failed to close position: ${errorMessage}`);
        return {
          success: false,
          errorMessage
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error closing position: ${errorMessage}`);
      return {
        success: false,
        errorMessage
      };
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage, fetchOpenPositionsHandler]);

  const partialClosePositionHandler = useCallback(async (contractId: string, size: number): Promise<{
    success: boolean;
    errorMessage?: string;
  }> => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) {
      return {
        success: false,
        errorMessage: 'Cannot partially close position: Missing session token, broker selection, or account'
      };
    }

    try {
      setIsLoading(true);
      const response = await apiPartialClosePosition(selectedBroker, sessionToken, {
        accountId: selectedAccountId,
        contractId,
        size
      });
      setIsLoading(false);

      if (response.success) {
        setConnectionStatusMessage(`Position for ${contractId} partially closed successfully.`);
        // Refresh positions list
        fetchOpenPositionsHandler();
        return { success: true };
      } else {
        const errorMessage = response.errorMessage || 'Unknown error partially closing position';
        setConnectionStatusMessage(`Failed to partially close position: ${errorMessage}`);
        return {
          success: false,
          errorMessage
        };
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatusMessage(`Error partially closing position: ${errorMessage}`);
      return {
        success: false,
        errorMessage
      };
    }
  }, [sessionToken, selectedBroker, selectedAccountId, setConnectionStatusMessage, fetchOpenPositionsHandler]);


  // Effect to automatically connect hubs if authenticated and broker is selected
  useEffect(() => {
    if (isAuthenticated && selectedBroker && sessionToken) {
        if (userHubStatus === 'disconnected') {
            connectUserHubInternal();
        }
        if ((selectedBroker === 'topstepx' || selectedBroker === 'projectx') && marketHubStatus === 'disconnected') {
            connectMarketHub();
        }
    } else {
        // If not authenticated or no broker, ensure hubs are disconnected
        if (userHubStatus !== 'disconnected') disconnectUserHubHandler();
        if (marketHubStatus !== 'disconnected') disconnectMarketHubHandler();
    }
  // FIX: Added all missing dependencies to the useEffect hook.
  // This includes state values used in conditions (userHubStatus, marketHubStatus)
  // and memoized callback functions called within the effect.
  }, [
    isAuthenticated, 
    selectedBroker, 
    sessionToken, 
    userHubStatus, 
    marketHubStatus, 
    connectUserHubInternal, 
    connectMarketHub, 
    disconnectUserHubHandler, 
    disconnectMarketHubHandler
  ]);


  // Contract Search Handler
  const searchContractsHandler = useCallback(async (
    broker: BrokerType,
    params: { 
      searchText: string,
      live?: boolean, 
      productType?: number,
      exchange?: string,
      symbolRoot?: string,
      contractGroup?: string,
      contractName?: string
    }
  ) => {
    if (!sessionToken) {
      return {
        contracts: [],
        success: false,
        errorCode: 401,
        errorMessage: 'Authentication token is required'
      };
    }

    try {
      setIsLoading(true);
      const response = await searchContracts(broker, sessionToken, params);
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      console.error('Error searching contracts:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contracts: [],
        success: false,
        errorCode: 500,
        errorMessage
      };
    }
  }, [sessionToken]);

  const searchContractByIdHandler = useCallback(async (
    broker: BrokerType,
    contractId: string,
    includeDefinition?: boolean
  ) => {
    if (!sessionToken) {
      return {
        contracts: [],
        success: false,
        errorCode: 401,
        errorMessage: 'Authentication token is required'
      };
    }

    try {
      setIsLoading(true);
      const response = await searchContractById(broker, sessionToken, { 
        contractId,
        includeDefinition
      });
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      console.error('Error searching contract by ID:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contracts: [],
        success: false,
        errorCode: 500,
        errorMessage
      };
    }
  }, [sessionToken]);

  // Enhanced subscription to both positions and quotes for accurate P&L updates
  const subscribeToPositionsAndQuotesHandler = useCallback(async (contractId: string) => {
    if (!marketHubConnection || !selectedAccountId || !sessionToken) {
      console.error('Cannot subscribe to position data: Missing required connection state');
      return;
    }

    if (marketHubStatus !== 'connected') {
      console.error('Cannot subscribe to position data: Market hub not in connected state');
      return;
    }

    console.log(`Subscribing to position + quote data for contract: ${contractId}`);

    try {
      // First make sure we subscribe to the market data for this contract
      await subscribeToMarketDataHandler(contractId);

      // Then ensure positions are subscribed as well
      if (userHubConnection) {
        await userHubConnection.invoke('SubscribePositions', selectedAccountId);
      }

      console.log(`Successfully subscribed to position and quote data for ${contractId}`);
    } catch (error) {
      console.error(`Error subscribing to position and quote data for ${contractId}:`, error);
      throw error;
    }
  }, [marketHubConnection, userHubConnection, selectedAccountId, subscribeToMarketDataHandler]);

  // Ref to track previous quotes to avoid infinite update loops
  const previousQuotesRef = useRef<QuoteData[]>([]);

  // Enhanced position update function that augments positions with latest market data
  useEffect(() => {
    if (!Array.isArray(livePositionUpdates) || !Array.isArray(liveQuotes)) {
      console.error('Invalid data format for position updates or quotes');
      return;
    }

    // Only process if we have both positions and quotes
    if (livePositionUpdates.length > 0 && liveQuotes.length > 0) {
      // Check if quotes have actually changed since last update
      const quotesChanged = liveQuotes.some((quote, index) => {
        const prevQuote = previousQuotesRef.current[index];
        return !prevQuote || 
               prevQuote.contractId !== quote.contractId || 
               prevQuote.lastPrice !== quote.lastPrice ||
               prevQuote.bidPrice !== quote.bidPrice ||
               prevQuote.askPrice !== quote.askPrice;
      });

      // Only update if quotes have changed
      if (quotesChanged) {
        // Get updated positions with latest market prices and calculated P&L
        const updatedPositions = integrateQuotesWithPositions(livePositionUpdates, liveQuotes);

        // Check if any positions have changed and need to be updated
        const needsUpdate = positionsNeedQuoteUpdate(livePositionUpdates, updatedPositions);

        // Only update if there are real changes to avoid unnecessary re-renders
        if (needsUpdate) {
          console.log('Updating positions with real-time market data');
          setLivePositionUpdates(updatedPositions);
        }

        // Update the ref with current quotes
        previousQuotesRef.current = [...liveQuotes];
      }
    }
  }, [liveQuotes, livePositionUpdates]);

  return (
    <TradingContext.Provider value={{
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
      sessionToken,
      sessionExpiry,
      isAuthenticated,
      connectionStatusMessage,
      isLoading,
      userAccounts,
      selectedAccountId,
      selectBroker: selectBrokerHandler,
      setProjectXAuthMode,
      updateProjectXCredentials: updateProjectXCredentialsHandler,
      updateTopstepXCredentials: updateTopstepXCredentialsHandler,
      connectToBroker: connectToBrokerHandler,
      disconnectFromBroker: disconnectFromBrokerHandler,
      fetchUserAccounts: fetchUserAccountsHandler,
      selectAccount: setSelectedAccountId,

      userHubConnection,
      userHubStatus,
      userHubStatusMessage,
      liveAccountUpdates,
      liveOrderUpdates,
      livePositionUpdates,
      setLivePositionUpdates, // Keep this if direct manipulation is needed elsewhere
      liveTradeUpdates, // This will be populated by fetchTradesHandler
      connectUserHub: connectUserHubInternal,
      disconnectUserHub: disconnectUserHubHandler,

      // Trade Pagination State
      currentPageTrades,
      totalPagesTrades,
      totalTradesCount,
      tradesLimitPerPage,
      setCurrentPageTrades, // Expose to allow components to request a specific page

      marketHubConnection,
      marketHubStatus,
      marketHubStatusMessage,
      marketStreamContractId,
      liveQuotes,
      liveMarketTrades,
      liveDepthUpdates,
      connectMarketHub,
      disconnectMarketHub: disconnectMarketHubHandler,
      subscribeToMarketData: subscribeToMarketDataHandler,
      unsubscribeFromMarketData: unsubscribeFromMarketDataHandler,

      // Historical Data
      historicalData,
      isLoadingHistoricalData,
      historicalDataError,
      fetchHistoricalData: fetchHistoricalDataHandler,
      clearHistoricalData: clearHistoricalDataHandler,

      // TopstepX Direct Authentication
      authenticateTopstepXDirect: authenticateTopstepXDirectHandler,

      // Contract Management
      searchContracts: searchContractsHandler,
      searchContractById: searchContractByIdHandler,

      // Order Management
      placeOrder: placeOrderHandler,
      cancelOrder: cancelOrderHandler,
      modifyOrder: modifyOrderHandler,
      fetchOrders: fetchOrdersHandler,
      fetchOpenOrders: fetchOpenOrdersHandler,

      // Position Management
      fetchOpenPositions: fetchOpenPositionsHandler,
      closePosition: closePositionHandler,
      partialClosePosition: partialClosePositionHandler,
      subscribeToPositionsAndQuotes: subscribeToPositionsAndQuotesHandler,

      // Trade Management
      fetchTrades: fetchTradesHandler,

    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingContext = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};
