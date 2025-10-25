import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from 'react';
import { HubConnection } from '@microsoft/signalr';
import {
  BrokerType,
  HubConnectionStatus,
  Order,
  Position,
  Trade,
  QuoteData,
  MarketTradeData,
  MarketDepthUpdate,
  TradingAccount
} from '../types';
import {
  buildTopstepXUserHubConnection,
  buildTopstepXMarketHubConnection,
  setupTopstepXUserHubHandlers,
  setupTopstepXMarketHubHandlers,
  subscribeToTopstepXMarketData,
  unsubscribeFromTopstepXMarketData
} from '../services/topstepXService';
import {
  buildProjectXMarketHubConnection,
  setupProjectXMarketHubHandlers,
  subscribeToProjectXMarketData,
  unsubscribeFromProjectXMarketData
} from '../services/tradingApiService';
import { retryOperation, withTimeout } from '../utils/errorHandler';

interface SignalRContextType {
  userHubConnection: HubConnection | null;
  userHubStatus: HubConnectionStatus;
  userHubStatusMessage: string | null;
  liveAccountUpdates: TradingAccount[];
  liveOrderUpdates: Order[];
  livePositionUpdates: Position[];
  liveTradeUpdates: Trade[];

  marketHubConnection: HubConnection | null;
  marketHubStatus: HubConnectionStatus;
  marketHubStatusMessage: string | null;
  marketStreamContractId: string | null;
  liveQuotes: QuoteData[];
  liveMarketTrades: MarketTradeData[];
  liveDepthUpdates: MarketDepthUpdate[];

