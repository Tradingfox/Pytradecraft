import React, { useState } from 'react';
import DeploymentsManager from '../components/DeploymentsManager';
import DeploymentDashboard from '../components/DeploymentDashboard';
import { AlgorithmDeployment } from '../types';
import { useTradingContext } from '../contexts/TradingContext';

const DeploymentsManagerView: React.FC = () => {
  const { isAuthenticated } = useTradingContext();
  const [selectedDeployment, setSelectedDeployment] = useState<AlgorithmDeployment | null>(null);
  
  const handleSelectDeployment = (deployment: AlgorithmDeployment) => {
    setSelectedDeployment(deployment);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-gray-300 mb-2">Authentication Required</p>
          <p className="text-gray-400">Please connect to a broker to manage algorithm deployments.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-700 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Algorithm Deployments</h1>
        <p className="text-gray-400 mt-1">
          Monitor and manage your algorithm deployments across all accounts.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <DeploymentsManager onSelectDeployment={handleSelectDeployment} />
        
        {selectedDeployment && (
          <div className="mt-6">
            <div className="border-b border-gray-700 pb-3 mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                Deployment Dashboard: {selectedDeployment.algorithmName}
              </h2>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Close Dashboard
              </button>
            </div>
            <DeploymentDashboard deployment={selectedDeployment} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentsManagerView; 