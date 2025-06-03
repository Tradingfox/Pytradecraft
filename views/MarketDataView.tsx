import React from 'react';
import MarketData from '../components/MarketData';
import { useTradingContext } from '../contexts/TradingContext';

const MarketDataView: React.FC = () => {
  const { selectedBroker, sessionToken } = useTradingContext();

  if (!selectedBroker || !sessionToken) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Market Data</h1>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Connect to a Broker</h2>
          <p className="text-gray-400 mb-4">
            To view market data, please connect to a broker first through the Broker Connect tab.
          </p>
          <p className="text-gray-400">
            Once connected, you'll be able to view real-time quotes, market depth, recent trades, and order book data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Market Data</h1>
      <MarketData />
    </div>
  );
};

export default MarketDataView; 