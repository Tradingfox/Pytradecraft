import React, { useState, useEffect } from 'react';
import { signalService, SignalSource } from '../services/signalService';

interface SignalSourceManagerProps {
  onClose: () => void;
  onSourceCreated: () => void;
}

const SignalSourceManager: React.FC<SignalSourceManagerProps> = ({ onClose, onSourceCreated }) => {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedType, setSelectedType] = useState<SignalSource['source_type'] | null>(null);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [createdSource, setCreatedSource] = useState<SignalSource | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sourceTypes = [
    {
      type: 'tradingview' as const,
      name: 'TradingView',
      icon: '📊',
      description: 'Receive alerts from TradingView charts via webhook',
      fields: [
        { name: 'alert_name', label: 'Alert Name', type: 'text', placeholder: 'My TradingView Alert' },
      ],
    },
    {
      type: 'telegram' as const,
      name: 'Telegram',
      icon: '✈️',
      description: 'Receive signals from Telegram channels or groups',
      fields: [
        { name: 'bot_token', label: 'Bot Token', type: 'text', placeholder: 'Your Telegram bot token' },
        { name: 'chat_id', label: 'Channel/Group ID', type: 'text', placeholder: 'Channel or group ID' },
      ],
    },
    {
      type: 'mt4' as const,
      name: 'MetaTrader 4',
      icon: '📈',
      description: 'Receive signals from MT4 Expert Advisors',
      fields: [
        { name: 'account_number', label: 'MT4 Account Number', type: 'text' },
        { name: 'server', label: 'Broker Server', type: 'text', placeholder: 'e.g., ICMarkets-Demo' },
      ],
    },
    {
      type: 'mt5' as const,
      name: 'MetaTrader 5',
      icon: '📈',
      description: 'Receive signals from MT5 Expert Advisors',
      fields: [
        { name: 'account_number', label: 'MT5 Account Number', type: 'text' },
        { name: 'server', label: 'Broker Server', type: 'text', placeholder: 'e.g., ICMarkets-Demo' },
      ],
    },
  ];

  const handleSelectType = (type: SignalSource['source_type']) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleCreate = async () => {
    if (!selectedType || !name) return;

    setIsCreating(true);
    try {
      const source = await signalService.createSignalSource(name, selectedType, config);
      if (source) {
        setCreatedSource(source);
        onSourceCreated();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const selectedSourceType = sourceTypes.find(s => s.type === selectedType);

  if (createdSource) {
    const webhookUrl = signalService.getWebhookUrl(createdSource);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-green-600">✓ Signal Source Created!</h2>

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Your signal source <strong>{createdSource.name}</strong> has been created successfully.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Webhook URL</h3>
            <p className="text-sm text-gray-600 mb-2">
              Use this URL to send signals from {selectedSourceType?.name}:
            </p>
            <div className="bg-white border rounded p-3 font-mono text-sm break-all">
              {webhookUrl}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Copy URL
            </button>
          </div>

          {createdSource.source_type === 'tradingview' && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">TradingView Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Open your TradingView chart</li>
                <li>Click the Alert button (⏰) in the toolbar</li>
                <li>Set your alert conditions</li>
                <li>In the Notifications tab, enable "Webhook URL"</li>
                <li>Paste the webhook URL above</li>
                <li>In the Message field, use JSON format:</li>
              </ol>
              <pre className="mt-2 bg-white border rounded p-3 text-xs overflow-x-auto">
{`{
  "action": "buy",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "timeframe": "{{interval}}",
  "comment": "TradingView Alert"
}`}
              </pre>
            </div>
          )}

          {createdSource.source_type === 'telegram' && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Telegram Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Create a Telegram bot using @BotFather</li>
                <li>Get your bot token</li>
                <li>Set the webhook for your bot to the URL above</li>
                <li>Add the bot to your channel/group as admin</li>
                <li>Signals will be parsed from messages in the format:</li>
              </ol>
              <pre className="mt-2 bg-white border rounded p-3 text-xs">
{`Symbol: BTCUSDT
Action: BUY
Entry: 45000
Stop Loss: 44000
Take Profit: 47000
Quantity: 0.1`}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setCreatedSource(null);
                setStep('select');
                setSelectedType(null);
                setName('');
                setConfig({});
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Create Another
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Signal Source</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {step === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sourceTypes.map((source) => (
              <button
                key={source.type}
                onClick={() => handleSelectType(source.type)}
                className="p-6 border-2 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left"
              >
                <div className="text-4xl mb-3">{source.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{source.name}</h3>
                <p className="text-gray-600 text-sm">{source.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === 'configure' && selectedSourceType && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('select')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to source types
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`My ${selectedSourceType.name} Source`}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {selectedSourceType.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Source'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalSourceManager;
