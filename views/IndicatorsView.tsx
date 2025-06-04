import React, { useState } from 'react';
import SectionPanel from '../components/SectionPanel';
import CodeEditor from '../components/CodeEditor';
import ConsoleOutput from '../components/ConsoleOutput';
import LoadingSpinner from '../components/LoadingSpinner';
import { Indicator, GeminiRequestStatus } from '../types';
import { generatePythonCode } from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';
import { useTradingContext } from '../contexts/TradingContext'; // For sessionToken
import { GEMINI_API_KEY_INFO_URL } from '../constants.tsx';

// Define a more specific type for the selected indicator to include a potentially null ID for new indicators
type EditableIndicator = Omit<Indicator, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string | null; // id is optional for a new, unsaved indicator
  parametersString?: string; // For editing parameters as JSON string
};


const DEFAULT_INDICATOR_CODE = `
# Python code for a custom trading indicator
# Example: Custom Moving Average
import pandas as pd

def custom_indicator(data_series, window=20):
    """
    Calculates a custom moving average.
    :param data_series: pandas Series of prices
    :param window: The lookback period
    :return: pandas Series with the indicator values
    """
    if not isinstance(data_series, pd.Series):
        raise ValueError("data_series must be a pandas Series")
    if len(data_series) < window:
        return pd.Series([None] * len(data_series), index=data_series.index) # Not enough data

    # Example: Weighted moving average (linearly weighted)
    weights = pd.Series(range(1, window + 1))
    weighted_ma = data_series.rolling(window=window).apply(lambda x: (x * weights).sum() / weights.sum(), raw=True)
    
    return weighted_ma

# Example Usage (for testing locally):
# prices = pd.Series([10, 12, 11, 13, 15, 14, 16, 18, 17, 19, 20, 22, 21, 23, 25])
# custom_ma = custom_indicator(prices, window=5)
# print(custom_ma)
`;

// MOCK_INDICATORS removed, will fetch from API

