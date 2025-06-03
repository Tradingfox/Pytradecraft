import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { getStrategies, createStrategy, updateStrategy, deleteStrategy } from '../services/tradingApiService';
import { Strategy, CreateStrategyRequest, UpdateStrategyRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';

const StrategyManagement: React.FC = () => {
  const { sessionToken, selectedBroker, selectedAccountId } = useTradingContext();
  
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  
  // Form state for creating/editing strategies
  const [formData, setFormData] = useState<CreateStrategyRequest>({
    name: '',
    description: '',
    type: 'manual',
    status: 'inactive',
    parameters: {},
    riskLimits: {
      maxPositionSize: 0,
      maxDailyLoss: 0,
      maxDrawdown: 0
    }
  });

  useEffect(() => {
    if (sessionToken && selectedBroker && selectedAccountId) {
      fetchStrategies();
    }
  }, [sessionToken, selectedBroker, selectedAccountId]);

  const fetchStrategies = async () => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getStrategies(selectedBroker, selectedAccountId, sessionToken);
      
      if (response.success) {
        setStrategies(response.strategies);
      } else {
        setError(response.errorMessage || 'Failed to fetch strategies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedBroker || !selectedAccountId) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await createStrategy(selectedBroker, selectedAccountId, formData, sessionToken);
      
      if (response.success) {
        setSuccess('Strategy created successfully');
        setShowCreateForm(false);
        resetForm();
        await fetchStrategies();
      } else {
        setError(response.errorMessage || 'Failed to create strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create strategy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedBroker || !selectedAccountId || !editingStrategy) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updateData: UpdateStrategyRequest = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        parameters: formData.parameters,
        riskLimits: formData.riskLimits
      };
      
      const response = await updateStrategy(selectedBroker, selectedAccountId, editingStrategy.id, updateData, sessionToken);
      
      if (response.success) {
        setSuccess('Strategy updated successfully');
        setEditingStrategy(null);
        resetForm();
        await fetchStrategies();
      } else {
        setError(response.errorMessage || 'Failed to update strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!sessionToken || !selectedBroker || !selectedAccountId) return;
    
    if (!confirm('Are you sure you want to delete this strategy?')) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await deleteStrategy(selectedBroker, selectedAccountId, strategyId, sessionToken);
      
      if (response.success) {
        setSuccess('Strategy deleted successfully');
        await fetchStrategies();
      } else {
        setError(response.errorMessage || 'Failed to delete strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete strategy');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description,
      type: strategy.type,
      status: strategy.status,
      parameters: strategy.parameters,
      riskLimits: strategy.riskLimits
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'manual',
      status: 'inactive',
      parameters: {},
      riskLimits: {
        maxPositionSize: 0,
        maxDailyLoss: 0,
        maxDrawdown: 0
      }
    });
    setEditingStrategy(null);
  };

  const handleInputChange = (field: keyof CreateStrategyRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRiskLimitChange = (field: keyof typeof formData.riskLimits, value: number) => {
    setFormData(prev => ({
      ...prev,
      riskLimits: { ...prev.riskLimits, [field]: value }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30';
      case 'inactive': return 'text-gray-400 bg-gray-900/30';
      case 'paused': return 'text-yellow-400 bg-yellow-900/30';
      case 'error': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'algorithmic': return 'text-blue-400 bg-blue-900/30';
      case 'manual': return 'text-purple-400 bg-purple-900/30';
      case 'hybrid': return 'text-indigo-400 bg-indigo-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Strategy Management</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create Strategy'}
          </button>
          <button
            onClick={fetchStrategies}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {/* Create/Edit Strategy Form */}
      {showCreateForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}
          </h3>
          
          <form onSubmit={editingStrategy ? handleUpdateStrategy : handleCreateStrategy} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Strategy Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  placeholder="Enter strategy name"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  disabled={!!editingStrategy} // Can't change type when editing
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="manual">Manual</option>
                  <option value="algorithmic">Algorithmic</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                placeholder="Describe your strategy..."
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            {/* Risk Limits */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-3">Risk Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Max Position Size</label>
                  <input
                    type="number"
                    value={formData.riskLimits.maxPositionSize}
                    onChange={(e) => handleRiskLimitChange('maxPositionSize', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Max Daily Loss ($)</label>
                  <input
                    type="number"
                    value={formData.riskLimits.maxDailyLoss}
                    onChange={(e) => handleRiskLimitChange('maxDailyLoss', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Max Drawdown (%)</label>
                  <input
                    type="number"
                    value={formData.riskLimits.maxDrawdown}
                    onChange={(e) => handleRiskLimitChange('maxDrawdown', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingStrategy ? 'Update Strategy' : 'Create Strategy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Strategies List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Strategies ({strategies.length})</h3>
        
        {strategies.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No strategies found. Create your first strategy to get started.</p>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-white font-medium text-lg">{strategy.name}</h4>
                    <p className="text-gray-400 text-sm mt-1">{strategy.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(strategy.status)}`}>
                      {strategy.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(strategy.type)}`}>
                      {strategy.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Performance</div>
                    <div className="text-white font-medium">
                      {strategy.performance ? formatPercentage(strategy.performance.totalReturn) : 'N/A'}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {strategy.performance ? `${strategy.performance.totalTrades} trades` : ''}
                    </div>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Risk Limits</div>
                    <div className="text-white text-sm">
                      Max Loss: {formatCurrency(strategy.riskLimits.maxDailyLoss)}
                    </div>
                    <div className="text-white text-sm">
                      Max DD: {formatPercentage(strategy.riskLimits.maxDrawdown)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400 text-xs">Created</div>
                    <div className="text-white text-sm">{formatDateTime(strategy.createdAt)}</div>
                    <div className="text-gray-400 text-xs">
                      Updated: {formatDateTime(strategy.updatedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => startEditing(strategy)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strategy.id)}
                    disabled={strategy.status === 'active'}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyManagement; 