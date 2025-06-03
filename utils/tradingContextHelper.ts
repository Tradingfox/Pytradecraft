/**
 * Utility for updating live quotes in TradingContext
 * This file provides additional helper methods to ensure correct updates
 * of positions with real-time market data
 */
import { QuoteData, Position } from '../types';
import { calculatePositionPnL } from './positionsHelper';

/**
 * Takes the latest positions and quotes data and returns updated positions
 * with current market prices and recalculated P&L values.
 * 
 * @param positions Array of current positions
 * @param quotes Array of latest quotes
 * @returns Updated positions with market prices and P&L
 */
export const integrateQuotesWithPositions = (
  positions: Position[], 
  quotes: QuoteData[]
): Position[] => {
  if (!positions.length || !quotes.length) return positions;
  
  // Get the latest quote for each contract
  const latestQuotesByContract: Record<string, QuoteData> = quotes.reduce((acc, quote) => {
    if (quote.contractId && quote.lastPrice !== undefined) {
      // Only keep the latest quote for each contract
      if (!acc[quote.contractId] || 
          new Date(acc[quote.contractId].timestamp) < new Date(quote.timestamp)) {
        acc[quote.contractId] = quote;
      }
    }
    return acc;
  }, {} as Record<string, QuoteData>);

  // Update positions with latest market prices and recalculate P&L
  return positions.map(position => {
    const quote = latestQuotesByContract[position.contractId];
    if (!quote || quote.lastPrice === undefined) return position;
    
    // Create updated position with new market price
    const updatedPosition: Position = {
      ...position,
      marketPrice: quote.lastPrice
    };
    
    // Calculate P&L if not provided by server
    if (position.profitAndLoss === undefined || position.profitAndLoss === null) {
      updatedPosition.profitAndLoss = calculatePositionPnL(updatedPosition);
    }
    
    return updatedPosition;
  });
};

/**
 * Determines if positions need to be updated based on new quotes
 * 
 * @param currentPositions Current positions array
 * @param updatedPositions Positions updated with latest quotes
 * @returns Boolean indicating if updates are needed
 */
export const positionsNeedQuoteUpdate = (
  currentPositions: Position[],
  updatedPositions: Position[]
): boolean => {
  if (currentPositions.length !== updatedPositions.length) return true;
  
  for (let i = 0; i < currentPositions.length; i++) {
    const currentPos = currentPositions[i];
    const updatedPos = updatedPositions[i];
    
    // Check if market price or P&L has changed
    if (currentPos.marketPrice !== updatedPos.marketPrice || 
        currentPos.profitAndLoss !== updatedPos.profitAndLoss) {
      return true;
    }
  }
  
  return false;
};
