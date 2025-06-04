import { HubConnection } from '@microsoft/signalr';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
}

export interface Algorithm {
  id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquityDataPoint {
  date: string;
  value: number;
}

export interface BacktestMetric {
  name: string;
  value: string | number;
}

export interface BacktestResult {
  id: string;
  algorithmId: string;
  algorithmName: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalEquity: number;
  totalReturn: string;
  sharpeRatio: number;
  maxDrawdown: string;
  equityCurve: EquityDataPoint[];
  metrics: BacktestMetric[];
  logs: string[];
  trades: SimulatedTrade[];
  generatedAt: string;
}

export interface SimulatedTrade {
  id: string;
  timestamp: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  pnl?: number;
}

export interface Indicator {
  id: string;
  name: string;
  code: string;
  description: string;
}

export enum GeminiRequestStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface AppContextType {
  apiKeyStatus: 'checking' | 'valid' | 'invalid' | 'missing'; // Added 'invalid'
  checkApiKey: (key?: string) => Promise<void>; // Modified to accept an optional key and return Promise
  geminiApiKey?: string; // Added for storing the Gemini API key
  setGeminiApiKey: (key: string) => void; // Added for setting the Gemini API key
}

// Trading Platform Integration Types
export type BrokerType = 'projectx' | 'topstepx';
export type ProjectXAuthMode = 'loginKey' | 'loginApp';

export interface AuthResponse {
  token: string;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  // May include other fields like user details, expiry
}

export interface ProjectXLoginKeyRequest {
  userName: string;
  apiKey: string;
}

export interface ProjectXLoginAppRequest {
  userName: string;
  password?: string; // Optional based on image, but likely required
  deviceId?: string; // Optional based on image
  appId: string; // Typically fixed
  verifyKey?: string; // Optional based on image
}

export interface TradingAccount {
  id: number | string; // number for ProjectX, could be string for others
  name: string;
  balance?: number; // Example field
  currency?: string; // Example field
  canTrade?: boolean;
  isVisible?: boolean;
  // Other account-specific details
}

export interface AccountSearchResponse {
    accounts: TradingAccount[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export type HubConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'disconnecting';

// Market Data Stream Types
export interface QuoteData {
  contractId: string;
  timestamp: string;
  symbol?: string;
  lastPrice?: number;
  // Support both old and new field names
  bidPrice?: number;
  askPrice?: number;
  bestBid?: number;
  bestAsk?: number;
  bidSize?: number;
  askSize?: number;
  volume?: number;
  lastUpdated?: string;
}

export interface MarketTradeData {
  contractId: string;
  timestamp: string;
  price: number;
  size: number;
  side?: 'BUY' | 'SELL' | 'UNKNOWN'; // Optional, not always present in raw market trades
}

export interface DepthLevel {
  price: number;
  size: number;
}
export interface MarketDepthUpdate {
  contractId: string;
  timestamp: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
}


export interface TradingContextType {
  // State
  selectedBroker: BrokerType | null;
  projectXAuthMode: ProjectXAuthMode;
  projectXUsername: string;
  projectXApiKey: string;
  projectXPassword?: string;
  projectXDeviceId?: string;
  projectXAppId: string; // Defaulted or configurable
  projectXVerifyKey?: string;
  
  topstepXUsername: string; 
  topstepXApiKey: string;  

  sessionToken: string | null;
  sessionExpiry: Date | null;
  isAuthenticated: boolean;
  connectionStatusMessage: string | null;
  isLoading: boolean;
  
  userAccounts: TradingAccount[];
  selectedAccountId: string | number | null;

  // User Hub SignalR State
  userHubConnection: HubConnection | null;
  userHubStatus: HubConnectionStatus;
  userHubStatusMessage: string | null;
  
  liveAccountUpdates: TradingAccount[]; 
  liveOrderUpdates: Order[]; 
  livePositionUpdates: Position[];
  setLivePositionUpdates: (updater: Position[] | ((prev: Position[]) => Position[])) => void; 
  liveTradeUpdates: Trade[]; 

  // Market Hub SignalR State
  marketHubConnection: HubConnection | null;
  marketHubStatus: HubConnectionStatus;
  marketHubStatusMessage: string | null;
  marketStreamContractId: string | null; // Which contract is being streamed

  liveQuotes: QuoteData[];
  liveMarketTrades: MarketTradeData[];
  liveDepthUpdates: MarketDepthUpdate[];

  // Historical Data State
  historicalData: HistoricalDataResponse | null;
  isLoadingHistoricalData: boolean;
  historicalDataError: string | null;

  // Actions
  selectBroker: (broker: BrokerType | null) => void;
  setProjectXAuthMode: (mode: ProjectXAuthMode) => void;
  updateProjectXCredentials: (credentials: Partial<ProjectXLoginKeyRequest & ProjectXLoginAppRequest>) => void;
  updateTopstepXCredentials: (credentials: { username?: string, apiKey?: string }) => void;
  authenticateTopstepXDirect?: (token: string) => Promise<void>;
  
  connectToBroker: () => Promise<void>;
  disconnectFromBroker: () => void;
  
  fetchUserAccounts: (tokenToUse?: string, brokerToUse?: BrokerType) => Promise<void>;
  selectAccount: (accountId: string | number | null) => void;

  // User Hub SignalR Actions
  connectUserHub: () => Promise<void>;
  disconnectUserHub: () => Promise<void>;
  
  // Market Hub SignalR Actions
  connectMarketHub: () => Promise<void>;
  disconnectMarketHub: () => Promise<void>;
  subscribeToMarketData: (contractId: string) => Promise<void>;
  unsubscribeFromMarketData: () => Promise<void>;

  // Historical Data Actions
  fetchHistoricalData: (request: HistoricalDataRequest) => Promise<void>;
  clearHistoricalData: () => void;
  
  // Contract Management
  searchContracts: (
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
  ) => Promise<ContractSearchResponse>;
  
  searchContractById: (
    broker: BrokerType,
    contractId: string,
    includeDefinition?: boolean
  ) => Promise<ContractSearchResponse>;
  
  // Order Management Actions
  placeOrder: (order: PlaceOrderRequest) => Promise<{ success: boolean; orderId?: string | number; errorMessage?: string }>;
  cancelOrder: (orderId: string | number) => Promise<{ success: boolean; errorMessage?: string }>;
  modifyOrder: (request: ModifyOrderRequest) => Promise<{ success: boolean; errorMessage?: string }>;
  fetchOrders: (params?: { startTimestamp?: string; endTimestamp?: string }) => Promise<void>;
  fetchOpenOrders: () => Promise<void>;
  
  // Position Management Actions
  fetchOpenPositions: () => Promise<void>;
  closePosition: (contractId: string) => Promise<{ success: boolean; errorMessage?: string }>;
  partialClosePosition: (contractId: string, size: number) => Promise<{ success: boolean; errorMessage?: string }>;
  subscribeToPositionsAndQuotes: (contractId: string) => Promise<void>;
  
  // Trade Actions
  fetchTrades: (params?: { startTimestamp?: string; endTimestamp?: string; contractId?: string }) => Promise<void>;
}

// Placeholder for other trading-related types
export interface Contract {
  id: string;
  name: string;
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
  productType?: number; // 1=Future, 2=Option, 3=Spread
  exchange?: string;
  symbolRoot?: string;
  contractGroup?: string;
  minPrice?: number;
  maxPrice?: number;
  pointValue?: number;
  expirationDate?: string;
  strikePrice?: number;
  callPut?: number; // 0 for call, 1 for put (for options)
  deliveryType?: number;
  // Additional fields that may be present
  definition?: any; // Full contract definition when includeDefinition is true
}

export interface Order {
  id: number | string;
  accountId: number | string;
  contractId: string;
  type: number; // 1=Limit, 2=Market, 3=Stop, 4=StopLimit
  side: number; // 0=Buy, 1=Sell
  size: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  status: number; // 0=Pending, 1=Working, 2=Rejected, 3=Filled, 4=Canceled
  statusText?: string;
  creationTimestamp: string;
  updateTimestamp?: string | null;
  executionTimestamp?: string | null;
  closingTimestamp?: string | null;
  timeInForce?: number; // 0=Day, 1=GTC, 2=IOC, 3=FOK
  timeInForceDate?: string | null;
  filledSize?: number;
  averagePrice?: number | null;
  customTag?: string | null;
  linkedOrderId?: number | null;
  text?: string;
}

export interface Position {
    id: number | string;
    accountId: number | string;
    contractId: string;
    type: number; // 0=Short, 1=Long
    size: number;
    averagePrice: number;
    marketPrice?: number;
    creationTimestamp: string;
    updateTimestamp?: string;
    closingTimestamp?: string | null;
    profitAndLossPercent?: number; 
    profitAndLoss?: number;
    initialSize?: number;
    initialAveragePrice?: number;
    closingSize?: number;
    closingAveragePrice?: number;
}

export interface Trade {
    id: number | string;
    accountId: number | string;
    contractId: string;
    orderId: number | string;
    price: number;
    size: number;
    side: number; // 0=Buy, 1=Sell
    fees: number;
    profitAndLoss?: number | null;
    creationTimestamp: string;
    voided: boolean;
    previousPositionSize?: number;
    newPositionSize?: number;
    text?: string;
    originalPrice?: number;
    previousAveragePrice?: number;
    newAveragePrice?: number;
}

export interface Bar {
    t: string; // timestamp
    o: number; // open
    h: number; // high
    l: number; // low, PDF uses "I" but standard is "l"
    c: number; // close
    v: number; // volume
}

export interface RetrieveBarsRequest {
    contractId: string;
    live: boolean;
    startTime: string; // ISO datetime string
    endTime: string;   // ISO datetime string
    unit: number; // 1=Second, 2=Minute, 3=Hour, 4=Day, 5=Week, 6=Month
    unitNumber: number;
    limit?: number;
    includePartialBar: boolean;
}

export interface ContractSearchResponse {
    contracts: Contract[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface OrderSearchResponse {
    orders: Order[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}
export interface PositionSearchResponse {
    positions: Position[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}
export interface TradeSearchResponse {
    trades: Trade[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
    // Pagination fields (optional, as they depend on broker API)
    totalItems?: number;
    totalPages?: number;
    currentPage?: number;
    limit?: number; // The limit that was used for the request
}
export interface RetrieveBarsResponse {
    bars: Bar[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}
export interface PlaceOrderRequest {
  accountId: number | string;
  contractId: string;
  type: number; // 1=Limit, 2=Market, 3=Stop, 4=StopLimit
  side: number; // 0=Buy, 1=Sell
  size: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  customTag?: string | null;
  linkedOrderId?: number | null;
  timeInForce?: number; // 0=Day, 1=GTC, 2=IOC, 3=FOK
  timeInForceDate?: string | null;
}

export interface PlaceOrderResponse {
    orderId: number | string; // PDF shows 'orderId' for place, but 'id' in search
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface CancelOrderRequest {
    accountId: number | string;
    orderId: number | string;
    customTag?: string | null;
}

export interface ModifyOrderRequest {
    accountId: number | string;
    orderId: number | string;
    size?: number;
    limitPrice?: number | null;
    stopPrice?: number | null;
    trailPrice?: number | null;
    customTag?: string | null;
    timeInForce?: number;
    timeInForceDate?: string | null;
}

export interface ClosePositionRequest {
    accountId: number | string;
    contractId: number | string;
}
export interface PartialClosePositionRequest extends ClosePositionRequest {
    size: number;
}

export interface GenericSuccessResponse {
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

// TopstepX Historical Data Types
export interface HistoricalDataRequest {
  contractId: string;
  startDate: string; // ISO format date string
  endDate: string; // ISO format date string
  interval?: string; // e.g., '1m', '5m', '1h', '1d'
  includeAfterHours?: boolean;
}

export interface HistoricalBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataResponse {
  contractId: string;
  interval: string;
  bars: HistoricalBar[];
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
}

// --- Account Management Types ---
export interface AccountDetails {
    id: string | number;
    name: string;
    type: string;
    status: string;
    currency: string;
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    openPositions: number;
    openOrders: number;
    createdAt: string;
    lastActivity: string;
}

export interface AccountDetailsResponse {
    account: AccountDetails;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface AccountBalance {
    accountId: string | number;
    balance: number;
    equity: number;
    unrealizedPnL: number;
    realizedPnL: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    currency: string;
    timestamp: string;
}

export interface AccountBalanceResponse {
    balance: AccountBalance;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface AccountMargin {
    accountId: string | number;
    totalMargin: number;
    usedMargin: number;
    freeMargin: number;
    marginLevel: number;
    marginCall: boolean;
    stopOut: boolean;
    currency: string;
    positions: {
        contractId: string;
        margin: number;
        maintenanceMargin: number;
    }[];
}

export interface AccountMarginResponse {
    margin: AccountMargin;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

// --- Risk Management Types ---
export interface RiskLimits {
    accountId: string | number;
    maxDailyLoss: number;
    maxDrawdown: number;
    maxPositionSize: number;
    maxOrderSize: number;
    maxOpenOrders: number;
    maxOpenPositions: number;
    allowedContracts: string[];
    restrictedContracts: string[];
    tradingHours: {
        start: string;
        end: string;
        timezone?: string;
    };
    riskEnabled?: boolean;
    platformManaged?: boolean; // Indicates if risk management is handled by the platform interface
}

export interface RiskLimitsResponse {
    limits: RiskLimits;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
    platformNote?: string; // Additional note about platform-specific behavior
}

export interface UpdateRiskLimitsRequest {
    accountId: string | number;
    maxDailyLoss?: number;
    maxDrawdown?: number;
    maxPositionSize?: number;
    maxOrderSize?: number;
    maxOpenOrders?: number;
    maxOpenPositions?: number;
    allowedContracts?: string[];
    restrictedContracts?: string[];
}

// --- Portfolio Management Types ---
export interface PortfolioSummary {
    accountId: string | number;
    totalValue: number;
    totalPnL: number;
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    yearlyPnL: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    currency: string;
    lastUpdated: string;
}

export interface PortfolioSummaryResponse {
    summary: PortfolioSummary;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface PortfolioPerformanceData {
    date: string;
    equity: number;
    pnl: number;
    trades: number;
    volume: number;
}

export interface PortfolioPerformanceResponse {
    accountId: string | number;
    period: string;
    data: PortfolioPerformanceData[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

// --- Market Data Types ---
export interface MarketQuote {
    contractId: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    close: number;
    change: number;
    changePercent: number;
    timestamp: string;
}

export interface MarketQuoteResponse {
    quote: MarketQuote;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface MarketDepthLevel {
    price: number;
    size: number;
    orders: number;
}

export interface MarketDepth {
    contractId: string;
    bids: MarketDepthLevel[];
    asks: MarketDepthLevel[];
    timestamp: string;
}

export interface MarketDepthResponse {
    depth: MarketDepth;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface MarketTrade {
    id: string;
    contractId: string;
    price: number;
    size: number;
    side: 'BUY' | 'SELL';
    timestamp: string;
}

export interface MarketTradesResponse {
    trades: MarketTrade[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface OrderBookLevel {
    price: number;
    size: number;
    orders: number;
}

export interface OrderBook {
    contractId: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: number;
    timestamp: string;
}

export interface OrderBookResponse {
    orderBook: OrderBook;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

// --- Strategy Management Types ---
export interface Strategy {
    id: string | number;
    name: string;
    description: string;
    type: 'manual' | 'algorithmic' | 'hybrid';
    status: 'active' | 'inactive' | 'paused' | 'error';
    accountId: string | number;
    parameters: Record<string, any>;
    riskLimits: {
        maxPositionSize: number;
        maxDailyLoss: number;
        maxDrawdown: number;
    };
    performance?: {
        totalReturn: number;
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        profitFactor: number;
        sharpeRatio: number;
        maxDrawdown: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface StrategiesResponse {
    strategies: Strategy[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface CreateStrategyRequest {
    name: string;
    description: string;
    type: 'manual' | 'algorithmic' | 'hybrid';
    status: 'active' | 'inactive' | 'paused';
    parameters: Record<string, any>;
    riskLimits: {
        maxPositionSize: number;
        maxDailyLoss: number;
        maxDrawdown: number;
    };
}

export interface CreateStrategyResponse {
    strategyId: string | number;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface UpdateStrategyRequest {
    name?: string;
    description?: string;
    status?: 'active' | 'inactive' | 'paused';
    parameters?: Record<string, any>;
    riskLimits?: {
        maxPositionSize?: number;
        maxDailyLoss?: number;
        maxDrawdown?: number;
    };
}

// --- Alerts Management Types ---
export interface Alert {
    id: string | number;
    name: string;
    description: string;
    type: 'price' | 'indicator' | 'news' | 'time';
    contractId: string;
    condition: {
        operator: '>' | '<' | '=' | '>=' | '<=';
        value: number;
        field: string;
    };
    status: 'active' | 'triggered' | 'expired';
    notifications: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
    };
    createdAt: string;
    triggeredAt?: string;
    expiresAt?: string;
}

export interface AlertsResponse {
    alerts: Alert[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface CreateAlertRequest {
    name: string;
    description: string;
    type: 'price' | 'indicator' | 'news' | 'time';
    contractId: string;
    condition: {
        operator: '>' | '<' | '=' | '>=' | '<=';
        value: number;
        field: string;
    };
    notifications: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
    };
    expiresAt?: string;
}

export interface CreateAlertResponse {
    alertId: string | number;
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface UpdateAlertRequest {
    alertId: string | number;
    name?: string;
    description?: string;
    condition?: {
        operator: '>' | '<' | '=' | '>=' | '<=';
        value: number;
        field: string;
    };
    status?: 'active' | 'triggered' | 'expired';
    notifications?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
    };
    expiresAt?: string;
}

// --- News and Events Types ---
export interface NewsItem {
    id: string;
    title: string;
    content: string;
    source: string;
    symbols: string[];
    importance: 'low' | 'medium' | 'high';
    publishedAt: string;
    url?: string;
}

export interface MarketNewsResponse {
    news: NewsItem[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

export interface EconomicEvent {
    id: string;
    title: string;
    description: string;
    country: string;
    currency: string;
    importance: 'low' | 'medium' | 'high';
    actual?: number;
    forecast?: number;
    previous?: number;
    unit: string;
    eventTime: string;
}

export interface EconomicEventsResponse {
    events: EconomicEvent[];
    success: boolean;
    errorCode: number;
    errorMessage: string | null;
}

// --- TopstepX Specific Types ---

// TopstepX Authentication Types
export interface TopstepXLoginApiKeyRequest {
  userName: string;
  apiKey: string;
}

export interface TopstepXLoginAppRequest {
  userName: string;
  password: string;
  deviceId?: string;
  appId: string;
  verifyKey?: string;
}

export interface TopstepXValidateResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  isValid: boolean;
  userInfo?: {
    userId: string;
    userName: string;
    email?: string;
    accountIds: string[];
  };
}

export interface TopstepXLogoutResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  loggedOut: boolean;
}

// TopstepX Contract Search Types
export interface TopstepXSearchContractResponse {
  contracts: TopstepXContract[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface TopstepXSearchContractByIdResponse {
  contract: TopstepXContract | null;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface TopstepXContract {
  id: string;
  name: string;
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
  productType: number; // 1=Future, 2=Option, 3=Spread
  exchange: string;
  symbolRoot: string;
  contractGroup: string;
  minPrice?: number;
  maxPrice?: number;
  pointValue?: number;
  expirationDate?: string;
  strikePrice?: number;
  callPut?: number; // 0=Call, 1=Put (for options)
  deliveryType?: number;
  definition?: TopstepXContractDefinition;
}

export interface TopstepXContractDefinition {
  fullSymbol: string;
  underlyingSymbol: string;
  contractSize: number;
  currency: string;
  tradingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  marginRequirement: number;
  tickData: {
    tickSize: number;
    tickValue: number;
  };
}

// TopstepX Historical Data Types
export interface TopstepXRetrieveBarResponse {
  bars: TopstepXAggregateBarModel[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface TopstepXAggregateBarModel {
  timestamp: string; // ISO datetime string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
  vwap?: number; // Volume Weighted Average Price
}

export interface TopstepXRetrieveBarRequest {
  contractId: string;
  live: boolean;
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
  unit: number; // 1=Second, 2=Minute, 3=Hour, 4=Day, 5=Week, 6=Month
  unitNumber: number;
  limit?: number;
  includePartialBar: boolean;
}

// TopstepX Order Management Types
export interface TopstepXPlaceOrderResponse {
  orderId: string;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  orderStatus?: TopstepXOrderStatus;
}

export interface TopstepXCancelOrderResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  cancelledOrderId: string;
  cancellationTime: string;
}

export interface TopstepXModifyOrderResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  modifiedOrderId: string;
  modificationTime: string;
}

export interface TopstepXOrderStatus {
  orderId: string;
  status: TopstepXOrderStatusEnum;
  statusText: string;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice?: number;
  lastUpdateTime: string;
}

export enum TopstepXOrderStatusEnum {
  PENDING = 0,
  WORKING = 1,
  REJECTED = 2,
  FILLED = 3,
  CANCELED = 4,
  PARTIALLY_FILLED = 5
}

export enum TopstepXOrderTypeEnum {
  LIMIT = 1,
  MARKET = 2,
  STOP = 3,
  STOP_LIMIT = 4
}

export enum TopstepXOrderSideEnum {
  BUY = 0,
  SELL = 1
}

export enum TopstepXTimeInForceEnum {
  DAY = 0,
  GTC = 1, // Good Till Canceled
  IOC = 2, // Immediate or Cancel
  FOK = 3  // Fill or Kill
}

// TopstepX Position Management Types
export interface TopstepXSearchPositionResponse {
  positions: TopstepXPosition[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface TopstepXClosePositionResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  closedPositionId: string;
  closingOrderId: string;
  closingTime: string;
}

export interface TopstepXPartialClosePositionResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  partiallyClosedPositionId: string;
  closingOrderId: string;
  closedQuantity: number;
  remainingQuantity: number;
  closingTime: string;
}

export interface TopstepXPosition {
  id: string;
  accountId: string;
  contractId: string;
  type: TopstepXPositionTypeEnum; // 0=Short, 1=Long
  size: number;
  averagePrice: number;
  marketPrice?: number;
  creationTimestamp: string;
  updateTimestamp?: string;
  closingTimestamp?: string | null;
  profitAndLossPercent?: number;
  profitAndLoss?: number;
  initialSize?: number;
  initialAveragePrice?: number;
  closingSize?: number;
  closingAveragePrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

export enum TopstepXPositionTypeEnum {
  SHORT = 0,
  LONG = 1
}

// TopstepX Trade History Types
export interface TopstepXSearchHalfTradeResponse {
  halfTrades: TopstepXHalfTradeModel[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface TopstepXHalfTradeModel {
  id: string;
  accountId: string;
  contractId: string;
  orderId: string;
  price: number;
  size: number;
  side: TopstepXOrderSideEnum; // 0=Buy, 1=Sell
  fees: number;
  profitAndLoss?: number | null;
  creationTimestamp: string;
  voided: boolean;
  previousPositionSize?: number;
  newPositionSize?: number;
  text?: string;
  originalPrice?: number;
  previousAveragePrice?: number;
  newAveragePrice?: number;
  tradeType: TopstepXTradeTypeEnum;
  commission: number;
  exchange: string;
  isClosing: boolean;
}

export enum TopstepXTradeTypeEnum {
  OPENING = 0,
  CLOSING = 1,
  PARTIAL_CLOSING = 2
}

// TopstepX Error Codes
export enum TopstepXAuthErrorCode {
  SUCCESS = 0,
  INVALID_CREDENTIALS = 1001,
  ACCOUNT_LOCKED = 1002,
  ACCOUNT_SUSPENDED = 1003,
  INVALID_API_KEY = 1004,
  API_KEY_EXPIRED = 1005,
  DEVICE_NOT_AUTHORIZED = 1006,
  TOO_MANY_LOGIN_ATTEMPTS = 1007,
  SESSION_EXPIRED = 1008,
  INVALID_SESSION = 1009,
  UNKNOWN_ERROR = 9999
}

export enum TopstepXContractErrorCode {
  SUCCESS = 0,
  CONTRACT_NOT_FOUND = 2001,
  INVALID_SEARCH_CRITERIA = 2002,
  TOO_MANY_RESULTS = 2003,
  CONTRACT_INACTIVE = 2004,
  MARKET_CLOSED = 2005,
  DATA_NOT_AVAILABLE = 2006,
  UNKNOWN_ERROR = 9999
}

export enum TopstepXOrderErrorCode {
  SUCCESS = 0,
  INSUFFICIENT_FUNDS = 3001,
  INVALID_ORDER_SIZE = 3002,
  INVALID_PRICE = 3003,
  ORDER_REJECTED = 3004,
  ORDER_NOT_FOUND = 3005,
  ORDER_ALREADY_FILLED = 3006,
  ORDER_ALREADY_CANCELED = 3007,
  POSITION_LIMIT_EXCEEDED = 3008,
  RISK_LIMIT_EXCEEDED = 3009,
  MARKET_CLOSED = 3010,
  CONTRACT_NOT_TRADEABLE = 3011,
  UNKNOWN_ERROR = 9999
}

export enum TopstepXPositionErrorCode {
  SUCCESS = 0,
  POSITION_NOT_FOUND = 4001,
  INSUFFICIENT_POSITION = 4002,
  POSITION_ALREADY_CLOSED = 4003,
  CLOSE_ORDER_REJECTED = 4004,
  MARGIN_CALL = 4005,
  UNKNOWN_ERROR = 9999
}

export enum TopstepXTradeErrorCode {
  SUCCESS = 0,
  TRADE_NOT_FOUND = 5001,
  INVALID_DATE_RANGE = 5002,
  TOO_MANY_TRADES = 5003,
  TRADE_DATA_UNAVAILABLE = 5004,
  UNKNOWN_ERROR = 9999
}

// TopstepX Request/Response Wrappers
export interface TopstepXBaseRequest {
  accountId?: string;
  timestamp?: string;
}

export interface TopstepXBaseResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
  timestamp: string;
  requestId?: string;
}

// TopstepX-specific extensions to existing types
export interface TopstepXTradingAccount extends TradingAccount {
  accountType: 'DEMO' | 'LIVE' | 'FUNDED';
  tradingPermissions: string[];
  riskLimits: {
    maxDailyLoss: number;
    maxDrawdown: number;
    maxPositions: number;
  };
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  lastActivity: string;
}

export interface TopstepXOrder extends Order {
  orderSource: 'API' | 'PLATFORM' | 'MOBILE';
  parentOrderId?: string;
  childOrderIds?: string[];
  triggerConditions?: {
    triggerPrice?: number;
    triggerCondition?: 'ABOVE' | 'BELOW';
  };
}

/**
 * Technical Indicator Types
 */
export enum IndicatorType {
  OVERLAY = 'overlay',   // Displayed on the main price chart (e.g., Moving Averages, Bollinger Bands)
  OSCILLATOR = 'oscillator' // Displayed in a separate panel (e.g., RSI, MACD, Stochastic)
}

export enum IndicatorSourceType {
  CLOSE = 'close',
  OPEN = 'open',
  HIGH = 'high',
  LOW = 'low',
  HL2 = 'hl2',    // (High + Low) / 2
  HLC3 = 'hlc3',  // (High + Low + Close) / 3
  OHLC4 = 'ohlc4' // (Open + High + Low + Close) / 4
}

export interface ChartIndicator {
  id: string;
  name: string;
  type: IndicatorType;
  visible: boolean;
  color: string;
  lineWidth: number;
  sourceType: IndicatorSourceType;
  settings: Record<string, any>;  // Indicator-specific settings
  values: number[] | null;        // Calculated values
  subValues?: Record<string, number[]>; // Additional value series (like signal lines)
}

export interface MovingAverageIndicator extends ChartIndicator {
  settings: {
    period: number;
    maType: 'sma' | 'ema' | 'wma' | 'vwma' | 'hull';
  };
}

export interface BollingerBandsIndicator extends ChartIndicator {
  settings: {
    period: number;
    deviations: number;
  };
  subValues: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface RsiIndicator extends ChartIndicator {
  settings: {
    period: number;
    overbought: number;
    oversold: number;
  };
}

export interface MacdIndicator extends ChartIndicator {
  settings: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    histogramColor: string;
    signalLineColor: string;
  };
  subValues: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
}

/**
 * Drawing Tools Types
 */
export enum DrawingToolType {
  TRENDLINE = 'trendline',
  HORIZONTAL_LINE = 'horizontal-line',
  VERTICAL_LINE = 'vertical-line',
  RECTANGLE = 'rectangle',
  FIBONACCI = 'fibonacci',
  TEXT = 'text',
  ARROW = 'arrow',
  CHANNEL = 'channel',
  PITCHFORK = 'pitchfork',
  RAYS = 'rays',
  BRUSH = 'brush'
}

export interface Point {
  x: number;  // Chart x-coordinate (bar index)
  y: number;  // Chart y-coordinate (price)
}

export interface DrawingObject {
  id: string;
  type: DrawingToolType;
  points: Point[];
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fillOpacity?: number;
  text?: string;
  fontSize?: number;
  interactive: boolean;
  locked: boolean;
  visible: boolean;
  editable: boolean;
  dataAttached?: Record<string, any>; // Custom data attached to the drawing
}

/**
 * Chart Interaction States
 */
export enum ChartInteractionMode {
  NORMAL = 'normal',
  DRAWING = 'drawing',
  PANNING = 'panning',
  SCALING = 'scaling'
}

export interface ChartVisibleRange {
  barStart: number;   // First visible bar index
  barEnd: number;     // Last visible bar index
  priceHigh: number;  // Upper price bound
  priceLow: number;   // Lower price bound
  scaleType: 'linear' | 'logarithmic';
  autoScale: boolean;
}

/**
 * Chart Memory Types (for MCP Memory integration)
 */
export interface ChartMemorySettings {
  indicators: {
    favorites: ChartIndicator[];  // Favorite indicator configurations
    lastUsed: ChartIndicator[];   // Recently used indicators
  };
  drawings: {
    favorites: DrawingObject[];   // Favorite drawing tools configurations
    lastUsed: DrawingObject[];    // Recently used drawings
  };
  viewPreferences: {
    timeframe: string;
    chartType: string;
    showVolume: boolean;
    theme: 'light' | 'dark' | 'system';
    gridLines: boolean;
    crosshair: boolean;
    scaleType: 'linear' | 'logarithmic';
  };
  history: {
    lastViewed: { contractId: string, timestamp: string }[]; // Recently viewed charts
  };
}

// Deployment related types
export interface DeploymentParams {
  [key: string]: string | number | boolean;
}

export interface AlgorithmDeployment {
  id: string;
  algorithmId: string;
  algorithmName: string;
  accountId: string | number;
  accountName?: string;
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'error' | 'completed';
  parameters: DeploymentParams;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  errorMessage?: string;
}

export interface DeploymentStatus {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'error' | 'completed';
  metrics?: {
    orders: number;
    trades: number;
    profitLoss: number;
    runningTime: string; // Duration string
  };
  lastEvent?: {
    type: string;
    message: string;
    timestamp: string;
  };
  resourceUsage?: {
    cpu: number; // Percentage
    memory: number; // MB
    network: number; // KB/s
  };
  updatedAt: string;
}

export interface DeploymentLog {
  deploymentId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

export interface BulkDeploymentRequest {
  algorithmId: string;
  accountIds: (string | number)[];
  parameters: DeploymentParams;
}

export interface BulkDeploymentResponse {
  successCount: number;
  failureCount: number;
  deployments: {
    [accountId: string]: {
      success: boolean;
      deploymentId?: string;
      errorMessage?: string;
    };
  };
}

