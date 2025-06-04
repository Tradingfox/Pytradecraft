import React from 'react';
import SectionPanel from '../SectionPanel'; // Adjust path as needed

const RecentActivityWidget: React.FC = () => {
  return (
    <SectionPanel title="Recent Activity (Mock)">
      <ul className="space-y-2 text-sm">
        <li className="text-gray-400">Backtest completed for 'SMA Crossover Strategy'.</li>
        <li className="text-gray-400">New algorithm 'Volatility Breakout' created.</li>
        <li className="text-gray-400">Indicator 'Custom MACD' updated.</li>
        <li className="text-gray-400">Deployed 'RSI Momentum Bot' to paper account.</li>
        <li className="text-gray-400">User 'demo_user' logged in.</li>
        <li className="text-gray-400">Market data stream for 'ESM4' started.</li>
      </ul>
    </SectionPanel>
  );
};

export default RecentActivityWidget;
