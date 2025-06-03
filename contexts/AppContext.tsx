import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppContextType } from '../types';
import { checkApiKeyValidity } from '../services/geminiService'; // Import the validity check

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
  const [geminiApiKey, setGeminiApiKey] = useState<string | undefined>(undefined);

  const checkApiKey = useCallback(async (key?: string) => {
    setApiKeyStatus('checking');
    const keyToCheck = key || geminiApiKey || process.env.API_KEY; // Ensure this logic for process.env.API_KEY is appropriate for your build
    if (keyToCheck && keyToCheck.trim() !== "") {
      const isValid = await checkApiKeyValidity(keyToCheck);
      if (isValid) {
        setApiKeyStatus('valid');
      } else {
        setApiKeyStatus('invalid');
      }
    } else {
      setApiKeyStatus('missing');
    }
  }, [geminiApiKey]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('geminiApiKey');
    if (storedApiKey) {
      setGeminiApiKey(storedApiKey);
      checkApiKey(storedApiKey);
    } else {
      // If no key in local storage, check environment variable (if your setup supports it client-side)
      // Or simply default to 'missing' if no key is found anywhere.
      const envApiKey = process.env.REACT_APP_GEMINI_API_KEY; // Example for Create React App
      if (envApiKey) {
        setGeminiApiKey(envApiKey);
        checkApiKey(envApiKey);
      } else {
        setApiKeyStatus('missing');
      }
    }
  }, [checkApiKey]);

  const handleSetGeminiApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key); 
    checkApiKey(key); 
  };

  return (
    <AppContext.Provider value={{ apiKeyStatus, checkApiKey, geminiApiKey, setGeminiApiKey: handleSetGeminiApiKey }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
