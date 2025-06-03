/**
 * DTFX Algo Zones Strategy
 * 
 * This strategy is based on the PineScript indicator "DTFX Algo Zones with Automatic Contract Size Calculation".
 * It identifies swing points in the market, calculates trading zones, and generates entry signals at 50% retracement levels.
 * Stop losses are placed at the zone boundaries, and targets are set at 2:1 risk-reward ratio.
 * 
 * Market: MNQ (Micro Nasdaq futures)
 * Timeframe: 5 minutes
 */

/**
 * Initialize the strategy with default parameters
 * @param {Object} context - The context object for storing state
 */
function initialize(context) {
  // Strategy parameters
  context.symbol = 'MNQ'; // Micro Nasdaq futures
  context.structureLength = 10; // Length for identifying swing points
  context.entryLevel = 0.5; // 50% retracement for entries
  context.stopType = 'Zone'; // Stop loss type: 'Zone', 'Points', 'Ticks', 'ATR'
  context.stopOffset = 0; // Additional offset for zone-based stops
  context.targetRR = 2; // Risk-reward ratio for targets
  context.tickSize = 0.25; // Tick size for MNQ
  context.pointValue = 2; // Point value for MNQ
  context.accountSize = 10000; // Default account size
  context.maxRiskPercent = 1; // Maximum risk per trade (1%)
  
  // State variables
  context.dir = 0; // Current market direction: 1 for up, -1 for down, 0 for undefined
  context.top = null; // Last swing high price
  context.btm = null; // Last swing low price
  context.topBar = null; // Bar index of last swing high
  context.btmBar = null; // Bar index of last swing low
  context.bos_up_check = false; // Breakout of structure up check
  context.bos_down_check = false; // Breakout of structure down check
  context.lastTop = "NA"; // Last top type (HH or LH)
  context.lastBot = "NA"; // Last bottom type (LL or HL)
  context.t_dir = 0; // Trend direction
  
  // Trading state
  context.inPosition = false;
  context.positionType = null; // 'long' or 'short'
  context.entryPrice = null;
  context.stopPrice = null;
  context.targetPrice = null;
  context.contractSize = 0;
  
  console.log("DTFX Algo Zones Strategy initialized.");
}

/**
 * Calculate the number of contracts to trade based on risk parameters
 * @param {number} entryPrice - Entry price
 * @param {number} stopPrice - Stop loss price
 * @param {number} accountSize - Account size
 * @param {number} maxRiskPercent - Maximum risk percentage
 * @param {number} pointValue - Point value of the contract
 * @returns {number} - Number of contracts to trade
 */
function calculateContractSize(entryPrice, stopPrice, accountSize, maxRiskPercent, pointValue) {
  const maxRiskDollars = (maxRiskPercent / 100) * accountSize;
  const riskPerUnit = Math.abs(entryPrice - stopPrice) * pointValue;
  
  if (riskPerUnit > 0) {
    return Math.floor(maxRiskDollars / riskPerUnit);
  }
  return 0;
}

/**
 * Calculate entry, stop, and target prices based on the zone
 * @param {number} top - Zone top price
 * @param {number} bottom - Zone bottom price
 * @param {boolean} isBullish - Whether the zone is bullish
 * @param {Object} context - Strategy context
 * @returns {Array} - [entryPrice, stopPrice, targetPrice]
 */
