import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import {
  BrokerType,
  ProjectXAuthMode,
  ProjectXLoginKeyRequest,
  ProjectXLoginAppRequest,
  TradingAccount
} from '../types';
import {
  projectXLoginKey,
  projectXLoginApp,
  searchAccounts as apiSearchAccounts,
  topstepXLoginApiKey
} from '../services/tradingApiService';
import { PROJECTX_DEFAULT_APP_ID } from '../constants.tsx';

interface AuthContextType {
  selectedBroker: BrokerType | null;
  projectXAuthMode: ProjectXAuthMode;
  sessionToken: string | null;
  sessionExpiry: Date | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  statusMessage: string | null;
  userAccounts: TradingAccount[];
  selectedAccountId: string | number | null;

  projectXUsername: string;
  projectXApiKey: string;
  projectXPassword: string;
  projectXDeviceId: string;
  projectXAppId: string;
  projectXVerifyKey: string;
  topstepXUsername: string;
  topstepXApiKey: string;

  selectBroker: (broker: BrokerType | null) => void;
  setProjectXAuthMode: (mode: ProjectXAuthMode) => void;
  updateProjectXCredentials: (credentials: Partial<ProjectXLoginKeyRequest & ProjectXLoginAppRequest>) => void;
  updateTopstepXCredentials: (credentials: { username?: string; apiKey?: string }) => void;
  connectToBroker: () => Promise<void>;
  disconnectFromBroker: () => Promise<void>;
  fetchUserAccounts: (tokenToUse?: string, brokerToUse?: BrokerType) => Promise<void>;
  selectAccount: (accountId: string | number | null) => void;
  authenticateTopstepXDirect: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [projectXAuthMode, setProjectXAuthMode] = useState<ProjectXAuthMode>('loginKey');

  const [projectXUsername, setProjectXUsername] = useState('');
  const [projectXApiKey, setProjectXApiKey] = useState('');
  const [projectXPassword, setProjectXPassword] = useState('');
  const [projectXDeviceId, setProjectXDeviceId] = useState('');
  const [projectXAppId, setProjectXAppId] = useState(PROJECTX_DEFAULT_APP_ID);
  const [projectXVerifyKey, setProjectXVerifyKey] = useState('');

