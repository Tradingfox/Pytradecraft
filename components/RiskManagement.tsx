import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { getRiskLimits, updateRiskLimits } from '../services/tradingApiService';
import { RiskLimits, UpdateRiskLimitsRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';

const RiskManagement: React.FC = () => {
  const { selectedAccountId, sessionToken, selectedBroker } = useTradingContext();
  
  const [riskLimits, setRiskLimits] = useState<RiskLimits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [platformNote, setPlatformNote] = useState<string | null>(null);
  
  // Form state for editing
  const [formData, setFormData] = useState<Partial<UpdateRiskLimitsRequest>>({});

  useEffect(() => {
    if (selectedAccountId && sessionToken && selectedBroker) {
      fetchRiskLimits();
    }
  }, [selectedAccountId, sessionToken, selectedBroker]);
  const fetchRiskLimits = async () => {
    if (!selectedAccountId || !sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getRiskLimits(selectedBroker, sessionToken, { accountId: selectedAccountId });
      if (response.success) {
        setRiskLimits(response.limits);
        
        // For platform-managed risk (TopStepX), show the platform note and disable editing
        if (response.limits.platformManaged) {
          console.log('ℹ️ Risk management is platform-managed:', response.platformNote);
          setPlatformNote(response.platformNote || null);
        } else {
          setPlatformNote(null);
          // Initialize form data with current limits for editable systems
          setFormData({
            accountId: selectedAccountId,
            maxDailyLoss: response.limits.maxDailyLoss,
            maxDrawdown: response.limits.maxDrawdown,
            maxPositionSize: response.limits.maxPositionSize,
            maxOrderSize: response.limits.maxOrderSize,
            maxOpenOrders: response.limits.maxOpenOrders,
            maxOpenPositions: response.limits.maxOpenPositions,
            allowedContracts: response.limits.allowedContracts,
            restrictedContracts: response.limits.restrictedContracts,
          });
        }
      } else {
        setError(response.errorMessage || 'Failed to fetch risk limits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk limits');
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateRiskLimits = async () => {
    if (!selectedAccountId || !sessionToken || !selectedBroker) return;
    
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);
      try {
      // Ensure formData has the required accountId property
      const completeFormData: UpdateRiskLimitsRequest = {
        accountId: selectedAccountId,
        ...formData as Omit<UpdateRiskLimitsRequest, 'accountId'>
      };
      
      const response = await updateRiskLimits(selectedBroker, sessionToken, completeFormData);
      if (response.success) {
        setSuccessMessage('Risk limits updated successfully');
        setIsEditing(false);
        // Refresh the data
        await fetchRiskLimits();
      } else {
        setError(response.errorMessage || 'Failed to update risk limits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update risk limits');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field: keyof UpdateRiskLimitsRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field: 'allowedContracts' | 'restrictedContracts', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setFormData(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!selectedAccountId) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Risk Management</h2>
        <p className="text-gray-400">Please select an account to view risk limits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Risk Management</h2>
        <div className="space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={fetchRiskLimits}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading || !riskLimits || riskLimits.platformManaged}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {riskLimits?.platformManaged ? 'Platform Managed' : 'Edit Limits'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={isUpdating}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRiskLimits}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {platformNote && (
        <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <div className="font-medium mb-1">Platform-Managed Risk Settings</div>
              <div className="text-sm">{platformNote}</div>
              {selectedBroker === 'topstepx' && (
                <div className="text-xs mt-2 text-blue-300">
                  Configure these settings through your TopStepX platform: Settings → Risk Settings
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {riskLimits && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Limits */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Financial Limits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Daily Loss</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxDailyLoss || ''}
                    onChange={(e) => handleInputChange('maxDailyLoss', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max daily loss"
                  />
                ) : (
                  <div className="text-white font-medium">{formatCurrency(riskLimits.maxDailyLoss)}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Drawdown</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxDrawdown || ''}
                    onChange={(e) => handleInputChange('maxDrawdown', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max drawdown"
                  />
                ) : (
                  <div className="text-white font-medium">{formatCurrency(riskLimits.maxDrawdown)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Position & Order Limits */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Position & Order Limits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Position Size</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxPositionSize || ''}
                    onChange={(e) => handleInputChange('maxPositionSize', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max position size"
                  />
                ) : (
                  <div className="text-white font-medium">{riskLimits.maxPositionSize.toLocaleString()}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Order Size</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxOrderSize || ''}
                    onChange={(e) => handleInputChange('maxOrderSize', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max order size"
                  />
                ) : (
                  <div className="text-white font-medium">{riskLimits.maxOrderSize.toLocaleString()}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Open Orders</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxOpenOrders || ''}
                    onChange={(e) => handleInputChange('maxOpenOrders', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max open orders"
                  />
                ) : (
                  <div className="text-white font-medium">{riskLimits.maxOpenOrders}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Open Positions</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.maxOpenPositions || ''}
                    onChange={(e) => handleInputChange('maxOpenPositions', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter max open positions"
                  />
                ) : (
                  <div className="text-white font-medium">{riskLimits.maxOpenPositions}</div>
                )}
              </div>
            </div>
          </div>

          {/* Trading Hours */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trading Hours</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Start Time:</span>
                <span className="text-white font-medium">{formatTime(riskLimits.tradingHours.start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">End Time:</span>
                <span className="text-white font-medium">{formatTime(riskLimits.tradingHours.end)}</span>
              </div>
              {riskLimits.tradingHours.timezone && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Timezone:</span>
                  <span className="text-white font-medium">{riskLimits.tradingHours.timezone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contract Restrictions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contract Restrictions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Allowed Contracts</label>
                {isEditing ? (
                  <textarea
                    value={formData.allowedContracts?.join(', ') || ''}
                    onChange={(e) => handleArrayInputChange('allowedContracts', e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-20"
                    placeholder="Enter contract IDs separated by commas"
                  />
                ) : (
                  <div className="text-white text-sm">
                    {riskLimits.allowedContracts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {riskLimits.allowedContracts.map((contract, index) => (
                          <span key={index} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                            {contract}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">All contracts allowed</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Restricted Contracts</label>
                {isEditing ? (
                  <textarea
                    value={formData.restrictedContracts?.join(', ') || ''}
                    onChange={(e) => handleArrayInputChange('restrictedContracts', e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-20"
                    placeholder="Enter contract IDs separated by commas"
                  />
                ) : (
                  <div className="text-white text-sm">
                    {riskLimits.restrictedContracts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {riskLimits.restrictedContracts.map((contract, index) => (
                          <span key={index} className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                            {contract}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">No restrictions</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Status Indicators */}
      {riskLimits && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="text-white font-medium">Risk Limits</div>
              <div className="text-green-400 text-sm">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⏰</div>
              <div className="text-white font-medium">Trading Hours</div>
              <div className="text-blue-400 text-sm">
                {riskLimits.tradingHours.start} - {riskLimits.tradingHours.end}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-white font-medium">Contract Access</div>
              <div className="text-yellow-400 text-sm">
                {riskLimits.allowedContracts.length > 0 ? 'Restricted' : 'Full Access'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskManagement; 