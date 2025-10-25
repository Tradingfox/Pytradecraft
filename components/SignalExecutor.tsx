import React, { useEffect, useState } from 'react';
import { signalService, TradingSignal, SignalFilter } from '../services/signalService';
import { useTradingContext } from '../contexts/TradingContext';
import { PlaceOrderRequest } from '../types';

interface SignalExecutorProps {
  autoExecute?: boolean;
  executeFilters?: boolean;
}

const SignalExecutor: React.FC<SignalExecutorProps> = ({
  autoExecute = false,
  executeFilters = true,
}) => {
  const {
    selectedBroker,
    sessionToken,
    selectedAccountId,
    placeOrder,
  } = useTradingContext();

  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [executingSignals, setExecutingSignals] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SignalFilter[]>([]);

  useEffect(() => {
    if (executeFilters) {
      loadFilters();
    }
  }, [executeFilters]);

  useEffect(() => {
    if (!autoExecute || !selectedBroker || !sessionToken || !selectedAccountId) {
      return;
    }

    const interval = setInterval(() => {
      checkAndExecuteSignals();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoExecute, selectedBroker, sessionToken, selectedAccountId, filters]);

  const loadFilters = async () => {
    const data = await signalService.getFilters();
    setFilters(data.filter(f => f.is_active));
  };

  const checkAndExecuteSignals = async () => {
    try {
      const signals = await signalService.getSignals({
        status: 'received',
        limit: 20,
      });

      for (const signal of signals) {
        if (executingSignals.has(signal.id)) continue;

        const shouldExecute = executeFilters
          ? await signalService.applyFilters(signal, filters)
          : true;

        if (shouldExecute) {
          executeSignal(signal);
        } else {
          await signalService.updateSignalStatus(signal.id, 'ignored');
          await signalService.logSignalExecution(
            signal.id,
            'filter_check',
            false,
            'Signal filtered out by active filters'
          );
        }
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking signals:', error);
    }
  };

  const executeSignal = async (signal: TradingSignal) => {
    if (!selectedBroker || !sessionToken || !selectedAccountId) {
      console.error('Missing broker, session token, or account ID');
      return;
    }

    if (signal.signal_type === 'alert') {
      await signalService.updateSignalStatus(signal.id, 'ignored');
      return;
    }

    setExecutingSignals(prev => new Set(prev).add(signal.id));

    try {
      await signalService.updateSignalStatus(signal.id, 'executing', 'Validating signal...');
      await signalService.logSignalExecution(signal.id, 'validation', true, 'Starting signal validation');

      const validation = await signalService.validateSignal(signal);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      await signalService.logSignalExecution(signal.id, 'validation', true, 'Signal validated successfully');

      let orderSide: 'buy' | 'sell';
      if (signal.signal_type === 'buy') {
        orderSide = 'buy';
      } else if (signal.signal_type === 'sell') {
        orderSide = 'sell';
      } else if (signal.signal_type === 'close') {
        await signalService.updateSignalStatus(signal.id, 'ignored');
        await signalService.logSignalExecution(
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

      await signalService.updateSignalStatus(
        signal.id,
        'executing',
        `Placing ${orderRequest.orderType} ${orderRequest.side} order...`
      );
      await signalService.logSignalExecution(
        signal.id,
        'place_order',
        true,
        'Sending order to broker',
        { orderRequest }
      );

      const result = await placeOrder(orderRequest);

      if (result.success && result.orderId) {
        await signalService.updateSignalStatus(
          signal.id,
          'executed',
          'Order placed successfully',
          result.orderId.toString()
        );
        await signalService.logSignalExecution(
          signal.id,
          'execution_complete',
          true,
          `Order ${result.orderId} placed successfully`,
          { orderId: result.orderId }
        );
      } else {
        throw new Error(result.errorMessage || 'Failed to place order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error executing signal:', errorMessage);

      await signalService.updateSignalStatus(
        signal.id,
        'failed',
        undefined,
        undefined,
        errorMessage
      );
      await signalService.logSignalExecution(
        signal.id,
        'execution_failed',
        false,
        errorMessage
      );
    } finally {
      setExecutingSignals(prev => {
        const next = new Set(prev);
        next.delete(signal.id);
        return next;
      });
    }
  };

  if (!autoExecute) {
    return null;
  }

  const isReady = selectedBroker && sessionToken && selectedAccountId;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Signal Auto-Executor</h4>
        <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <p>Status: {isReady ? 'Active' : 'Waiting for connection'}</p>
        {isReady && (
          <>
            <p>Last checked: {lastChecked.toLocaleTimeString()}</p>
            <p>Executing: {executingSignals.size} signals</p>
            <p>Filters: {executeFilters ? `${filters.length} active` : 'Disabled'}</p>
          </>
        )}
      </div>

      {!isReady && (
        <div className="mt-2 text-xs text-orange-600">
          Connect to a broker and select an account to enable auto-execution
        </div>
      )}
    </div>
  );
};

export default SignalExecutor;
