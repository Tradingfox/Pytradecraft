import React, { useEffect, useState } from 'react';

// Status indicator component for API operations
interface StatusIndicatorProps {
  operation: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  clearAfter?: number; // Time in ms to clear success/error status automatically
  className?: string;
  showLabel?: boolean; // Whether to show text label
  onClear?: () => void; // Optional callback when auto-clearing
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  operation, 
  status, 
  clearAfter = 5000, 
  className = '',
  showLabel = false,
  onClear
}) => {
  // Auto-clearing success/error after specified time
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if ((status === 'success' || status === 'error') && clearAfter > 0) {
      timer = setTimeout(() => {
        if (onClear) onClear();
      }, clearAfter);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, clearAfter, onClear]);
  
  // Return the appropriate icon based on status
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <span className="inline-block animate-spin" title={`${operation} in progress`}>⟳</span>
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

  // Don't render anything if idle and not showing label
  if (status === 'idle' && !showLabel) return null;

  return (
    <span className={`ml-2 inline-flex items-center ${className}`} title={operation}>
      {getIcon()}
      {showLabel && (
        <span className={`ml-1 text-sm ${
          status === 'success' ? 'text-green-600' : 
          status === 'error' ? 'text-red-600' : 
          status === 'loading' ? 'text-blue-600' : 'text-gray-500'
        }`}>
          {status === 'loading' ? `${operation}...` : 
           status === 'success' ? `${operation} successful` : 
           status === 'error' ? `${operation} failed` : operation}
        </span>
      )}
    </span>
  );
};

export default StatusIndicator;
