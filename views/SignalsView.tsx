import React, { useState, useEffect } from 'react';
import { signalService, TradingSignal, SignalSource } from '../services/signalService';
import SectionPanel from '../components/SectionPanel';
import SignalSourceManager from '../components/SignalSourceManager';

const SignalsView: React.FC = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [sources, setSources] = useState<SignalSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);

  useEffect(() => {
    loadSources();
    loadSignals();

    const interval = setInterval(() => {
      loadSignals();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedSourceId, selectedStatus]);

  const loadSources = async () => {
    const data = await signalService.getSignalSources();
    setSources(data);
  };

  const loadSignals = async () => {
    setIsLoading(true);
    try {
      const filters: any = { limit: 100 };
      if (selectedSourceId !== 'all') {
        filters.sourceId = selectedSourceId;
      }
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus as any;
      }
      const data = await signalService.getSignals(filters);
      setSignals(data);
    } finally {
      setIsLoading(false);
    }
  };

  const getSignalTypeColor = (type: string) => {
    switch (type) {
      case 'buy': return 'text-green-600 bg-green-100';
      case 'sell': return 'text-red-600 bg-red-100';
      case 'close': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'text-blue-600 bg-blue-100';
      case 'validated': return 'text-purple-600 bg-purple-100';
      case 'executing': return 'text-yellow-600 bg-yellow-100';
      case 'executed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'ignored': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'tradingview': return '📊';
      case 'telegram': return '✈️';
      case 'mt4': return '📈';
      case 'mt5': return '📈';
      default: return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleIgnoreSignal = async (signalId: string) => {
    await signalService.updateSignalStatus(signalId, 'ignored');
    loadSignals();
  };

  const handleExecuteSignal = async (signalId: string) => {
    await signalService.updateSignalStatus(signalId, 'executing');
    loadSignals();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trading Signals</h1>
        <button
          onClick={() => setShowSourceModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Signal Source
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sources.map((source) => {
          const signalCount = signals.filter(s => s.signal_source_id === source.id).length;
          return (
            <div
              key={source.id}
              className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{getSourceIcon(source.source_type)}</span>
                <span className={`px-2 py-1 rounded text-xs ${source.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-lg">{source.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{source.source_type}</p>
              <p className="text-xs text-gray-500 mt-2">{signalCount} signals</p>
            </div>
          );
        })}
      </div>

      <SectionPanel title="Signal Filters">
        <div className="flex gap-4">
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="received">Received</option>
            <option value="validated">Validated</option>
            <option value="executing">Executing</option>
            <option value="executed">Executed</option>
            <option value="failed">Failed</option>
            <option value="ignored">Ignored</option>
          </select>

          <button
            onClick={loadSignals}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title={`Signals (${signals.length})`}>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading signals...</div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No signals found. Configure a signal source to start receiving signals.
          </div>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => {
              const source = sources.find(s => s.id === signal.signal_source_id);
              return (
                <div
                  key={signal.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedSignal(signal)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{getSourceIcon(source?.source_type || 'custom')}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSignalTypeColor(signal.signal_type)}`}>
                          {signal.signal_type.toUpperCase()}
                        </span>
                        <span className="text-xl font-bold">{signal.symbol}</span>
                        {signal.action && (
                          <span className="text-sm text-gray-600 capitalize">({signal.action})</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {signal.price && (
                          <div>
                            <span className="text-gray-600">Price:</span>
                            <span className="ml-1 font-semibold">{signal.price}</span>
                          </div>
                        )}
                        {signal.stop_loss && (
                          <div>
                            <span className="text-gray-600">SL:</span>
                            <span className="ml-1 font-semibold text-red-600">{signal.stop_loss}</span>
                          </div>
                        )}
                        {signal.take_profit && (
                          <div>
                            <span className="text-gray-600">TP:</span>
                            <span className="ml-1 font-semibold text-green-600">{signal.take_profit}</span>
                          </div>
                        )}
                        {signal.quantity && (
                          <div>
                            <span className="text-gray-600">Qty:</span>
                            <span className="ml-1 font-semibold">{signal.quantity}</span>
                          </div>
                        )}
                      </div>

                      {signal.comment && (
                        <p className="text-sm text-gray-600 mt-2">{signal.comment}</p>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>{formatDate(signal.received_at)}</span>
                        <span>{source?.name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(signal.status)}`}>
                        {signal.status}
                      </span>

                      {signal.status === 'received' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteSignal(signal.id);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Execute
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIgnoreSignal(signal.id);
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                          >
                            Ignore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {selectedSignal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedSignal(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Signal Details</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(selectedSignal, null, 2)}
            </pre>
            <button
              onClick={() => setSelectedSignal(null)}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showSourceModal && (
        <SignalSourceManager
          onClose={() => setShowSourceModal(false)}
          onSourceCreated={() => {
            loadSources();
            setShowSourceModal(false);
          }}
        />
      )}
    </div>
  );
};

export default SignalsView;
