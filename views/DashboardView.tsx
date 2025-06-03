
import React from 'react';
import { Link } from 'react-router-dom';
import SectionPanel from '../components/SectionPanel';
import { NAV_ITEMS } from '../constants.tsx';

const DashboardView: React.FC = () => {
  const quickAccessItems = NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').slice(0, 4);

  return (
    <div className="space-y-6">
      <SectionPanel title="Welcome to PyTradeCraft">
        <p className="text-lg text-gray-300">
          Your integrated environment for developing, backtesting, and deploying Python trading algorithms.
        </p>
        <p className="mt-2 text-gray-400">
          Navigate using the sidebar or the quick access links below. Start by creating a new algorithm or exploring existing ones.
        </p>
      </SectionPanel>

      <SectionPanel title="Quick Access">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccessItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              className="bg-gray-700 hover:bg-sky-600 text-white p-6 rounded-lg shadow-md transition-all duration-200 ease-in-out flex flex-col items-center text-center"
            >
              <item.icon className="w-10 h-10 mb-3" />
              <span className="font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </SectionPanel>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel title="Recent Activity (Mock)">
          <ul className="space-y-2 text-sm">
            <li className="text-gray-400">Backtest completed for 'SMA Crossover Strategy'.</li>
            <li className="text-gray-400">New algorithm 'Volatility Breakout' created.</li>
            <li className="text-gray-400">Indicator 'Custom MACD' updated.</li>
            <li className="text-gray-400">Deployed 'RSI Momentum Bot' to paper account.</li>
          </ul>
        </SectionPanel>
        
        <SectionPanel title="System Status (Mock)">
            <div className="space-y-2 text-sm">
                <p className="text-gray-400">Market Data Feed: <span className="text-green-400">Connected</span></p>
                <p className="text-gray-400">Broker Connection (Paper): <span className="text-green-400">Active</span></p>
                <p className="text-gray-400">Last Gemini Sync: <span className="text-gray-300">{new Date().toLocaleTimeString()}</span></p>
                <p className="text-gray-400">Active Algorithms: <span className="text-gray-300">2</span></p>
            </div>
        </SectionPanel>
      </div>
    </div>
  );
};

export default DashboardView;
