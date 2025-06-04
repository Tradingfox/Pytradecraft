
import React, { Suspense } from 'react'; // Import Suspense
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner'; // Import LoadingSpinner
import { NAV_ITEMS } from './constants';

// Lazy load view components
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const AlgorithmsView = React.lazy(() => import('./views/AlgorithmsView'));
const BacktestingView = React.lazy(() => import('./views/BacktestingView'));
const IndicatorsView = React.lazy(() => import('./views/IndicatorsView'));
const DeploymentsView = React.lazy(() => import('./views/DeploymentsView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const TradingView = React.lazy(() => import('./views/TradingView'));
const MarketDataView = React.lazy(() => import('./views/MarketDataView'));
const ChartsView = React.lazy(() => import('./views/ChartsView'));


const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
        <Sidebar navItems={NAV_ITEMS} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="PyTradeCraft" />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-4 sm:p-6">
            <Suspense fallback={
              <div className="flex justify-center items-center h-full w-full">
                <LoadingSpinner message="Loading page..." />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardView />} />
                <Route path="/algorithms" element={<AlgorithmsView />} />
                <Route path="/backtesting" element={<BacktestingView />} />
                <Route path="/indicators" element={<IndicatorsView />} />
                <Route path="/trading" element={<TradingView />} />
                <Route path="/charts" element={<ChartsView />} />
                <Route path="/marketdata" element={<MarketDataView />} />
                <Route path="/deployments" element={<DeploymentsView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