  connectUserHub: (sessionToken: string, selectedBroker: BrokerType, selectedAccountId?: string | number | null) => Promise<void>;
  disconnectUserHub: () => Promise<void>;
  connectMarketHub: (sessionToken: string, selectedBroker: BrokerType) => Promise<void>;
  disconnectMarketHub: () => Promise<void>;
  subscribeToMarketData: (contractId: string) => Promise<void>;
  unsubscribeFromMarketData: (contractId?: string) => Promise<void>;
  setLivePositionUpdates: React.Dispatch<React.SetStateAction<Position[]>>;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userHubConnection, setUserHubConnection] = useState<HubConnection | null>(null);
  const [userHubStatus, setUserHubStatus] = useState<HubConnectionStatus>('disconnected');
  const [userHubStatusMessage, setUserHubStatusMessage] = useState<string | null>('User Hub: Not Connected.');

  const [liveAccountUpdates, setLiveAccountUpdates] = useState<TradingAccount[]>([]);
  const [liveOrderUpdates, setLiveOrderUpdates] = useState<Order[]>([]);
  const [livePositionUpdates, setLivePositionUpdates] = useState<Position[]>([]);
  const [liveTradeUpdates, setLiveTradeUpdates] = useState<Trade[]>([]);

  const [marketHubConnection, setMarketHubConnection] = useState<HubConnection | null>(null);
  const [marketHubStatus, setMarketHubStatus] = useState<HubConnectionStatus>('disconnected');
  const [marketHubStatusMessage, setMarketHubStatusMessage] = useState<string | null>('Market Hub: Not Connected.');
  const [marketStreamContractId, setMarketStreamContractId] = useState<string | null>(null);

  const [liveQuotes, setLiveQuotes] = useState<QuoteData[]>([]);
  const [liveMarketTrades, setLiveMarketTrades] = useState<MarketTradeData[]>([]);
  const [liveDepthUpdates, setLiveDepthUpdates] = useState<MarketDepthUpdate[]>([]);

  const reconnectMarketHubRef = useRef<() => Promise<void>>();
  const marketHubReconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const disconnectUserHub = useCallback(async () => {
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

  const disconnectMarketHub = useCallback(async () => {
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
        setMarketStreamContractId(null);
        setLiveQuotes([]);
        setLiveMarketTrades([]);
        setLiveDepthUpdates([]);
        marketHubReconnectAttempts.current = 0;
      }
    }
  }, [marketHubConnection]);

  const connectUserHub = useCallback(async (
    sessionToken: string,
    selectedBroker: BrokerType,
    selectedAccountId?: string | number | null
  ) => {
    if (selectedBroker !== 'topstepx') {
      setUserHubStatusMessage('User Hub: Only available for TopstepX.');
      setUserHubStatus('disconnected');
      return;
    }

    if (userHubConnection && userHubStatus !== 'disconnected' && userHubStatus !== 'error') {
      setUserHubStatusMessage('User Hub: Already connected or connecting.');
      return;
    }

    await disconnectUserHub();

    setUserHubStatus('connecting');
    setUserHubStatusMessage('User Hub: Connecting...');

    try {
      const newConnection = buildTopstepXUserHubConnection(sessionToken);

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

      newConnection.onclose((error) => {
        console.log('User Hub connection closed:', error);
        setUserHubStatus('connecting');
        setUserHubStatusMessage('User Hub: Connection lost. Attempting to reconnect...');
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

      await withTimeout(newConnection.start(), 15000, 'User Hub connection timed out');
      setUserHubConnection(newConnection);
      setUserHubStatus('connected');
      setUserHubStatusMessage('User Hub: Successfully connected. Sending subscriptions...');

      if (selectedAccountId) {
        try {
          await newConnection.invoke('SubscribeOrders', selectedAccountId);
          await newConnection.invoke('SubscribePositions', selectedAccountId);
          await newConnection.invoke('SubscribeTrades', selectedAccountId);
        } catch (invokeError) {
          console.warn('Error sending account-specific subscriptions:', invokeError);
        }
      }

      try {
        await newConnection.invoke('SubscribeAccounts');
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
    }
  }, [userHubConnection, userHubStatus, disconnectUserHub]);

  const connectMarketHub = useCallback(async (
    sessionToken: string,
    selectedBroker: BrokerType
  ) => {
    if (marketHubStatus === 'connecting') {
      console.log('Already connecting to market hub, ignoring duplicate request');
      return;
    }

    if (marketHubStatus === 'connected' && marketHubConnection) {
      console.log('Market hub already connected, ignoring duplicate connection request');
      return;
    }

    if (marketHubConnection) {
      try {
        await marketHubConnection.stop();
        console.log(`Stopped existing market hub connection for ${selectedBroker}`);
      } catch (err) {
        console.warn('Error stopping existing market hub connection:', err);
      }
      setMarketHubConnection(null);
    }

    setMarketHubStatus('connecting');
    setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Connecting...`);

    const currentStreamContractId = marketStreamContractId;

    try {
      let newConnection: HubConnection;

      if (selectedBroker === 'topstepx') {
        newConnection = buildTopstepXMarketHubConnection(sessionToken);

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

      newConnection.onclose(async (error) => {
        console.warn(`Market Hub connection closed unexpectedly: ${error ? error.message : 'Unknown reason'}`);
        setMarketHubStatus('disconnected');
        setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Connection closed unexpectedly.`);

        if (marketHubReconnectAttempts.current < maxReconnectAttempts) {
          marketHubReconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, marketHubReconnectAttempts.current), 30000);

          setTimeout(() => {
            if (reconnectMarketHubRef.current) {
              console.log(`Attempting to reconnect to Market Hub (attempt ${marketHubReconnectAttempts.current})...`);
              reconnectMarketHubRef.current();
            }
          }, delay);
        } else {
          setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Max reconnection attempts reached.`);
        }
      });

      await withTimeout(newConnection.start(), 15000, 'Market Hub connection timed out');
      setMarketHubConnection(newConnection);
      setMarketHubStatus('connected');
      setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Successfully connected.`);
      marketHubReconnectAttempts.current = 0;

      if (currentStreamContractId) {
        try {
          if (selectedBroker === 'topstepx') {
            await subscribeToTopstepXMarketData(newConnection, currentStreamContractId);
          } else if (selectedBroker === 'projectx') {
            await subscribeToProjectXMarketData(newConnection, currentStreamContractId);
          }
          setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Connected and re-subscribed to ${currentStreamContractId}.`);
        } catch (err) {
          console.error(`Error re-subscribing to market data for ${currentStreamContractId}:`, err);
        }
      }
    } catch (err) {
      console.error(`Error starting ${selectedBroker} Market Hub connection:`, err);
      setMarketHubStatus('error');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMarketHubStatusMessage(`Market Hub (${selectedBroker}): Failed to start - ${errorMsg}`);
      setMarketHubConnection(null);
    }
  }, [marketHubStatus, marketHubConnection, marketStreamContractId]);

  useEffect(() => {
    reconnectMarketHubRef.current = async () => {
      console.log('Reconnect function called');
    };
  }, [connectMarketHub]);

  const unsubscribeFromMarketData = useCallback(async (contractIdInput?: string) => {
    if (!marketHubConnection) {
      console.log('Market Hub: Not connected. Cannot unsubscribe from market data.');
      return;
    }

    const contractId = contractIdInput || marketStreamContractId;
    if (!contractId) {
      console.log('Market Hub: No contract ID to unsubscribe from.');
      return;
    }

    try {
      setMarketHubStatusMessage(`Market Hub: Unsubscribing from ${contractId}...`);

      if (marketHubConnection.state === 'Connected') {
        const brokerType = marketStreamContractId?.includes('ESH') ? 'topstepx' : 'projectx';
        if (brokerType === 'topstepx') {
          await unsubscribeFromTopstepXMarketData(marketHubConnection, contractId);
        } else {
          await unsubscribeFromProjectXMarketData(marketHubConnection, contractId);
        }
      }

      if (marketStreamContractId === contractId) {
        setMarketStreamContractId(null);
        setLiveQuotes([]);
        setLiveMarketTrades([]);
        setLiveDepthUpdates([]);
      }

      setMarketHubStatusMessage(`Market Hub: Successfully unsubscribed from ${contractId}`);
    } catch (err) {
      console.error(`Error unsubscribing from ${contractId}:`, err);
      setMarketHubStatusMessage(`Market Hub: Error unsubscribing from ${contractId} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [marketHubConnection, marketStreamContractId]);

  const subscribeToMarketData = useCallback(async (contractIdInput: string) => {
    if (marketHubStatus !== 'connected' || !marketHubConnection) {
      setMarketHubStatusMessage('Market Hub: Not connected. Cannot subscribe to market data.');
      return;
    }

    if (marketStreamContractId && marketStreamContractId !== contractIdInput) {
      await unsubscribeFromMarketData(marketStreamContractId);
      setLiveQuotes([]);
      setLiveMarketTrades([]);
      setLiveDepthUpdates([]);
    }

    setMarketStreamContractId(contractIdInput);
    setMarketHubStatusMessage(`Market Hub: Subscribing to ${contractIdInput}...`);

    try {
      if (marketHubConnection.state !== 'Connected') {
        throw new Error(`Cannot subscribe - connection is in ${marketHubConnection.state} state`);
      }

      const brokerType = contractIdInput.includes('ESH') ? 'topstepx' : 'projectx';
      const subscriptionPromise = brokerType === 'topstepx'
        ? subscribeToTopstepXMarketData(marketHubConnection, contractIdInput)
        : subscribeToProjectXMarketData(marketHubConnection, contractIdInput);

      await withTimeout(subscriptionPromise, 15000, 'Subscription timed out');
      setMarketHubStatusMessage(`Market Hub: Successfully subscribed to ${contractIdInput}`);
    } catch (error) {
      console.error(`Error subscribing to ${contractIdInput}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMarketHubStatusMessage(`Market Hub: Failed to subscribe - ${errorMessage}`);
    }
  }, [marketHubStatus, marketHubConnection, marketStreamContractId, unsubscribeFromMarketData]);

  return (
    <SignalRContext.Provider value={{
      userHubConnection,
      userHubStatus,
      userHubStatusMessage,
      liveAccountUpdates,
      liveOrderUpdates,
      livePositionUpdates,
      liveTradeUpdates,
      marketHubConnection,
      marketHubStatus,
      marketHubStatusMessage,
      marketStreamContractId,
      liveQuotes,
      liveMarketTrades,
      liveDepthUpdates,
      connectUserHub,
      disconnectUserHub,
      connectMarketHub,
      disconnectMarketHub,
      subscribeToMarketData,
      unsubscribeFromMarketData,
      setLivePositionUpdates
    }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = (): SignalRContextType => {
  const context = useContext(SignalRContext);
  if (context === undefined) {
    throw new Error('useSignalR must be used within a SignalRProvider');
  }
  return context;
};
