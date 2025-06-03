
import { Algorithm, BacktestResult, EquityDataPoint, SimulatedTrade } from '../types';

// Helper to simulate a delay
const delay = <T,>(ms: number, value?: T): Promise<T | undefined> => 
  new Promise(resolve => setTimeout(() => resolve(value), ms));

export const runMockBacktest = async (
  algorithm: Algorithm,
  startDateStr: string,
  endDateStr: string,
  initialCapital: number
): Promise<BacktestResult> => {
  await delay(1500); // Simulate processing time

  const equityCurve: EquityDataPoint[] = [];
  let currentEquity = initialCapital;
  const trades: SimulatedTrade[] = [];
  const logs: string[] = [`Backtest started for ${algorithm.name} from ${startDateStr} to ${endDateStr} with $${initialCapital.toLocaleString()}`];

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const numDataPoints = Math.min(Math.max(diffDays, 30), 250); // Cap data points for performance

  for (let i = 0; i < numDataPoints; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + (i * (diffDays / numDataPoints)));

    // Simulate market fluctuation and trading decisions
    const randomFactor = (Math.random() - 0.49) * (initialCapital * 0.005); // Small daily change
    currentEquity += randomFactor;

    if (i > 0 && i % Math.floor(numDataPoints/5) === 0) { // Simulate some trades
        const isBuy = Math.random() > 0.5;
        const tradeAmount = currentEquity * 0.1 * Math.random();
        const tradePrice = 100 + Math.random() * 50;
        const quantity = tradeAmount / tradePrice;

        if (isBuy) {
            currentEquity -= tradeAmount;
            logs.push(`SIMULATED BUY: ${quantity.toFixed(2)} units of MOCK_ASSET @ $${tradePrice.toFixed(2)} on ${currentDate.toISOString().split('T')[0]}`);
             trades.push({
                id: `trade-${Date.now()}-${i}-buy`,
                timestamp: currentDate.toISOString(),
                symbol: 'MOCK_ASSET',
                type: 'BUY',
                quantity: quantity,
                price: tradePrice,
            });
        } else {
            currentEquity += tradeAmount; // Assume we had shares to sell
            logs.push(`SIMULATED SELL: ${quantity.toFixed(2)} units of MOCK_ASSET @ $${tradePrice.toFixed(2)} on ${currentDate.toISOString().split('T')[0]}`);
            trades.push({
                id: `trade-${Date.now()}-${i}-sell`,
                timestamp: currentDate.toISOString(),
                symbol: 'MOCK_ASSET',
                type: 'SELL',
                quantity: quantity,
                price: tradePrice,
                pnl: tradeAmount * (Math.random() * 0.2 - 0.1) // Simulate P&L
            });
        }
    }

    // Ensure equity doesn't go below a certain threshold (e.g. 10% of initial) for realism
    currentEquity = Math.max(currentEquity, initialCapital * 0.1);


    equityCurve.push({
      date: currentDate.toISOString().split('T')[0],
      value: parseFloat(currentEquity.toFixed(2)),
    });
  }

  const finalEquity = parseFloat(currentEquity.toFixed(2));
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const sharpeRatio = Math.random() * 2 - 0.5; // Random Sharpe
  const maxDrawdown = Math.random() * 30; // Random Max Drawdown %

  logs.push(`Backtest finished. Final Equity: $${finalEquity.toLocaleString()}`);

  return {
    id: `backtest-${Date.now()}`,
    algorithmId: algorithm.id,
    algorithmName: algorithm.name,
    startDate: startDateStr,
    endDate: endDateStr,
    initialCapital,
    finalEquity,
    totalReturn: `${totalReturn.toFixed(2)}%`,
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: `${maxDrawdown.toFixed(2)}%`,
    equityCurve,
    metrics: [
      { name: 'Total Return', value: `${totalReturn.toFixed(2)}%` },
      { name: 'Sharpe Ratio', value: sharpeRatio.toFixed(2) },
      { name: 'Max Drawdown', value: `${maxDrawdown.toFixed(2)}%` },
      { name: 'Number of Trades', value: trades.length },
      { name: 'Winning Trades %', value: `${(Math.random() * 30 + 40).toFixed(1)}%` }, // mock
    ],
    logs,
    trades,
    generatedAt: new Date().toISOString(),
  };
};

