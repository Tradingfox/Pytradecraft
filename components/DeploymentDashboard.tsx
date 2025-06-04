import React, { useState, useEffect } from 'react';
import { AlgorithmDeployment, DeploymentStatus } from '../types';
import { getDeploymentStatus, getDeploymentLogs } from '../services/deploymentService';
import { useTradingContext } from '../contexts/TradingContext';
import LoadingSpinner from './LoadingSpinner';
import SectionPanel from './SectionPanel';

interface DeploymentDashboardProps {
  deployment: AlgorithmDeployment;
}

const DeploymentDashboard: React.FC<DeploymentDashboardProps> = ({ deployment }) => {
  const { sessionToken } = useTradingContext();
  
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(10); // seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  
  // Fetch deployment status
  const fetchDeploymentStatus = async () => {
    if (!sessionToken) return;
    
    try {
      const statusData = await getDeploymentStatus(sessionToken, deployment.id);
      setStatus(statusData);
      setError(null);
    } catch (err) {
      console.error(`Error fetching status for deployment ${deployment.id}:`, err);
      setError(`Failed to fetch deployment status: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Fetch deployment logs
  const fetchDeploymentLogs = async () => {
    if (!sessionToken) return;
    
    try {
      const logsData = await getDeploymentLogs(sessionToken, deployment.id, 50, 0);
      setLogs(logsData);
    } catch (err) {
      console.error(`Error fetching logs for deployment ${deployment.id}:`, err);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    setIsLoading(true);
    
    const fetchData = async () => {
      await Promise.all([
        fetchDeploymentStatus(),
        fetchDeploymentLogs()
      ]);
      setIsLoading(false);
    };
    
    fetchData();
  }, [deployment.id, sessionToken]);
  
  // Set up auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const intervalId = setInterval(() => {
      fetchDeploymentStatus();
      fetchDeploymentLogs();
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [isAutoRefresh, refreshInterval, deployment.id, sessionToken]);
  
  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Format resource usage as percentage
  const formatResourcePercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };
  
  // Calculate uptime from running time string
  const calculateUptime = (runningTime: string): string => {
    // Assuming runningTime is in format "HH:MM:SS"
    return runningTime || '00:00:00';
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner message="Loading deployment information..." />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 text-red-200 p-3 rounded-md">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionPanel title="Deployment Overview">
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(status?.status || deployment.status)}`}></div>
              <span className="text-lg font-semibold text-white">
                {status?.status ? status.status.charAt(0).toUpperCase() + status.status.slice(1) : 'Unknown'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-400">Algorithm</p>
                <p className="text-lg font-medium text-white">{deployment.algorithmName}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-400">Account</p>
                <p className="text-lg font-medium text-white">{deployment.accountName || deployment.accountId}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-400">Uptime</p>
                <p className="text-lg font-medium text-white">
                  {status?.metrics?.runningTime ? calculateUptime(status.metrics.runningTime) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-400">Last Updated</p>
                <p className="text-lg font-medium text-white">
                  {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {status?.lastEvent && (
              <div className="bg-gray-700 p-3 rounded-md">
                <p className="text-xs text-gray-400">Last Event</p>
                <p className="text-sm text-white mt-1">{status.lastEvent.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(status.lastEvent.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Auto-refresh:</label>
                <input
                  type="checkbox"
                  checked={isAutoRefresh}
                  onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  className="rounded border-gray-600 text-sky-600 focus:ring-sky-500"
                />
              </div>
              
              {isAutoRefresh && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Interval (s):</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-gray-700 text-white text-sm p-1 rounded border border-gray-600"
                  >
                    <option value="5">5s</option>
                    <option value="10">10s</option>
                    <option value="30">30s</option>
                    <option value="60">1m</option>
                  </select>
                </div>
              )}
              
              <button
                onClick={() => {
                  fetchDeploymentStatus();
                  fetchDeploymentLogs();
                }}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </SectionPanel>
        
        <SectionPanel title="Performance Metrics">
          <div className="p-4 space-y-4">
            {status?.metrics ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-3 rounded-md text-center">
                    <p className="text-xs text-gray-400">Orders</p>
                    <p className="text-xl font-semibold text-white">{status.metrics.orders}</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-md text-center">
                    <p className="text-xs text-gray-400">Trades</p>
                    <p className="text-xl font-semibold text-white">{status.metrics.trades}</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-md text-center">
                    <p className="text-xs text-gray-400">P/L</p>
                    <p className={`text-xl font-semibold ${status.metrics.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${status.metrics.profitLoss.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {status.resourceUsage && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium text-gray-300">Resource Usage</p>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">CPU</span>
                          <span className="text-xs text-gray-400">
                            {formatResourcePercentage(status.resourceUsage.cpu)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, status.resourceUsage.cpu)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">Memory</span>
                          <span className="text-xs text-gray-400">
                            {status.resourceUsage.memory.toFixed(1)} MB
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (status.resourceUsage.memory / 512) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">Network</span>
                          <span className="text-xs text-gray-400">
                            {status.resourceUsage.network.toFixed(1)} KB/s
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (status.resourceUsage.network / 100) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-gray-400">No metrics available</p>
              </div>
            )}
          </div>
        </SectionPanel>
      </div>
      
      <SectionPanel title="Recent Logs">
        <div className="bg-gray-900 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="pb-1 border-b border-gray-800 mb-1 whitespace-pre-wrap">
                {log}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center p-4">No logs available for this deployment.</p>
          )}
        </div>
      </SectionPanel>
    </div>
  );
};

export default DeploymentDashboard; 