const IndicatorsView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey } = useAppContext();
  const { sessionToken } = useTradingContext(); // For API calls

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<EditableIndicator | null>(null);
  const [currentCode, setCurrentCode] = useState<string>(DEFAULT_INDICATOR_CODE);

  const [geminiPrompt, setGeminiPrompt] = useState<string>('');
  const [geminiStatus, setGeminiStatus] = useState<GeminiRequestStatus>(GeminiRequestStatus.IDLE);
  const [geminiOutput, setGeminiOutput] = useState<string[]>([]);

  // Pagination state
  const [currentIndicatorPage, setCurrentIndicatorPage] = useState<number>(1);
  const [totalIndicatorPages, setTotalIndicatorPages] = useState<number>(0);
  const [indicatorsPerPage, setIndicatorsPerPage] = useState<number>(10); // Or your preferred default

  // Loading and error states
  const [isLoadingIndicators, setIsLoadingIndicators] = useState<boolean>(false);
  const [indicatorError, setIndicatorError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [parameterJsonError, setParameterJsonError] = useState<string | null>(null);


  const handleCreateNewIndicator = () => {
    setSelectedIndicator({
      id: null,
      name: 'New Custom Indicator',
      code: DEFAULT_INDICATOR_CODE,
      description: '',
      parameters: {},
      parametersString: '{}',
    });
    setGeminiOutput(['New indicator initialized. Edit details and code, then save.']);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveIndicator = async () => {
    if (!selectedIndicator) {
      setSaveError("No indicator selected to save.");
      return;
    }
    if (!selectedIndicator.name.trim()) {
        setSaveError("Indicator name cannot be empty.");
        return;
    }
    if (!currentCode.trim()) {
        setSaveError("Indicator code cannot be empty.");
        return;
    }

    let paramsObject = {};
    try {
      if (selectedIndicator.parametersString && selectedIndicator.parametersString.trim()) {
        paramsObject = JSON.parse(selectedIndicator.parametersString);
      }
      setParameterJsonError(null); // Clear JSON error if parsing succeeds here for save
    } catch (e) {
      setSaveError("Parameters are not valid JSON. Please correct and try again.");
      setParameterJsonError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
      return;
    }

    setIsLoadingIndicators(true);
    setSaveError(null);
    setSaveSuccess(null);
    // parameterJsonError is already handled above, no need to clear again unless successful save

    const indicatorData = {
      name: selectedIndicator.name,
      description: selectedIndicator.description,
      code: currentCode,
      parameters: paramsObject,
    };

    const method = selectedIndicator.id ? 'PUT' : 'POST';
    const endpoint = selectedIndicator.id ? `/api/indicators/${selectedIndicator.id}` : '/api/indicators';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(indicatorData),
      });

      if (!response.ok) {
        let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
        try { const errorData = await response.json(); errorMsg = errorData.error || errorData.message || JSON.stringify(errorData); }
        catch (e) { try { const textError = await response.text(); if (textError) errorMsg = textError; } catch (e2) {} }
        throw new Error(errorMsg);
      }

      const savedIndicator: Indicator = await response.json();
      setSaveSuccess(`Indicator "${savedIndicator.name}" saved successfully!`);

      // Update selectedIndicator with the saved one (especially to get ID if it was new)
      handleSelectIndicator(savedIndicator); // This will re-set parametersString correctly

      // Refresh the list (go to the page where this indicator might be, or current page)
      // If it was a new indicator, it's good to go to page 1 if sorted by newness
      if (method === 'POST') {
        if (currentIndicatorPage !== 1) setCurrentIndicatorPage(1);
        else await fetchIndicators(1, indicatorsPerPage); // if already on page 1, force refresh
      } else {
        await fetchIndicators(currentIndicatorPage, indicatorsPerPage); // Refresh current page for updates
      }
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setSaveError(`Failed to save indicator: ${errMsg}`);
      console.error("Save indicator error:", error);
    } finally {
      setIsLoadingIndicators(false);
    }
  };

  const handleDeleteIndicator = async () => {
    if (!selectedIndicator || !selectedIndicator.id) {
      setSaveError("No saved indicator selected to delete.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the indicator "${selectedIndicator.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoadingIndicators(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch(`/api/indicators/${selectedIndicator.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });

      if (!response.ok) {
        let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
        try { const errorData = await response.json(); errorMsg = errorData.error || errorData.message || JSON.stringify(errorData); }
        catch (e) { try { const textError = await response.text(); if (textError) errorMsg = textError; } catch (e2) {} }
        throw new Error(errorMsg);
      }

      setSaveSuccess(`Indicator "${selectedIndicator.name}" deleted successfully.`);
      setSelectedIndicator(null); // Clear selection
      // setCurrentCode(DEFAULT_INDICATOR_CODE); // Handled by useEffect on selectedIndicator
      setGeminiOutput([`Indicator "${selectedIndicator.name}" deleted.`]);
      // Refresh current page of indicators list; fetchIndicators handles if page becomes empty
      await fetchIndicators(currentIndicatorPage, indicatorsPerPage);
      setTimeout(() => setSaveSuccess(null), 3000);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setSaveError(`Failed to delete indicator: ${errMsg}`);
      console.error("Delete indicator error:", error);
    } finally {
      setIsLoadingIndicators(false);
    }
  };

  const fetchIndicators = useCallback(async (page: number, limit: number) => {
    if (!sessionToken) {
      setIndicatorError("Session token not available. Please log in.");
    if (!sessionToken) {
      setIndicatorError("Session token not available. Please log in.");
      setIndicators([]);
      setTotalIndicatorPages(0);
      return;
    }
    setIsLoadingIndicators(true);
    setIndicatorError(null);
    try {
      const response = await fetch(`/api/indicators?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (!response.ok) {
        let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
        try { const errorData = await response.json(); errorMsg = errorData.error || errorData.message || JSON.stringify(errorData); }
        catch (e) { try { const textError = await response.text(); if (textError) errorMsg = textError; } catch (e2) {} }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setIndicators(data.indicators);
      setTotalIndicatorPages(data.totalPages);
      setCurrentIndicatorPage(data.currentPage);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setIndicatorError(`Failed to fetch indicators: ${errMsg}`);
      setIndicators([]);
      setTotalIndicatorPages(0);
    } finally {
      setIsLoadingIndicators(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchIndicators(currentIndicatorPage, indicatorsPerPage);
  }, [fetchIndicators, currentIndicatorPage, indicatorsPerPage]);


  const handleSelectIndicator = (indicator: Indicator) => {
    setSelectedIndicator({
      ...indicator, // This is a full Indicator type from the list
      id: indicator.id, // Ensure id is explicitly passed
      parametersString: indicator.parameters ? JSON.stringify(indicator.parameters, null, 2) : '{}',
    });
    // setCurrentCode(indicator.code); // Handled by useEffect watching selectedIndicator
    setGeminiOutput([`Indicator "${indicator.name}" loaded.`]);
    setSaveError(null);
    setSaveSuccess(null);
  };

  // Effect to handle selectedIndicator changes (e.g., after create/save or selection from list)
   useEffect(() => {
    if (selectedIndicator) {
      setCurrentCode(selectedIndicator.code);
      // If it's a new indicator (no id yet), parametersString should already be set
      // If it's an existing one, parametersString was set in handleSelectIndicator
      // This effect primarily syncs currentCode.
    } else {
      // No indicator selected (e.g., after delete or initial state)
      setCurrentCode(DEFAULT_INDICATOR_CODE);
      // setGeminiOutput([]); // Cleared elsewhere if needed
    }
  }, [selectedIndicator]);


  const handleGenerateIndicatorCode = async () => {
    if (apiKeyStatus === 'missing' || apiKeyStatus === 'invalid' || !geminiApiKey) { // Check for invalid too
        setGeminiOutput(prev => [...prev, `Error: Gemini API Key is ${apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. Please configure it in Settings. Get key: ${GEMINI_API_KEY_INFO_URL}`]);
        return;
    }
    if (!geminiPrompt.trim()) {
      setGeminiOutput(prev => [...prev, 'Error: Gemini prompt cannot be empty for code generation.']);
      return;
    }
    setGeminiStatus(GeminiRequestStatus.LOADING);
    setGeminiOutput(prev => [...prev, `Generating indicator code for: "${geminiPrompt}"...`]);
    try {
      const systemInstructionForIndicators = `You are an expert Python developer specializing in quantitative trading indicators.
Generate Python code for a single trading indicator function.
The function should typically take a pandas Series (e.g., price data) and parameters as input, and return a pandas Series with the indicator values.
Assume common libraries like 'pandas' and 'numpy' are available.
Only provide the raw Python code block for the indicator. Do not include \`initialize\` or \`handle_data\` functions.`;
      
      // FIX: Pass custom system instruction directly to generatePythonCode
      const code = await generatePythonCode(geminiApiKey, geminiPrompt, systemInstructionForIndicators); // Pass geminiApiKey
      
      setCurrentCode(code);
      if(selectedIndicator) {
        setSelectedIndicator(prev => prev ? {...prev, code: code} : null);
      }
      setGeminiOutput(prev => [...prev, 'Python indicator code generated by Gemini and updated in editor.']);
      setGeminiStatus(GeminiRequestStatus.SUCCESS);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGeminiOutput(prev => [...prev, `Error with Gemini API: ${errorMessage}`]);
      setGeminiStatus(GeminiRequestStatus.ERROR);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-1 flex flex-col space-y-6">
            <SectionPanel title="My Custom Indicators">
                <button
                    onClick={handleCreateNewIndicator}
                    className="w-full mb-4 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                    Create New Indicator
                </button>
                {isLoadingIndicators && <LoadingSpinner message="Loading indicators..." />}
                {indicatorError && <div className="text-red-400 p-2 bg-red-900/20 rounded-md">{indicatorError}</div>}
                {!isLoadingIndicators && !indicatorError && indicators.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No custom indicators found. Create one!</p>
                )}
                 <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-2 custom-scrollbar pr-2"> {/* Adjusted height */}
                    {indicators.map(ind => (
                    <div 
                        key={ind.id}
                        onClick={() => handleSelectIndicator(ind)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${selectedIndicator?.id === ind.id ? 'bg-sky-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <h4 className="font-semibold">{ind.name}</h4>
                        <p className="text-xs text-gray-400 truncate">{ind.description || 'No description'}</p>
                    </div>
                    ))}
                </div>
                {/* Pagination Controls */}
                {totalIndicatorPages > 0 && (
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-300">
                        <button
                            onClick={() => setCurrentIndicatorPage(prev => Math.max(1, prev - 1))}
                            disabled={currentIndicatorPage <= 1 || isLoadingIndicators}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>Page {currentIndicatorPage} of {totalIndicatorPages}</span>
                        <button
                            onClick={() => setCurrentIndicatorPage(prev => Math.min(totalIndicatorPages, prev + 1))}
                            disabled={currentIndicatorPage >= totalIndicatorPages || isLoadingIndicators}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </SectionPanel>
        </div>
        <div className="lg:col-span-2 flex flex-col space-y-6">
            {/* Details, Editor, Save/Delete buttons will go here */}
            <SectionPanel
                title={selectedIndicator ? (selectedIndicator.id ? `Edit: ${selectedIndicator.name}` : 'Create New Indicator') : "Indicator Details & Editor"}
            >
              {selectedIndicator ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="indicatorName" className="block text-sm font-medium text-gray-300 mb-1">Indicator Name</label>
                    <input
                      type="text"
                      id="indicatorName"
                      value={selectedIndicator.name}
                      onChange={(e) => setSelectedIndicator(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="e.g., My Custom SMA"
                    />
                  </div>
                  <div>
                    <label htmlFor="indicatorDesc" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <textarea
                      id="indicatorDesc"
                      value={selectedIndicator.description || ''}
                      onChange={(e) => setSelectedIndicator(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500 h-20 resize-none"
                      placeholder="Brief description of the indicator"
                    />
                  </div>
                  <div>
                    <label htmlFor="indicatorParams" className="block text-sm font-medium text-gray-300 mb-1">
                      Parameters (JSON format)
                    </label>
                    <textarea
                      id="indicatorParams"
                      value={selectedIndicator.parametersString || '{}'}
                      onChange={(e) => {
                        const newParamsString = e.target.value;
                        setSelectedIndicator(prev => prev ? { ...prev, parametersString: newParamsString } : null);
                        try {
                          JSON.parse(newParamsString);
                          setParameterJsonError(null);
                        } catch (jsonErr) {
                          setParameterJsonError("Invalid JSON format.");
                        }
                      }}
                      className={`w-full bg-gray-700 text-white p-2 rounded-md border ${parameterJsonError ? 'border-red-500' : 'border-gray-600'} focus:ring-sky-500 focus:border-sky-500 h-24 resize-none font-mono text-xs`}
                      placeholder='{ "window": 20, "color": "blue" }'
                    />
                    {parameterJsonError && <p className="text-xs text-red-400 mt-1">{parameterJsonError}</p>}
                     <p className="text-xs text-gray-500 mt-1">Edit parameters as a JSON object. E.g., <code>{`{"period": 14, "smoothing": "ema"}`}</code></p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Select an indicator to edit or create a new one.</p>
              )}

                <CodeEditor code={currentCode} setCode={setCurrentCode} height={selectedIndicator ? "calc(100vh - 700px)" : "calc(100vh - 550px)"} />

                <div className="mt-4 flex justify-end space-x-3">
                    {selectedIndicator && selectedIndicator.id && (
                         <button
                            onClick={handleDeleteIndicator}
                            disabled={isLoadingIndicators}
                            className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                        >
                            {isLoadingIndicators ? <LoadingSpinner size="sm"/> : 'Delete'}
                        </button>
                    )}
                    {selectedIndicator && (
                        <button
                            onClick={handleSaveIndicator}
                            disabled={isLoadingIndicators}
                            className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                        >
                           {isLoadingIndicators ? <LoadingSpinner size="sm"/> : (selectedIndicator.id ? 'Save Changes' : 'Save New Indicator')}
                        </button>
                    )}
                </div>
                 {saveError && <p className="text-sm text-red-400 mt-2 py-1 px-2 bg-red-900/30 rounded-md">{saveError}</p>}
                 {saveSuccess && <p className="text-sm text-green-400 mt-2 py-1 px-2 bg-green-900/30 rounded-md">{saveSuccess}</p>}
            </SectionPanel>

             <SectionPanel title="Gemini: Generate Indicator Code">
                {(apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') && ( // Show for missing or invalid
                    <div className="mb-4 p-3 bg-red-800 border border-red-700 rounded-md text-yellow-200 text-sm">
                        Gemini API Key is {apiKeyStatus === 'invalid' ? 'invalid' : 'missing'}. AI features are disabled. 
                        <a href={GEMINI_API_KEY_INFO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100 ml-1">Get a key</a>.
                    </div>
                )}
                <textarea
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                placeholder="Describe the indicator (e.g., 'A Donchian Channel indicator with a 20-period lookback')."
                className="w-full p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-sky-500 focus:border-sky-500 resize-none mb-2"
                rows={2}
                disabled={apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                />
                <button
                    onClick={handleGenerateIndicatorCode}
                    disabled={geminiStatus === GeminiRequestStatus.LOADING || apiKeyStatus === 'missing' || apiKeyStatus === 'invalid'}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
                >
                    {geminiStatus === GeminiRequestStatus.LOADING ? <LoadingSpinner size="sm" /> : 'Generate Indicator Code'}
                </button>
                {geminiStatus === GeminiRequestStatus.LOADING && <LoadingSpinner message="Gemini is crafting your indicator..." />}
                <ConsoleOutput lines={geminiOutput} title="Gemini Output" height="100px" className="mt-3"/>
            </SectionPanel>
        </div>
    </div>
  );
};

export default IndicatorsView;