  const [topstepXUsername, setTopstepXUsername] = useState('');
  const [topstepXApiKey, setTopstepXApiKey] = useState('');

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [userAccounts, setUserAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | number | null>(null);

  const updateProjectXCredentials = useCallback((credentials: Partial<ProjectXLoginKeyRequest & ProjectXLoginAppRequest>) => {
    if (credentials.userName !== undefined) setProjectXUsername(credentials.userName);
    if (credentials.apiKey !== undefined) setProjectXApiKey(credentials.apiKey);
    if (credentials.password !== undefined) setProjectXPassword(credentials.password);
    if (credentials.deviceId !== undefined) setProjectXDeviceId(credentials.deviceId);
    if (credentials.appId !== undefined) setProjectXAppId(credentials.appId);
    if (credentials.verifyKey !== undefined) setProjectXVerifyKey(credentials.verifyKey);
  }, []);

  const updateTopstepXCredentials = useCallback((credentials: { username?: string; apiKey?: string }) => {
    if (credentials.username !== undefined) setTopstepXUsername(credentials.username);
    if (credentials.apiKey !== undefined) setTopstepXApiKey(credentials.apiKey);
  }, []);

  const authenticateTopstepXDirect = useCallback(async (token: string) => {
    setSessionToken(token);
    setIsAuthenticated(true);
    setStatusMessage('Successfully authenticated with TopstepX. Token set directly.');
    setSelectedBroker('topstepx');
  }, []);

  const selectBroker = useCallback((broker: BrokerType | null) => {
    if (broker !== selectedBroker) {
      setSelectedBroker(broker);
    }
  }, [selectedBroker]);

  const fetchUserAccounts = useCallback(async (tokenToUse?: string, brokerToUse?: BrokerType) => {
    const currentToken = tokenToUse || sessionToken;
    const currentBroker = brokerToUse || selectedBroker;

    if (!currentToken || !currentBroker) {
      setStatusMessage('Cannot fetch accounts: Not authenticated or no broker selected.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Fetching accounts for ${currentBroker}...`);

    try {
      const response = await apiSearchAccounts(currentBroker, currentToken, { onlyActiveAccounts: true });
      if (response.success && response.accounts) {
        setUserAccounts(response.accounts);
        setStatusMessage(`Successfully fetched ${response.accounts.length} active account(s).`);

        if (response.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(response.accounts[0].id);
        } else if (response.accounts.length === 0) {
          setSelectedAccountId(null);
          setStatusMessage('No active accounts found.');
        }
      } else {
        throw new Error(response.errorMessage || 'Failed to fetch accounts.');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Error fetching accounts: ${errorMessage}`);
      setUserAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, selectedBroker, selectedAccountId]);

  const connectToBroker = useCallback(async () => {
    if (!selectedBroker) {
      setStatusMessage('Please select a broker first.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Connecting to ${selectedBroker}...`);

    try {
      let authResponse;

      if (selectedBroker === 'projectx') {
        if (projectXAuthMode === 'loginKey') {
          if (!projectXUsername || !projectXApiKey) throw new Error('ProjectX username and API key are required for loginKey auth.');
          authResponse = await projectXLoginKey({ userName: projectXUsername, apiKey: projectXApiKey });
        } else {
          if (!projectXUsername || !projectXAppId) throw new Error('ProjectX username and App ID are required for loginApp auth.');
          authResponse = await projectXLoginApp({
            userName: projectXUsername,
            password: projectXPassword,
            deviceId: projectXDeviceId,
            appId: projectXAppId,
            verifyKey: projectXVerifyKey
          });
        }
      } else if (selectedBroker === 'topstepx') {
        if (!topstepXApiKey) throw new Error('TopstepX API Key/Token is required.');
        authResponse = await topstepXLoginApiKey({ userName: topstepXUsername || '', apiKey: topstepXApiKey });
      } else {
        throw new Error('Unsupported broker for connection.');
      }

      if (authResponse.success && authResponse.token) {
        setSessionToken(authResponse.token);
        setIsAuthenticated(true);
        setStatusMessage(`Successfully authenticated with ${selectedBroker}. Token received.`);
        await fetchUserAccounts(authResponse.token, selectedBroker);
      } else {
        throw new Error(authResponse.errorMessage || `Authentication failed for ${selectedBroker}.`);
      }
    } catch (error) {
      console.error(`Error connecting to ${selectedBroker}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Connection failed: ${errorMessage}`);
      setIsAuthenticated(false);
      setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBroker, projectXAuthMode, projectXUsername, projectXApiKey, projectXPassword, projectXDeviceId, projectXAppId, projectXVerifyKey, topstepXUsername, topstepXApiKey, fetchUserAccounts]);

  const disconnectFromBroker = useCallback(async () => {
    setSessionToken(null);
    setSessionExpiry(null);
    setIsAuthenticated(false);
    setUserAccounts([]);
    setSelectedAccountId(null);
    setStatusMessage(selectedBroker ? `Disconnected from ${selectedBroker}.` : 'Disconnected.');
  }, [selectedBroker]);

  return (
    <AuthContext.Provider value={{
      selectedBroker,
      projectXAuthMode,
      sessionToken,
      sessionExpiry,
      isAuthenticated,
      isLoading,
      statusMessage,
      userAccounts,
      selectedAccountId,
      projectXUsername,
      projectXApiKey,
      projectXPassword,
      projectXDeviceId,
      projectXAppId,
      projectXVerifyKey,
      topstepXUsername,
      topstepXApiKey,
      selectBroker,
      setProjectXAuthMode,
      updateProjectXCredentials,
      updateTopstepXCredentials,
      connectToBroker,
      disconnectFromBroker,
      fetchUserAccounts,
      selectAccount: setSelectedAccountId,
      authenticateTopstepXDirect
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
