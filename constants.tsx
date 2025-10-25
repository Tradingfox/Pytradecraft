import React from 'react';
import { NavItem } from './types';

// SVG Icon Components (simple examples)
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

const CodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311V21m-3.75-2.311V21m0 0H9m3.75 0h3.75M12 3v1.5M12 6.75v1.5m0-1.5A3.375 3.375 0 008.625 3.625M12 6.75A3.375 3.375 0 0115.375 3.625m0 0A3.375 3.375 0 0012 3.375M4.125 9A3.375 3.375 0 006.375 6.375m0 0A3.375 3.375 0 014.125 9m15.75 0A3.375 3.375 0 0117.625 6.375m0 0A3.375 3.375 0 0019.875 9" />
  </svg>
);

const RocketLaunchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a17.96 17.96 0 00-5.84-2.56m5.84 2.56A17.96 17.96 0 0121.75 12 17.96 17.96 0 0115.59 14.37m-5.84 7.38a6 6 0 01-5.84-7.38m5.84 7.38a17.96 17.96 0 005.84-2.56m-5.84 2.56L11.25 12l4.34-2.37a17.96 17.96 0 00-5.84-2.56m0 0L5.84 7.38a6 6 0 005.84 7.38" />
  </svg>
);

const ServerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
);

const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93s.844.17 1.25.07l.86-.215c.527-.132 1.06.196 1.262.724l.54 1.08c.203.407.098.91-.247 1.226l-.648.578c-.32.285-.468.716-.418 1.135l.076.625c.05.42.05.844 0 1.264l-.076.625c-.05.42-.1.85.27 1.135l.648.578c.345.316.45.82.247 1.226l-.54 1.08c-.202.429-.735.756-1.262.724l-.86-.215c-.406-.1-.847-.06-1.25.07s-.71.505-.78.93l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.149-.894c-.07-.424-.384-.764-.78-.93s-.844-.17-1.25-.07l-.86.215c-.527-.132-1.06.196-1.262.724l-.54-1.08c-.203-.407-.098-.91.247-1.226l.648-.578c.32-.285.468.716-.418-1.135l-.075-.625c-.05-.42-.05-.844 0-1.264l.075-.625c.05-.42.1-.85-.27-1.135l-.648-.578c-.345-.316-.45-.82-.247-1.226l.54-1.08c.202-.428.735-.756 1.262-.724l.86.215c.406.1.847.06 1.25-.07s.71-.505.78-.93l.15-.894z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

const PresentationChartLineIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

const ChartCandlestickIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m0-6.75V12m9-2.25v6.75M12 9.75v4.5m-7.5-1.5h15M3.75 12h1.5M18.75 12h1.5" />
  </svg>
);

const BellAlertIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
  </svg>
);


export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: (props) => <HomeIcon {...props} /> },
  { id: 'algorithms', label: 'Algorithms', path: '/algorithms', icon: (props) => <CodeIcon {...props} /> },
  { id: 'backtesting', label: 'Backtesting', path: '/backtesting', icon: (props) => <ChartBarIcon {...props} /> },
  { id: 'indicators', label: 'Indicators', path: '/indicators', icon: (props) => <LightBulbIcon {...props} /> },
  { id: 'trading', label: 'Trading', path: '/trading', icon: (props) => <ChartIcon {...props} /> },
  { id: 'charts', label: 'Charts', path: '/charts', icon: (props) => <ChartCandlestickIcon {...props} /> },
  { id: 'signals', label: 'Signals', path: '/signals', icon: (props) => <BellAlertIcon {...props} /> },
  { id: 'marketdata', label: 'Market Data', path: '/marketdata', icon: (props) => <PresentationChartLineIcon {...props} /> },
  { id: 'broker-connect', label: 'Broker Connect', path: '/deployments', icon: (props) => <RocketLaunchIcon {...props} /> },
  { id: 'deployments', label: 'Algo Deployments', path: '/deployments/manager', icon: (props) => <ServerIcon {...props} /> },
  { id: 'settings', label: 'Settings', path: '/settings', icon: (props) => <CogIcon {...props} /> },
];

