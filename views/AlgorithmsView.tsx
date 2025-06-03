import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from '../components/CodeEditor';
import SectionPanel from '../components/SectionPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ConsoleOutput from '../components/ConsoleOutput';
import BacktestPanel from '../components/BacktestPanel';
import { Algorithm, GeminiRequestStatus, BacktestResult } from '../types';
import { DEFAULT_ALGORITHM_CODE } from '../constants.tsx';
import { GEMINI_API_KEY_INFO_URL } from '../constants';
import { 
  generatePythonCode, 
  explainPythonCode, 
  generatePythonCodeWithSequentialThinking,
  generatePythonCodeWithContext,
  generateStructuredAlgorithm,
  explainPythonCodeWithMemory
} from '../services/geminiService';
import { MOCK_ALGORITHMS } from '../services/mockTradingService';
import { useAppContext } from '../contexts/AppContext';
import { useTradingContext } from '../contexts/TradingContext';

const AlgorithmsView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey } = useAppContext(); // Added geminiApiKey
  const { sessionToken } = useTradingContext(); // Get session token for TopstepX API

  // Algorithm state
  const [algorithms, setAlgorithms] = useState<Algorithm[]>(MOCK_ALGORITHMS);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [currentCode, setCurrentCode] = useState<string>(DEFAULT_ALGORITHM_CODE);

  // UI state
  const [activeTab, setActiveTab] = useState<'code' | 'backtest'>('code');

  // Gemini AI state
  const [geminiPrompt, setGeminiPrompt] = useState<string>('');
  const [geminiStatus, setGeminiStatus] = useState<GeminiRequestStatus>(GeminiRequestStatus.IDLE);
  const [geminiOutput, setGeminiOutput] = useState<string[]>([]);
  const [selectedMcpServer, setSelectedMcpServer] = useState<string>('standard');
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [hasMemoryContext, setHasMemoryContext] = useState<boolean>(false);

  // Backtest state
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [selectedBacktestResult, setSelectedBacktestResult] = useState<BacktestResult | null>(null);

  useEffect(() => {
    if (selectedAlgorithm) {
      setCurrentCode(selectedAlgorithm.code);
      setGeminiOutput([`Algorithm "${selectedAlgorithm.name}" loaded.`]);
    } else {
      setCurrentCode(DEFAULT_ALGORITHM_CODE);
      setGeminiOutput([]);
    }
  }, [selectedAlgorithm]);

  const handleSelectAlgorithm = (algo: Algorithm) => {
    setSelectedAlgorithm(algo);
  };

  const handleCreateNew = () => {
    const newAlgo: Algorithm = {
      id: `algo-${Date.now()}`,
      name: 'New Untitled Algorithm',
      code: DEFAULT_ALGORITHM_CODE,
      description: 'A new trading algorithm.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAlgorithms(prev => [newAlgo, ...prev]);
    setSelectedAlgorithm(newAlgo);
    setCurrentCode(newAlgo.code);
    setGeminiOutput(['Created new algorithm. Edit its details and code.']);
  };

  const handleSaveAlgorithm = () => {
    if (selectedAlgorithm) {
      const updatedAlgo = { ...selectedAlgorithm, code: currentCode, name: selectedAlgorithm.name, updatedAt: new Date().toISOString() }; // Add name editing later
      setAlgorithms(prev => prev.map(a => a.id === updatedAlgo.id ? updatedAlgo : a));
      setSelectedAlgorithm(updatedAlgo);
      setGeminiOutput(prev => [...prev, `Algorithm "${updatedAlgo.name}" saved successfully.`]);
      alert('Algorithm saved (mock)!');
    }
  };

  // Handle backtest completion
  const handleBacktestComplete = (result: BacktestResult) => {
    setBacktestResults(prev => [result, ...prev]);
    setSelectedBacktestResult(result);
    setGeminiOutput(prev => [...prev, `Backtest completed for "${result.algorithmName}". Final equity: $${result.finalEquity.toLocaleString()}`]);
  };

  const handleGeminiAction = useCallback(async (actionType: 'generate' | 'explain' | 'followup') => {
    if (apiKeyStatus === 'missing' || apiKeyStatus === 'invalid' || !geminiApiKey) {
        setGeminiOutput(prev => [...prev, `Error: Gemini API Key is ${apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. Please configure it in Settings. Get key: ${GEMINI_API_KEY_INFO_URL}`]);
        return;
    }

    // Validate inputs based on action type
    if (actionType === 'generate' && !geminiPrompt.trim()) {
      setGeminiOutput(prev => [...prev, 'Error: Gemini prompt cannot be empty for code generation.']);
      return;
    }
    if (actionType === 'explain' && !currentCode.trim()) {
      setGeminiOutput(prev => [...prev, 'Error: Code editor is empty. Nothing to explain.']);
      return;
    }
    if (actionType === 'followup' && !followUpQuestion.trim()) {
      setGeminiOutput(prev => [...prev, 'Error: Follow-up question cannot be empty.']);
      return;
    }

    setGeminiStatus(GeminiRequestStatus.LOADING);

    // Set appropriate action message
    let actionMessage = '';
    if (actionType === 'generate') {
      actionMessage = `Generating code using ${selectedMcpServer} MCP for: "${geminiPrompt}"...`;
    } else if (actionType === 'explain') {
      actionMessage = `Explaining code using ${selectedMcpServer} MCP...`;
    } else if (actionType === 'followup') {
      actionMessage = `Processing follow-up question: "${followUpQuestion}"...`;
    }

    setGeminiOutput(prev => [...prev, actionMessage]);

    try {
      let result: string | any;

      // Handle generate action
      if (actionType === 'generate') {
        switch (selectedMcpServer) {
          case 'sequential':
            result = await generatePythonCodeWithSequentialThinking(geminiApiKey, geminiPrompt);
            break;
          case 'context':
            result = await generatePythonCodeWithContext(geminiApiKey, geminiPrompt);
            break;
          case 'structured':
            const structuredResult = await generateStructuredAlgorithm(geminiApiKey, geminiPrompt);
            // Update algorithm details from structured output
            if (selectedAlgorithm && structuredResult) {
              setSelectedAlgorithm(prev => prev ? {
                ...prev,
                name: structuredResult.name || prev.name,
                description: structuredResult.description || prev.description,
              } : null);
            }
            result = structuredResult.code || '';
            setGeminiOutput(prev => [...prev, 
              '--- Structured Algorithm Generated ---', 
              `Name: ${structuredResult.name || 'Not specified'}`,
              `Description: ${structuredResult.description || 'Not specified'}`,
              `Parameters: ${structuredResult.parameters?.length ? structuredResult.parameters.map(p => `${p.name} (${p.type}): ${p.description}`).join('\n') : 'None'}`
            ]);
            break;
          case 'memory':
            // Memory MCP doesn't make sense for initial code generation
            result = await generatePythonCode(geminiApiKey, geminiPrompt);
            break;
          default: // standard
            result = await generatePythonCode(geminiApiKey, geminiPrompt);
        }

        setCurrentCode(result);
        setGeminiOutput(prev => [...prev, 'Python code generated and updated in editor.']);
      } 
      // Handle explain action
      else if (actionType === 'explain') {
        switch (selectedMcpServer) {
          case 'memory':
            result = await explainPythonCodeWithMemory(geminiApiKey, currentCode);
            setHasMemoryContext(true); // Set memory context for follow-up questions
            break;
          default: // standard, sequential, context, structured
            result = await explainPythonCode(geminiApiKey, currentCode);
        }

        setGeminiOutput(prev => [...prev, '--- Code Explanation ---', result, '--- End of Explanation ---']);
      } 
      // Handle follow-up action
      else if (actionType === 'followup') {
        if (selectedMcpServer === 'memory' && hasMemoryContext) {
          result = await explainPythonCodeWithMemory(geminiApiKey, '', followUpQuestion);
          setFollowUpQuestion(''); // Clear the follow-up question
          setGeminiOutput(prev => [...prev, '--- Follow-up Response ---', result, '--- End of Response ---']);
        } else {
          throw new Error('Memory context not established. Please explain code first.');
        }
      }

      setGeminiStatus(GeminiRequestStatus.SUCCESS);
    } catch (error) {
      console.error(`Gemini ${actionType} error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGeminiOutput(prev => [...prev, `Error with Gemini API: ${errorMessage}`]);
      setGeminiStatus(GeminiRequestStatus.ERROR);
    }
  }, [geminiPrompt, currentCode, followUpQuestion, selectedMcpServer, hasMemoryContext, apiKeyStatus, geminiApiKey, selectedAlgorithm]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Algorithm List and Controls */}
      <div className="lg:col-span-1 flex flex-col space-y-6">
        <SectionPanel title="My Algorithms">
          <button 
            onClick={handleCreateNew}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out mb-4"
          >
            Create New Algorithm
          </button>
          <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {algorithms.map(algo => (
              <div 
                key={algo.id}
                onClick={() => handleSelectAlgorithm(algo)}
                className={`p-3 rounded-md cursor-pointer transition-colors ${selectedAlgorithm?.id === algo.id ? 'bg-sky-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <h4 className="font-semibold">{algo.name}</h4>
                <p className="text-xs text-gray-400 truncate">{algo.description}</p>
                <p className="text-xs text-gray-500">Last updated: {new Date(algo.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </SectionPanel>
        {selectedAlgorithm && (
          <SectionPanel title={`Details: ${selectedAlgorithm.name}`}>
             <input 
                type="text" 
                value={selectedAlgorithm.name}
                onChange={(e) => setSelectedAlgorithm(prev => prev ? {...prev, name: e.target.value} : null)}
                className="w-full bg-gray-700 text-white p-2 rounded-md mb-2 border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Algorithm Name"
              />
              <textarea 
                value={selectedAlgorithm.description}
                onChange={(e) => setSelectedAlgorithm(prev => prev ? {...prev, description: e.target.value} : null)}
                className="w-full bg-gray-700 text-white p-2 rounded-md mb-2 h-24 resize-none border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Algorithm Description"
              />
            <button 
              onClick={handleSaveAlgorithm}
              disabled={geminiStatus === GeminiRequestStatus.LOADING}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
            >
              Save Algorithm
            </button>
          </SectionPanel>
        )}
      </div>

      {/* Code Editor and Gemini Interaction */}
      <div className="lg:col-span-2 flex flex-col space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'code'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('code')}
          >
            Code Editor
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'backtest'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('backtest')}
            disabled={!selectedAlgorithm}
          >
            Backtest
          </button>
        </div>

        {/* Code Editor Tab */}
        {activeTab === 'code' && (
          <>
            <SectionPanel 
              title={selectedAlgorithm ? `Editing: ${selectedAlgorithm.name}` : "Python Code Editor"}
              actions={
                <button 
                  onClick={handleSaveAlgorithm}
                  disabled={!selectedAlgorithm || geminiStatus === GeminiRequestStatus.LOADING}
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition duration-150 ease-in-out disabled:opacity-50"
                >
                  Save Code
                </button>
              }
            >
              <CodeEditor code={currentCode} setCode={setCurrentCode} height="calc(100vh - 500px)" />
            </SectionPanel>

            <SectionPanel title="Gemini AI Assistant">
              {apiKeyStatus === 'missing' || apiKeyStatus === 'invalid' && ( // Show for missing or invalid
                <div className="mb-4 p-3 bg-red-800 border border-red-700 rounded-md text-yellow-200 text-sm">
                  Gemini API Key is {apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. AI features are disabled. 
                  Please set a valid <code>API_KEY</code> in Settings. 
                  You can get a key from <a href={GEMINI_API_KEY_INFO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">Google AI Studio</a>.
                  After setting it, you may need to refresh or re-check in the header.
                </div>
              )}
              <div className="space-y-3">
                <div className="flex space-x-3 mb-3">
                  <label className="text-white text-sm font-medium">MCP Server:</label>
                  <select 
                    value={selectedMcpServer}
                    onChange={(e) => {
                      setSelectedMcpServer(e.target.value);
                      // Reset memory context when changing servers
                      if (e.target.value !== 'memory') {
                        setHasMemoryContext(false);
                      }
                    }}
                    className="bg-gray-700 text-white border border-gray-600 rounded-md px-2 py-1 flex-1"
                    disabled={apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                  >
                    <option value="standard">Standard</option>
                    <option value="sequential">Sequential Thinking</option>
                    <option value="context">Context-aware</option>
                    <option value="memory">Memory</option>
                    <option value="structured">Structured Output</option>
                  </select>
                </div>

                {selectedMcpServer === 'memory' && hasMemoryContext ? (
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Follow-up Question:</label>
                    <textarea
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      placeholder="Ask a follow-up question about the code (e.g., 'How would I modify this to use a different indicator?')"
                      className="w-full p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-sky-500 focus:border-sky-500 resize-none"
                      rows={2}
                      disabled={apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                    />
                    <button
                      onClick={() => handleGeminiAction('followup')}
                      disabled={!followUpQuestion.trim() || geminiStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                    >
                      {geminiStatus === GeminiRequestStatus.LOADING ? <LoadingSpinner size="sm" /> : 'Ask Follow-up Question'}
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    placeholder="Describe the trading logic you want Gemini to generate (e.g., 'Bollinger Bands breakout strategy for BTC/USD on 1h timeframe'). Or leave blank to explain current code."
                    className="w-full p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-sky-500 focus:border-sky-500 resize-none"
                    rows={3}
                    disabled={apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                  />
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleGeminiAction('generate')}
                    disabled={selectedMcpServer === 'memory' && hasMemoryContext || geminiStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                  >
                    {geminiStatus === GeminiRequestStatus.LOADING && geminiPrompt ? <LoadingSpinner size="sm" /> : 'Generate Code'}
                  </button>
                  <button
                    onClick={() => handleGeminiAction('explain')}
                    disabled={selectedMcpServer === 'memory' && hasMemoryContext || geminiStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                  >
                    {geminiStatus === GeminiRequestStatus.LOADING && !geminiPrompt ? <LoadingSpinner size="sm" /> : 'Explain Code'}
                  </button>
                </div>
                {geminiStatus === GeminiRequestStatus.LOADING && <LoadingSpinner message="Gemini is thinking..." />}
              </div>
            </SectionPanel>
          </>
        )}

        {/* Backtest Tab */}
        {activeTab === 'backtest' && selectedAlgorithm && (
          <BacktestPanel 
            algorithm={selectedAlgorithm} 
            onBacktestComplete={handleBacktestComplete} 
          />
        )}

        {/* Console Output (shown in both tabs) */}
        <ConsoleOutput lines={geminiOutput} title="Console Output" height="150px" />
      </div>
    </div>
  );
};

export default AlgorithmsView;