function calculateLevels(top, bottom, isBullish, context) {
  // Calculate entry price at the specified retracement level
  const entryPrice = bottom + context.entryLevel * (top - bottom);
  
  let stopPrice;
  // Calculate stop price based on the selected stop type
  if (context.stopType === 'Zone') {
    stopPrice = isBullish ? 
      bottom - context.stopOffset * context.tickSize : 
      top + context.stopOffset * context.tickSize;
  } else if (context.stopType === 'Points') {
    stopPrice = isBullish ? 
      entryPrice - context.stopValue : 
      entryPrice + context.stopValue;
  } else if (context.stopType === 'Ticks') {
    stopPrice = isBullish ? 
      entryPrice - context.stopValue * context.tickSize : 
      entryPrice + context.stopValue * context.tickSize;
  } else if (context.stopType === 'ATR') {
    // ATR-based stop would require ATR calculation from historical data
    // For simplicity, we'll use a fixed value here
    const atrValue = 5 * context.tickSize; // Example ATR value
    stopPrice = isBullish ? 
      entryPrice - atrValue : 
      entryPrice + atrValue;
  }
  
  // Calculate target price based on risk-reward ratio
  const risk = Math.abs(entryPrice - stopPrice);
  const targetPrice = isBullish ? 
    entryPrice + context.targetRR * risk : 
    entryPrice - context.targetRR * risk;
  
  return [entryPrice, stopPrice, targetPrice];
}

/**
 * Process market data and generate trading signals
 * @param {Object} context - The context object for storing state
 * @param {Object} data - The data object for accessing market data
 */
