import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { Position, Contract } from '../types';

interface PositionManagementProps {
  selectedContract?: Contract | null;
}

const PositionManagement: React.FC<PositionManagementProps> = ({ selectedContract }) => {  const {
    selectedAccountId,
    livePositionUpdates,
    fetchOpenPositions,
    closePosition,
    partialClosePosition,
    subscribeToPositionsAndQuotes
  } = useTradingContext();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [partialCloseSize, setPartialCloseSize] = useState<{ [key: string]: number }>({});
  const [showPartialClose, setShowPartialClose] = useState<{ [key: string]: boolean }>({});

  // Filter positions by selected contract if applicable
  const filteredPositions = React.useMemo(() => 
    selectedContract 
      ? livePositionUpdates.filter(position => position.contractId === selectedContract.id)
      : livePositionUpdates,
    [livePositionUpdates, selectedContract]
  );

  // Load positions on component mount or when account/contract changes
  useEffect(() => {
    if (selectedAccountId) {
      loadPositions();
    }
  }, [selectedAccountId, selectedContract]);

  // Log position updates (useful for debugging)
  useEffect(() => {
    console.log('PositionManagement received livePositionUpdates:', livePositionUpdates.map(pos => ({
      contractId: pos.contractId,
      type: pos.type,
      size: pos.size,
      avgPrice: pos.averagePrice,
      marketPrice: pos.marketPrice,
      pnl: pos.profitAndLoss
    })));
  }, [livePositionUpdates]);

  // Subscribe to quotes for all position contracts
  useEffect(() => {
    if (filteredPositions.length > 0) {
      const contractIds = filteredPositions.map(pos => pos.contractId);
      const uniqueContractIds = [...new Set(contractIds)];
      
      uniqueContractIds.forEach(contractId => {
        console.log(`PositionManagement: Subscribing to position and market data for contract: ${contractId}`);
        subscribeToPositionsAndQuotes(contractId).catch(err => 
          console.error(`Error subscribing to position and market data for ${contractId} from PositionManagement:`, err)
        );
      });
    }
    // TODO: Consider unsubscribing when contracts are no longer in filteredPositions
  }, [filteredPositions, subscribeToPositionsAndQuotes]);

  const loadPositions = async () => {
    if (!selectedAccountId) {
      setError('Please select an account first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await fetchOpenPositions();
    } catch (error) {
      setError(`Error fetching positions: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (contractId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await closePosition(contractId);
      if (result.success) {
        setSuccess(`Position closed successfully!`);
        // Refresh positions
        await fetchOpenPositions();
      } else {
        setError(result.errorMessage || 'Failed to close position');
      }
    } catch (error) {
      setError(`Error closing position: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartialClosePosition = async (contractId: string) => {
    if (!partialCloseSize[contractId]) {
      setError('Please enter a valid size for partial close');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await partialClosePosition(contractId, partialCloseSize[contractId]);
      if (result.success) {
        setSuccess(`Position partially closed successfully!`);
        // Refresh positions
        await fetchOpenPositions();
        // Reset UI state
        setShowPartialClose({ ...showPartialClose, [contractId]: false });
        setPartialCloseSize({ ...partialCloseSize, [contractId]: 0 });
      } else {
        setError(result.errorMessage || 'Failed to partially close position');
      }
    } catch (error) {
      setError(`Error partially closing position: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePartialClose = (contractId: string, position: Position) => {
    setShowPartialClose({
      ...showPartialClose,
      [contractId]: !showPartialClose[contractId]
    });
    
    // Set default partial close size to half the position size
    if (!showPartialClose[contractId]) {
      setPartialCloseSize({
        ...partialCloseSize,
        [contractId]: Math.floor(position.size / 2)
      });
    }
  };
  const getPositionTypeText = (type: number): string => {
    return type === 0 ? 'Short' : 'Long';
  };

  // Enhance positions with calculated P&L if needed
  const enhancedPositions = React.useMemo(() => {
    return filteredPositions.map(position => ({
      ...position,
      // Ensure displayPnL is always a number, defaulting to 0 if profitAndLoss is not a valid number
      displayPnL: (typeof position.profitAndLoss === 'number' && !isNaN(position.profitAndLoss)) ? position.profitAndLoss : 0,
    }));
  }, [filteredPositions]);

  // Calculate total P&L using enhanced positions
  const calculateTotalPnL = (): number => {
    const total = enhancedPositions.reduce((acc, position) => {
      // Ensure we are adding numbers
      const pnlValue = (typeof position.displayPnL === 'number' && !isNaN(position.displayPnL)) ? position.displayPnL : 0;
      return acc + pnlValue;
    }, 0);
    // console.log('Total P&L:', total); // Keep for debugging if needed
    return total;
  };

  return (
    <div className="position-management">
      <h2 className="text-xl font-bold mb-4">Position Management</h2>

      {/* Positions Table */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Open Positions</h3>
          <div className="flex items-center">
            <span className="mr-4">
              Total P&L: 
              <span className={`font-bold ml-1 ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${calculateTotalPnL().toFixed(2)}
              </span>
            </span>
            <button
              onClick={loadPositions}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
            {success}
          </div>
        )}

        {filteredPositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enhancedPositions.map(position => (
                  <React.Fragment key={`${position.contractId}-${position.type}`}>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{position.contractId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${position.type === 1 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {getPositionTypeText(position.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{position.size}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">${position.averagePrice.toFixed(2)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {position.marketPrice ? `$${position.marketPrice.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {(typeof position.displayPnL === 'number' && !isNaN(position.displayPnL)) ? (
                          <span className={`${position.displayPnL >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            ${position.displayPnL.toFixed(2)}
                            {(typeof position.profitAndLoss !== 'number' || isNaN(position.profitAndLoss)) && <sup>*</sup>}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleClosePosition(position.contractId)}
                            className="text-red-500 hover:text-red-700"
                            disabled={isLoading}
                          >
                            Close
                          </button>
                          <button
                            onClick={() => togglePartialClose(position.contractId, position)}
                            className="text-blue-500 hover:text-blue-700"
                            disabled={isLoading}
                          >
                            Partial
                          </button>
                        </div>
                      </td>
                    </tr>
                    {showPartialClose[position.contractId] && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">Partial close size:</span>
                            <input
                              type="number"
                              min="1"
                              max={position.size - 1}
                              className="w-24 p-1 border rounded"
                              value={partialCloseSize[position.contractId] || ''}
                              onChange={(e) => setPartialCloseSize({
                                ...partialCloseSize,
                                [position.contractId]: Math.min(position.size - 1, Math.max(1, parseInt(e.target.value) || 0))
                              })}
                            />
                            <button
                              onClick={() => handlePartialClosePosition(position.contractId)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              disabled={isLoading || !partialCloseSize[position.contractId] || partialCloseSize[position.contractId] >= position.size}
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => setShowPartialClose({...showPartialClose, [position.contractId]: false})}
                              className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {isLoading ? 'Loading positions...' : 'No open positions found'}
          </p>
        )}
      </div>
    </div>
  );
};

export default PositionManagement;
