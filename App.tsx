
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './views/DashboardView';
import AlgorithmsView from './views/AlgorithmsView';
import BacktestingView from './views/BacktestingView';
import IndicatorsView from './views/IndicatorsView';
import DeploymentsView from './views/DeploymentsView';
import SettingsView from './views/SettingsView';
import TradingView from './views/TradingView';
import MarketDataView from './views/MarketDataView';
import ChartsView from './views/ChartsView';
import { NAV_ITEMS } from './constants';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
        <Sidebar navItems={NAV_ITEMS} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="PyTradeCraft" />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-4 sm:p-6">
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
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
