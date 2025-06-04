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
import { useAppContext } from '../contexts/AppContext';
import { useTradingContext } from '../contexts/TradingContext';

const AlgorithmsView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey } = useAppContext();
  const { sessionToken } = useTradingContext();

  // Algorithm state
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [currentCode, setCurrentCode] = useState<string>(DEFAULT_ALGORITHM_CODE);
  const [isLoadingAlgorithms, setIsLoadingAlgorithms] = useState<boolean>(false);
  const [algorithmError, setAlgorithmError] = useState<string | null>(null);
  // Pagination state for algorithms
  const [currentPageAlgos, setCurrentPageAlgos] = useState<number>(1);
  const [totalPagesAlgos, setTotalPagesAlgos] = useState<number>(0);
  const [totalAlgorithms, setTotalAlgorithms] = useState<number>(0);
  const [algoLimitPerPage, setAlgoLimitPerPage] = useState<number>(5); // Smaller limit for easier UI testing

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
  const [savedBacktests, setSavedBacktests] = useState<BacktestResult[]>([]);
  const [isLoadingBacktests, setIsLoadingBacktests] = useState<boolean>(false);
  const [backtestListError, setBacktestListError] = useState<string | null>(null);
  const [selectedSavedBacktest, setSelectedSavedBacktest] = useState<BacktestResult | null>(null);
  // Pagination state for saved backtests
  const [currentBacktestPage, setCurrentBacktestPage] = useState<number>(1);
  const [totalBacktestPages, setTotalBacktestPages] = useState<number>(0);
  const [totalSavedBacktestsCount, setTotalSavedBacktestsCount] = useState<number>(0);
  const [backtestsPerPage, setBacktestsPerPage] = useState<number>(5);


  const fetchAlgorithms = useCallback(async (page: number, limit: number) => {
    if (!sessionToken) {
      setAlgorithmError("Session token is not available. Cannot fetch algorithms.");
      setAlgorithms([]); // Clear algorithms if no token
      setTotalPagesAlgos(0);
      setTotalAlgorithms(0);
      return;
    }
    setIsLoadingAlgorithms(true);
    setAlgorithmError(null);
    try {
      const response = await fetch(`/api/algorithms?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch algorithms: ${response.statusText}`);
      }
      const data = await response.json(); // Expects { algorithms: [], totalItems: number, totalPages: number, currentPage: number }
      setAlgorithms(data.algorithms);
      setTotalAlgorithms(data.totalItems);
      setTotalPagesAlgos(data.totalPages);
      setCurrentPageAlgos(data.currentPage);
      if (data.algorithms.length === 0 && data.currentPage > 1) { // If current page has no items (e.g. after delete)
        setCurrentPageAlgos(Math.max(1, data.currentPage - 1)); // Go to previous page or page 1
      }

    } catch (error) {
      console.error('Error fetching algorithms:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setAlgorithmError(errMsg);
      setAlgorithms([]);
      setTotalPagesAlgos(0);
      setTotalAlgorithms(0);
    } finally {
      setIsLoadingAlgorithms(false);
    }
  }, [sessionToken]);

  // Initial fetch and re-fetch when currentPageAlgos changes (but not algoLimitPerPage to avoid loop with fetchAlgorithms)
  useEffect(() => {
    if (sessionToken) { // Only fetch if session token is available
        fetchAlgorithms(currentPageAlgos, algoLimitPerPage);
    } else {
        // Clear data if no session token
        setAlgorithms([]);
        setTotalPagesAlgos(0);
        setTotalAlgorithms(0);
        setAlgorithmError("Session token not available. Please log in.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, currentPageAlgos, algoLimitPerPage]);


  const fetchSavedBacktests = useCallback(async (algorithmId: string, page: number, limit: number) => {
    if (!sessionToken) {
      setBacktestListError("Session token not available.");
      setSavedBacktests([]);
      setTotalBacktestPages(0);
      setTotalSavedBacktestsCount(0);
      return;
    }
    if (!algorithmId) {
        setBacktestListError("No algorithm selected to fetch backtests for.");
        setSavedBacktests([]);
        setTotalBacktestPages(0);
        setTotalSavedBacktestsCount(0);
        return;
    }
    setIsLoadingBacktests(true);
    setBacktestListError(null);
    try {
      const response = await fetch(`/api/algorithms/${algorithmId}/backtests?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch saved backtests: ${response.statusText}`);
      }
      const data = await response.json(); // Expects { backtests: [], totalItems: number, totalPages: number, currentPage: number }
      setSavedBacktests(data.backtests);
      setTotalSavedBacktestsCount(data.totalItems);
      setTotalBacktestPages(data.totalPages);
      setCurrentBacktestPage(data.currentPage);
       if (data.backtests.length === 0 && data.currentPage > 1) {
        setCurrentBacktestPage(Math.max(1, data.currentPage - 1));
      }
    } catch (error) {
      console.error('Error fetching saved backtests:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setBacktestListError(errMsg);
      setSavedBacktests([]);
      setTotalBacktestPages(0);
      setTotalSavedBacktestsCount(0);
    } finally {
      setIsLoadingBacktests(false);
    }
  }, [sessionToken]);

  // Effect for fetching saved backtests when selected algorithm or backtest page changes
  useEffect(() => {
    if (selectedAlgorithm) {
      setCurrentCode(selectedAlgorithm.code); // Update code editor
      setGeminiOutput([`Algorithm "${selectedAlgorithm.name}" loaded.`]); // Update console
      setAlgorithmError(null); // Clear algo list errors

      // Reset backtest pagination and fetch first page for new algo
      setCurrentBacktestPage(1);
      fetchSavedBacktests(selectedAlgorithm.id, 1, backtestsPerPage);

      setSavedBacktests([]); // Clear previous algo's backtests immediately
      setBacktestListError(null); // Clear previous errors
      setSelectedSavedBacktest(null); // Clear selected saved backtest detail view
    } else {
      // Clear states if no algorithm is selected
      setCurrentCode(DEFAULT_ALGORITHM_CODE);
      setSavedBacktests([]);
      setBacktestListError(null);
      setSelectedSavedBacktest(null);
      setCurrentBacktestPage(1);
      setTotalBacktestPages(0);
      setTotalSavedBacktestsCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlgorithm]); // Removed fetchSavedBacktests, backtestsPerPage from deps to avoid loop with page reset

  // Effect to fetch saved backtests when currentBacktestPage changes, only if an algorithm is selected
  useEffect(() => {
    if (selectedAlgorithm) {
      fetchSavedBacktests(selectedAlgorithm.id, currentBacktestPage, backtestsPerPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBacktestPage]); // Removed selectedAlgorithm from here to let the above effect handle initial load/reset
                               // Also removed backtestsPerPage and fetchSavedBacktests to avoid potential loops/re-fetches
                               // if they change identity but not value. Page change is the primary trigger.

  const handleSelectAlgorithm = (algo: Algorithm) => {
    setSelectedAlgorithm(algo);
  };

  const handleCreateNew = async () => {
    if (!sessionToken) {
      setGeminiOutput(prev => [...prev, "Error: Session token not available. Please log in."]);
      setAlgorithmError("Session token is not available. Cannot create algorithm.");
      return;
    }
    setIsLoadingAlgorithms(true);
    setAlgorithmError(null);
    setGeminiOutput(prev => [...prev, "Creating new algorithm..."]);

    try {
      const newAlgorithmData = {
        name: 'New Untitled Algorithm',
        code: DEFAULT_ALGORITHM_CODE,
        description: 'A new trading algorithm.',
      };
      const response = await fetch('/api/algorithms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(newAlgorithmData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create algorithm: ${response.statusText}`);
      }
      const createdAlgorithm: Algorithm = await response.json();
      // After creating, fetch the page where the new algorithm might appear (e.g., page 1 or current page)
      // Or better, the API could return the created algorithm and we add it, then refetch current page if full.
      // For simplicity now, just refetch current page or page 1. Let's go to page 1 to see the newest.
      if (currentPageAlgos !== 1) setCurrentPageAlgos(1); // This will trigger the useEffect above
      else await fetchAlgorithms(1, algoLimitPerPage); // If already on page 1, manually refetch

      setSelectedAlgorithm(createdAlgorithm); // Select the new one
      // setCurrentCode(createdAlgorithm.code); // This is handled by useEffect on selectedAlgorithm change
      setGeminiOutput(prev => [...prev, `Successfully created "${createdAlgorithm.name}". Select it to start editing.`]);
    } catch (error) {
      console.error('Error creating new algorithm:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setAlgorithmError(errMsg);
      setGeminiOutput(prev => [...prev, `Error creating algorithm: ${errMsg}`]);
    } finally {
      setIsLoadingAlgorithms(false);
    }
  };

  const handleSaveAlgorithm = async () => {
    if (!selectedAlgorithm) {
      setGeminiOutput(prev => [...prev, "Error: No algorithm selected to save."]);
      return;
    }
    if (!sessionToken) {
      setGeminiOutput(prev => [...prev, "Error: Session token not available. Please log in."]);
      setAlgorithmError("Session token is not available. Cannot save algorithm.");
      return;
    }

    setIsLoadingAlgorithms(true);
    setAlgorithmError(null);
    setGeminiOutput(prev => [...prev, `Saving algorithm "${selectedAlgorithm.name}"...`]);

    try {
      const algorithmToSave = {
        name: selectedAlgorithm.name,
        code: currentCode, // Use currentCode from editor
        description: selectedAlgorithm.description,
      };
      const response = await fetch(`/api/algorithms/${selectedAlgorithm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(algorithmToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save algorithm: ${response.statusText}`);
      }
      const updatedAlgorithm: Algorithm = await response.json();
      await fetchAlgorithms(); // Refresh the list
      // Or, for optimistic update:
      // setAlgorithms(prev => prev.map(a => a.id === updatedAlgorithm.id ? updatedAlgorithm : a)); // Optimistic update
      setSelectedAlgorithm(updatedAlgorithm); // Re-set to trigger useEffect if needed, or just update fields
      setGeminiOutput(prev => [...prev, `Algorithm "${updatedAlgorithm.name}" saved successfully.`]);
    } catch (error) {
      console.error('Error saving algorithm:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setAlgorithmError(errMsg);
      setGeminiOutput(prev => [...prev, `Error saving algorithm: ${errMsg}`]);
    } finally {
      setIsLoadingAlgorithms(false);
    }
  };

  const handleDeleteAlgorithm = async (algorithmId: string) => {
    if (!sessionToken) {
      setGeminiOutput(prev => [...prev, "Error: Session token not available. Please log in."]);
      setAlgorithmError("Session token is not available. Cannot delete algorithm.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this algorithm? This action cannot be undone.")) {
      return;
    }

    setIsLoadingAlgorithms(true);
    setAlgorithmError(null);
    const algorithmToDelete = algorithms.find(a => a.id === algorithmId);
    setGeminiOutput(prev => [...prev, `Deleting algorithm "${algorithmToDelete?.name || algorithmId}"...`]);

    try {
      const response = await fetch(`/api/algorithms/${algorithmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete algorithm: ${response.statusText}`);
      }

      setGeminiOutput(prev => [...prev, `Algorithm "${algorithmToDelete?.name || algorithmId}" deleted successfully.`]);
      // After deleting, refetch the current page. The API might return an empty list for this page
      // if it was the last item, fetchAlgorithms handles setting to previous page if current becomes empty.
      await fetchAlgorithms(currentPageAlgos, algoLimitPerPage);

      if (selectedAlgorithm?.id === algorithmId) {
        setSelectedAlgorithm(null);
        // setCurrentCode(DEFAULT_ALGORITHM_CODE); // Handled by useEffect on selectedAlgorithm
      }
    } catch (error) {
      console.error('Error deleting algorithm:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setAlgorithmError(errMsg);
      setGeminiOutput(prev => [...prev, `Error deleting algorithm: ${errMsg}`]);
    } finally {
      setIsLoadingAlgorithms(false);
    }
  };

  // Handle backtest completion
  const handleBacktestComplete = (newBacktestResult: BacktestResult) => {
    // The BacktestPanel already calls saveBacktestResult which should save to backend.
    // We just need to refresh the list of saved backtests.
    setGeminiOutput(prev => [...prev, `New backtest completed for "${newBacktestResult.algorithmName}". Final equity: $${newBacktestResult.finalEquity.toLocaleString()}. Refreshing list...`]);

    setBacktestResults(prev => [newBacktestResult, ...prev]);
    setSelectedBacktestResult(newBacktestResult); // This shows the NEWLY RUN backtest details
    setSelectedSavedBacktest(null); // Clear any selected SAVED backtest to avoid confusion

    if (newBacktestResult.algorithmId && selectedAlgorithm?.id === newBacktestResult.algorithmId) {
      // Refresh to the first page of backtests for the current algorithm
      setCurrentBacktestPage(1); // This will trigger the useEffect to fetch page 1
      fetchSavedBacktests(newBacktestResult.algorithmId, 1, backtestsPerPage);
    } else if (newBacktestResult.algorithmId) {
      // If the backtest was for a different algo (not currently selected), just log or optionally fetch for it
      console.log("Backtest completed for an algorithm not currently selected in view. Not auto-refreshing list for current algo.");
    }
     else {
      setBacktestListError("Could not refresh backtests: Algorithm ID missing from new backtest result.");
    }
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
            disabled={isLoadingAlgorithms || !sessionToken || (apiKeyStatus === 'missing' || apiKeyStatus === 'invalid')}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out mb-4 disabled:opacity-50"
          >
            {isLoadingAlgorithms && algorithms.length === 0 ? <LoadingSpinner size="sm" /> : 'Create New Algorithm'}
          </button>
          {isLoadingAlgorithms && algorithms.length === 0 && <LoadingSpinner message="Loading algorithms..." />}
          {algorithmError && <p className="text-red-400 text-sm p-2 bg-red-900 rounded-md">{algorithmError}</p>}
          {!isLoadingAlgorithms && !algorithmError && algorithms.length === 0 && sessionToken && (
            <p className="text-gray-400 text-center">No algorithms yet. Create one!</p>
          )}
          {!sessionToken && !isLoadingAlgorithms && algorithms.length === 0 && ( // Show only if list is also empty
             <p className="text-yellow-400 text-sm p-2 bg-yellow-900 rounded-md">Session token not found. Please log in to manage algorithms.</p>
          )}
          <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar pr-2"> {/* Adjusted max-h */}
            {algorithms.map(algo => (
              <div
                key={algo.id}
                className={`p-3 rounded-md cursor-pointer transition-colors group relative ${selectedAlgorithm?.id === algo.id ? 'bg-sky-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <div onClick={() => handleSelectAlgorithm(algo)}>
                  <h4 className="font-semibold">{algo.name}</h4>
                  <p className="text-xs text-gray-400 truncate">{algo.description}</p>
                  <p className="text-xs text-gray-500">Last updated: {new Date(algo.updatedAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent selecting the algorithm
                    handleDeleteAlgorithm(algo.id);
                  }}
                  disabled={isLoadingAlgorithms || !sessionToken}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:opacity-50 disabled:hover:bg-red-600"
                  title="Delete Algorithm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {/* Pagination Controls */}
          {totalPagesAlgos > 0 && (
            <div className="mt-4 flex justify-between items-center text-sm text-gray-300">
              <button
                onClick={() => setCurrentPageAlgos(prev => Math.max(1, prev - 1))}
                disabled={currentPageAlgos <= 1 || isLoadingAlgorithms}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {currentPageAlgos} of {totalPagesAlgos} (Total: {totalAlgorithms})
              </span>
              <button
                onClick={() => setCurrentPageAlgos(prev => Math.min(totalPagesAlgos, prev + 1))}
                disabled={currentPageAlgos >= totalPagesAlgos || isLoadingAlgorithms}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
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
            <div className="flex space-x-2">
              <button
                onClick={handleSaveAlgorithm}
                disabled={isLoadingAlgorithms || geminiStatus === GeminiRequestStatus.LOADING || !sessionToken}
                className="flex-grow bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
              >
                {isLoadingAlgorithms ? <LoadingSpinner size="sm" /> : 'Save Algorithm'}
              </button>
              <button
                onClick={() => handleDeleteAlgorithm(selectedAlgorithm.id)}
                disabled={isLoadingAlgorithms || !sessionToken}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                title="Delete Selected Algorithm"
              >
                Delete
              </button>
            </div>
          </SectionPanel>
        )}

        {/* Saved Backtests List */}
        {selectedAlgorithm && (
          <SectionPanel title={`Saved Backtests for ${selectedAlgorithm.name}`}>
            {isLoadingBacktests && <LoadingSpinner message="Loading backtests..." />}
            {backtestListError && <p className="text-red-400 text-sm p-2 bg-red-900 rounded-md">{backtestListError}</p>}
            {!isLoadingBacktests && !backtestListError && savedBacktests.length === 0 && (
              <p className="text-gray-400 text-center">No saved backtests for this algorithm.</p>
            )}
            {!isLoadingBacktests && !backtestListError && savedBacktests.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2"> {/* Adjusted max-h */}
                {savedBacktests.map(bt => ( // Data is already sorted by backend
                  <div
                    key={bt.id}
                    onClick={() => {
                      setSelectedSavedBacktest(bt);
                      setSelectedBacktestResult(null);
                      setActiveTab('backtest');
                    }}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${selectedSavedBacktest?.id === bt.id ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    <p className="text-sm font-semibold">Run at: {new Date(bt.generatedAt).toLocaleString()}</p>
                    <div className="flex justify-between text-xs">
                      <span>Return: <span className={parseFloat(bt.totalReturn) >= 0 ? 'text-green-400' : 'text-red-400'}>{bt.totalReturn}</span></span>
                      <span>Sharpe: {bt.sharpeRatio?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
             {/* Pagination Controls for Saved Backtests */}
            {totalBacktestPages > 0 && (
              <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                <button
                  onClick={() => setCurrentBacktestPage(prev => Math.max(1, prev - 1))}
                  disabled={currentBacktestPage <= 1 || isLoadingBacktests}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {currentBacktestPage} of {totalBacktestPages} ({totalSavedBacktestsCount} results)
                </span>
                <button
                  onClick={() => setCurrentBacktestPage(prev => Math.min(totalBacktestPages, prev + 1))}
                  disabled={currentBacktestPage >= totalBacktestPages || isLoadingBacktests}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
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
                  disabled={!selectedAlgorithm || isLoadingAlgorithms || geminiStatus === GeminiRequestStatus.LOADING || !sessionToken || (apiKeyStatus === 'missing' || apiKeyStatus === 'invalid')}
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition duration-150 ease-in-out disabled:opacity-50"
                >
                  {isLoadingAlgorithms && selectedAlgorithm ? <LoadingSpinner size="xs" /> : 'Save Code'}
                </button>
              }
            >
              <CodeEditor code={currentCode} setCode={setCurrentCode} height="calc(100vh - 500px)" />
            </SectionPanel>

            <SectionPanel title="Gemini AI Assistant">
              {/* Combined error display spot */}
              {(algorithmError && activeTab === 'code') && (
                 <div className="mb-4 p-3 bg-red-800 border border-red-700 rounded-md text-red-300 text-sm">
                   <strong>Algorithm Operation Error:</strong> {algorithmError}
                 </div>
              )}
              {(apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') && (
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
          <>
            {selectedSavedBacktest ? (
              <SectionPanel title={`Details for Saved Backtest (Run: ${new Date(selectedSavedBacktest.generatedAt).toLocaleString()})`}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Algorithm: {selectedAlgorithm.name}</h4>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-200 mb-1">Performance Metrics</h4>
                    <BacktestMetricsTable metrics={selectedSavedBacktest.metrics} />
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-200 mb-1">Equity Curve</h4>
                    <BacktestResultsChart result={selectedSavedBacktest} />
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-200 mb-1">Trades</h4>
                    <BacktestTradesTable trades={selectedSavedBacktest.trades} />
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-200 mb-1">Logs</h4>
                    <ConsoleOutput lines={selectedSavedBacktest.logs} title="Saved Backtest Logs" height="200px" />
                  </div>
                  <button
                    onClick={() => setSelectedSavedBacktest(null)}
                    className="mt-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Close Details (Show Run New Backtest Panel)
                  </button>
                </div>
              </SectionPanel>
            ) : selectedBacktestResult ? ( // If a NEWLY RUN backtest is selected (from BacktestPanel completion)
              // This part is implicitly handled if BacktestPanel itself shows results,
              // or you can expand this to show newly run selectedBacktestResult similarly
              // For now, focusing on selectedSavedBacktest. If selectedBacktestResult is set,
              // BacktestPanel might be displaying it or could be enhanced to.
              // Let's assume BacktestPanel handles its own immediate output display for now.
              // So, if no SAVED backtest is selected, show the panel to run a new one.
               <BacktestPanel
                algorithm={selectedAlgorithm}
                onBacktestComplete={handleBacktestComplete}
              />
            ) : (
              <BacktestPanel
                algorithm={selectedAlgorithm}
                onBacktestComplete={handleBacktestComplete}
              />
            )}
          </>
        )}

        {/* Console Output (shown in both tabs) */}
        <ConsoleOutput lines={geminiOutput} title="Console Output" height="150px" />
      </div>
    </div>
  );
};

export default AlgorithmsView;
