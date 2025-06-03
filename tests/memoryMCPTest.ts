import { createMemoryChain } from '../services/mcpService';
import { explainPythonCodeWithMemory } from '../services/geminiService';
import dotenv from 'dotenv';

// Load environment variables (keeping this for flexibility)
dotenv.config();

// Sample Python code to explain
const sampleCode = `
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

class MovingAverageCrossoverStrategy:
    def __init__(self, short_window=20, long_window=50):
        self.short_window = short_window
        self.long_window = long_window
        self.positions = None
        
    def generate_signals(self, data):
        # Create DataFrame from data
        prices = pd.DataFrame(data)
        
        # Initialize signals DataFrame with 0s
        signals = pd.DataFrame(index=prices.index)
        signals['signal'] = 0
        
        # Create short and long moving averages
        signals['short_mavg'] = prices['close'].rolling(window=self.short_window, min_periods=1).mean()
        signals['long_mavg'] = prices['close'].rolling(window=self.long_window, min_periods=1).mean()
        
        # Generate signals based on moving average crossovers
        signals['signal'][self.short_window:] = np.where(
            signals['short_mavg'][self.short_window:] > signals['long_mavg'][self.short_window:], 1, 0)
        
        # Generate trading orders
        signals['positions'] = signals['signal'].diff()
        
        self.positions = signals
        return signals
        
    def backtest(self, data, initial_capital=100000.0):
        # Create DataFrame from data
        prices = pd.DataFrame(data)
        
        # Generate trading signals
        signals = self.generate_signals(data)
        
        # Create position column (1=long, 0=cash, -1=short)
        positions = pd.DataFrame(index=signals.index).fillna(0.0)
        positions['position'] = signals['signal']
        
        # Initialize portfolio with value owned
        portfolio = pd.DataFrame(index=positions.index)
        portfolio['holdings'] = positions['position'] * prices['close']
        portfolio['cash'] = initial_capital - (positions['position'].diff() * prices['close']).cumsum()
        portfolio['total'] = portfolio['holdings'] + portfolio['cash']
        portfolio['returns'] = portfolio['total'].pct_change()
        
        return portfolio
        
    def plot_results(self, data, portfolio):
        # Create figure and axes
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
        
        # Plot price and moving averages
        prices = pd.DataFrame(data)
        ax1.plot(prices.index, prices['close'], label='Price')
        ax1.plot(self.positions.index, self.positions['short_mavg'], label=f'{self.short_window} Day MA')
        ax1.plot(self.positions.index, self.positions['long_mavg'], label=f'{self.long_window} Day MA')
        
        # Plot buy/sell signals
        ax1.plot(self.positions.loc[self.positions['positions'] == 1.0].index, 
                self.positions['short_mavg'][self.positions['positions'] == 1.0],
                '^', markersize=10, color='g', label='Buy')
        ax1.plot(self.positions.loc[self.positions['positions'] == -1.0].index, 
                self.positions['short_mavg'][self.positions['positions'] == -1.0],
                'v', markersize=10, color='r', label='Sell')
        
        # Plot portfolio value
        ax2.plot(portfolio.index, portfolio['total'], label='Portfolio Value')
        
        # Add labels and legend
        ax1.set_ylabel('Price')
        ax1.legend(loc='best')
        ax1.set_title('Moving Average Crossover Trading Strategy')
        
        ax2.set_xlabel('Date')
        ax2.set_ylabel('Portfolio Value')
        ax2.legend(loc='best')
        
        plt.tight_layout()
        plt.show()

# Example usage:
# data = pd.read_csv('stock_data.csv', index_col='date', parse_dates=True)
# strategy = MovingAverageCrossoverStrategy(short_window=20, long_window=50)
# portfolio = strategy.backtest(data)
# strategy.plot_results(data, portfolio)
`;

// Direct API key for testing
const GEMINI_API_KEY = 'AIzaSyBLFwNj2__fN70ed18kWg7OW_kCLdH0guI';

// Function to test Memory MCP
export async function testMemoryMCP() {
    try {
        console.log("Starting Memory MCP Test...");

        // Use provided API key instead of environment variable
        const apiKey = GEMINI_API_KEY;

        // First request - Explain the code
        console.log("Step 1: Initial code explanation request");
        const initialExplanation = await explainPythonCodeWithMemory(apiKey, sampleCode);
        console.log("\n=== Initial Explanation ===");
        console.log(initialExplanation);

        // Second request - Follow-up question about the backtest method
        console.log("\nStep 2: Follow-up question about backtest method");
        const followUpQuestion1 = await explainPythonCodeWithMemory(
            apiKey,
            "",
            "Can you explain the backtest method in more detail and how it calculates portfolio holdings?"
        );
        console.log("\n=== Follow-up Answer (Backtest Method) ===");
        console.log(followUpQuestion1);

        // Third request - Follow-up question about improving the strategy
        console.log("\nStep 3: Follow-up question about improvements");
        const followUpQuestion2 = await explainPythonCodeWithMemory(
            apiKey,
            "",
            "How could we improve this strategy to handle market volatility better?"
        );
        console.log("\n=== Follow-up Answer (Improvements) ===");
        console.log(followUpQuestion2);

        // Fourth request - Follow-up about parameter optimization
        console.log("\nStep 4: Follow-up question about parameter optimization");
        const followUpQuestion3 = await explainPythonCodeWithMemory(
            apiKey,
            "",
            "How could we implement parameter optimization to find the best moving average windows?"
        );
        console.log("\n=== Follow-up Answer (Parameter Optimization) ===");
        console.log(followUpQuestion3);

        console.log("\nMemory MCP Test Completed Successfully!");

        // Return results for saving
        return {
            initialExplanation,
            followUpQuestion1,
            followUpQuestion2,
            followUpQuestion3
        };
    } catch (error) {
        console.error("Error testing Memory MCP:", error);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testMemoryMCP().then(results => {
        if (results) {
            console.log("Test completed. Run saveMemoryMCPTest.ts to save results to file.");
        }
    });
}
