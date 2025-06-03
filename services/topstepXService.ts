import { 
    HubConnection, HubConnectionBuilder, LogLevel, HttpTransportType 
} from '@microsoft/signalr';
import { 
    TradingAccount, Order, Position, Trade,
    QuoteData, MarketTradeData, MarketDepthUpdate,
    HubConnectionStatus,
    HistoricalDataRequest, 
    HistoricalDataResponse,
    HistoricalBar 
} from '../types';
import { TOPSTEPX_USER_HUB_URL, TOPSTEPX_MARKET_HUB_URL, TOPSTEPX_API_BASE_URL, TOPSTEPX_HISTORICAL_DATA_ENDPOINT } from '../constants.tsx';
import { PROJECTX_API_BASE_URL } from '../constants.ts';

// User Hub Connection Management
export const buildTopstepXUserHubConnection = (token: string): HubConnection => {
    return new HubConnectionBuilder()
        .withUrl(`${TOPSTEPX_USER_HUB_URL}?access_token=${token}`, {
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
                // Implement exponential backoff with max timeout
                if (retryContext.previousRetryCount === 0) {
                    return 0; // No delay for first retry
                }

                // Exponential backoff capped at 30 seconds
                const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                console.log(`TopstepX User Hub reconnection attempt ${retryContext.previousRetryCount}, delay: ${delay}ms`);
                return delay;
            }
        })
        .build();
};

// Market Hub Connection Management
export const buildTopstepXMarketHubConnection = (token: string): HubConnection => {
    return new HubConnectionBuilder()
        .withUrl(`${TOPSTEPX_MARKET_HUB_URL}?access_token=${token}`, {
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets,
            timeout: 30000 // Increase timeout to 30 seconds to prevent premature timeouts
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
                // Implement exponential backoff with max timeout
                if (retryContext.previousRetryCount === 0) {
                    return 0; // No delay for first retry
                }

                // Exponential backoff capped at 30 seconds
                const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                console.log(`TopstepX Market Hub reconnection attempt ${retryContext.previousRetryCount}, delay: ${delay}ms`);
                return delay;
            }
        })
        .build();
};

// User Hub Handlers
export const setupTopstepXUserHubHandlers = (
    connection: HubConnection,
    callbacks: {
        onConnectionStatusChange: (status: HubConnectionStatus, message: string) => void;
        onAccountUpdates: (accounts: TradingAccount[]) => void;
        onOrderUpdates: (orders: Order[]) => void;
        onPositionUpdates: (positions: Position[]) => void;
        onTradeUpdates: (trades: Trade[]) => void;
    }
): void => {
    // Setup connection status handlers
    connection.onclose((error) => {
        if (error) {
            console.error('TopstepX User Hub connection closed with error:', error);
            callbacks.onConnectionStatusChange('error', `Connection closed with error: ${error}`);
        } else {
            console.log('TopstepX User Hub connection closed');
            callbacks.onConnectionStatusChange('disconnected', 'Connection closed');
        }
    });

    connection.onreconnecting((error) => {
        console.warn('TopstepX User Hub reconnecting due to error:', error);
        callbacks.onConnectionStatusChange('connecting', `Reconnecting: ${error ? error.message : 'Connection lost'}`);
    });

    connection.onreconnected((connectionId) => {
        console.log(`TopstepX User Hub reconnected with ID: ${connectionId}`);
        callbacks.onConnectionStatusChange('connected', `Reconnected with ID: ${connectionId}`);
    });

    // Setup event handlers based on TopstepX API documentation
    // Single account update - wrapped in array for consistency
    connection.on('GatewayUserAccount', (account: TradingAccount) => {
        console.log('Received account update:', account);
        callbacks.onAccountUpdates([account]);
    });

    // Single order update - wrapped in array for consistency
    connection.on('GatewayUserOrder', (order: Order) => {
        console.log('Received order update:', order);
        callbacks.onOrderUpdates([order]);
    });

    // Single position update - wrapped in array for consistency
    connection.on('GatewayUserPosition', (position: Position) => {
        console.log('Received position update:', position);
        callbacks.onPositionUpdates([position]);
    });

    // Single trade update - wrapped in array for consistency
    connection.on('GatewayUserTrade', (trade: Trade) => {
        console.log('Received trade update:', trade);
        callbacks.onTradeUpdates([trade]);
    });

    // Optional: Add a connection health check ping
    let pingInterval: number | null = null;

    connection.on('OnPong', () => {
        console.log('Received pong from TopstepX User Hub');
    });

    const startPingInterval = () => {
        if (pingInterval !== null) {
            clearInterval(pingInterval);
        }

        // Ping every 30 seconds to keep connection alive
        pingInterval = window.setInterval(() => {
            if (connection.state === 'Connected') {
                connection.invoke('Ping').catch(err => {
                    console.error('Error pinging TopstepX User Hub:', err);
                });
            }
        }, 30000);
    };

    const clearPingInterval = () => {
        if (pingInterval !== null) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    };

    // Start ping immediately and when reconnected, clear on disconnection
    startPingInterval(); // Start immediately when handlers are set up
    connection.onreconnected(() => startPingInterval());
    connection.onclose(() => clearPingInterval());
};

