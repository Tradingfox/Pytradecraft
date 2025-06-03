import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { 
  getAlerts, 
  createAlert, 
  updateAlert, 
  deleteAlert 
} from '../services/tradingApiService';
import { 
  Alert, 
  CreateAlertRequest, 
  UpdateAlertRequest 
} from '../types';
import LoadingSpinner from './LoadingSpinner';

const AlertsManagement: React.FC = () => {
  const { selectedAccountId, sessionToken, selectedBroker } = useTradingContext();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreateAlertRequest>>({
    type: 'price',
    condition: {
      operator: '>',
      value: 0,
      field: 'last'
    },
    notifications: {
      email: true,
      sms: false,
      push: true
    }
  });

  useEffect(() => {
    if (selectedAccountId && sessionToken && selectedBroker) {
      fetchAlerts();
    }
  }, [selectedAccountId, sessionToken, selectedBroker]);

  const fetchAlerts = async () => {
    if (!sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAlerts(selectedBroker, sessionToken);
      
      if (response.success) {
        setAlerts(response.alerts);
      } else {
        setError(response.errorMessage || 'Failed to fetch alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await createAlert(selectedBroker, formData as CreateAlertRequest, sessionToken);
      
      if (response.success) {
        setSuccessMessage('Alert created successfully');
        setShowCreateForm(false);
        resetForm();
        await fetchAlerts();
      } else {
        setError(response.errorMessage || 'Failed to create alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAlert = async (alertId: string | number, updateData: Partial<UpdateAlertRequest>) => {
    if (!sessionToken || !selectedBroker) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await updateAlert(selectedBroker, { alertId, ...updateData }, sessionToken);
      
      if (response.success) {
        setSuccessMessage('Alert updated successfully');
        setEditingAlert(null);
        await fetchAlerts();
      } else {
        setError(response.errorMessage || 'Failed to update alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string | number) => {
    if (!sessionToken || !selectedBroker) return;
    
    if (!confirm('Are you sure you want to delete this alert?')) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await deleteAlert(selectedBroker, alertId, sessionToken);
      
      if (response.success) {
        setSuccessMessage('Alert deleted successfully');
        await fetchAlerts();
      } else {
        setError(response.errorMessage || 'Failed to delete alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'price',
      condition: {
        operator: '>',
        value: 0,
        field: 'last'
      },
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConditionChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      condition: {
        ...prev.condition!,
        [field]: value
      }
    }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications!,
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'triggered': return 'text-yellow-400';
      case 'expired': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!selectedAccountId) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Alerts Management</h2>
        <p className="text-gray-400">Please select an account to manage alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Alerts Management</h2>
        <div className="space-x-2">
          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Alert
          </button>
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

      {isLoading && <LoadingSpinner />}

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                placeholder="Alert name"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Contract ID</label>
              <input
                type="text"
                value={formData.contractId || ''}
                onChange={(e) => handleInputChange('contractId', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                placeholder="e.g., ES, NQ, YM"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Type</label>
              <select
                value={formData.type || 'price'}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="price">Price</option>
                <option value="indicator">Indicator</option>
                <option value="news">News</option>
                <option value="time">Time</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Field</label>
              <select
                value={formData.condition?.field || 'last'}
                onChange={(e) => handleConditionChange('field', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="last">Last Price</option>
                <option value="bid">Bid Price</option>
                <option value="ask">Ask Price</option>
                <option value="volume">Volume</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Operator</label>
              <select
                value={formData.condition?.operator || '>'}
                onChange={(e) => handleConditionChange('operator', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value=">">Greater than</option>
                <option value="<">Less than</option>
                <option value="=">Equal to</option>
                <option value=">=">Greater than or equal</option>
                <option value="<=">Less than or equal</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Value</label>
              <input
                type="number"
                step="0.01"
                value={formData.condition?.value || ''}
                onChange={(e) => handleConditionChange('value', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                placeholder="Trigger value"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-20"
                placeholder="Alert description"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-2">Notifications</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications?.email || false}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-white">Email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications?.sms || false}
                    onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-white">SMS</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications?.push || false}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-white">Push</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAlert}
              disabled={isLoading || !formData.name || !formData.contractId}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create Alert
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Active Alerts ({alerts.length})</h3>
        
        {alerts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No alerts found. Create your first alert to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Contract</th>
                  <th className="text-left py-2">Condition</th>
                  <th className="text-center py-2">Status</th>
                  <th className="text-center py-2">Notifications</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-center py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-gray-700/50">
                    <td className="py-3">
                      <div className="text-white font-medium">{alert.name}</div>
                      <div className="text-gray-400 text-xs">{alert.description}</div>
                    </td>
                    <td className="py-3 text-white">{alert.contractId}</td>
                    <td className="py-3">
                      <div className="text-white">
                        {alert.condition.field} {alert.condition.operator} {alert.condition.value}
                      </div>
                      <div className="text-gray-400 text-xs capitalize">{alert.type}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center space-x-1">
                        {alert.notifications.email && <span className="text-blue-400">📧</span>}
                        {alert.notifications.sms && <span className="text-green-400">📱</span>}
                        {alert.notifications.push && <span className="text-purple-400">🔔</span>}
                      </div>
                    </td>
                    <td className="py-3 text-gray-300 text-xs">
                      {formatDateTime(alert.createdAt)}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => handleUpdateAlert(alert.id, { 
                            status: alert.status === 'active' ? 'expired' : 'active' 
                          })}
                          className={`px-2 py-1 rounded text-xs ${
                            alert.status === 'active' 
                              ? 'bg-yellow-600 hover:bg-yellow-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white transition-colors`}
                        >
                          {alert.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsManagement; 