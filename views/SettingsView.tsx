import React, { useState, useEffect } from 'react';
import SectionPanel from '../components/SectionPanel';
import { useAppContext } from '../contexts/AppContext';
import { GEMINI_API_KEY_INFO_URL } from '../constants.tsx';


const SettingsView: React.FC = () => {
  const { apiKeyStatus, geminiApiKey: contextGeminiApiKey, setGeminiApiKey: setContextGeminiApiKey, checkApiKey } = useAppContext();
  const [geminiApiKey, setGeminiApiKey] = useState(contextGeminiApiKey || '');

  useEffect(() => {
    setGeminiApiKey(contextGeminiApiKey || '');
  }, [contextGeminiApiKey]);

  const handleSaveSettings = async () => { // Make async
    setContextGeminiApiKey(geminiApiKey);
    await checkApiKey(geminiApiKey); // Await the check
    alert('Settings saved and API key status updated!'); // Update alert message
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
                        apiKeyStatus === 'invalid' ? 'text-orange-400' : 'text-yellow-400' // Added 'invalid' color
                    }`}>
                        {apiKeyStatus === 'valid' ? 'Valid & Active' : 
                         apiKeyStatus === 'missing' ? 'Missing' : 
                         apiKeyStatus === 'invalid' ? 'Invalid Key' : 'Checking...' // Added 'invalid' text
                        }
                    </span>
                </p>
                {(apiKeyStatus === 'missing' || apiKeyStatus === 'invalid') && ( // Show for missing or invalid
                    <p className="text-sm text-yellow-300 mb-2">
                        To use AI-powered features, please enter a valid API key above and save settings. 
                        <a href={GEMINI_API_KEY_INFO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100 ml-1">Get an API Key here.</a>
                    </p>
                )}
            </div>

        </div>
         <div className="mt-8 border-t border-gray-700 pt-6">
            <button 
                onClick={handleSaveSettings}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                Save Settings
            </button>
        </div>
      </SectionPanel>
    </div>
  );
};

export default SettingsView;
