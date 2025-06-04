/**
 * DTFX Algo Zones
 * 
 * A sample trading algorithm that uses support and resistance zones
 * to generate trading signals.
 */

const sampleCode = `
# DTFX Algo Zones Strategy
# A simple trading algorithm that uses support and resistance zones

# Parameter: timeframe = 1h
# Parameter: lookback_period = 20
# Parameter: zone_threshold = 0.0015

import numpy as np
import pandas as pd
from datetime import datetime

def initialize(context):
    context.symbols = ["EURUSD", "GBPUSD", "USDJPY"]
    context.lookback_period = 20
    context.zone_threshold = 0.0015
    
    # Schedule the trading logic to run at the beginning of each timeframe
    schedule_function(trade_logic, date_rules.every_day(), time_rules.market_open())

def identify_zones(prices, threshold):
    """Identify support and resistance zones based on price history"""
    highs = prices['high'].rolling(window=5).max()
    lows = prices['low'].rolling(window=5).min()
    
    # Find clusters of highs and lows
    resistance_zones = []
    support_zones = []
    
    # Simplified zone identification for the example
    for i in range(len(highs) - 1):
        # If two highs are close to each other, consider it a resistance zone
        if abs(highs.iloc[i] - highs.iloc[i+1]) < threshold * highs.iloc[i]:
            resistance_zones.append((highs.iloc[i] + highs.iloc[i+1]) / 2)
            
        # If two lows are close to each other, consider it a support zone
        if abs(lows.iloc[i] - lows.iloc[i+1]) < threshold * lows.iloc[i]:
            support_zones.append((lows.iloc[i] + lows.iloc[i+1]) / 2)
    
    return support_zones, resistance_zones

def trade_logic(context, data):
    """Execute trading logic for each symbol"""
    for symbol in context.symbols:
        # Get historical price data
        prices = data.history(symbol, ['open', 'high', 'low', 'close'], 
                             context.lookback_period, '1d')
        
        if len(prices) < context.lookback_period:
            log.warn(f"Not enough price data for {symbol}")
            continue
        
        # Identify support and resistance zones
        support_zones, resistance_zones = identify_zones(prices, context.zone_threshold)
        
        current_price = data.current(symbol, 'close')
        
        # Trading logic based on zones
        closest_support = min(support_zones, key=lambda x: abs(x - current_price)) if support_zones else None
        closest_resistance = min(resistance_zones, key=lambda x: abs(x - current_price)) if resistance_zones else None
        
        # If price is near support, consider buying
        if closest_support and current_price < closest_support * 1.01:
            if context.portfolio.positions[symbol].amount <= 0:
                order_target_percent(symbol, 0.1)
                log.info(f"BUY signal for {symbol} at {current_price}, near support zone {closest_support}")
        
        # If price is near resistance, consider selling
        elif closest_resistance and current_price > closest_resistance * 0.99:
            if context.portfolio.positions[symbol].amount >= 0:
                order_target_percent(symbol, -0.1)
                log.info(f"SELL signal for {symbol} at {current_price}, near resistance zone {closest_resistance}")
        
        # Additional risk management
        manage_risk(context, data, symbol)

def manage_risk(context, data, symbol):
    """Apply risk management rules to existing positions"""
    position = context.portfolio.positions.get(symbol, None)
    
    if position and position.amount != 0:
        current_price = data.current(symbol, 'close')
        entry_price = position.cost_basis
        
        # Simple stop loss and take profit rules
        if position.amount > 0:  # Long position
            # 2% stop loss
            if current_price < entry_price * 0.98:
                order_target_percent(symbol, 0)
                log.info(f"Stop loss triggered for {symbol} long position")
            # 3% take profit
            elif current_price > entry_price * 1.03:
                order_target_percent(symbol, 0)
                log.info(f"Take profit triggered for {symbol} long position")
        
        elif position.amount < 0:  # Short position
            # 2% stop loss
            if current_price > entry_price * 1.02:
                order_target_percent(symbol, 0)
                log.info(f"Stop loss triggered for {symbol} short position")
            # 3% take profit
            elif current_price < entry_price * 0.97:
                order_target_percent(symbol, 0)
                log.info(f"Take profit triggered for {symbol} short position")

def analyze(context, data):
    """Post-trading analysis"""
    # Calculate performance metrics
    portfolio_value = context.portfolio.portfolio_value
    cash = context.portfolio.cash
    
    # Log portfolio statistics
    log.info(f"Portfolio Value: {portfolio_value}")
    log.info(f"Cash: {cash}")
    
    # Log positions
    for symbol, position in context.portfolio.positions.items():
        if position.amount != 0:
            log.info(f"Position: {symbol}, Amount: {position.amount}, Cost Basis: {position.cost_basis}")
`;

module.exports = {
  name: "DTFX Algo Zones",
  description: "A trading algorithm that uses support and resistance zones to generate trading signals.",
  code: sampleCode
}; 