function handle_data(context, data) {
  // Get current price data
  const currentBar = data.current(context.symbol);
  const high = currentBar.high;
  const low = currentBar.low;
  const close = currentBar.close;
  
  // Get historical data for structure identification
  const bars = data.history(context.symbol, ['high', 'low'], context.structureLength * 2, '5m');
  
  // Identify swing points
  const upper = Math.max(...bars.high.slice(-context.structureLength));
  const lower = Math.min(...bars.low.slice(-context.structureLength));
  
  // Structure identification logic
  let structure_confirmed = 0;
  
  // Identify potential swing high
  if (context.dir >= 0 && bars.high[bars.high.length - context.structureLength - 1] > upper) {
    context.dir = -1;
    context.top = bars.high[bars.high.length - context.structureLength - 1];
    context.topBar = bars.high.length - context.structureLength - 1;
    context.bos_up_check = true;
    structure_confirmed = 1;
    console.log(`Swing high identified at ${context.top}`);
  }
  
  // Identify potential swing low
  if (context.dir <= 0 && bars.low[bars.low.length - context.structureLength - 1] < lower) {
    context.dir = 1;
    context.btm = bars.low[bars.low.length - context.structureLength - 1];
    context.btmBar = bars.low.length - context.structureLength - 1;
    context.bos_down_check = true;
    structure_confirmed = -1;
    console.log(`Swing low identified at ${context.btm}`);
  }
  
  // Determine if we have higher highs/lows or lower highs/lows
  let HH = false, HL = false, LH = false, LL = false;
  
  if (structure_confirmed > 0 && context.top > context.top) {
    HH = true;
    context.lastTop = "HH";
  } else if (structure_confirmed > 0 && context.top < context.top) {
    LH = true;
    context.lastTop = "LH";
  }
  
  if (structure_confirmed < 0 && context.btm < context.btm) {
    LL = true;
    context.lastBot = "LL";
  } else if (structure_confirmed < 0 && context.btm > context.btm) {
    HL = true;
    context.lastBot = "HL";
  }
  
  // Check for change of character (CHOCH) and breakout of structure (BOS)
  let choch_up = false, choch_down = false, bos_up = false, bos_down = false;
  
  // CHOCH occurs when price crosses a swing point in the opposite direction of the trend
  if (close > context.top && context.t_dir <= 0) {
    choch_up = true;
    context.t_dir = 1;
    console.log(`Change of character up detected at ${close}`);
  }
  
  if (close < context.btm && context.t_dir >= 0) {
    choch_down = true;
    context.t_dir = -1;
    console.log(`Change of character down detected at ${close}`);
  }
  
  // BOS occurs when price crosses a swing point in the same direction as the trend
  if (close > context.top && context.bos_up_check && context.t_dir >= 0) {
    bos_up = true;
    context.bos_up_check = false;
    console.log(`Breakout of structure up detected at ${close}`);
  }
  
  if (close < context.btm && context.bos_down_check && context.t_dir <= 0) {
    bos_down = true;
    context.bos_down_check = false;
    console.log(`Breakout of structure down detected at ${close}`);
  }
  
  // Market structure shift (MSS) is either a BOS or CHOCH
  const mss_up = bos_up || choch_up;
  const mss_down = bos_down || choch_down;
  
  // Generate trading signals based on market structure shifts
  if (mss_up) {
    // Bullish zone identified
    const _top = context.top;
    const _bot = context.dir === -1 ? lower : context.dir === 1 ? context.btm : low;
    
    // Calculate entry, stop, and target levels
    const [entryPrice, stopPrice, targetPrice] = calculateLevels(_top, _bot, true, context);
    
    // Calculate position size
    const contractSize = calculateContractSize(
      entryPrice, 
      stopPrice, 
      context.accountSize, 
      context.maxRiskPercent, 
      context.pointValue
    );
    
    console.log(`Bullish zone identified: ${_bot} to ${_top}`);
    console.log(`Entry: ${entryPrice}, Stop: ${stopPrice}, Target: ${targetPrice}, Contracts: ${contractSize}`);
    
    // Store signal for execution
    context.entryPrice = entryPrice;
    context.stopPrice = stopPrice;
    context.targetPrice = targetPrice;
    context.contractSize = contractSize;
    context.positionType = 'long';
  }
  
  if (mss_down) {
    // Bearish zone identified
    const _top = context.dir === 1 ? upper : context.dir === -1 ? context.top : high;
    const _bot = context.btm;
    
    // Calculate entry, stop, and target levels
    const [entryPrice, stopPrice, targetPrice] = calculateLevels(_top, _bot, false, context);
    
    // Calculate position size
    const contractSize = calculateContractSize(
      entryPrice, 
      stopPrice, 
      context.accountSize, 
      context.maxRiskPercent, 
      context.pointValue
    );
    
    console.log(`Bearish zone identified: ${_bot} to ${_top}`);
    console.log(`Entry: ${entryPrice}, Stop: ${stopPrice}, Target: ${targetPrice}, Contracts: ${contractSize}`);
    
    // Store signal for execution
    context.entryPrice = entryPrice;
    context.stopPrice = stopPrice;
    context.targetPrice = targetPrice;
    context.contractSize = contractSize;
    context.positionType = 'short';
  }
  
  // Execute trades when price crosses entry level
  if (!context.inPosition && context.entryPrice && context.positionType) {
    if (context.positionType === 'long' && low <= context.entryPrice && high >= context.entryPrice) {
      // Long entry triggered
      console.log(`LONG entry triggered at ${context.entryPrice} with ${context.contractSize} contracts`);
      // order(context.symbol, context.contractSize);
      context.inPosition = true;
    } else if (context.positionType === 'short' && high >= context.entryPrice && low <= context.entryPrice) {
      // Short entry triggered
      console.log(`SHORT entry triggered at ${context.entryPrice} with ${context.contractSize} contracts`);
      // order(context.symbol, -context.contractSize);
      context.inPosition = true;
    }
  }
  
  // Check for stop loss or target hit
  if (context.inPosition) {
    if (context.positionType === 'long') {
      if (low <= context.stopPrice) {
        // Stop loss hit
        console.log(`Stop loss hit at ${context.stopPrice}`);
        // order(context.symbol, -context.contractSize);
        context.inPosition = false;
        context.positionType = null;
      } else if (high >= context.targetPrice) {
        // Target hit
        console.log(`Target hit at ${context.targetPrice}`);
        // order(context.symbol, -context.contractSize);
        context.inPosition = false;
        context.positionType = null;
      }
    } else if (context.positionType === 'short') {
      if (high >= context.stopPrice) {
        // Stop loss hit
        console.log(`Stop loss hit at ${context.stopPrice}`);
        // order(context.symbol, context.contractSize);
        context.inPosition = false;
        context.positionType = null;
      } else if (low <= context.targetPrice) {
        // Target hit
        console.log(`Target hit at ${context.targetPrice}`);
        // order(context.symbol, context.contractSize);
        context.inPosition = false;
        context.positionType = null;
      }
    }
  }
}

module.exports = {
  initialize,
  handle_data,
  calculateContractSize,
  calculateLevels
};