import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { NAV_ITEMS } from './constants';

// Lazy load view components
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const AlgorithmsView = React.lazy(() => import('./views/AlgorithmsView'));
const BacktestingView = React.lazy(() => import('./views/BacktestingView'));
const IndicatorsView = React.lazy(() => import('./views/IndicatorsView'));
const DeploymentsView = React.lazy(() => import('./views/DeploymentsView'));
const DeploymentsManagerView = React.lazy(() => import('./views/DeploymentsManagerView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const TradingView = React.lazy(() => import('./views/TradingView'));
const MarketDataView = React.lazy(() => import('./views/MarketDataView'));
const ChartsView = React.lazy(() => import('./views/ChartsView'));
const SignalsView = React.lazy(() => import('./views/SignalsView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));


const App: React.FC = () => {
  return (
    <ErrorBoundary>
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
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardView />} />
                    <Route path="/algorithms" element={<AlgorithmsView />} />
                    <Route path="/backtesting" element={<BacktestingView />} />
                    <Route path="/indicators" element={<IndicatorsView />} />
                    <Route path="/trading" element={<TradingView />} />
                    <Route path="/charts" element={<ChartsView />} />
                    <Route path="/signals" element={<SignalsView />} />
                    <Route path="/marketdata" element={<MarketDataView />} />
                    <Route path="/deployments" element={<DeploymentsView />} />
                    <Route path="/deployments/manager" element={<DeploymentsManagerView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="*" element={<NotFoundView />} />
                  </Routes>
                </ErrorBoundary>
              </Suspense>
            </main>
          </div>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
