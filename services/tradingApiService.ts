import { 
    BrokerType, ProjectXLoginKeyRequest, ProjectXLoginAppRequest, AuthResponse, 
    AccountSearchResponse, RetrieveBarsRequest, RetrieveBarsResponse,
    ContractSearchResponse, OrderSearchResponse, PositionSearchResponse, TradeSearchResponse,
    PlaceOrderRequest, PlaceOrderResponse, CancelOrderRequest, ModifyOrderRequest,
    ClosePositionRequest, PartialClosePositionRequest, GenericSuccessResponse,
    HistoricalDataRequest, HistoricalDataResponse, HistoricalBar,
    AccountDetailsResponse, AccountBalanceResponse, AccountMarginResponse,
    RiskLimitsResponse, UpdateRiskLimitsRequest, PortfolioSummaryResponse,
    PortfolioPerformanceResponse, MarketQuoteResponse, MarketDepthResponse,
    MarketTradesResponse, OrderBookResponse, StrategiesResponse,
    CreateStrategyRequest, CreateStrategyResponse, UpdateStrategyRequest,
    AlertsResponse, CreateAlertRequest, CreateAlertResponse, UpdateAlertRequest,
    MarketNewsResponse, EconomicEventsResponse,
    // TopstepX Types
    TopstepXLoginApiKeyRequest, TopstepXLoginAppRequest, TopstepXValidateResponse, TopstepXLogoutResponse,
    TopstepXSearchContractResponse, TopstepXSearchContractByIdResponse, TopstepXRetrieveBarRequest, TopstepXRetrieveBarResponse,
    TopstepXPlaceOrderResponse, TopstepXCancelOrderResponse, TopstepXModifyOrderResponse, TopstepXOrderStatusEnum,
    TopstepXSearchPositionResponse, TopstepXClosePositionResponse, TopstepXPartialClosePositionResponse,
    TopstepXSearchHalfTradeResponse,
    // SignalR Types
    HubConnection, QuoteData, MarketTradeData, MarketDepthUpdate, HubConnectionStatus
} from '../types';
import { PROJECTX_API_BASE_URL } from '../constants.ts';
import { TOPSTEPX_API_BASE_URL, PROJECTX_MARKET_HUB_URL } from '../constants.tsx';
import { fetchTopstepXHistoricalData } from './topstepXService';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

const getApiBaseUrl = (broker: BrokerType): string => {
    if (broker === 'projectx') return PROJECTX_API_BASE_URL;
    if (broker === 'topstepx') return TOPSTEPX_API_BASE_URL;
    throw new Error('Invalid broker type specified');
};

