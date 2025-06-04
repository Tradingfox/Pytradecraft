import React, { useState, useEffect } from 'react';
import SectionPanel from '../components/SectionPanel';
import { useAppContext } from '../contexts/AppContext';
import { GEMINI_API_KEY_INFO_URL } from '../constants.tsx';


const SettingsView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey: contextGeminiApiKey, setGeminiApiKey: setContextGeminiApiKey, checkApiKey } = useAppContext();
  const [geminiApiKey, setGeminiApiKey] = useState(contextGeminiApiKey || '');
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [isCheckingManually, setIsCheckingManually] = useState<boolean>(false);


  useEffect(() => {
    setGeminiApiKey(contextGeminiApiKey || '');
  }, [contextGeminiApiKey]);

  const handleSaveSettings = async () => {
    setContextGeminiApiKey(geminiApiKey);
    // checkApiKey is already called by the AppContext when contextGeminiApiKey changes.
    // However, if we want immediate feedback on *this* page after save, explicitly calling it can be useful.
    // Or rely on the AppContext's useEffect for contextGeminiApiKey.
    // For this task, let's assume we want explicit feedback tied to the save action.
    const newStatus = await checkApiKey(geminiApiKey);
    setSaveStatusMessage(`Settings saved. API Key status: ${newStatus}.`);
    setTimeout(() => setSaveStatusMessage(null), 5000); // Clear message after 5 seconds
  };

  const handleCheckKey = async () => {
    if (!geminiApiKey.trim()) return;
    setIsCheckingManually(true);
    // We call checkApiKey from context, which updates apiKeyStatus globally
    await checkApiKey(geminiApiKey);
    // No need to set a specific message here as apiKeyStatus will update globally.
    // The 'checking' status itself provides feedback.
    // After checkApiKey finishes, apiKeyStatus will be updated, and the UI will reflect it.
    setIsCheckingManually(false); // Reset manual check trigger
  };
  
  return (
    <div className="space-y-6">
      <SectionPanel title="Application Settings">
        <p className="text-gray-400 mb-6">
          Configure various aspects of PyTradeCraft. Settings are mock for this demonstration.
        </p>

        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold text-white mb-2">Theme</h4>
                <select className="w-full md:w-1/2 bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500">
                    <option>Dark Mode (Default)</option>
                    <option disabled>Light Mode (Coming Soon)</option>
                </select>
            </div>

            <div>
                <h4 className="text-lg font-semibold text-white mb-2">Notifications</h4>
                <label className="flex items-center space-x-2 text-gray-300">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500" defaultChecked />
                    <span>Enable Desktop Notifications (Mock)</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300 mt-1">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500" />
                    <span>Enable Email Summaries (Mock)</span>
                </label>
            </div>
             <div>
                <h4 className="text-lg font-semibold text-white mb-2">Gemini API Key</h4>
                <input 
                    type="password" 
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API Key"
                    className="w-full md:w-1/2 bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-sky-500 focus:border-sky-500 mb-2"
                />
                <p className="text-sm text-gray-400 mb-2">
                    Current Status: 
                    <span className={`font-semibold ml-1 ${
                            apiKeyStatus === 'valid' ? 'text-green-400' :
                            apiKeyStatus === 'missing' ? 'text-red-400' :
                            apiKeyStatus === 'invalid' ? 'text-orange-400' :
                            apiKeyStatus === 'checking' ? 'text-yellow-400' : 'text-gray-400' // Default for idle or other states
                        }`}>
                            {apiKeyStatus === 'valid' ? 'Valid & Active' :
                             apiKeyStatus === 'missing' ? 'Missing' :
                             apiKeyStatus === 'invalid' ? 'Invalid Key' :
                             apiKeyStatus === 'checking' ? 'Verifying Key...' : 'Idle'
                            }
                        </span>
                         {isCheckingManually && apiKeyStatus === 'checking' && <span className="text-yellow-400 ml-2">(Manual check...)</span>}
                    </p>
                    {(apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') && (
                        <p className="text-sm text-yellow-300 mb-2">
                            To use AI-powered features, please enter a valid API key above and save settings.
                            <a href={GEMINI_API_KEY_INFO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100 ml-1">Get an API Key here.</a>
                        </p>
                    )}
                     <div className="flex items-center space-x-3 mt-3">
                        <button
                            onClick={handleCheckKey}
                            disabled={!geminiApiKey.trim() || apiKeyStatus === 'checking'}
                            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition duration-150 ease-in-out disabled:opacity-50"
                        >
                            {apiKeyStatus === 'checking' && isCheckingManually ? 'Checking...' : 'Check Validity'}
                        </button>
                    </div>
                </div>
            </div>
            {saveStatusMessage && (
                <div className="mt-4 p-3 bg-green-800 border border-green-700 rounded-md text-green-200 text-sm">
                    {saveStatusMessage}
                </div>
            )}
            <div className="mt-8 border-t border-gray-700 pt-6">
                <button
                    onClick={handleSaveSettings}
                    disabled={apiKeyStatus === 'checking'} // Disable save if a check is in progress
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50">
                    Save Settings
                </button>
            </div>
        </SectionPanel>
    </div>
  );
};

export default SettingsView;
