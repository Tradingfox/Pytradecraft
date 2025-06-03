import { QuoteData, MarketTradeData, MarketDepthUpdate } from '../types';

/**
 * Market Hub Diagnostics Utility
 * 
 * This utility provides functions to help diagnose issues with market data connections
 * and subscriptions in the PyTradeCraft application.
 */

interface MarketDataActivity {
  lastQuoteTimestamp: number;
  lastTradeTimestamp: number;
  lastDepthTimestamp: number;
  quoteCount: number;
  tradeCount: number;
  depthCount: number;
}

const marketActivity: Record<string, MarketDataActivity> = {};

/**
 * Track market data activity for a specific contract
 */
export const trackMarketActivity = (contractId: string, dataType: 'quote' | 'trade' | 'depth'): void => {
  if (!marketActivity[contractId]) {
    marketActivity[contractId] = {
      lastQuoteTimestamp: 0,
      lastTradeTimestamp: 0,
      lastDepthTimestamp: 0,
      quoteCount: 0,
      tradeCount: 0,
      depthCount: 0
    };
  }
  
  const now = Date.now();
  const activity = marketActivity[contractId];
  
  switch (dataType) {
    case 'quote':
      activity.lastQuoteTimestamp = now;
      activity.quoteCount++;
      break;
    case 'trade':
      activity.lastTradeTimestamp = now;
      activity.tradeCount++;
      break;
    case 'depth':
      activity.lastDepthTimestamp = now;
      activity.depthCount++;
      break;
  }
};

/**
 * Track quote updates
 */
export const trackQuoteUpdate = (quotes: QuoteData[]): void => {
  if (quotes.length === 0) return;
  
  quotes.forEach(quote => {
    if (quote.contractId) {
      trackMarketActivity(quote.contractId, 'quote');
    }
  });
};

/**
 * Track trade updates
 */
export const trackTradeUpdate = (trades: MarketTradeData[]): void => {
  if (trades.length === 0) return;
  
  trades.forEach(trade => {
    if (trade.contractId) {
      trackMarketActivity(trade.contractId, 'trade');
    }
  });
};

/**
 * Track market depth updates
 */
export const trackDepthUpdate = (depthUpdates: MarketDepthUpdate[]): void => {
  if (depthUpdates.length === 0) return;
  
  depthUpdates.forEach(depth => {
    if (depth.contractId) {
      trackMarketActivity(depth.contractId, 'depth');
    }
  });
};

/**
 * Get activity stats for a specific contract
 */
export const getMarketActivityStats = (contractId: string): MarketDataActivity | null => {
  return marketActivity[contractId] || null;
};

/**
 * Get a formatted report of market activity for debugging
 */
export const getMarketActivityReport = (contractId?: string): string => {
  if (contractId && marketActivity[contractId]) {
    const activity = marketActivity[contractId];
    const now = Date.now();
    
    return `Market Activity for ${contractId}:
    Quotes: ${activity.quoteCount} (last: ${formatTimeAgo(now - activity.lastQuoteTimestamp)} ago)
    Trades: ${activity.tradeCount} (last: ${formatTimeAgo(now - activity.lastTradeTimestamp)} ago)
    Depth Updates: ${activity.depthCount} (last: ${formatTimeAgo(now - activity.lastDepthTimestamp)} ago)`;
  }
  
  // Report on all contracts
  const contractIds = Object.keys(marketActivity);
  if (contractIds.length === 0) {
    return 'No market activity recorded yet.';
  }
  
  return contractIds.map(cid => {
    const activity = marketActivity[cid];
    const now = Date.now();
    
    return `${cid}: Q:${activity.quoteCount} (${formatTimeAgo(now - activity.lastQuoteTimestamp)}), ` +
           `T:${activity.tradeCount} (${formatTimeAgo(now - activity.lastTradeTimestamp)}), ` +
           `D:${activity.depthCount} (${formatTimeAgo(now - activity.lastDepthTimestamp)})`;
  }).join('\n');
};

/**
 * Format time difference as a human-readable string
 */
const formatTimeAgo = (ms: number): string => {
  if (ms === 0 || isNaN(ms)) return 'never';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
};