async function makeApiRequest<T_Response, T_Request = any>(
    broker: BrokerType,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    body?: T_Request,
    token?: string | null, // This is for session token
    customHeaders?: Record<string, string> // New parameter for custom headers
): Promise<T_Response> {
    const baseUrl = getApiBaseUrl(broker);
    const url = `${baseUrl}${endpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Prefer JSON response
        ...customHeaders, // Spread custom headers here
    };

    if (token) { // This is for session token, not API key for initial auth
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🚀 API Request:', {
        url,
        method,
        headers,
        bodyLength: body ? JSON.stringify(body).length : 0,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
    });

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        console.log('📡 API Response:', {
            url,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                url
            });

            // Try to parse error as JSON first, then fall back to text
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { errorMessage: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }

            // Return a structured error response
            return {
                success: false,
                errorCode: response.status,
                errorMessage: errorData.errorMessage || errorData.message || errorText || `HTTP ${response.status}: ${response.statusText}`,
                token: null
            } as T_Response;
        }

        const responseText = await response.text();
        console.log('📨 API Response Text:', {
            url,
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
        });

        // The TopStepX doc for /api/Auth/loginKey mentions 'accept: text/plain' but returns JSON.
        // Robustly parse, assuming it's likely JSON.
        try {
            const responseData: T_Response = JSON.parse(responseText);
            console.log('✅ Parsed JSON Response:', {
                url,
                success: (responseData as any).success,
                hasToken: !!(responseData as any).token,
                tokenLength: (responseData as any).token?.length || 0
            });
            return responseData;
        } catch (e) {
            console.error("❌ Failed to parse JSON response:", {
                url,
                responseText,
                parseError: e instanceof Error ? e.message : String(e)
            });

            // Return a structured error response for parse failures
            return {
                success: false,
                errorCode: 1000,
                errorMessage: "Invalid JSON response from server: " + responseText,
                token: null
            } as T_Response;
        }

    } catch (error) {
        console.error(`💥 API request to ${url} encountered an error:`, error);

        // Return a structured error response for network/other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            errorCode: 1001,
            errorMessage: `Network error: ${errorMessage}`,
            token: null
        } as T_Response;
    }
}

// --- Authentication ---
export const projectXLoginKey = (payload: ProjectXLoginKeyRequest): Promise<AuthResponse> => {
    console.log('🔐 ProjectX LoginKey Request:', {
        endpoint: '/Auth/loginKey',
        payload: {
            userName: payload.userName,
            hasApiKey: !!payload.apiKey,
            apiKeyLength: payload.apiKey?.length || 0
        }
    });

    return makeApiRequest<AuthResponse, ProjectXLoginKeyRequest>('projectx', '/Auth/loginKey', 'POST', payload);
};

export const projectXLoginApp = (payload: ProjectXLoginAppRequest): Promise<AuthResponse> => {
    console.log('🔐 ProjectX LoginApp Request:', {
        endpoint: '/Auth/loginApp',
        payload: {
            userName: payload.userName,
            hasPassword: !!payload.password,
            deviceId: payload.deviceId || 'not provided',
            appId: payload.appId,
            hasVerifyKey: !!payload.verifyKey
        }
    });

    return makeApiRequest<AuthResponse, ProjectXLoginAppRequest>('projectx', '/Auth/loginApp', 'POST', payload);
};

// --- TopstepX Authentication Functions ---
export const topstepXLoginApiKey = (payload: TopstepXLoginApiKeyRequest): Promise<AuthResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<AuthResponse, TopstepXLoginApiKeyRequest>(
        'topstepx', 
        '/api/Auth/loginKey', 
        'POST', 
        payload,
        null,
        customHeaders
    );
};

export const topstepXLoginApp = (payload: TopstepXLoginAppRequest): Promise<AuthResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<AuthResponse, TopstepXLoginAppRequest>(
        'topstepx', 
        '/api/Auth/loginApp', 
        'POST', 
        payload,
        null,
        customHeaders
    );
};

export const topstepXValidateSession = async (token: string): Promise<TopstepXValidateResponse> => {
    // TopstepX API doesn't have a dedicated /api/Auth/validate endpoint
    // Use account search as the primary validation method
    console.log('🔍 TopstepX session validation using account search method...');
    return topstepXValidateSessionAlt(token);
};

// Alternative validation using account search (more reliable)
export const topstepXValidateSessionAlt = async (token: string): Promise<TopstepXValidateResponse> => {
    try {
        console.log('🔍 Attempting alternative session validation via account search...');

        // Try to search for accounts - if this works, session is valid
        const accountResponse = await makeApiRequest<AccountSearchResponse>(
            'topstepx',
            '/api/Account/search',
            'POST',
            { onlyActiveAccounts: true },
            token,
            { 'Accept': 'application/json' }
        );

        console.log('✅ Alternative validation successful via account search');

        return {
            success: true,
            errorCode: 0,
            errorMessage: null,
            isValid: true,
            userInfo: {
                userId: 'validated-alt',
                userName: 'User',
                accountIds: accountResponse.accounts?.map(acc => acc.id.toString()) || []
            }
        };
    } catch (error) {
        console.log('❌ Alternative validation failed:', error);

        return {
            success: false,
            errorCode: 1009, // INVALID_SESSION
            errorMessage: error instanceof Error ? error.message : 'Session validation failed',
            isValid: false
        };
    }
};

export const topstepXLogout = (token: string): Promise<TopstepXLogoutResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXLogoutResponse>(
        'topstepx', 
        '/api/Auth/logout', 
        'POST', 
        {},
        token,
        customHeaders
    );
};

// --- Account ---
export const searchAccounts = (broker: BrokerType, token: string, params: { onlyActiveAccounts: boolean }): Promise<AccountSearchResponse> => {
    // For api.topstepx.com (now used by 'topstepx' broker type), the endpoint is /api/Account/search
    // For projectx (gateway-api-demo.s2f.projectx.com), the endpoint is /account/search
    const endpoint = broker === 'topstepx' ? '/api/Account/search' : '/account/search';

    // TopstepX API sometimes expects text/plain accept header based on their documentation
    const customHeaders = broker === 'topstepx' ? { 'Accept': 'text/plain' } : undefined;

    console.log('📣 searchAccounts call:', {
        broker,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        params,
        endpoint,
        customHeaders
    });

    return makeApiRequest<AccountSearchResponse> (broker, endpoint, 'POST', params, token, customHeaders);
};

// --- Contract ---
export const searchContracts = async (
    broker: BrokerType, 
    token: string, 
    params: { 
        searchText: string,
        live?: boolean,
        productType?: number,
        exchange?: string,
        symbolRoot?: string,
        contractGroup?: string,
        contractName?: string,
        limit?: number,          // NEW – paging support
        offset?: number          // NEW – paging support
    }
): Promise<ContractSearchResponse> => {
    // Different endpoints for different brokers - TopStepX uses capital C based on Swagger docs
    const endpoint = broker === 'topstepx' ? '/api/Contract/search' : '/contract/search';

    /* -----------------------------------------------
       1. Build request body with sensible defaults
    ------------------------------------------------*/
    let requestBody: any;
    if (broker === 'topstepx') {
        // TopstepX uses simple structure - sanitize and only include valid fields
        requestBody = {
            searchText: params.searchText,
            live: typeof params.live === 'boolean' ? params.live : false
        };

        // Only add optional fields if they are non-empty and of correct type
        if (typeof params.productType === 'number') requestBody.productType = params.productType;
        if (params.exchange && params.exchange.trim() !== '') requestBody.exchange = params.exchange.trim();
        if (params.symbolRoot && params.symbolRoot.trim() !== '') requestBody.symbolRoot = params.symbolRoot.trim();
        if (params.contractGroup && params.contractGroup.trim() !== '') requestBody.contractGroup = params.contractGroup.trim();
        if (params.contractName && params.contractName.trim() !== '') requestBody.contractName = params.contractName.trim();

        // Debug logging for TopStepX
        console.log('🔍 [TopStepX ContractSearch] Outgoing request:', {
            endpoint,
            method: 'POST',
            headers: { 'Accept': 'text/plain', 'Content-Type': 'application/json' },
            body: requestBody,
            searchText: params.searchText,
            live: requestBody.live
        });
    } else {
        // ProjectX wrapper remains unchanged – but include paging for consistency
        requestBody = {
            request: {
                searchText: params.searchText,
                live: params.live ?? true,
                productType: params.productType,
                exchange: params.exchange,
                symbolRoot: params.symbolRoot,
                contractGroup: params.contractGroup,
                contractName: params.contractName,
                limit: params.limit ?? 100,
                offset: params.offset ?? 0
            }
        };
    }

    /* -----------------------------------------------
       2. Primary request
    ------------------------------------------------*/
    try {
        // Use text/plain accept header for TopstepX (from working example)
        const customHeaders = broker === 'topstepx' ? { 'Accept': 'text/plain' } : undefined;
        const response = await makeApiRequest<ContractSearchResponse>(broker, endpoint, 'POST', requestBody, token, customHeaders);

        console.log('📥 [ContractSearch] API Response:', {
            broker,
            success: response.success,
            contractCount: response.contracts?.length || 0,
            errorCode: response.errorCode,
            errorMessage: response.errorMessage,
            firstContract: response.contracts?.[0]?.name || 'none'
        });

        if (response.success && response.contracts && response.contracts.length > 0) {
            return response;
        }

        // ---------- 3a. Exact-ID fallback ----------
        if (broker === 'topstepx') {
            try {
                const idFallback = await searchContractById(
                    broker,
                    token,
                    { contractId: params.searchText, includeDefinition: false }
                );
                if (idFallback.success && idFallback.contracts && idFallback.contracts.length > 0) {
                    return idFallback;
                }
            } catch (idErr) {
                console.warn('Exact-ID fallback failed', idErr);
            }
        }

        // ---------- 3b. Wildcard fallback ----------
        if (broker === 'topstepx' && params.searchText !== '*') {
            try {
                const wildcardParams = { ...params, searchText: '*' } as typeof params;
                const wildcardResponse = await topstepXSearchContracts(token, wildcardParams);
                if (wildcardResponse.success && wildcardResponse.contracts && wildcardResponse.contracts.length > 0) {
                    return {
                        contracts: wildcardResponse.contracts.map(c => ({
                            // basic field mapping – keep it minimal
                            id: c.id,
                            name: c.name,
                            description: c.description,
                            tickSize: c.tickSize,
                            tickValue: c.tickValue,
                            activeContract: c.activeContract,
                            productType: c.productType,
                            exchange: c.exchange,
                            symbolRoot: c.symbolRoot,
                            contractGroup: c.contractGroup,
                            minPrice: c.minPrice,
                            maxPrice: c.maxPrice,
                            pointValue: c.pointValue,
                            expirationDate: c.expirationDate,
                            definition: c.definition
                        })),
                        success: true,
                        errorCode: 0,
                        errorMessage: null
                    };
                }
            } catch (wcErr) {
                console.warn('Wildcard fallback failed', wcErr);
            }
        }

        // Nothing worked yet – FINAL fallback: simplified TopstepX payload (root-level only)
        if (broker === 'topstepx') {
            try {
                const simpleBody = {
                    searchText: params.searchText,
                    live: params.live ?? false // Match user example
                };
                const simpleResp = await makeApiRequest<ContractSearchResponse>(
                    broker, 
                    endpoint, 
                    'POST', 
                    simpleBody, 
                    token, 
                    { 'Accept': 'text/plain' }
                );
                if (simpleResp.success && simpleResp.contracts && simpleResp.contracts.length > 0) {
                    return simpleResp;
                }
            } catch (simpleErr) {
                console.warn('Simple-body fallback failed', simpleErr);
            }
        }

        // Nothing worked – return original response (likely empty contracts)
        return response;
    } catch (error) {
        console.error('Contract search error:', { error, broker, endpoint, params });
        throw error;
    }
};

export const searchContractById = (
    broker: BrokerType, 
    token: string, 
    params: { 
        contractId: string,
        includeDefinition?: boolean // When true, includes full contract definition
    }
): Promise<ContractSearchResponse> => { 
    const endpoint = broker === 'topstepx' ? '/api/Contract/searchById' : '/contract/searchById';
    return makeApiRequest<ContractSearchResponse>(broker, endpoint, 'POST', params, token);
};

// --- TopstepX Contract Management Functions ---
export const topstepXSearchContracts = async (
    token: string, 
    params: { 
        searchText: string,
        live?: boolean,
        productType?: number,
        exchange?: string,
        symbolRoot?: string,
        contractGroup?: string,
        contractName?: string,
        limit?: number,
        offset?: number
    }
): Promise<TopstepXSearchContractResponse> => {
    // Use simple structure matching working PowerShell example - sanitize fields
    const requestBody = {
        searchText: params.searchText,
        live: typeof params.live === 'boolean' ? params.live : false
    };

    // Add optional filters only if they are non-empty and valid
    if (typeof params.productType === 'number') requestBody.productType = params.productType;
    if (params.exchange && params.exchange.trim() !== '') requestBody.exchange = params.exchange.trim();
    if (params.symbolRoot && params.symbolRoot.trim() !== '') requestBody.symbolRoot = params.symbolRoot.trim();
    if (params.contractGroup && params.contractGroup.trim() !== '') requestBody.contractGroup = params.contractGroup.trim();
    if (params.contractName && params.contractName.trim() !== '') requestBody.contractName = params.contractName.trim();
    if (typeof params.limit === 'number') requestBody.limit = params.limit;
    if (typeof params.offset === 'number') requestBody.offset = params.offset;

    console.log('🔍 [TopstepXSearchContracts] Direct call:', {
        endpoint: '/api/Contract/search',
        body: requestBody
    });

    try {
        const response = await makeApiRequest<TopstepXSearchContractResponse>(
            'topstepx', 
            '/api/Contract/search', 
            'POST', 
            requestBody, 
            token,
            { 'Accept': 'text/plain' } // Match working example headers
        );
        return response;
    } catch (error) {
        console.error('TopstepX contract search error:', error);
        throw error;
    }
};

export const topstepXSearchContractById = (
    token: string, 
    params: { 
        contractId: string,
        includeDefinition?: boolean
    }
): Promise<TopstepXSearchContractByIdResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXSearchContractByIdResponse>(
        'topstepx', 
        '/api/Contract/searchById', 
        'POST', 
        params, 
        token,
        customHeaders
    );
};

// --- Order ---
export const placeOrder = (
    broker: BrokerType, 
    token: string, 
    payload: PlaceOrderRequest
): Promise<PlaceOrderResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Order/place' : '/order/place';

    console.log('📤 [PlaceOrder] Request:', {
        broker,
        endpoint,
        payload: {
            accountId: payload.accountId,
            contractId: payload.contractId,
            side: payload.side,
            size: payload.size,
            orderType: payload.orderType,
            price: payload.price
        }
    });

    return makeApiRequest<PlaceOrderResponse, PlaceOrderRequest>(broker, endpoint, 'POST', payload, token);
};

export const searchOrders = (
    broker: BrokerType, 
    token: string, 
    params: { 
        accountId: string | number, 
        startTimestamp?: string, 
        endTimestamp?: string,
        contractId?: string,
        status?: number,
        type?: number,
        side?: number,
        limit?: number,
        offset?: number
    }
): Promise<OrderSearchResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Order/search' : '/order/search';
    return makeApiRequest<OrderSearchResponse>(broker, endpoint, 'POST', params, token);
};

export const searchOpenOrders = (
    broker: BrokerType, 
    token: string, 
    params: { 
        accountId: string | number,
        contractId?: string 
    }
): Promise<OrderSearchResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Order/searchOpen' : '/order/searchOpen';
    return makeApiRequest<OrderSearchResponse>(broker, endpoint, 'POST', params, token);
};

export const cancelOrder = (
    broker: BrokerType, 
    token: string, 
    payload: CancelOrderRequest
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Order/cancel' : '/order/cancel';
    return makeApiRequest<GenericSuccessResponse, CancelOrderRequest>(broker, endpoint, 'POST', payload, token);
};

export const modifyOrder = (
    broker: BrokerType, 
    token: string, 
    payload: ModifyOrderRequest
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Order/modify' : '/order/modify';
    return makeApiRequest<GenericSuccessResponse, ModifyOrderRequest>(broker, endpoint, 'POST', payload, token);
};

// --- TopstepX Order Management Functions ---
export const topstepXPlaceOrder = (
    token: string, 
    payload: PlaceOrderRequest
): Promise<TopstepXPlaceOrderResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXPlaceOrderResponse, PlaceOrderRequest>(
        'topstepx', 
        '/api/Order/place', 
        'POST', 
        payload, 
        token,
        customHeaders
    );
};

export const topstepXCancelOrder = (
    token: string,
    request: CancelOrderRequest
): Promise<TopstepXCancelOrderResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXCancelOrderResponse, CancelOrderRequest>(
        'topstepx',
        '/api/Order/cancel',
        'POST',
        request,
        token,
        customHeaders
    );
};

export const topstepXModifyOrder = (
    token: string,
    request: ModifyOrderRequest
): Promise<TopstepXModifyOrderResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXModifyOrderResponse, ModifyOrderRequest>(
        'topstepx',
        '/api/Order/modify',
        'POST',
        request,
        token,
        customHeaders
    );
};

export const topstepXSearchOrders = (
    token: string, 
    params: { 
        accountId: string,
        startTimestamp?: string,
        endTimestamp?: string,
        orderId?: string,
        contractId?: string,
        status?: TopstepXOrderStatusEnum
    }
): Promise<OrderSearchResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<OrderSearchResponse>(
        'topstepx', 
        '/api/Order/search', 
        'POST', 
        params, 
        token,
        customHeaders
    );
};

// --- History / Bars ---
export const retrieveBars = (broker: BrokerType, token: string, payload: RetrieveBarsRequest): Promise<RetrieveBarsResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/History/GetBars' : '/history/retrieveBars'; // Updated to consistent endpoint
    return makeApiRequest<RetrieveBarsResponse, RetrieveBarsRequest>(broker, endpoint, 'POST', payload, token);
};

// --- TopstepX Historical Data Functions ---
export const topstepXRetrieveBars = (
    token: string,
    request: TopstepXRetrieveBarRequest
): Promise<TopstepXRetrieveBarResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXRetrieveBarResponse, TopstepXRetrieveBarRequest>(
        'topstepx',
        '/api/History/GetBars',
        'POST',
        request,
        token,
        customHeaders
    );
};

// --- Position ---
export const searchOpenPositions = (broker: BrokerType, token: string, params: { accountId: string | number }): Promise<PositionSearchResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Position/searchOpen' : '/position/searchOpen'; // Assuming similar pattern
    return makeApiRequest<PositionSearchResponse>(broker, endpoint, 'POST', params, token);
};

export const closePosition = (broker: BrokerType, token: string, payload: ClosePositionRequest): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Position/closeContract' : '/position/closeContract'; // Assuming similar pattern
    return makeApiRequest<GenericSuccessResponse, ClosePositionRequest>(broker, endpoint, 'POST', payload, token);
};

export const partialClosePosition = (broker: BrokerType, token: string, payload: PartialClosePositionRequest): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Position/partialCloseContract' : '/position/partialCloseContract'; // Assuming similar pattern
    return makeApiRequest<GenericSuccessResponse, PartialClosePositionRequest>(broker, endpoint, 'POST', payload, token);
};

// --- TopstepX Position Management Functions ---
export const topstepXSearchPositions = (
    token: string, 
    params: { 
        accountId: string,
        contractId?: string,
        includeClosedPositions?: boolean
    }
): Promise<TopstepXSearchPositionResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXSearchPositionResponse>(
        'topstepx', 
        '/api/Position/search', 
        'POST', 
        params, 
        token,
        customHeaders
    );
};

export const topstepXClosePosition = (
    token: string,
    request: ClosePositionRequest
): Promise<TopstepXClosePositionResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXClosePositionResponse, ClosePositionRequest>(
        'topstepx',
        '/api/Position/close',
        'POST',
        request,
        token,
        customHeaders
    );
};

export const topstepXPartialClosePosition = (
    token: string,
    request: PartialClosePositionRequest
): Promise<TopstepXPartialClosePositionResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXPartialClosePositionResponse, PartialClosePositionRequest>(
        'topstepx',
        '/api/Position/partialClose',
        'POST',
        request,
        token,
        customHeaders
    );
};

// --- Trade ---
export const searchTrades = (
    broker: BrokerType, 
    token: string, 
    params: { 
        accountId: string | number, 
        startTimestamp?: string, 
        endTimestamp?: string,
        contractId?: string,
        includeVoided?: boolean,
        orderId?: string | number,
        limit?: number,
        offset?: number
    }
): Promise<TradeSearchResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Trade/search' : '/trade/search';
    return makeApiRequest<TradeSearchResponse>(broker, endpoint, 'POST', params, token);
};

// --- TopstepX Trade History Functions ---
export const topstepXSearchHalfTrades = (
    token: string, 
    params: { 
        accountId: string,
        startTimestamp?: string,
        endTimestamp?: string,
        contractId?: string,
        orderId?: string
    }
): Promise<TopstepXSearchHalfTradeResponse> => {
    const customHeaders = { 'Accept': 'text/plain' };
    return makeApiRequest<TopstepXSearchHalfTradeResponse>(
        'topstepx', 
        '/api/Trade/search', 
        'POST', 
        params, 
        token,
        customHeaders
    );
};

// --- Account Management ---
export const getAccountDetails = (
    broker: BrokerType, 
    token: string, 
    accountId: string | number 
): Promise<AccountDetailsResponse> => {
    const endpoint = broker === 'topstepx' 
        ? '/api/Account/details' // Following TopStepX pattern: /api/Resource/action
        : '/account/details';        
    const method = 'POST'; // TopStepX uses POST for all endpoints
    const body = { accountId }; // accountId in request body
    return makeApiRequest<AccountDetailsResponse>(broker, endpoint, method, body, token);
};

export const getAccountBalance = (
    broker: BrokerType, 
    token: string, 
    accountId: string | number 
): Promise<AccountBalanceResponse> => {
    const endpoint = broker === 'topstepx' 
        ? '/api/Account/balance' // Following TopStepX pattern: /api/Resource/action
        : '/account/balance';               
    const method = 'POST'; // TopStepX uses POST for all endpoints
    const body = { accountId }; // accountId in request body
    return makeApiRequest<AccountBalanceResponse>(broker, endpoint, method, body, token);
};

export const getAccountMarginInfo = (
    broker: BrokerType, 
    token: string, 
    accountId: string | number 
): Promise<AccountMarginResponse> => {
    const endpoint = broker === 'topstepx' 
        ? '/api/Account/margin' // Following TopStepX pattern: /api/Resource/action
        : '/account/margin';                 
    const method = 'POST'; // TopStepX uses POST for all endpoints
    const body = { accountId }; // accountId in request body
    return makeApiRequest<AccountMarginResponse>(broker, endpoint, method, body, token);
};

// --- Risk Management ---
export const getRiskLimits = async (
    broker: BrokerType, 
    token: string, 
    params: { accountId: string | number }
): Promise<RiskLimitsResponse> => {
    // TopStepX doesn't provide risk management endpoints via API
    // Risk management is handled through the TopStepX platform interface
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX risk management is handled through the platform interface, not API');
        return {
            success: true,
            limits: {
                accountId: params.accountId.toString(),
                maxDailyLoss: 0,
                maxDrawdown: 0,
                maxPositionSize: 0,
                maxOrderSize: 0,
                maxOpenOrders: 0,
                maxOpenPositions: 0,
                allowedContracts: [],
                restrictedContracts: [],
                tradingHours: {
                    start: '09:00',
                    end: '16:00'
                },
                riskEnabled: false,
                platformManaged: true // Special flag to indicate platform-managed risk
            },
            errorCode: 0,
            errorMessage: null,
            platformNote: 'Risk management for TopStepX is configured through the platform interface. Features include Trailing Personal Daily Loss Limit, Trade Limits, Daily Risk Lock, Trade Clock, and Symbol Block settings.'
        };
    }

    // For ProjectX, try the original endpoints
    let endpoint: string;
    if (broker === 'projectx') {
        endpoint = '/risk/limits';
    } else {
        // This shouldn't be reached due to TopStepX handling above, but kept for safety
        endpoint = '/api/Risk/getLimits';
    }

    const attemptRequest = async (ep: string): Promise<RiskLimitsResponse> => {
        console.log(`Calling risk limits endpoint: ${getApiBaseUrl(broker)}${ep}`);
        return makeApiRequest<RiskLimitsResponse>(broker, ep, 'POST', params, token);
    };

    return attemptRequest(endpoint);
};

export const updateRiskLimits = async (
    broker: BrokerType, 
    token: string, 
    payload: UpdateRiskLimitsRequest
): Promise<GenericSuccessResponse> => {
    // TopStepX doesn't provide risk limit update endpoints via API
    // Risk management is handled through the TopStepX platform interface
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX risk limit updates must be done through the platform interface');
        return {
            success: false,
            errorCode: 1001,
            errorMessage: 'Risk limit updates for TopStepX must be configured through the platform interface. Go to Settings → Risk Settings in your TopStepX platform.'
        };
    }

    // For ProjectX, use the standard endpoint
    const endpoint = '/risk/updateLimits';
    return makeApiRequest<GenericSuccessResponse, UpdateRiskLimitsRequest>(broker, endpoint, 'POST', payload, token);
};

// --- Portfolio Management ---
export const getPortfolioSummary = (
    broker: BrokerType, 
    token: string, 
    accountId: string | number 
): Promise<PortfolioSummaryResponse> => {
    const endpoint = broker === 'topstepx' 
        ? '/api/Account/summary' // Following TopStepX pattern: /api/Resource/action
        : '/portfolio/summary';                
    const method = 'POST'; // TopStepX uses POST for all endpoints
    const body = { accountId }; // accountId in request body
    return makeApiRequest<PortfolioSummaryResponse>(broker, endpoint, method, body, token);
};

export const getPortfolioPerformance = (
    broker: BrokerType, 
    token: string, 
    params: { 
        accountId: string | number,
        startDate?: string,
        endDate?: string,
        period?: 'daily' | 'weekly' | 'monthly'
    }
): Promise<PortfolioPerformanceResponse> => {
    let endpoint: string;
    let method: 'GET' | 'POST';
    let body: any;

    if (broker === 'topstepx') {
        method = 'POST'; // TopStepX uses POST for all endpoints
        endpoint = '/api/Account/performance'; // Following TopStepX pattern: /api/Resource/action
        body = params; // All parameters in request body
    } else { // ProjectX
        method = 'POST';
        endpoint = '/portfolio/performance';
        body = params; 
    }

    return makeApiRequest<PortfolioPerformanceResponse>(broker, endpoint, method, body, token);
};

// --- Market Data ---
export const getMarketQuote = async (
    broker: BrokerType, 
    token: string, 
    params: { contractId: string }
): Promise<MarketQuoteResponse> => {
    // TopStepX doesn't provide dedicated market quote endpoints via direct API
    // Market data is available through WebSocket streams (handled by TradingContext)
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX market quotes are available through WebSocket streams and platform interface');

        // Return mock data for demonstration - in production this would come from WebSocket
        return {
            success: true,
            quote: {
                contractId: params.contractId,
                bid: 0,
                ask: 0,
                last: 0,
                volume: 0,
                high: 0,
                low: 0,
                open: 0,
                close: 0,
                change: 0,
                changePercent: 0,
                timestamp: new Date().toISOString()
            },
            errorCode: 0,
            errorMessage: 'Market quotes available through WebSocket streams. Please use real-time data feeds for live quotes.'
        };
    }

    // For ProjectX, use the standard endpoint
    const endpoint = '/market/quote';
    return makeApiRequest<MarketQuoteResponse>(broker, endpoint, 'POST', params, token);
};

export const getMarketDepth = async (
    broker: BrokerType, 
    token: string, 
    params: { contractId: string, levels?: number }
): Promise<MarketDepthResponse> => {
    // TopStepX doesn't provide dedicated market depth endpoints via direct API
    // Market depth is available through WebSocket streams and platform interface
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX market depth is available through WebSocket streams and platform interface');

        // Return mock data structure for demonstration
        return {
            success: true,
            depth: {
                contractId: params.contractId,
                bids: [],
                asks: [],
                timestamp: new Date().toISOString()
            },
            errorCode: 0,
            errorMessage: 'Market depth available through WebSocket streams. Use real-time data feeds for live order book data.'
        };
    }

    // For ProjectX, use the standard endpoint
    const endpoint = '/market/depth';
    return makeApiRequest<MarketDepthResponse>(broker, endpoint, 'POST', params, token);
};

export const getMarketTrades = async (
    broker: BrokerType, 
    token: string, 
    params: { 
        contractId: string,
        startTimestamp?: string,
        endTimestamp?: string,
        limit?: number
    }
): Promise<MarketTradesResponse> => {
    // TopStepX doesn't provide dedicated market trades endpoints via direct API
    // Recent trades are available through WebSocket streams and platform interface
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX market trades are available through WebSocket streams and platform interface');

        // Return mock data structure for demonstration
        return {
            success: true,
            trades: [],
            errorCode: 0,
            errorMessage: 'Market trades available through WebSocket streams. Use real-time data feeds for recent trade data.'
        };
    }

    // For ProjectX, use the standard endpoint
    const endpoint = '/market/trades';
    return makeApiRequest<MarketTradesResponse>(broker, endpoint, 'POST', params, token);
};

// --- Order Book Management ---
export const getOrderBook = async (
    broker: BrokerType, 
    token: string, 
    params: { contractId: string, depth?: number }
): Promise<OrderBookResponse> => {
    // TopStepX doesn't provide dedicated order book endpoints via direct API
    // Order book data is available through WebSocket streams and platform interface
    if (broker === 'topstepx') {
        console.log('ℹ️ TopStepX order book is available through WebSocket streams and platform interface');

        // Return mock data structure for demonstration
        return {
            success: true,
            orderBook: {
                contractId: params.contractId,
                bids: [],
                asks: [],
                spread: 0,
                timestamp: new Date().toISOString()
            },
            errorCode: 0,
            errorMessage: 'Order book data available through WebSocket streams and DOM. Use real-time data feeds for live order book.'
        };
    }

    // For ProjectX, use the standard endpoint
    const endpoint = '/market/orderBook';
    return makeApiRequest<OrderBookResponse>(broker, endpoint, 'POST', params, token);
};

// --- Strategy Management ---
export const getStrategies = (
    broker: BrokerType, 
    token: string, 
    params: { accountId: string | number }
): Promise<StrategiesResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Strategy/list' : '/strategy/list';
    return makeApiRequest<StrategiesResponse>(broker, endpoint, 'POST', params, token);
};

export const createStrategy = (
    broker: BrokerType, 
    token: string, 
    payload: CreateStrategyRequest
): Promise<CreateStrategyResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Strategy/create' : '/strategy/create';
    return makeApiRequest<CreateStrategyResponse, CreateStrategyRequest>(broker, endpoint, 'POST', payload, token);
};

export const updateStrategy = (
    broker: BrokerType, 
    token: string, 
    payload: UpdateStrategyRequest
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Strategy/update' : '/strategy/update';
    return makeApiRequest<GenericSuccessResponse, UpdateStrategyRequest>(broker, endpoint, 'POST', payload, token);
};

export const deleteStrategy = (
    broker: BrokerType, 
    token: string, 
    params: { strategyId: string | number }
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Strategy/delete' : '/strategy/delete';
    return makeApiRequest<GenericSuccessResponse>(broker, endpoint, 'POST', params, token);
};

// --- Alerts Management ---
export const getAlerts = (
    broker: BrokerType, 
    token: string, 
    params: { accountId: string | number, active?: boolean }
): Promise<AlertsResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Alert/list' : '/alert/list';
    return makeApiRequest<AlertsResponse>(broker, endpoint, 'POST', params, token);
};

export const createAlert = (
    broker: BrokerType, 
    token: string, 
    payload: CreateAlertRequest
): Promise<CreateAlertResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Alert/create' : '/alert/create';
    return makeApiRequest<CreateAlertResponse, CreateAlertRequest>(broker, endpoint, 'POST', payload, token);
};

export const updateAlert = (
    broker: BrokerType, 
    token: string, 
    payload: UpdateAlertRequest
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Alert/update' : '/alert/update';
    return makeApiRequest<GenericSuccessResponse, UpdateAlertRequest>(broker, endpoint, 'POST', payload, token);
};

export const deleteAlert = (
    broker: BrokerType, 
    token: string, 
    params: { alertId: string | number }
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Alert/delete' : '/alert/delete';
    return makeApiRequest<GenericSuccessResponse>(broker, endpoint, 'POST', params, token);
};

// --- News and Events ---
export const getMarketNews = (
    broker: BrokerType, 
    token: string, 
    params: { 
        symbols?: string[],
        startDate?: string,
        endDate?: string,
        limit?: number
    }
): Promise<MarketNewsResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/News/market' : '/news/market';
    return makeApiRequest<MarketNewsResponse>(broker, endpoint, 'POST', params, token);
};

export const getEconomicEvents = (
    broker: BrokerType, 
    token: string, 
    params: { 
        startDate?: string,
        endDate?: string,
        importance?: 'low' | 'medium' | 'high'
    }
): Promise<EconomicEventsResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/News/events' : '/news/events';
    return makeApiRequest<EconomicEventsResponse>(broker, endpoint, 'POST', params, token);
};

// --- Session Management ---
export const refreshSession = (
    broker: BrokerType, 
    token: string
): Promise<AuthResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Auth/refresh' : '/auth/refresh';
    return makeApiRequest<AuthResponse>(broker, endpoint, 'POST', {}, token);
};

export const logout = (
    broker: BrokerType, 
    token: string
): Promise<GenericSuccessResponse> => {
    const endpoint = broker === 'topstepx' ? '/api/Auth/logout' : '/auth/logout';
    return makeApiRequest<GenericSuccessResponse>(broker, endpoint, 'POST', {}, token);
};

// --- TopstepX Historical Data ---
/**
 * Fetch historical data for a contract from TopstepX
 * @param token Valid session token
 * @param request Historical data request parameters
 * @returns Promise with historical data response
 */
export const getTopstepXHistoricalData = async (
    token: string,
    request: HistoricalDataRequest
): Promise<HistoricalDataResponse> => {
    if (request.contractId.trim() === '') {
        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 400,
            errorMessage: 'Contract ID is required'
        };
    }

    return fetchTopstepXHistoricalData(token, request);
};

/**
 * Converts ProjectX-specific bar data to a common historical data format
 * @param token Valid session token 
 * @param request Bar retrieval request
 * @returns Historical data response
 */
export const getProjectXHistoricalData = async (
    token: string,
    request: HistoricalDataRequest
): Promise<HistoricalDataResponse> => {
    if (!request.contractId || request.contractId.trim() === '') {
        return {
            contractId: request.contractId || '',
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 400,
            errorMessage: 'Contract ID is required'
        };
    }

    if (!request.startDate || !request.endDate) {
        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 400,
            errorMessage: 'Start date and end date are required'
        };
    }

    try {
        // Map the interval to ProjectX unit and unitNumber
        let unit = 4; // Default to Day
        let unitNumber = 1;

        if (request.interval) {
            const intervalMatch = request.interval.match(/^(\d+)([mhdwM])$/);
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

        // Convert the request to ProjectX format
        const projectXRequest: RetrieveBarsRequest = {
            contractId: request.contractId,
            live: false, // Historical data is not live
            startTime: request.startDate,
            endTime: request.endDate,
            unit,
            unitNumber,
            includePartialBar: true,
            limit: 1000 // Reasonable default
        };

        // Call the standard ProjectX API
        const barsResponse = await retrieveBars('projectx', token, projectXRequest);

        if (!barsResponse.success) {
            return {
                contractId: request.contractId,
                interval: request.interval || '1d',
                bars: [],
                success: false,
                errorCode: barsResponse.errorCode,
                errorMessage: barsResponse.errorMessage || 'Failed to retrieve bars'
            };
        }

        // Convert ProjectX bar format to our Historical Bar format
        const historicalBars: HistoricalBar[] = barsResponse.bars.map(bar => ({
            timestamp: bar.t,
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v
        }));

        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: historicalBars,
            success: true
        };
    } catch (error) {
        console.error('Error fetching ProjectX historical data:', error);

        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 500,
            errorMessage: error instanceof Error ? error.message : String(error)
        };
    }
};

/**
 * Unified function to fetch historical data for a contract from any supported broker
 * @param broker The broker type (projectx or topstepx)
 * @param token Valid session token
 * @param request Historical data request parameters
 * @returns Promise with historical data response
 */
export const getHistoricalData = async (
    broker: BrokerType,
    token: string,
    request: HistoricalDataRequest
): Promise<HistoricalDataResponse> => {
    if (!token) {
        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 401,
            errorMessage: 'Authentication token is required'
        };
    }

    if (broker === 'topstepx') {
        return getTopstepXHistoricalData(token, request);
    } else if (broker === 'projectx') {
        return getProjectXHistoricalData(token, request);
    } else {
        return {
            contractId: request.contractId,
            interval: request.interval || '1d',
            bars: [],
            success: false,
            errorCode: 400,
            errorMessage: `Unsupported broker: ${broker}`
        };
    }
};

// --- ProjectX SignalR Service Functions ---

/**
 * ProjectX Market Hub Connection Management
 * Based on ProjectX Real Time API documentation
 */
export const buildProjectXMarketHubConnection = (token: string): HubConnection => {
    return new HubConnectionBuilder()
        .withUrl(PROJECTX_MARKET_HUB_URL, {
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets,
            accessTokenFactory: () => token,
            timeout: 10000
        })
        .withAutomaticReconnect()
        .build();
};

/**
 * Setup ProjectX Market Hub event handlers
 * Handles: GatewayQuote, GatewayTrade, GatewayDepth events
 */
export const setupProjectXMarketHubHandlers = (
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
            console.error('ProjectX Market Hub connection closed with error:', error);
            callbacks.onConnectionStatusChange('error', `Connection closed with error: ${error}`);
        } else {
            console.log('ProjectX Market Hub connection closed');
            callbacks.onConnectionStatusChange('disconnected', 'Connection closed');
        }
    });

    connection.onreconnecting((error) => {
        console.warn('ProjectX Market Hub reconnecting due to error:', error);
        callbacks.onConnectionStatusChange('connecting', `Reconnecting: ${error ? error.message : 'Connection lost'}`);
    });

    connection.onreconnected((connectionId) => {
        console.log(`ProjectX Market Hub reconnected with ID: ${connectionId}`);
        callbacks.onConnectionStatusChange('connected', `Reconnected with ID: ${connectionId}`);
    });

    // Setup ProjectX-specific event handlers
    connection.on('GatewayQuote', (contractId: string, data: QuoteData) => {
        console.log(`Received ProjectX gateway quote for ${contractId}:`, data);
        const enhancedData = { ...data, contractId };
        callbacks.onQuoteUpdates([enhancedData]);
    });

    connection.on('GatewayTrade', (contractId: string, data: MarketTradeData) => {
        console.log(`Received ProjectX gateway trade for ${contractId}:`, data);
        const enhancedData = { ...data, contractId };
        callbacks.onMarketTradeUpdates([enhancedData]);
    });

    connection.on('GatewayDepth', (contractId: string, data: MarketDepthUpdate) => {
        console.log(`Received ProjectX gateway depth for ${contractId}:`, data);
        const enhancedData = { ...data, contractId };
        callbacks.onDepthUpdates([enhancedData]);
    });
};

/**
 * Subscribe to ProjectX market data for a specific contract
 */
export const subscribeToProjectXMarketData = async (
    connection: HubConnection, 
    contractId: string
): Promise<void> => {
    console.log(`🔔 Subscribing to ProjectX market data for contract: ${contractId}`);

    try {
        await connection.invoke('SubscribeContractQuotes', contractId);
        await connection.invoke('SubscribeContractTrades', contractId);
        await connection.invoke('SubscribeContractMarketDepth', contractId);

        console.log(`✅ Successfully subscribed to ProjectX market data for ${contractId}`);
    } catch (error) {
        console.error(`❌ Error subscribing to ProjectX market data for ${contractId}:`, error);
        throw error;
    }
};

/**
 * Unsubscribe from ProjectX market data for a specific contract
 */
export const unsubscribeFromProjectXMarketData = async (
    connection: HubConnection, 
    contractId: string
): Promise<void> => {
    console.log(`🔕 Unsubscribing from ProjectX market data for contract: ${contractId}`);

    try {
        await connection.invoke('UnsubscribeContractQuotes', contractId);
        await connection.invoke('UnsubscribeContractTrades', contractId);
        await connection.invoke('UnsubscribeContractMarketDepth', contractId);

        console.log(`✅ Successfully unsubscribed from ProjectX market data for ${contractId}`);
    } catch (error) {
        console.error(`❌ Error unsubscribing from ProjectX market data for ${contractId}:`, error);
        throw error;
    }
};
