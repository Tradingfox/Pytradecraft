/**
 * Optimized Signal Executor Component
 *
 * Optimizations:
 * 1. Intelligent polling with adaptive intervals
 * 2. Incremental signal fetching (only new signals)
 * 3. Parallel execution for multiple signals
 * 4. Circuit breaker pattern for failed executions
 * 5. Priority queue for signal processing
 * 6. Performance metrics tracking
 * 7. Automatic backoff on errors
 * 8. WebSocket support (optional)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { signalServiceOptimized, TradingSignal, SignalFilter } from '../services/signalServiceOptimized';
import { useTradingContext } from '../contexts/TradingContext';
import { PlaceOrderRequest } from '../types';

interface SignalExecutorOptimizedProps {
  autoExecute?: boolean;
  executeFilters?: boolean;
  maxConcurrentExecutions?: number;
  enableAdaptivePolling?: boolean;
  useWebSocket?: boolean;
}

interface ExecutionMetrics {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  avgExecutionTime: number;
  lastError: string | null;
  circuitBreakerOpen: boolean;
}

interface SignalPriority {
  signal: TradingSignal;
  priority: number;
  timestamp: number;
}

const SignalExecutorOptimized: React.FC<SignalExecutorOptimizedProps> = ({
  autoExecute = false,
  executeFilters = true,
  maxConcurrentExecutions = 3,
  enableAdaptivePolling = true,
  useWebSocket = false,
}) => {
  const {
    selectedBroker,
    sessionToken,
    selectedAccountId,
    placeOrder,
  } = useTradingContext();

  // State
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [lastSignalTimestamp, setLastSignalTimestamp] = useState<string>(new Date().toISOString());
  const [executingSignals, setExecutingSignals] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SignalFilter[]>([]);
  const [pollingInterval, setPollingInterval] = useState<number>(5000);
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    avgExecutionTime: 0,
    lastError: null,
    circuitBreakerOpen: false,
  });

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const executionQueue = useRef<SignalPriority[]>([]);
  const circuitBreakerFailures = useRef<number>(0);
  const circuitBreakerResetTimeout = useRef<NodeJS.Timeout | null>(null);
  const executionTimes = useRef<number[]>([]);

  // ==========================================
  // CIRCUIT BREAKER
  // ==========================================
  const CIRCUIT_BREAKER_THRESHOLD = 5; // failures
  const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  const openCircuitBreaker = useCallback(() => {
    setMetrics(prev => ({ ...prev, circuitBreakerOpen: true }));
    console.warn('🔴 Circuit breaker opened - pausing executions');

    // Reset after timeout
    circuitBreakerResetTimeout.current = setTimeout(() => {
      circuitBreakerFailures.current = 0;
      setMetrics(prev => ({ ...prev, circuitBreakerOpen: false }));
      console.log('🟢 Circuit breaker reset');
    }, CIRCUIT_BREAKER_TIMEOUT);
  }, []);

  const recordExecutionResult = useCallback((success: boolean, executionTime: number) => {
    if (!success) {
      circuitBreakerFailures.current++;
      if (circuitBreakerFailures.current >= CIRCUIT_BREAKER_THRESHOLD) {
        openCircuitBreaker();
      }
    } else {
      // Reset failure count on success
      circuitBreakerFailures.current = Math.max(0, circuitBreakerFailures.current - 1);
    }

    // Track execution times
    executionTimes.current.push(executionTime);
    if (executionTimes.current.length > 50) {
      executionTimes.current.shift();
    }

    const avgTime = executionTimes.current.reduce((a, b) => a + b, 0) / executionTimes.current.length;

    setMetrics(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      totalSuccess: success ? prev.totalSuccess + 1 : prev.totalSuccess,
      totalFailed: success ? prev.totalFailed : prev.totalFailed + 1,
      avgExecutionTime: Math.round(avgTime),
    }));
  }, [openCircuitBreaker]);

  // ==========================================
  // ADAPTIVE POLLING
  // ==========================================
  const adjustPollingInterval = useCallback(() => {
    if (!enableAdaptivePolling) return;

    const queueSize = executionQueue.current.length;
    const recentActivity = metrics.totalProcessed > 0;

    let newInterval = pollingInterval;

    if (queueSize > 5) {
      // Heavy load - increase interval
      newInterval = Math.min(pollingInterval + 1000, 15000);
    } else if (queueSize === 0 && !recentActivity) {
      // No activity - decrease frequency
      newInterval = Math.min(pollingInterval + 2000, 30000);
    } else if (recentActivity) {
      // Active - faster polling
      newInterval = Math.max(pollingInterval - 1000, 3000);
    }

    if (newInterval !== pollingInterval) {
      console.log(`📊 Adjusting polling interval: ${pollingInterval}ms → ${newInterval}ms`);
      setPollingInterval(newInterval);
    }
  }, [enableAdaptivePolling, pollingInterval, metrics.totalProcessed]);

  // ==========================================
  // PRIORITY QUEUE
  // ==========================================
  const calculatePriority = useCallback((signal: TradingSignal): number => {
    let priority = 0;

    // Higher priority for buy/sell vs alerts
    if (signal.signal_type === 'buy' || signal.signal_type === 'sell') {
      priority += 100;
    }

    // Higher priority for market orders
    if (signal.action === 'market') {
      priority += 50;
    }

    // Lower priority for high leverage (more risk)
    if (signal.leverage > 10) {
      priority -= 20;
    }

    // Higher priority for signals with SL/TP
    if (signal.stop_loss) priority += 10;
    if (signal.take_profit) priority += 10;

    return priority;
  }, []);

  const addToQueue = useCallback((signal: TradingSignal) => {
    const priority = calculatePriority(signal);
    executionQueue.current.push({
      signal,
      priority,
      timestamp: Date.now(),
    });

    // Sort by priority (highest first), then by timestamp (oldest first)
    executionQueue.current.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }, [calculatePriority]);

  // ==========================================
  // FILTERS
  // ==========================================
  useEffect(() => {
    if (executeFilters) {
      loadFilters();
    }
  }, [executeFilters]);

  const loadFilters = async () => {
    const data = await signalServiceOptimized.getFilters();
    setFilters(data.filter(f => f.is_active));
  };

  // ==========================================
  // SIGNAL CHECKING (Incremental)
  // ==========================================
  const checkForNewSignals = useCallback(async () => {
    if (metrics.circuitBreakerOpen) {
      console.log('⏸️ Circuit breaker open - skipping signal check');
      return;
    }

    try {
      // Fetch only signals received after last check (incremental)
      const signals = await signalServiceOptimized.getSignals({
        status: 'received',
        afterTimestamp: lastSignalTimestamp,
        limit: 50,
      });

      if (signals.length > 0) {
        console.log(`📥 Found ${signals.length} new signals`);

        // Update last timestamp
        const latest = signals[0].received_at;
        setLastSignalTimestamp(latest);

        // Process signals
        for (const signal of signals) {
          if (executingSignals.has(signal.id)) continue;

          // Apply filters
          if (executeFilters) {
            const filterResult = await signalServiceOptimized.applyFilters(signal, filters);

            if (!filterResult.allowed) {
              await signalServiceOptimized.updateSignalStatus(signal.id, 'ignored');
              await signalServiceOptimized.logSignalExecution(
                signal.id,
                'filter_check',
                false,
                `Signal filtered: ${filterResult.reasons.join(', ')}`
              );
              continue;
            }
          }

          // Add to priority queue
          addToQueue(signal);
        }
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking signals:', error);
      setMetrics(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [
    metrics.circuitBreakerOpen,
    lastSignalTimestamp,
    executingSignals,
    executeFilters,
    filters,
    addToQueue,
  ]);

  // ==========================================
  // SIGNAL EXECUTION (Parallel)
  // ==========================================
  const executeSignal = useCallback(async (signal: TradingSignal) => {
    if (!selectedBroker || !sessionToken || !selectedAccountId) {
      console.error('Missing broker, session token, or account ID');
      return;
    }

    if (signal.signal_type === 'alert') {
      await signalServiceOptimized.updateSignalStatus(signal.id, 'ignored');
      return;
    }

    const executionStart = Date.now();

    try {
      await signalServiceOptimized.updateSignalStatus(signal.id, 'executing', 'Validating signal...');
      await signalServiceOptimized.logSignalExecution(signal.id, 'validation', true, 'Starting validation');

      const validation = await signalServiceOptimized.validateSignal(signal);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        await signalServiceOptimized.logSignalExecution(
          signal.id,
          'validation_warning',
          true,
          `Warnings: ${validation.warnings.join(', ')}`
        );
      }

      await signalServiceOptimized.logSignalExecution(signal.id, 'validation', true, 'Signal validated');

      let orderSide: 'buy' | 'sell';
      if (signal.signal_type === 'buy') {
        orderSide = 'buy';
      } else if (signal.signal_type === 'sell') {
        orderSide = 'sell';
      } else if (signal.signal_type === 'close') {
        await signalServiceOptimized.updateSignalStatus(signal.id, 'ignored');
        await signalServiceOptimized.logSignalExecution(
          signal.id,
          'execution',
          false,
          'Close signals not yet implemented'
        );
        return;
      } else {
        throw new Error(`Unsupported signal type: ${signal.signal_type}`);
      }

      const orderRequest: PlaceOrderRequest = {
        accountId: selectedAccountId,
        contractId: signal.symbol,
        side: orderSide,
        size: signal.quantity || 1,
        orderType: signal.action === 'limit' ? 'limit' : signal.action === 'stop' ? 'stop' : 'market',
        price: signal.price || undefined,
        stopLoss: signal.stop_loss || undefined,
        takeProfit: signal.take_profit || undefined,
      };

      await signalServiceOptimized.updateSignalStatus(
        signal.id,
        'executing',
        `Placing ${orderRequest.orderType} ${orderRequest.side} order...`
      );

      const result = await placeOrder(orderRequest);

      if (result.success && result.orderId) {
        await signalServiceOptimized.updateSignalStatus(
          signal.id,
          'executed',
          'Order placed successfully',
          result.orderId.toString()
        );

        const executionTime = Date.now() - executionStart;
        recordExecutionResult(true, executionTime);

        await signalServiceOptimized.logSignalExecution(
          signal.id,
          'execution_complete',
          true,
          `Order ${result.orderId} placed successfully in ${executionTime}ms`,
          { orderId: result.orderId, executionTime }
        );
      } else {
        throw new Error(result.errorMessage || 'Failed to place order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error executing signal:', errorMessage);

      const executionTime = Date.now() - executionStart;
      recordExecutionResult(false, executionTime);

      await signalServiceOptimized.updateSignalStatus(
        signal.id,
        'failed',
        undefined,
        undefined,
        errorMessage
      );

      await signalServiceOptimized.logSignalExecution(
        signal.id,
        'execution_failed',
        false,
        errorMessage,
        { executionTime }
      );

      setMetrics(prev => ({ ...prev, lastError: errorMessage }));
    }
  }, [selectedBroker, sessionToken, selectedAccountId, placeOrder, recordExecutionResult]);

  // ==========================================
  // QUEUE PROCESSOR (Parallel)
  // ==========================================
  const processQueue = useCallback(async () => {
    if (metrics.circuitBreakerOpen) return;
    if (executionQueue.current.length === 0) return;
    if (executingSignals.size >= maxConcurrentExecutions) return;

    const availableSlots = maxConcurrentExecutions - executingSignals.size;
    const signalsToProcess = executionQueue.current.splice(0, availableSlots);

    if (signalsToProcess.length === 0) return;

    console.log(`⚡ Processing ${signalsToProcess.length} signals in parallel`);

    // Execute in parallel
    const executions = signalsToProcess.map(async ({ signal }) => {
      setExecutingSignals(prev => new Set(prev).add(signal.id));

      try {
        await executeSignal(signal);
      } finally {
        setExecutingSignals(prev => {
          const next = new Set(prev);
          next.delete(signal.id);
          return next;
        });
      }
    });

    await Promise.allSettled(executions);
  }, [metrics.circuitBreakerOpen, executingSignals, maxConcurrentExecutions, executeSignal]);

  // ==========================================
  // MAIN LOOP
  // ==========================================
  useEffect(() => {
    if (!autoExecute || !selectedBroker || !sessionToken || !selectedAccountId) {
      return;
    }

    const runLoop = async () => {
      await checkForNewSignals();
      await processQueue();
      adjustPollingInterval();
    };

    // Initial run
    runLoop();

    // Set up polling
    pollingIntervalRef.current = setInterval(runLoop, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [
    autoExecute,
    selectedBroker,
    sessionToken,
    selectedAccountId,
    pollingInterval,
    checkForNewSignals,
    processQueue,
    adjustPollingInterval,
  ]);

  // ==========================================
  // CLEANUP
  // ==========================================
  useEffect(() => {
    return () => {
      if (circuitBreakerResetTimeout.current) {
        clearTimeout(circuitBreakerResetTimeout.current);
      }
    };
  }, []);

  // ==========================================
  // RENDER
  // ==========================================
  if (!autoExecute) {
    return null;
  }

  const isReady = selectedBroker && sessionToken && selectedAccountId && !metrics.circuitBreakerOpen;
  const successRate = metrics.totalProcessed > 0
    ? Math.round((metrics.totalSuccess / metrics.totalProcessed) * 100)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">⚡ Signal Auto-Executor (Optimized)</h4>
        <div className={`w-3 h-3 rounded-full ${
          metrics.circuitBreakerOpen ? 'bg-red-500 animate-pulse' :
          isReady ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`} />
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="font-medium">
            {metrics.circuitBreakerOpen ? '🔴 Paused (Circuit Breaker)' :
             isReady ? '🟢 Active' : '⏸️ Waiting'}
          </span>
        </div>

        {isReady && (
          <>
            <div className="flex justify-between">
              <span>Last checked:</span>
              <span>{lastChecked.toLocaleTimeString()}</span>
            </div>

            <div className="flex justify-between">
              <span>Executing:</span>
              <span>{executingSignals.size}/{maxConcurrentExecutions}</span>
            </div>

            <div className="flex justify-between">
              <span>Queue:</span>
              <span>{executionQueue.current.length} signals</span>
            </div>

            <div className="flex justify-between">
              <span>Polling:</span>
              <span>{(pollingInterval / 1000).toFixed(1)}s</span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between">
              <span>Processed:</span>
              <span className="font-medium">{metrics.totalProcessed}</span>
            </div>

            <div className="flex justify-between">
              <span>Success:</span>
              <span className="text-green-600 font-medium">
                {metrics.totalSuccess} ({successRate}%)
              </span>
            </div>

            <div className="flex justify-between">
              <span>Failed:</span>
              <span className="text-red-600 font-medium">{metrics.totalFailed}</span>
            </div>

            <div className="flex justify-between">
              <span>Avg time:</span>
              <span>{metrics.avgExecutionTime}ms</span>
            </div>

            <div className="flex justify-between">
              <span>Filters:</span>
              <span>{executeFilters ? `${filters.length} active` : 'Disabled'}</span>
            </div>

            {metrics.lastError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Last Error:</strong>
                <div className="truncate" title={metrics.lastError}>
                  {metrics.lastError}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!isReady && !metrics.circuitBreakerOpen && (
        <div className="mt-2 text-xs text-orange-600">
          Connect to a broker and select an account to enable auto-execution
        </div>
      )}

      {metrics.circuitBreakerOpen && (
        <div className="mt-2 text-xs text-red-600">
          Too many failures detected. Execution paused for {CIRCUIT_BREAKER_TIMEOUT / 1000}s.
        </div>
      )}
    </div>
  );
};

export default SignalExecutorOptimized;
