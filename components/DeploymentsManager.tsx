import React, { useState, useEffect } from 'react';
import { AlgorithmDeployment, DeploymentStatus } from '../types';
import SectionPanel from './SectionPanel';
import LoadingSpinner from './LoadingSpinner';
import { 
  getAccountDeployments,
  getDeploymentStatus,
  stopDeployment,
  deleteDeployment,
  getDeploymentLogs
} from '../services/deploymentService';
import { useTradingContext } from '../contexts/TradingContext';

interface DeploymentsManagerProps {
  onSelectDeployment?: (deployment: AlgorithmDeployment) => void;
}

const DeploymentsManager: React.FC<DeploymentsManagerProps> = ({ onSelectDeployment }) => {
  const { sessionToken, userAccounts, selectedAccountId } = useTradingContext();
  
  const [deployments, setDeployments] = useState<AlgorithmDeployment[]>([]);
  const [deploymentStatuses, setDeploymentStatuses] = useState<Record<string, DeploymentStatus>>({});
  const [deploymentLogs, setDeploymentLogs] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<AlgorithmDeployment | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Fetch deployments for the selected account or all accounts
  const fetchDeployments = async () => {
    if (!sessionToken) {
      setError("Session token is not available. Cannot fetch deployments.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let allDeployments: AlgorithmDeployment[] = [];
      
      if (selectedAccountId) {
        // Fetch deployments for selected account
        const accountDeployments = await getAccountDeployments(sessionToken, selectedAccountId);
        allDeployments = accountDeployments;
      } else {
        // Fetch deployments for all accounts
        for (const account of userAccounts) {
          try {
            const accountDeployments = await getAccountDeployments(sessionToken, account.id);
            allDeployments = [...allDeployments, ...accountDeployments];
          } catch (err) {
            console.error(`Error fetching deployments for account ${account.id}:`, err);
          }
        }
      }
      
      setDeployments(allDeployments);
      
      // Fetch status for each deployment
      const statuses: Record<string, DeploymentStatus> = {};
      
      for (const deployment of allDeployments) {
        try {
          const status = await getDeploymentStatus(sessionToken, deployment.id);
          statuses[deployment.id] = status;
        } catch (err) {
          console.error(`Error fetching status for deployment ${deployment.id}:`, err);
        }
      }
      
      setDeploymentStatuses(statuses);
    } catch (err) {
      console.error('Error fetching deployments:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch deployments on initial load and when selected account changes
  useEffect(() => {
    fetchDeployments();
  }, [sessionToken, selectedAccountId]);
  
  // Fetch logs for a specific deployment
  const fetchDeploymentLogs = async (deploymentId: string) => {
    if (!sessionToken) return;
    
    try {
      const logs = await getDeploymentLogs(sessionToken, deploymentId);
      setDeploymentLogs(prev => ({ ...prev, [deploymentId]: logs }));
    } catch (err) {
      console.error(`Error fetching logs for deployment ${deploymentId}:`, err);
    }
  };
  
  // Handle stopping a deployment
  const handleStopDeployment = async (deploymentId: string) => {
    if (!sessionToken) return;
    
    try {
      await stopDeployment(sessionToken, deploymentId);
      // Update deployment status
      fetchDeployments();
    } catch (err) {
      console.error(`Error stopping deployment ${deploymentId}:`, err);
    }
  };
  
  // Handle deleting a deployment
  const handleDeleteDeployment = async (deploymentId: string) => {
    if (!sessionToken) return;
    
    if (!window.confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDeployment(sessionToken, deploymentId);
      // Update deployments list
      setDeployments(prev => prev.filter(d => d.id !== deploymentId));
    } catch (err) {
      console.error(`Error deleting deployment ${deploymentId}:`, err);
    }
  };
  
  // Handle refreshing deployments
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeployments();
    setIsRefreshing(false);
  };
  
  // Get account name by ID
  const getAccountName = (accountId: string | number): string => {
    const account = userAccounts.find(a => a.id === accountId);
    return account ? account.name : `Account ${accountId}`;
  };
  
  // Format status for display
  const formatStatus = (status: string): { text: string, color: string } => {
    switch (status) {
      case 'running':
        return { text: 'Running', color: 'text-green-400' };
      case 'pending':
        return { text: 'Pending', color: 'text-yellow-400' };
      case 'paused':
        return { text: 'Paused', color: 'text-blue-400' };
      case 'stopped':
        return { text: 'Stopped', color: 'text-gray-400' };
      case 'error':
        return { text: 'Error', color: 'text-red-400' };
      case 'completed':
        return { text: 'Completed', color: 'text-purple-400' };
      default:
        return { text: status, color: 'text-gray-400' };
    }
  };
  
  return (
    <div>
      <SectionPanel 
        title="Algorithm Deployments" 
        actions={
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition disabled:opacity-50"
          >
            {isRefreshing ? <LoadingSpinner size="xs" /> : 'Refresh'}
          </button>
        }
      >
        {isLoading && <LoadingSpinner message="Loading deployments..." />}
        {error && <p className="text-red-400 text-sm p-2 bg-red-900 rounded-md">{error}</p>}
        
        {!isLoading && !error && deployments.length === 0 && (
          <p className="text-gray-400 text-center p-4">No active deployments found. Deploy an algorithm to get started.</p>
        )}
        
        {deployments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Algorithm</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Account</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Last Run</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {deployments.map(deployment => {
                  const status = deploymentStatuses[deployment.id]?.status || deployment.status;
                  const statusInfo = formatStatus(status);
                  
                  return (
                    <tr 
                      key={deployment.id} 
                      className="hover:bg-gray-700 cursor-pointer"
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        if (onSelectDeployment) onSelectDeployment(deployment);
                      }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {deployment.algorithmName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {deployment.accountName || getAccountName(deployment.accountId)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`${statusInfo.color} font-medium`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {new Date(deployment.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                        {deployment.lastRunAt ? new Date(deployment.lastRunAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchDeploymentLogs(deployment.id);
                              setSelectedDeployment(deployment);
                              setIsLogModalOpen(true);
                            }}
                            className="text-sky-400 hover:text-sky-300"
                            title="View Logs"
                          >
                            Logs
                          </button>
                          {(status === 'running' || status === 'pending') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopDeployment(deployment.id);
                              }}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Stop Deployment"
                            >
                              Stop
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeployment(deployment.id);
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Deployment"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
      
      {/* Log Modal */}
      {isLogModalOpen && selectedDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  Logs: {selectedDeployment.algorithmName} ({getAccountName(selectedDeployment.accountId)})
                </h2>
                <button 
                  onClick={() => setIsLogModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-md p-3 h-96 overflow-y-auto text-sm font-mono">
                {deploymentLogs[selectedDeployment.id] ? (
                  deploymentLogs[selectedDeployment.id].length > 0 ? (
                    deploymentLogs[selectedDeployment.id].map((log, index) => (
                      <div key={index} className="pb-1 border-b border-gray-800 mb-1">
                        {log}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No logs available for this deployment.</p>
                  )
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <LoadingSpinner message="Loading logs..." />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setIsLogModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentsManager; 