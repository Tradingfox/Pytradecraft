import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SectionPanel from '../components/SectionPanel';
import { NAV_ITEMS } from '../constants.tsx';
import { 
  getAllDeployments, 
  stopDeployment, 
  deployAlgorithm,
  getDeploymentStatus
} from '../services/deploymentService';
import { getAlgorithms } from '../services/algorithmService';
import { searchTrades } from '../services/tradingApiService';
import { Algorithm, AlgorithmDeployment, Trade, Position } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

// Token used for authentication - in a real app, this would come from an auth system
const AUTH_TOKEN = 'dummy-token';

// Mock data as fallback when API calls fail
const MOCK_DEPLOYMENTS: AlgorithmDeployment[] = [
  {
    id: 'deploy-1',
    algorithmId: 'algo-1',
    algorithmName: 'Moving Average Crossover',
    accountId: 'demo-account',
    status: 'running',
    parameters: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'deploy-2',
    algorithmId: 'algo-2',
    algorithmName: 'RSI Strategy',
    accountId: 'demo-account',
    status: 'stopped',
    parameters: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const MOCK_ALGORITHMS: Algorithm[] = [
  {
    id: 'algo-1',
    name: 'Moving Average Crossover',
    description: 'Simple MA crossover strategy',
    code: 'print("Moving Average Crossover")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'algo-2',
    name: 'RSI Strategy',
    description: 'RSI-based mean reversion',
    code: 'print("RSI Strategy")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'algo-3',
    name: 'Bollinger Bands Strategy',
    description: 'Volatility-based trading',
    code: 'print("Bollinger Bands Strategy")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const MOCK_TRADES: Trade[] = [
  {
    id: 'trade-1',
    contractId: 'ES',
    side: 0, // BUY
    size: 1,
    price: 4750.25,
    profitAndLoss: 125.50,
    creationTimestamp: new Date().toISOString()
  },
  {
    id: 'trade-2',
    contractId: 'NQ',
    side: 1, // SELL
    size: 2,
    price: 16480.75,
    profitAndLoss: -75.25,
    creationTimestamp: new Date().toISOString()
  },
  {
    id: 'trade-3',
    contractId: 'CL',
    side: 0, // BUY
    size: 1,
    price: 81.45,
    profitAndLoss: 210.00,
    creationTimestamp: new Date().toISOString()
  }
];

const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const quickAccessItems = NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').slice(0, 4);
  
  // State for data
  const [deployments, setDeployments] = useState<AlgorithmDeployment[]>([]);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accounts, setAccounts] = useState<string[]>(['demo-account', 'live-account']); // Mock accounts until we have a real account service
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('');
  
  // Loading and error states
  const [loading, setLoading] = useState({
    deployments: true,
    algorithms: true,
    trades: true,
    positions: true
  });
  
  const [errors, setErrors] = useState({
    deployments: '',
    algorithms: '',
    trades: '',
    positions: '',
    deployment: ''
  });

  const [totalPnl, setTotalPnl] = useState(0);
  const [currentPnl, setCurrentPnl] = useState(0);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling for refreshing data
    const interval = setInterval(() => {
      refreshDeploymentStatuses();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Memoized function to fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Reset errors
      setErrors({
        deployments: '',
        algorithms: '',
        trades: '',
        positions: '',
        deployment: ''
      });
      
      // Set loading states
      setLoading({
        deployments: true,
        algorithms: true,
        trades: true,
        positions: true
      });
      
      // Fetch deployments
      let deploymentData: AlgorithmDeployment[] = [];
      try {
        const deploymentsResponse = await getAllDeployments(AUTH_TOKEN);
        deploymentData = deploymentsResponse.deployments || [];
        setDeployments(deploymentData);
      } catch (err) {
        console.error('Error fetching deployments:', err);
        setErrors(prev => ({ ...prev, deployments: err instanceof Error ? err.message : String(err) }));
        // Use mock data as fallback
        deploymentData = MOCK_DEPLOYMENTS;
        setDeployments(deploymentData);
      } finally {
        setLoading(prev => ({ ...prev, deployments: false }));
      }
      
      // Fetch algorithms
      let algorithmData: Algorithm[] = [];
      try {
        const algorithmsResponse = await getAlgorithms(AUTH_TOKEN);
        algorithmData = algorithmsResponse.algorithms || [];
        setAlgorithms(algorithmData);
      } catch (err) {
        console.error('Error fetching algorithms:', err);
        setErrors(prev => ({ ...prev, algorithms: err instanceof Error ? err.message : String(err) }));
        // Use mock data as fallback
        algorithmData = MOCK_ALGORITHMS;
        setAlgorithms(algorithmData);
      } finally {
        setLoading(prev => ({ ...prev, algorithms: false }));
      }
      
      // Fetch trades
      let tradeData: Trade[] = [];
      try {
        const tradeResponse = await fetchTrades();
        tradeData = tradeResponse;
        setTrades(tradeData);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setErrors(prev => ({ ...prev, trades: err instanceof Error ? err.message : String(err) }));
        // Use mock data as fallback
        tradeData = MOCK_TRADES;
        setTrades(tradeData);
      } finally {
        setLoading(prev => ({ ...prev, trades: false }));
      }
      
      // Calculate PNL from trades
      calculatePnlFromTrades(tradeData);
      
      // Set default selections
      if (algorithmData.length > 0 && !selectedAlgorithm) {
        setSelectedAlgorithm(algorithmData[0].id);
      }
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0]);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Update loading states even on error
      setLoading({
        deployments: false,
        algorithms: false,
        trades: false,
        positions: false
      });
    }
  }, [selectedAlgorithm, selectedAccount, accounts]);
  
  // Helper function to fetch trades
  const fetchTrades = async (): Promise<Trade[]> => {
    try {
      // Try to get trades from TopstepX
      const response = await searchTrades('topstepx', AUTH_TOKEN, { 
        accountId: selectedAccount || accounts[0] || '1', 
        limit: 10 
      });
      
      return response.trades || [];
    } catch (error) {
      console.error('Error fetching trades, falling back to mock data:', error);
      return MOCK_TRADES;
    }
  };
  
  // Calculate PNL from trades
  const calculatePnlFromTrades = (trades: Trade[]) => {
    const totalPnl = trades.reduce(
      (sum, trade) => sum + (trade.profitAndLoss || 0), 
      0
    );
    setTotalPnl(totalPnl);
    
    // Get current PNL (from open positions or recent trades)
    const currentDate = new Date();
    const oneDayAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    
    const recentTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.creationTimestamp);
      return tradeDate >= oneDayAgo;
    });
    
    const recentPnl = recentTrades.reduce(
      (sum, trade) => sum + (trade.profitAndLoss || 0), 
      0
    );
    
    setCurrentPnl(recentPnl);
  };
  
  // Refresh deployment statuses
  const refreshDeploymentStatuses = async () => {
    try {
      const runningDeployments = deployments.filter(d => 
        d.status === 'running' || d.status === 'pending'
      );
      
      if (runningDeployments.length === 0) return;
      
      // Fetch status updates for all running deployments
      const statusPromises = runningDeployments.map(deployment => 
        getDeploymentStatus(AUTH_TOKEN, deployment.id)
          .catch(err => {
            console.error(`Error fetching status for deployment ${deployment.id}:`, err);
            return null;
          })
      );
      
      const statuses = await Promise.all(statusPromises);
      
      // Update deployments with new status information
      const updatedDeployments = [...deployments];
      statuses.forEach((status) => {
        if (!status) return;
        
        const deploymentIndex = updatedDeployments.findIndex(d => d.id === status.id);
        if (deploymentIndex !== -1) {
          updatedDeployments[deploymentIndex] = {
            ...updatedDeployments[deploymentIndex],
            status: status.status,
            updatedAt: status.updatedAt
          };
        }
      });
      
      setDeployments(updatedDeployments);
      
    } catch (error) {
      console.error('Error refreshing deployment statuses:', error);
    }
  };
  
  // Handle stop/start algorithm
  const handleAlgorithmAction = async (deploymentId?: string) => {
    try {
      setErrors(prev => ({ ...prev, deployment: '' }));
      
      if (deploymentId) {
        // Stop the running algorithm
        await stopDeployment(AUTH_TOKEN, deploymentId);
      } else if (selectedAlgorithm && selectedAccount) {
        // Deploy a new algorithm
        await deployAlgorithm(AUTH_TOKEN, selectedAlgorithm, selectedAccount);
      }
      
      // Refresh deployments after action
      try {
        const deploymentsResponse = await getAllDeployments(AUTH_TOKEN);
        setDeployments(deploymentsResponse.deployments || []);
      } catch (error) {
        console.error('Error refreshing deployments after action:', error);
        // Simulate a successful operation by updating local state
        if (deploymentId) {
          // Simulate stopping an algorithm
          setDeployments(prevDeployments => 
            prevDeployments.map(d => 
              d.id === deploymentId 
                ? { ...d, status: 'stopped', updatedAt: new Date().toISOString() } 
                : d
            )
          );
        } else if (selectedAlgorithm && selectedAccount) {
          // Simulate starting an algorithm
          const algo = algorithms.find(a => a.id === selectedAlgorithm);
          if (algo) {
            const newDeployment: AlgorithmDeployment = {
              id: `deploy-${Date.now()}`,
              algorithmId: selectedAlgorithm,
              algorithmName: algo.name,
              accountId: selectedAccount,
              status: 'running',
              parameters: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setDeployments(prev => [...prev, newDeployment]);
          }
        }
      }
      
    } catch (error) {
      console.error('Error with algorithm action:', error);
      setErrors(prev => ({ 
        ...prev, 
        deployment: error instanceof Error ? error.message : 'Failed to perform algorithm action'
      }));
    }
  };
  
  // Calculate summary statistics
  const runningAlgos = deployments.filter(d => d.status === 'running').length;
  const pendingAlgos = deployments.filter(d => d.status === 'pending').length;
  const openTrades = trades.filter(t => !t.voided && t.newPositionSize !== 0).length;
  
  return (
    <div className="space-y-6">
      <SectionPanel title="PyTradeCraft Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Running Algos</h3>
            <p className="text-3xl text-green-400">{runningAlgos}</p>
            <p className="text-sm text-gray-400">{pendingAlgos} pending</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Active Accounts</h3>
            <p className="text-3xl text-blue-400">{accounts.length}</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Open Trades</h3>
            <p className="text-3xl text-yellow-400">{openTrades}</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Total P&L</h3>
            <p className={`text-3xl ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnl.toFixed(2)}
            </p>
            <p className={`text-sm ${currentPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Current: ${currentPnl.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Deploy Algorithm</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              className="bg-gray-800 text-white rounded p-2 flex-grow"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="">Select Account</option>
              {accounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
            
            <select 
              className="bg-gray-800 text-white rounded p-2 flex-grow"
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
            >
              <option value="">Select Algorithm</option>
              {algorithms.map(algo => (
                <option key={algo.id} value={algo.id}>{algo.name}</option>
              ))}
            </select>
            
            <button 
              className="bg-green-600 hover:bg-green-700 text-white rounded p-2 px-4"
              onClick={() => handleAlgorithmAction()}
              disabled={!selectedAlgorithm || !selectedAccount}
            >
              Run
            </button>
          </div>
          
          {errors.deployment && (
            <div className="mt-2 text-red-400 text-sm">
              Error: {errors.deployment}
            </div>
          )}
          
          {errors.algorithms && (
            <div className="mt-2 text-yellow-400 text-sm">
              Algorithms error: {errors.algorithms}
            </div>
          )}
        </div>
      </SectionPanel>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel title="Running Deployments">
          {loading.deployments ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner message="Loading deployments..." />
            </div>
          ) : errors.deployments ? (
            <div className="p-4 text-red-400">
              <p>Error loading deployments: {errors.deployments}</p>
              <p className="text-sm text-gray-400 mt-2">Using mock data instead</p>
              <button 
                onClick={fetchDashboardData}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1 text-sm"
              >
                Retry
              </button>
            </div>
          ) : deployments.length === 0 ? (
            <p className="text-gray-400 p-4">No active deployments</p>
          ) : (
            <div className="overflow-auto max-h-80">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Algorithm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {deployments.map(deployment => (
                    <tr key={deployment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{deployment.algorithmName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{deployment.accountId.toString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${deployment.status === 'running' ? 'bg-green-800 text-green-100' : 
                          deployment.status === 'pending' ? 'bg-yellow-800 text-yellow-100' : 
                          deployment.status === 'error' ? 'bg-red-800 text-red-100' : 
                          'bg-gray-800 text-gray-100'}`}>
                          {deployment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {deployment.status === 'running' || deployment.status === 'pending' ? (
                          <button
                            onClick={() => handleAlgorithmAction(deployment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Stop
                          </button>
                        ) : (
                          <span className="text-gray-500">Stopped</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionPanel>
        
        <SectionPanel title="Recent Trades">
          {loading.trades ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner message="Loading trades..." />
            </div>
          ) : errors.trades ? (
            <div className="p-4 text-red-400">
              <p>Error loading trades: {errors.trades}</p>
              <p className="text-sm text-gray-400 mt-2">Using mock data instead</p>
              <button 
                onClick={fetchDashboardData}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1 text-sm"
              >
                Retry
              </button>
            </div>
          ) : trades.length === 0 ? (
            <p className="text-gray-400 p-4">No recent trades</p>
          ) : (
            <div className="overflow-auto max-h-80">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">P&L</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {trades.map(trade => (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.contractId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {trade.side === 0 ? (
                          <span className="text-green-400">BUY</span>
                        ) : (
                          <span className="text-red-400">SELL</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.size}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        (trade.profitAndLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${(trade.profitAndLoss || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionPanel>
      </div>
      
      <SectionPanel title="Quick Access">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccessItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              className="bg-gray-700 hover:bg-sky-600 text-white p-6 rounded-lg shadow-md transition-all duration-200 ease-in-out flex flex-col items-center text-center"
            >
              <item.icon className="w-10 h-10 mb-3" />
              <span className="font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
};

export default DashboardView;
