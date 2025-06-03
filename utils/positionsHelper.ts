import { Position, QuoteData } from '../types';

/**
 * Calculate P&L for a position
 * @param position Position object
 * @returns Calculated P&L value
 */
export const calculatePositionPnL = (position: Position): number => {
  // Use server-provided P&L if available
  if (position.profitAndLoss !== undefined && position.profitAndLoss !== null) {
    return position.profitAndLoss;
  }

  // Cannot calculate P&L without market price
  if (!position.marketPrice) {
    return 0;
  }

  // Calculate P&L based on position type, size, average price, and market price
  const { type, size, averagePrice, marketPrice } = position;
  
  // For long positions: (marketPrice - avgPrice) * size
  // For short positions: (avgPrice - marketPrice) * size
  return type === 1
    ? (marketPrice - averagePrice) * size
    : (averagePrice - marketPrice) * size;
};

/**
 * Update position market prices from quotes
 * @param positions Array of positions
 * @param quotes Array of quotes
 * @returns Updated positions with market prices
 */
export const updatePositionsWithQuotes = (
  positions: Position[], 
  quotes: QuoteData[]
): Position[] => {
  if (!quotes.length || !positions.length) return positions;

  // Group quotes by contract ID for easy lookup
  const latestQuotesByContract = quotes.reduce((acc, quote) => {
    if (quote.contractId) {
      // Only keep the latest quote for each contract
      if (!acc[quote.contractId] || 
          new Date(acc[quote.contractId].timestamp) < new Date(quote.timestamp)) {
        acc[quote.contractId] = quote;
      }
    }
    return acc;
  }, {} as Record<string, QuoteData>);
  
  console.log('Latest quotes for contracts:', Object.keys(latestQuotesByContract).map(id => ({
    contractId: id,
    lastPrice: latestQuotesByContract[id].lastPrice
  })));
  
  // Update positions with latest quotes and recalculate P&L
  return positions.map(position => {
    const quote = latestQuotesByContract[position.contractId];
    if (quote && quote.lastPrice !== undefined) {
      const updatedPosition = {
        ...position,
        marketPrice: quote.lastPrice
      };
      
      // If the position doesn't have server-provided P&L, calculate it
      if (position.profitAndLoss === undefined || position.profitAndLoss === null) {
        const calculatedPnL = calculatePositionPnL(updatedPosition);
        updatedPosition.profitAndLoss = calculatedPnL;
      }
      
      return updatedPosition;
    }
    return position;
  });
};

/**
 * Enhance positions with calculated P&L
 * @param positions Array of positions
 * @returns Enhanced positions with displayPnL property
 */
export const enhancePositionsWithPnL = (positions: Position[]): (Position & { displayPnL: number })[] => {
  return positions.map(position => {
    const calculatedPnL = calculatePositionPnL(position);
    return {
      ...position,
      displayPnL: position.profitAndLoss !== undefined && position.profitAndLoss !== null
        ? position.profitAndLoss 
        : calculatedPnL
    };
  });
};