import { 
    trackQuoteUpdate, 
    trackTradeUpdate, 
    trackDepthUpdate
} from '../utils/marketHubDiagnostics';

// Market Hub Handlers
export const setupTopstepXMarketHubHandlers = (
    connection: HubConnection,
    callbacks: {
        onConnectionStatusChange: (status: HubConnectionStatus, message: string) => void;
        onQuoteUpdates: (quotes: QuoteData[]) => void;
        onMarketTradeUpdates: (trades: MarketTradeData[]) => void;
        onDepthUpdates: (depth: MarketDepthUpdate[]) => void;
    }
): void => {
    // Setup connection status handlers
    connection.onclose((error) => {
        if (error) {
            console.error('TopstepX Market Hub connection closed with error:', error);
            callbacks.onConnectionStatusChange('error', `Connection closed with error: ${error}`);
        } else {
            console.log('TopstepX Market Hub connection closed');
            callbacks.onConnectionStatusChange('disconnected', 'Connection closed');
        }
    });

    connection.onreconnecting((error) => {
        console.warn('TopstepX Market Hub reconnecting due to error:', error);
        callbacks.onConnectionStatusChange('connecting', `Reconnecting: ${error ? error.message : 'Connection lost'}`);
    });

    connection.onreconnected((connectionId) => {
        console.log(`TopstepX Market Hub reconnected with ID: ${connectionId}`);
        callbacks.onConnectionStatusChange('connected', `Reconnected with ID: ${connectionId}`);
    });    // Setup event handlers based on the reference implementation
    // Add standard event handlers as per the reference implementation
    connection.on('GatewayQuote', (contractId: string, data: QuoteData) => {
        console.log(`Received gateway quote for ${contractId}:`, data);
        // Ensure the contractId is added to the data for tracking
        const enhancedData = { ...data, contractId };
        trackQuoteUpdate([enhancedData]);
        callbacks.onQuoteUpdates([enhancedData]); // Wrap in array for consistency
    });

    connection.on('GatewayTrade', (contractId: string, data: MarketTradeData) => {
        console.log(`Received gateway trade for ${contractId}:`, data);
        // Ensure the contractId is added to the data for tracking
        const enhancedData = { ...data, contractId };
        trackTradeUpdate([enhancedData]);
        callbacks.onMarketTradeUpdates([enhancedData]); // Wrap in array for consistency
    });

    connection.on('GatewayDepth', (contractId: string, data: MarketDepthUpdate) => {
        console.log(`Received gateway depth for ${contractId}:`, data);
        // Ensure the contractId is added to the data for tracking
        const enhancedData = { ...data, contractId };
        trackDepthUpdate([enhancedData]);
        callbacks.onDepthUpdates([enhancedData]); // Wrap in array for consistency
    });

    // Keep the original handlers as fallbacks in case the API has multiple event formats
    // Standard quote updates
    connection.on('QuoteUpdate', (quote: QuoteData) => {
        console.log(`Received quote update:`, quote);
        callbacks.onQuoteUpdates([quote]); // Wrap in array for consistency
    });

    // Batch quote updates
    connection.on('QuoteUpdates', (quotes: QuoteData[]) => {
        console.log(`Received batch quote updates, count:`, quotes.length);
        callbacks.onQuoteUpdates(quotes);
    });

    // Standard trade updates
    connection.on('TradeUpdate', (trade: MarketTradeData) => {
        console.log(`Received market trade update:`, trade);
        callbacks.onMarketTradeUpdates([trade]); // Wrap in array for consistency
    });

    // Batch trade updates
    connection.on('TradeUpdates', (trades: MarketTradeData[]) => {
        console.log(`Received batch market trade updates, count:`, trades.length);
        callbacks.onMarketTradeUpdates(trades);
    });

    // Standard depth update
    connection.on('DepthUpdate', (depth: MarketDepthUpdate) => {
        console.log(`Received market depth update:`, depth);
        callbacks.onDepthUpdates([depth]); // Wrap in array for consistency
    });

    // Batch depth updates
    connection.on('DepthUpdates', (depthUpdates: MarketDepthUpdate[]) => {
        console.log(`Received batch market depth updates, count:`, depthUpdates.length);
        callbacks.onDepthUpdates(depthUpdates);
    });    // Enhanced connection health check and diagnostics
    let pingInterval: number | null = null;
    let healthCheckInterval: number | null = null;
    let lastReceivedData = Date.now();

    connection.on('OnPong', () => {
        console.log('Received pong from TopstepX Market Hub');
        lastReceivedData = Date.now(); // Update last activity timestamp
    });

    // Monitor for any activity in the connection
    const updateLastReceived = () => {
        lastReceivedData = Date.now();
        console.log('Market Hub connection activity detected, updated timestamp');
    };

    // Track connection activity on all events
    connection.on('GatewayQuote', () => updateLastReceived());
    connection.on('GatewayTrade', () => updateLastReceived());
    connection.on('GatewayDepth', () => updateLastReceived());
    connection.on('QuoteUpdate', () => updateLastReceived());
    connection.on('QuoteUpdates', () => updateLastReceived());
    connection.on('TradeUpdate', () => updateLastReceived());
    connection.on('TradeUpdates', () => updateLastReceived());
    connection.on('DepthUpdate', () => updateLastReceived());
    connection.on('DepthUpdates', () => updateLastReceived());

    const startPingInterval = () => {
        if (pingInterval !== null) {
            clearInterval(pingInterval);
        }

        // Ping every 30 seconds to keep connection alive
        pingInterval = window.setInterval(() => {
            if (connection.state === 'Connected') {
                console.log('Pinging TopstepX Market Hub to keep connection alive');
                connection.invoke('Ping').catch(err => {
                    console.error('Error pinging TopstepX Market Hub:', err);
                });
            }
        }, 30000);

        // Also start health check interval
        startHealthCheckInterval();
    };

    const startHealthCheckInterval = () => {
        if (healthCheckInterval !== null) {
            clearInterval(healthCheckInterval);
        }

        // Check connection health every minute
        healthCheckInterval = window.setInterval(() => {
            if (connection.state === 'Connected') {
                const inactiveTime = Date.now() - lastReceivedData;
                console.log(`Market Hub diagnostics: Last activity ${inactiveTime / 1000}s ago, state: ${connection.state}`);

                // If no data received for more than 2 minutes, log a warning
                if (inactiveTime > 120000) {
                    console.warn(`Market Hub warning: No data received in ${inactiveTime / 1000}s, but connection appears Connected`);
                }
            }
        }, 60000);
    };

    const clearPingInterval = () => {
        if (pingInterval !== null) {
            clearInterval(pingInterval);
            pingInterval = null;
        }

        if (healthCheckInterval !== null) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
    };

    // Start ping immediately and when reconnected, clear on disconnection
    startPingInterval(); // Start immediately when handlers are set up
    connection.onreconnected(() => startPingInterval());
    connection.onclose(() => clearPingInterval());
};

