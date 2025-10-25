import React, { useEffect, useState } from 'react';
import { signalService, TradingSignal } from '../services/signalService';
import { orderWorkflowService } from '../services/orderWorkflowService';
import { useTradingContext } from '../contexts/TradingContext';

interface AISignalExecutorProps {
  autoExecute?: boolean;
  useAI?: boolean;
}

const AISignalExecutor: React.FC<AISignalExecutorProps> = ({
  autoExecute = false,
  useAI = true,
}) => {
  const {
    selectedBroker,
    sessionToken,
    selectedAccountId,
    userAccounts,
  } = useTradingContext();

  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [processingSignals, setProcessingSignals] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    processed: 0,
    successful: 0,
    failed: 0,
  });

  useEffect(() => {
    if (!autoExecute || !selectedBroker || !sessionToken || !selectedAccountId) {
      return;
    }

    const interval = setInterval(() => {
      checkAndProcessSignals();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoExecute, selectedBroker, sessionToken, selectedAccountId]);

  const checkAndProcessSignals = async () => {
    try {
      const signals = await signalService.getSignals({
        status: 'received',
        limit: 10,
      });

      for (const signal of signals) {
        if (processingSignals.has(signal.id)) continue;

        if (useAI) {
          await processSignalWithAI(signal);
        } else {
          await processSignalDirect(signal);
        }
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking signals:', error);
    }
  };

  const processSignalWithAI = async (signal: TradingSignal) => {
    setProcessingSignals(prev => new Set(prev).add(signal.id));

    try {
      console.log(`🤖 Processing signal ${signal.id} with AI workflow...`);

      await signalService.updateSignalStatus(signal.id, 'executing', 'AI interpreting signal...');

      const accountIds = selectedAccountId ? [selectedAccountId.toString()] : [];
      const result = await orderWorkflowService.processSignalWorkflow(
        signal,
        accountIds,
        selectedBroker || 'topstepx',
        {
          default_risk_percentage: 1,
          default_stop_loss_pips: 50,
          default_take_profit_ratio: 2,
          max_position_size: 10,
        }
      );

      if (result.success) {
        await signalService.updateSignalStatus(
          signal.id,
          'executed',
          `Successfully created ${result.orders.length} order(s)`
        );

        setStats(prev => ({
          ...prev,
          processed: prev.processed + 1,
          successful: prev.successful + 1,
        }));

        console.log(`✅ Signal ${signal.id} processed successfully`);
      } else {
        await signalService.updateSignalStatus(
          signal.id,
          'failed',
          undefined,
          undefined,
          result.errors.join('; ')
        );

        setStats(prev => ({
          ...prev,
          processed: prev.processed + 1,
          failed: prev.failed + 1,
        }));

        console.error(`❌ Signal ${signal.id} failed:`, result.errors);
      }
    } catch (error) {
      await signalService.updateSignalStatus(
        signal.id,
        'failed',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      setStats(prev => ({
        ...prev,
        processed: prev.processed + 1,
        failed: prev.failed + 1,
      }));

      console.error('Error processing signal with AI:', error);
    } finally {
      setProcessingSignals(prev => {
        const next = new Set(prev);
        next.delete(signal.id);
        return next;
      });
    }
  };

  const processSignalDirect = async (signal: TradingSignal) => {
    console.log('Direct processing (legacy) - Consider enabling AI for better results');
    await signalService.updateSignalStatus(signal.id, 'ignored');
  };

  if (!autoExecute) {
    return null;
  }

  const isReady = selectedBroker && sessionToken && selectedAccountId;

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white border rounded-lg shadow-2xl p-4 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h4 className="font-semibold text-sm">AI Signal Workflow</h4>
        </div>
        <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
      </div>

      <div className="text-xs space-y-1.5 bg-white/10 rounded p-2 mb-2">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="font-semibold">{isReady ? 'Active' : 'Waiting'}</span>
        </div>
        {isReady && (
          <>
            <div className="flex justify-between">
              <span>Last check:</span>
              <span>{lastChecked.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <span>{processingSignals.size} signals</span>
            </div>
            <div className="flex justify-between">
              <span>AI Mode:</span>
              <span className="font-semibold">{useAI ? 'Enabled' : 'Disabled'}</span>
            </div>
          </>
        )}
      </div>

      {isReady && stats.processed > 0 && (
        <div className="text-xs space-y-1 bg-white/10 rounded p-2">
          <div className="font-semibold mb-1">Session Stats:</div>
          <div className="flex justify-between">
            <span>Processed:</span>
            <span>{stats.processed}</span>
          </div>
          <div className="flex justify-between text-green-300">
            <span>Success:</span>
            <span>{stats.successful}</span>
          </div>
          <div className="flex justify-between text-red-300">
            <span>Failed:</span>
            <span>{stats.failed}</span>
          </div>
        </div>
      )}

      {!isReady && (
        <div className="text-xs text-yellow-200 bg-yellow-900/30 rounded p-2">
          Connect to a broker and select an account to enable AI workflow
        </div>
      )}
    </div>
  );
};

export default AISignalExecutor;
