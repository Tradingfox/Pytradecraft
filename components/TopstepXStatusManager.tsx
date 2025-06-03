import React, { useState, useEffect } from 'react';

// Types for API operation statuses
export type ApiOperationName = 
  'login' | 
  'validateSession' | 
  'logout' | 
  'searchContracts' | 
  'historicalData' | 
  'placeOrder' | 
  'searchOrders' | 
  'cancelOrder' | 
  'searchPositions' | 
  'closePosition' | 
  'partialClosePosition' | 
  'searchTrades';

export type ApiOperationStatus = 'idle' | 'loading' | 'success' | 'error';

// Hook for managing API operation statuses
export const useApiStatusManager = (clearAfterMs = 5000) => {
  const [apiStatuses, setApiStatuses] = useState<Record<ApiOperationName, ApiOperationStatus>>({
    login: 'idle',
    validateSession: 'idle',
    logout: 'idle',
    searchContracts: 'idle',
    historicalData: 'idle',
    placeOrder: 'idle',
    searchOrders: 'idle',
    cancelOrder: 'idle',
    searchPositions: 'idle',
    closePosition: 'idle',
    partialClosePosition: 'idle',
    searchTrades: 'idle'
  });

  // Helper function to set operation status
  const setApiStatus = (operation: ApiOperationName, status: ApiOperationStatus) => {
    setApiStatuses(prev => ({ ...prev, [operation]: status }));

    // Auto-reset success/error states after the specified delay
    if ((status === 'success' || status === 'error') && clearAfterMs > 0) {
      setTimeout(() => {
        setApiStatuses(prev => ({ ...prev, [operation]: 'idle' }));
      }, clearAfterMs);
    }
  };

  // Helper for beginning an API operation
  const beginApiOperation = (operation: ApiOperationName) => {
    setApiStatus(operation, 'loading');
  };

  // Helper for completing an API operation successfully
  const completeApiOperationSuccess = (operation: ApiOperationName) => {
    setApiStatus(operation, 'success');
  };

  // Helper for failing an API operation
  const completeApiOperationError = (operation: ApiOperationName) => {
    setApiStatus(operation, 'error');
  };

  // Wrapper function to track API operation status
  const trackApiOperation = async <T extends any>(
    operation: ApiOperationName,
    apiFunction: () => Promise<T>,
  ): Promise<T> => {
    beginApiOperation(operation);
    try {
      const result = await apiFunction();
      completeApiOperationSuccess(operation);
      return result;
    } catch (error) {
      completeApiOperationError(operation);
      throw error;
    }
  };

  return {
    apiStatuses,
    beginApiOperation,
    completeApiOperationSuccess,
    completeApiOperationError,
    trackApiOperation
  };
};

// Status indicator component for API operations
interface StatusIndicatorProps {
  operation: string;
  status: ApiOperationStatus;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  operation, 
  status, 
  className = '' 
}) => {
  // Don't show anything for idle state
  if (status === 'idle') return null;
  
  // Return the appropriate icon based on status
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <span className="animate-spin inline-block" title={`${operation} in progress`}>⟳</span>
        );
      case 'success':
        return (
          <span className="text-green-500" title={`${operation} succeeded`}>✓</span>
        );
      case 'error':
        return (
          <span className="text-red-500" title={`${operation} failed`}>✗</span>
        );
      default:
        return null;
    }
  };

  return (
    <span className={`ml-2 inline-flex items-center ${className}`}>
      {getIcon()}
    </span>
  );
};

export default { useApiStatusManager, StatusIndicator };
