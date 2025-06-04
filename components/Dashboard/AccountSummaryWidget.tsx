import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useTradingContext } from '../../contexts/TradingContext';
import { TradingAccount, Position } from '../../types';
import SectionPanel from '../SectionPanel';
import LoadingSpinner from '../LoadingSpinner';

const AccountSummaryWidget: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const {
    selectedAccountId,
    userAccounts,
    livePositionUpdates,
    isAuthenticated,
    isLoading // Using global isLoading for simplicity, could be more granular
  } = useTradingContext();

  if (!isAuthenticated || !selectedAccountId) {
    return (
      <SectionPanel title="Account Summary">
        <p className="text-gray-400 text-sm text-center py-4">
          Please connect to a broker and select an account to view summary.
        </p>
      </SectionPanel>
    );
  }

  if (isLoading && !userAccounts.length) { // Show loading if loading and no accounts yet
    return (
      <SectionPanel title="Account Summary">
        <div className="flex justify-center items-center h-24">
          <LoadingSpinner message="Loading account details..." />
        </div>
      </SectionPanel>
    );
  }

  const selectedAccount = userAccounts.find(acc => acc.id === selectedAccountId);

  if (!selectedAccount) {
    return (
      <SectionPanel title="Account Summary">
        <p className="text-gray-400 text-sm text-center py-4">
          Selected account details not found.
        </p>
      </SectionPanel>
    );
  }

  const accountPositions = livePositionUpdates.filter(
    (pos: Position) => pos.accountId === selectedAccountId && pos.size !== 0
  );

  const openPnL = accountPositions.reduce((sum, pos) => sum + (pos.profitAndLoss || 0), 0);

  // Determine equity: use account.equity if available, otherwise balance + openPnL
  // The Position type has `profitAndLoss` which is often unrealized P&L for open positions.
  // Some brokers provide `equity` directly on the account object.
  const displayEquity = selectedAccount.equity !== undefined
    ? selectedAccount.equity
    : (selectedAccount.balance !== undefined ? selectedAccount.balance : 0) + openPnL;

  const formatCurrency = (value: number | undefined, currency: string = 'USD') => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  return (
    <SectionPanel title={`Account: ${selectedAccount.name || selectedAccount.id}`}>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-400 font-medium">Account ID: </span>
          <span className="text-gray-200">{selectedAccount.id}</span>
        </div>
        <div>
          <span className="text-gray-400 font-medium">Balance: </span>
          <span className="text-gray-200">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</span>
        </div>
        <div>
          <span className="text-gray-400 font-medium">Equity: </span>
          <span className="text-gray-200">{formatCurrency(displayEquity, selectedAccount.currency)}</span>
        </div>
        <div>
          <span className="text-gray-400 font-medium">Open P&L: </span>
          <span className={`${getPnlColor(openPnL)} font-semibold`}>
            {formatCurrency(openPnL, selectedAccount.currency)}
          </span>
        </div>
         {accountPositions.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs text-gray-400 font-medium mb-1">Open Positions ({accountPositions.length}):</h4>
            <ul className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar"> {/* Removed list-disc for cleaner look */}
              {accountPositions.map(pos => (
                <li
                  key={pos.id}
                  className="text-xs p-1 hover:bg-gray-700 rounded cursor-pointer"
                  onClick={() => navigate('/trading', {
                    state: {
                      selectedContractId: pos.contractId,
                      // Pass contract name if available, might need to fetch contract details first
                      // For now, just contractId. TradingView can search by ID.
                      // selectedContractName: pos.contractId // Placeholder
                    }
                  })}
                  title={`Trade ${pos.contractId}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sky-400 font-semibold">{pos.contractId}</span>
                    <span className={`font-bold ${pos.size > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pos.size > 0 ? 'Long' : 'Short'} {Math.abs(pos.size)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Avg Price: {formatCurrency(pos.averagePrice, selectedAccount.currency)}</span>
                    <span className={getPnlColor(pos.profitAndLoss || 0)}>
                      P&L: {formatCurrency(pos.profitAndLoss, selectedAccount.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
         {accountPositions.length === 0 && (
            <p className="text-xs text-gray-500 pt-2">No open positions for this account.</p>
        )}
      </div>
    </SectionPanel>
  );
};

export default AccountSummaryWidget;
