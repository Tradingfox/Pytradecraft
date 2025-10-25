
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { TradingProvider } from './contexts/TradingContext';
import { AuthProvider } from './contexts/AuthContext';
import { SignalRProvider } from './contexts/SignalRContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProvider>
      <AuthProvider>
        <SignalRProvider>
          <TradingProvider>
            <App />
          </TradingProvider>
        </SignalRProvider>
      </AuthProvider>
    </AppProvider>
  </React.StrictMode>
);