export const MOCK_ALGORITHMS: Algorithm[] = [
  { 
    id: 'algo-1', 
    name: 'SMA Crossover Strategy', 
    code: `
def initialize(context):
    context.asset = 'AAPL'
    context.short_window = 20
    context.long_window = 50
    context.invested = False

def handle_data(context, data):
    # prices = data.history(context.asset, 'price', context.long_window, '1d')
    # short_mavg = prices[-context.short_window:].mean()
    # long_mavg = prices.mean()

    # Mock data for example
    short_mavg = data.current(context.asset, 'mock_sma_short') 
    long_mavg = data.current(context.asset, 'mock_sma_long')

    if short_mavg > long_mavg and not context.invested:
        # order_target_percent(context.asset, 1.0)
        print(f"Buying {context.asset}")
        context.invested = True
    elif short_mavg < long_mavg and context.invested:
        # order_target_percent(context.asset, 0.0)
        print(f"Selling {context.asset}")
        context.invested = False
    `, 
    description: 'A simple strategy based on Simple Moving Average crossovers.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  { 
    id: 'algo-2', 
    name: 'RSI Momentum Bot', 
    code: `
def initialize(context):
    context.asset = 'GOOGL'
    context.rsi_period = 14
    context.rsi_oversold = 30
    context.rsi_overbought = 70
    context.invested = False

def handle_data(context, data):
    # prices = data.history(context.asset, 'price', context.rsi_period + 1, '1d')
    # rsi = custom_rsi_calculation(prices, context.rsi_period) # Assuming custom_rsi_calculation exists

    # Mock data for example
    rsi = data.current(context.asset, 'mock_rsi')


    if rsi < context.rsi_oversold and not context.invested:
        # order_target_percent(context.asset, 1.0)
        print(f"RSI Oversold ({rsi:.2f}). Buying {context.asset}")
        context.invested = True
    elif rsi > context.rsi_overbought and context.invested:
        # order_target_percent(context.asset, 0.0)
        print(f"RSI Overbought ({rsi:.2f}). Selling {context.asset}")
        context.invested = False
    `, 
    description: 'Trades based on RSI momentum, buying oversold and selling overbought.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
  { 
    id: 'algo-3', 
    name: 'DTFX Algo Zones Strategy', 
    code: `
def initialize(context):
    # Strategy parameters
    context.symbol = 'MNQ'  # Micro Nasdaq futures
    context.structureLength = 10  # Length for identifying swing points
    context.entryLevel = 0.5  # 50% retracement for entries
    context.stopType = 'Zone'  # Stop loss type: 'Zone', 'Points', 'Ticks', 'ATR'
    context.stopOffset = 0  # Additional offset for zone-based stops
    context.targetRR = 2  # Risk-reward ratio for targets
    context.tickSize = 0.25  # Tick size for MNQ
    context.pointValue = 2  # Point value for MNQ
    context.accountSize = 10000  # Default account size
    context.maxRiskPercent = 1  # Maximum risk per trade (1%)

    # State variables
    context.dir = 0  # Current market direction: 1 for up, -1 for down, 0 for undefined
    context.top = None  # Last swing high price
    context.btm = None  # Last swing low price
    context.topBar = None  # Bar index of last swing high
    context.btmBar = None  # Bar index of last swing low
    context.bos_up_check = False  # Breakout of structure up check
    context.bos_down_check = False  # Breakout of structure down check
    context.lastTop = "NA"  # Last top type (HH or LH)
    context.lastBot = "NA"  # Last bottom type (LL or HL)
    context.t_dir = 0  # Trend direction

    # Trading state
    context.inPosition = False
    context.positionType = None  # 'long' or 'short'
    context.entryPrice = None
    context.stopPrice = None
    context.targetPrice = None
    context.contractSize = 0

    print("DTFX Algo Zones Strategy initialized.")

def calculate_contract_size(entry_price, stop_price, account_size, max_risk_percent, point_value):
    """
    Calculate the number of contracts to trade based on risk parameters
    """
    max_risk_dollars = (max_risk_percent / 100) * account_size
    risk_per_unit = abs(entry_price - stop_price) * point_value

    if risk_per_unit > 0:
        return int(max_risk_dollars / risk_per_unit)
    return 0

def calculate_levels(top, bottom, is_bullish, context):
    """
    Calculate entry, stop, and target prices based on the zone
    """
    # Calculate entry price at the specified retracement level
    entry_price = bottom + context.entryLevel * (top - bottom)

    # Calculate stop price based on the selected stop type
    if context.stopType == 'Zone':
        stop_price = bottom - context.stopOffset * context.tickSize if is_bullish else top + context.stopOffset * context.tickSize
    elif context.stopType == 'Points':
        stop_price = entry_price - context.stopValue if is_bullish else entry_price + context.stopValue
    elif context.stopType == 'Ticks':
        stop_price = entry_price - context.stopValue * context.tickSize if is_bullish else entry_price + context.stopValue * context.tickSize
    elif context.stopType == 'ATR':
        # ATR-based stop would require ATR calculation from historical data
        # For simplicity, we'll use a fixed value here
        atr_value = 5 * context.tickSize  # Example ATR value
        stop_price = entry_price - atr_value if is_bullish else entry_price + atr_value

    # Calculate target price based on risk-reward ratio
    risk = abs(entry_price - stop_price)
    target_price = entry_price + context.targetRR * risk if is_bullish else entry_price - context.targetRR * risk

    return [entry_price, stop_price, target_price]

def handle_data(context, data):
    # Get current price data
    current_bar = data.current(context.symbol)
    high = current_bar.high
    low = current_bar.low
    close = current_bar.close

    # Get historical data for structure identification
    bars = data.history(context.symbol, ['high', 'low'], context.structureLength * 2, '5m')

    # Identify swing points
    upper = max(bars.high[-context.structureLength:])
    lower = min(bars.low[-context.structureLength:])

    # Structure identification logic
    structure_confirmed = 0

    # Identify potential swing high
    if context.dir >= 0 and bars.high[-(context.structureLength + 1)] > upper:
        context.dir = -1
        context.top = bars.high[-(context.structureLength + 1)]
        context.topBar = len(bars.high) - (context.structureLength + 1)
        context.bos_up_check = True
        structure_confirmed = 1
        print(f"Swing high identified at {context.top}")

    # Identify potential swing low
    if context.dir <= 0 and bars.low[-(context.structureLength + 1)] < lower:
        context.dir = 1
        context.btm = bars.low[-(context.structureLength + 1)]
        context.btmBar = len(bars.low) - (context.structureLength + 1)
        context.bos_down_check = True
        structure_confirmed = -1
        print(f"Swing low identified at {context.btm}")

    # Determine if we have higher highs/lows or lower highs/lows
    HH, HL, LH, LL = False, False, False, False

    if structure_confirmed > 0 and context.top > context.top:
        HH = True
        context.lastTop = "HH"
    elif structure_confirmed > 0 and context.top < context.top:
        LH = True
        context.lastTop = "LH"

    if structure_confirmed < 0 and context.btm < context.btm:
        LL = True
        context.lastBot = "LL"
    elif structure_confirmed < 0 and context.btm > context.btm:
        HL = True
        context.lastBot = "HL"

    # Check for change of character (CHOCH) and breakout of structure (BOS)
    choch_up, choch_down, bos_up, bos_down = False, False, False, False

    # CHOCH occurs when price crosses a swing point in the opposite direction of the trend
    if close > context.top and context.t_dir <= 0:
        choch_up = True
        context.t_dir = 1
        print(f"Change of character up detected at {close}")

    if close < context.btm and context.t_dir >= 0:
        choch_down = True
        context.t_dir = -1
        print(f"Change of character down detected at {close}")

    # BOS occurs when price crosses a swing point in the same direction as the trend
    if close > context.top and context.bos_up_check and context.t_dir >= 0:
        bos_up = True
        context.bos_up_check = False
        print(f"Breakout of structure up detected at {close}")

    if close < context.btm and context.bos_down_check and context.t_dir <= 0:
        bos_down = True
        context.bos_down_check = False
        print(f"Breakout of structure down detected at {close}")

    # Market structure shift (MSS) is either a BOS or CHOCH
    mss_up = bos_up or choch_up
    mss_down = bos_down or choch_down

    # Generate trading signals based on market structure shifts
    if mss_up:
        # Bullish zone identified
        _top = context.top
        _bot = lower if context.dir == -1 else context.btm if context.dir == 1 else low

        # Calculate entry, stop, and target levels
        entry_price, stop_price, target_price = calculate_levels(_top, _bot, True, context)

        # Calculate position size
        contract_size = calculate_contract_size(
            entry_price, 
            stop_price, 
            context.accountSize, 
            context.maxRiskPercent, 
            context.pointValue
        )

        print(f"Bullish zone identified: {_bot} to {_top}")
        print(f"Entry: {entry_price}, Stop: {stop_price}, Target: {target_price}, Contracts: {contract_size}")

        # Store signal for execution
        context.entryPrice = entry_price
        context.stopPrice = stop_price
        context.targetPrice = target_price
        context.contractSize = contract_size
        context.positionType = 'long'

    if mss_down:
        # Bearish zone identified
        _top = upper if context.dir == 1 else context.top if context.dir == -1 else high
        _bot = context.btm

        # Calculate entry, stop, and target levels
        entry_price, stop_price, target_price = calculate_levels(_top, _bot, False, context)

        # Calculate position size
        contract_size = calculate_contract_size(
            entry_price, 
            stop_price, 
            context.accountSize, 
            context.maxRiskPercent, 
            context.pointValue
        )

        print(f"Bearish zone identified: {_bot} to {_top}")
        print(f"Entry: {entry_price}, Stop: {stop_price}, Target: {target_price}, Contracts: {contract_size}")

        # Store signal for execution
        context.entryPrice = entry_price
        context.stopPrice = stop_price
        context.targetPrice = target_price
        context.contractSize = contract_size
        context.positionType = 'short'

    # Execute trades when price crosses entry level
    if not context.inPosition and context.entryPrice and context.positionType:
        if context.positionType == 'long' and low <= context.entryPrice and high >= context.entryPrice:
            # Long entry triggered
            print(f"LONG entry triggered at {context.entryPrice} with {context.contractSize} contracts")
            # order(context.symbol, context.contractSize)
            context.inPosition = True
        elif context.positionType == 'short' and high >= context.entryPrice and low <= context.entryPrice:
            # Short entry triggered
            print(f"SHORT entry triggered at {context.entryPrice} with {context.contractSize} contracts")
            # order(context.symbol, -context.contractSize)
            context.inPosition = True

    # Check for stop loss or target hit
    if context.inPosition:
        if context.positionType == 'long':
            if low <= context.stopPrice:
                # Stop loss hit
                print(f"Stop loss hit at {context.stopPrice}")
                # order(context.symbol, -context.contractSize)
                context.inPosition = False
                context.positionType = None
            elif high >= context.targetPrice:
                # Target hit
                print(f"Target hit at {context.targetPrice}")
                # order(context.symbol, -context.contractSize)
                context.inPosition = False
                context.positionType = None
        elif context.positionType == 'short':
            if high >= context.stopPrice:
                # Stop loss hit
                print(f"Stop loss hit at {context.stopPrice}")
                # order(context.symbol, context.contractSize)
                context.inPosition = False
                context.positionType = None
            elif low <= context.targetPrice:
                # Target hit
                print(f"Target hit at {context.targetPrice}")
                # order(context.symbol, context.contractSize)
                context.inPosition = False
                context.positionType = None
    `, 
    description: 'A strategy based on market structure and Fibonacci retracement levels. It identifies swing points, calculates trading zones, and generates entry signals at 50% retracement with 2:1 risk-reward targets.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
