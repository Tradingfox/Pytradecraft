
import React from 'react';
import { Link } from 'react-router-dom';
import SectionPanel from '../components/SectionPanel';
import { NAV_ITEMS } from '../constants.tsx';
// useTradingContext and HubConnectionStatus are no longer needed here directly
// useNavigate was only used for the inline SystemStatus, now encapsulated
import AccountSummaryWidget from '../components/Dashboard/AccountSummaryWidget';
import MarketOverviewWidget from '../components/Dashboard/MarketOverviewWidget';
import RecentActivityWidget from '../components/Dashboard/RecentActivityWidget'; // Import new widget
import SystemStatusWidget from '../components/Dashboard/SystemStatusWidget';   // Import new widget

const DashboardView: React.FC = () => {
  const quickAccessItems = NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').slice(0, 4);

  // Context consumption and helper functions (like getStatusColor, navigate)
  // are now moved into SystemStatusWidget.

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
      
      {/* Changed to md:grid-cols-2 for a 2x2 layout on medium screens and up */}
      {/* Main dashboard widgets in a 2x2 grid on medium screens and up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountSummaryWidget />
        <MarketOverviewWidget />
        <SystemStatusWidget />   {/* New component */}
        <RecentActivityWidget /> {/* New component */}
      </div>
    </div>
  );
};

export default DashboardView;