// Market Hub Contract Subscription
export const subscribeToTopstepXMarketData = async (
    connection: HubConnection, 
    contractId: string
): Promise<void> => {
    if (!contractId || contractId.trim() === '') {
        throw new Error('Invalid contract ID: Contract ID cannot be empty');
    }

    // Format and validate the contract ID
    const formattedContractId = formatTopstepXContractId(contractId);

    // Check connection exists and is in connected state
    if (!connection) {
        throw new Error('Cannot subscribe to market data: Connection object is null');
    }

    if (connection.state !== 'Connected') {
        throw new Error(`Cannot subscribe to market data: Connection is in ${connection.state} state, not Connected`);
    }

    try {
        // Subscribe to the different data types for this contract
        console.log(`Subscribing to contract ${formattedContractId} data streams...`);
        console.log(`Current connection state: ${connection.state}`);
        console.log(`Connection ID: ${connection.connectionId || 'unknown'}`);

        // Track if at least one subscription succeeds
        let hasSuccessfulSubscription = false;

        // Add a timeout promise to prevent hanging
        const timeout = (ms: number) => new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
        );

        // Subscribe to quotes with error handling and timeout
        try {
            console.log(`Invoking SubscribeContractQuotes for ${formattedContractId}...`);

            // Use Promise.race to add a timeout
            await Promise.race([
                connection.invoke('SubscribeContractQuotes', formattedContractId),
                timeout(10000) // 10 second timeout for subscription
            ]);

            console.log(`Successfully subscribed to quotes for contract ${formattedContractId}`);
            hasSuccessfulSubscription = true;
        } catch (quoteError) {
            console.error(`Error subscribing to quotes for contract ${formattedContractId}:`, quoteError);
            // Don't fail completely, try other subscriptions
        }

        // Attempt to subscribe to trades with timeout
        try {
            console.log(`Invoking SubscribeContractTrades for ${formattedContractId}...`);

            await Promise.race([
                connection.invoke('SubscribeContractTrades', formattedContractId),
                timeout(10000) // 10 second timeout
            ]);

            console.log(`Successfully subscribed to trades for contract ${formattedContractId}`);
            hasSuccessfulSubscription = true;
        } catch (tradeError) {
            console.error(`Error subscribing to trades for contract ${formattedContractId}:`, tradeError);
        }

        // Silently check if depth subscription is available (don't log errors)
        try {
            console.log(`Checking if SubscribeContractDepth is available for ${formattedContractId}...`);

            // First, check if the server supports the method by trying with a short timeout
            const supportsDepth = await Promise.race([
                connection.invoke('SubscribeContractDepth', formattedContractId),
                timeout(5000) // Shorter timeout for checking
            ]).then(() => true).catch(() => false);

            if (supportsDepth) {
                console.log(`Successfully subscribed to depth for contract ${formattedContractId}`);
                hasSuccessfulSubscription = true;
            } else {
                console.log(`SubscribeContractDepth not available for ${formattedContractId} - skipping depth subscription`);
            }
        } catch (depthError) {
            // Silently handle depth subscription errors, just log a debug message
            console.log(`Depth subscription not available for ${formattedContractId}`);
        }

        if (!hasSuccessfulSubscription) {
            console.warn(`No subscriptions succeeded for contract ${formattedContractId}. Will attempt fallback.`);

            // Fallback to a simple subscription if all others failed
            try {
                await Promise.race([
                    connection.invoke('SubscribeContract', formattedContractId),
                    timeout(10000) // 10 second timeout
                ]);
                console.log(`Successfully subscribed to contract ${formattedContractId} with fallback method`);
                hasSuccessfulSubscription = true;
            } catch (fallbackError) {
                console.error(`Fallback subscription also failed for ${formattedContractId}:`, fallbackError);
                throw new Error(`Failed to subscribe to any data streams for contract ${formattedContractId}`);
            }
        }

        return;

    } catch (err) {
        console.error(`Error subscribing to market data for contract ${formattedContractId}:`, err);
        throw err;
    }
};