export const DEFAULT_ALGORITHM_CODE = `
# Welcome to PyTradeCraft!
# This is a sample Python trading algorithm.
# You can use common libraries like pandas and numpy.

# The environment provides a 'context' object and 'data' object.
# - context: For storing variables between trading iterations.
# - data: For accessing market data.

def initialize(context):
    """
    Called once at the start of the algorithm.
    """
    context.asset = 'AAPL'  # Example asset
    context.lookback_period = 20
    context.sma_short = 0
    context.sma_long = 0
    context.invested = False
    print("Algorithm initialized.")

def handle_data(context, data):
    """
    Called on each new market data event.
    """
    # Example: Simple Moving Average Crossover
    # This is a simplified example. Real data access would be more complex.
    # prices = data.history(context.asset, 'price', context.lookback_period * 2, '1d')
    # if prices is None or len(prices) < context.lookback_period * 2:
    #     return

    # context.sma_short = prices[-context.lookback_period:].mean()
    # context.sma_long = prices.mean() # Simplified long SMA over entire period

    # Mock SMA values for demonstration
    context.sma_short = data.current(context.asset, 'mock_sma_short') 
    context.sma_long = data.current(context.asset, 'mock_sma_long')

    if context.sma_short > context.sma_long and not context.invested:
        # order_target_percent(context.asset, 1.0) # Simulate order
        print(f"Buying {context.asset} - Short SMA: {context.sma_short:.2f}, Long SMA: {context.sma_long:.2f}")
        context.invested = True
    elif context.sma_short < context.sma_long and context.invested:
        # order_target_percent(context.asset, 0) # Simulate order
        print(f"Selling {context.asset} - Short SMA: {context.sma_short:.2f}, Long SMA: {context.sma_long:.2f}")
        context.invested = False
    else:
        print(f"Holding {context.asset} - Short SMA: {context.sma_short:.2f}, Long SMA: {context.sma_long:.2f}")

# Mock data access for the example handle_data function
class MockMarketData:
    def __init__(self):
        self.mock_data = {
            'AAPL': {
                'mock_sma_short': 150.0,
                'mock_sma_long': 148.0,
            }
        }
        self._counter = 0

    def current(self, asset, field):
        # Simulate changing data
        self._counter +=1
        if self._counter % 10 == 0 : // change direction
             self.mock_data[asset]['mock_sma_short'] = 140 + (self._counter % 30)
             self.mock_data[asset]['mock_sma_long'] = 145 + (self._counter % 20)
        else:
             self.mock_data[asset]['mock_sma_short'] = 150 - (self._counter % 30)
             self.mock_data[asset]['mock_sma_long'] = 148 - (self._counter % 20)

        return self.mock_data.get(asset, {}).get(field, 0)

# Example usage (not part of the algorithm string, but for understanding)
# context_obj = type('Context', (), {})() // mock context
# data_obj = MockMarketData()
# initialize(context_obj)
# for _ in range(5): // Simulate 5 ticks
#    handle_data(context_obj, data_obj)

`;

export const GEMINI_API_KEY_INFO_URL = "https://aistudio.google.com/app/apikey";
export const GEMINI_PYTHON_SYSTEM_INSTRUCTION = `You are an expert Python developer specializing in quantitative trading algorithms.
Generate Python code for trading strategies.
The code should be compatible with a conceptual trading environment that provides:
1. An \`initialize(context)\` function, called once at the start. Use \`context\` to store state.
2. A \`handle_data(context, data)\` function, called for each new market event (e.g., daily, minutely).
   - \`data.current(asset, field)\` can be used to get current market data (e.g., price).
   - \`data.history(asset, field, lookback_periods, frequency)\` can be used to get historical data (returns a pandas-like Series).
   - Orders can be simulated with comments like \`# order_target_percent(asset, percentage)\` or \`# order(asset, shares)\`.

Focus on clear, well-commented, and logically sound Python code.
Assume common libraries like 'pandas' and 'numpy' are available if needed, but try to keep it self-contained where possible for simple strategies.
Do not include any surrounding text, explanations, or markdown formatting like \`\`\`python ... \`\`\` unless it's part of a comment within the code itself. Only provide the raw Python code block.
`;

export const PYTHON_CODE_GENERATION_MODEL = 'gemini-2.5-flash-preview-04-17';
export const PYTHON_CODE_EXPLANATION_MODEL = 'gemini-2.5-flash-preview-04-17';

// Trading Platform Constants
export const PROJECTX_API_BASE_URL = 'https://gateway-api-demo.s2f.projectx.com/api';
export const PROJECTX_DEFAULT_APP_ID = 'B76015F2-04D3-477E-9191-C5E22CB2C957'; // From PDF
export const PROJECTX_USER_HUB_URL = 'wss://gateway-rtc-demo.s2f.projectx.com/hubs/user';
export const PROJECTX_MARKET_HUB_URL = 'wss://gateway-rtc-demo.s2f.projectx.com/hubs/market'; // Added for market data streaming

// TopstepX API Endpoints
export const TOPSTEPX_API_BASE_URL = 'https://api.topstepx.com'; // Keep as HTTPS for REST API calls
export const TOPSTEPX_USER_HUB_URL = 'https://rtc.topstepx.com/hubs/user'; 
export const TOPSTEPX_MARKET_HUB_URL = 'https://rtc.topstepx.com/hubs/market';
export const TOPSTEPX_HISTORICAL_DATA_ENDPOINT = '/api/History/GetBars';