// Market Hub Contract Unsubscription
export const unsubscribeFromTopstepXMarketData = async (
    connection: HubConnection, 
    contractId: string
): Promise<void> => {
    if (!connection) {
        throw new Error('Cannot unsubscribe: Connection object is null');
    }

    if (connection.state !== 'Connected') {
        console.warn(`Unsubscribe attempted while connection is in ${connection.state} state`);
        // Don't throw error on unsubscribe - it's fine if we're already disconnected
        return;
    }

    if (!contractId || contractId.trim() === '') {
        console.warn('Unsubscribe called with empty contract ID, ignoring');
        return;
    }

    // Format and validate the contract ID
    const formattedContractId = formatTopstepXContractId(contractId);

    try {
        console.log(`Unsubscribing from contract ${formattedContractId} data streams...`);

        // Add a timeout promise to prevent hanging
        const timeout = (ms: number) => new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Unsubscribe operation timed out after ${ms}ms`)), ms)
        );

        // Track success of each unsubscribe operation
        let unsubscribeSucceeded = false;

        // Try to unsubscribe from quotes
        try {
            await Promise.race([
                connection.invoke('UnsubscribeContractQuotes', formattedContractId),
                timeout(5000) // 5 second timeout
            ]);
            console.log(`Successfully unsubscribed from quotes for ${formattedContractId}`);
            unsubscribeSucceeded = true;
        } catch (err) {
            console.warn(`Error unsubscribing from quotes for ${formattedContractId}`);
            // Continue with other unsubscribes
        }

        // Try to unsubscribe from trades
        try {
            await Promise.race([
                connection.invoke('UnsubscribeContractTrades', formattedContractId),
                timeout(5000) // 5 second timeout
            ]);
            console.log(`Successfully unsubscribed from trades for ${formattedContractId}`);
            unsubscribeSucceeded = true;
        } catch (err) {
            console.warn(`Error unsubscribing from trades for ${formattedContractId}`);
            // Continue with other unsubscribes
        }

        // Silently check if depth unsubscription is available
        try {
            // Check if the server supports the method first
            const supportsDepth = await Promise.race([
                connection.invoke('UnsubscribeContractDepth', formattedContractId),
                timeout(3000) // Shorter timeout for checking
            ]).then(() => true).catch(() => false);

            if (supportsDepth) {
                console.log(`Successfully unsubscribed from depth for ${formattedContractId}`);
                unsubscribeSucceeded = true;
            } else {
                console.log(`UnsubscribeContractDepth not available for ${formattedContractId} - skipping`);
            }
        } catch (err) {
            // Silently ignore depth unsubscription errors
            console.log(`Depth unsubscription not available for ${formattedContractId}`);
        }

        // Fallback if none succeeded
        if (!unsubscribeSucceeded) {
            try {
                await Promise.race([
                    connection.invoke('UnsubscribeContract', formattedContractId),
                    timeout(5000) // 5 second timeout
                ]);
                console.log(`Successfully unsubscribed from contract ${formattedContractId} with fallback method`);
                unsubscribeSucceeded = true;
            } catch (err) {
                console.warn(`Fallback unsubscribe also failed for ${formattedContractId}`);
                // We'll consider unsubscribe completed even if all methods failed
                // The connection might be in a bad state, but we don't want to block the UI
            }
        }

        return;

    } catch (err) {
        console.error(`Error unsubscribing from market data for contract ${formattedContractId}:`, err);
        // Don't throw error - we want unsubscribe to be "best effort"
    }
};

// WebSocket Connection Status Check
export const checkTopstepXWebSocketState = (connection: HubConnection | null): {
    isConnected: boolean;
    status: string;
} => {
    if (!connection) {
        return { isConnected: false, status: 'No connection established' };
    }

    switch (connection.state) {
        case 'Connected':
            return { isConnected: true, status: 'Connected' };
        case 'Connecting':
            return { isConnected: false, status: 'Connecting...' };
        case 'Disconnected':
            return { isConnected: false, status: 'Disconnected' };
        case 'Disconnecting':
            return { isConnected: false, status: 'Disconnecting...' };
        case 'Reconnecting':
            return { isConnected: false, status: 'Reconnecting...' };
        default:
            return { isConnected: false, status: 'Unknown state' };
    }
};

// Historical Data API Integration
/**
 * Fetches historical market data for TopStepX via ProjectX API
 * Note: TopStepX API access is provided through ProjectX infrastructure
 * @param token Auth token from ProjectX (required for TopStepX access)
 * @param request Historical data request parameters
 * @returns Promise with historical data response
 */
export const fetchTopstepXHistoricalData = async (
    token: string,
    request: HistoricalDataRequest
): Promise<HistoricalDataResponse> => {
    if (!token) {
        throw new Error('Authentication token is required for historical data access');
    }

    if (!request.contractId) {
        throw new Error('Contract ID is required for historical data');
    }

    // Ensure we have start and end dates
    if (!request.startDate || !request.endDate) {
        throw new Error('Start and end dates are required for historical data');
    }

    console.log('🔍 TopStepX Historical Data Request (via ProjectX API):', {
        contractId: request.contractId,
        interval: request.interval,
        startDate: request.startDate,
        endDate: request.endDate,
        note: 'Using ProjectX API infrastructure for TopStepX data access'
    });

    try {
        // Since TopStepX uses ProjectX infrastructure, we'll use ProjectX API endpoints
        // Map the interval to ProjectX unit and unitNumber format
        let unit = 4; // Default to Day
        let unitNumber = 1;

        if (request.interval) {
            const intervalMatch = request.interval.match(/^(\d+)([smhdwM])$/);
            if (intervalMatch) {
                unitNumber = parseInt(intervalMatch[1], 10) || 1;

                switch (intervalMatch[2]) {
                    case 's':
                        unit = 1; // Second
                        break;
                    case 'm':
                        unit = 2; // Minute
                        break;
                    case 'h':
                        unit = 3; // Hour
                        break;
                    case 'd':
                        unit = 4; // Day
                        break;
                    case 'w':
                        unit = 5; // Week
                        break;
                    case 'M':
                        unit = 6; // Month
                        break;
                    default:
                        unit = 4; // Default to Day
                        unitNumber = 1;
                }
            }
        }

        // Use ProjectX API format for historical data
        const projectXRequest = {
            contractId: request.contractId,
            live: false, // Historical data is not live
            startTime: request.startDate,
            endTime: request.endDate,
            unit,
            unitNumber,
            includePartialBar: true,
            limit: 1000 // Reasonable default
        };

        console.log('📡 Making ProjectX API request for TopStepX historical data:', {
            url: `${PROJECTX_API_BASE_URL}/history/retrieveBars`,
            contractId: request.contractId,
            unit,
            unitNumber,
            timeRange: `${request.startDate} to ${request.endDate}`
        });

        // Make the API request to ProjectX
        const response = await fetch(`${PROJECTX_API_BASE_URL}/history/retrieveBars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(projectXRequest)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ProjectX API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                endpoint: '/history/retrieveBars'
            });

            // Provide helpful error messages based on status code
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            if (response.status === 401) {
                errorMessage = 'Authentication failed. Please check your ProjectX API token and account linking.';
            } else if (response.status === 403) {
                errorMessage = 'Access forbidden. Ensure your TopStepX account is linked to ProjectX and you have API subscription.';
            } else if (response.status === 404) {
                errorMessage = 'Historical data endpoint not found. Please verify your ProjectX API configuration.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            }

            return {
                contractId: request.contractId,
                interval: request.interval || '1d',
                bars: [],
                success: false,
                errorCode: response.status,
                errorMessage
            };
        }

        const data = await response.json();
        console.log('✅ ProjectX API Response received:', {
            success: data.success,
            barsCount: data.bars?.length || 0,
            contractId: request.contractId
        });

        if (!data.success) {
            // Provide more detailed error information
            let errorMessage = data.errorMessage || 'Failed to retrieve historical data';

            // Add additional context if we have more information
            if (data.errorCode) {
                errorMessage += ` (Error code: ${data.errorCode})`;
            }

            // Check if we have any data about the request that might help diagnose the issue
            if (data.bars && data.bars.length === 0) {
                errorMessage += ' - No data available for the specified time range';
            }

            console.warn('Historical data request unsuccessful:', {
                contractId: request.contractId,
                errorCode: data.errorCode,
                errorMessage: data.errorMessage,
                dataReceived: data
            });

            return {
                contractId: request.contractId,
                interval: request.interval || '1d',
                bars: [],
                success: false,
                errorCode: data.errorCode || 500,
                errorMessage
            };
        }

        // Convert ProjectX bar format to our Historical Bar format
        const historicalBars: HistoricalBar[] = (data.bars || []).map((bar: any) => ({
            timestamp: bar.t,
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v
        }));

        console.log('📊 Historical data processed successfully:', {
            contractId: request.contractId,
            barsCount: historicalBars.length,
            interval: request.interval,
            dateRange: historicalBars.length > 0 ? {
                first: historicalBars[0].timestamp,
                last: historicalBars[historicalBars.length - 1].timestamp
            } : null
        });

        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: historicalBars,
            success: true
        };

    } catch (error) {
        console.error('💥 Error fetching TopStepX historical data via ProjectX API:', error);

        // Create a more detailed error message with troubleshooting information
        let errorMessage = error instanceof Error ? error.message : String(error);

        // Add troubleshooting suggestions based on the error
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
            errorMessage += ' - Please check your network connection and try again';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            errorMessage += ' - The request timed out, please try again or use a smaller date range';
        } else if (errorMessage.includes('token') || errorMessage.includes('authorization') || errorMessage.includes('Authentication')) {
            errorMessage += ' - Please check your authentication token or try logging in again';
        }

        // Log additional request details to help with debugging
        console.warn('Historical data request failed with exception:', {
            contractId: request.contractId,
            startDate: request.startDate,
            endDate: request.endDate,
            interval: request.interval,
            error: errorMessage
        });

        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 500,
            errorMessage
        };
    }
};

// Helper function to format contract ID for TopstepX API
export const formatTopstepXContractId = (contractId: string): string => {
    // Strip any whitespace
    const trimmed = contractId.trim();

    // If contains slashes, @ symbol, or dots (CON.F.US format), it's likely already formatted
    if (trimmed.includes('/') || trimmed.includes('@') || trimmed.includes('.')) {
        return trimmed;
    }

    // Otherwise, use default formatting (could be enhanced with specific rules)
    return trimmed;
};
