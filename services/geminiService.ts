import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION, PYTHON_CODE_GENERATION_MODEL, PYTHON_CODE_EXPLANATION_MODEL } from '../constants.ts';
import { 
  createSequentialThinkingChain, 
  createContext7Chain, 
  createMemoryChain, 
  createStructuredOutputChain,
  createCombinedMCP
} from './mcpService';

// Original implementation (for backward compatibility)
export const generatePythonCode = async (apiKey: string, prompt: string, systemInstructionOverride?: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PYTHON_CODE_GENERATION_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstructionOverride || GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION, 
        temperature: 0.3,
      },
    });
    if (typeof response.text !== 'string') {
      throw new Error("Failed to generate Python code: No text response from API.");
    }
    return response.text;
  } catch (error) {
    console.error("Error generating Python code:", error);
    throw error;
  }
};

// New implementation using Sequential Thinking MCP
export const generatePythonCodeWithSequentialThinking = async (apiKey: string, prompt: string, systemInstructionOverride?: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }
  try {
    const sequentialThinkingChain = createSequentialThinkingChain(apiKey, systemInstructionOverride);
    const result = await sequentialThinkingChain(prompt);
    return result;
  } catch (error) {
    console.error("Error generating Python code with Sequential Thinking:", error);
    throw error;
  }
};

// New implementation using Context7 MCP
export const generatePythonCodeWithContext = async (apiKey: string, prompt: string, systemInstructionOverride?: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }
  try {
    const context7Chain = createContext7Chain(apiKey, systemInstructionOverride);
    const result = await context7Chain.invoke({ input: prompt });
    return result;
  } catch (error) {
    console.error("Error generating Python code with Context7:", error);
    throw error;
  }
};

// New implementation using Structured Output MCP
export const generateStructuredAlgorithm = async (apiKey: string, prompt: string, systemInstructionOverride?: string): Promise<any> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }
  try {
    const structuredOutputChain = createStructuredOutputChain(apiKey, systemInstructionOverride);
    const result = await structuredOutputChain.invoke({ input: prompt });
    return result;
  } catch (error) {
    console.error("Error generating structured algorithm:", error);
    throw error;
  }
};

// Original implementation (for backward compatibility)
export const explainPythonCode = async (apiKey: string, code: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }

  const promptContent = `Please explain the following Python trading algorithm code. Focus on its logic, strategy, and potential improvements or risks:\\n\\n\`\`\`python\\n${code}\\n\`\`\`\\n`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PYTHON_CODE_EXPLANATION_MODEL,
      contents: promptContent,
       config: {
        temperature: 0.7,
      },
    });
    if (typeof response.text !== 'string') {
      throw new Error("Failed to explain Python code: No text response from API.");
    }
    return response.text;
  } catch (error) {
    console.error("Error explaining Python code:", error);
    throw error;
  }
};

// Memory-based implementation for code explanation
let memoryChainInstance: any = null;

export const explainPythonCodeWithMemory = async (apiKey: string, code: string, question?: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }

  try {
    // Create memory chain if it doesn't exist
    if (!memoryChainInstance) {
      memoryChainInstance = createMemoryChain(apiKey);
    }

    // If this is the first call (with code), set up the context
    if (code) {
      const promptContent = `Please analyze this Python trading algorithm code: \n\n\`\`\`python\n${code}\n\`\`\`\n`;
      const result = await memoryChainInstance.call({ input: promptContent });
      return result.response;
    } 
    // If this is a follow-up question
    else if (question) {
      const result = await memoryChainInstance.call({ input: question });
      return result.response;
    } else {
      throw new Error("Either code or question must be provided");
    }
  } catch (error) {
    console.error("Error explaining Python code with memory:", error);
    throw error;
  }
};

// Original implementation (for backward compatibility)
export const analyzeBacktestResults = async (apiKey: string, resultsSummary: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }

  const promptContent = `Analyze the following trading algorithm backtest results and provide insights, potential issues, or suggestions for improvement. Be concise and practical.\\nResults:\\n${resultsSummary}\\n  `;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PYTHON_CODE_EXPLANATION_MODEL,
      contents: promptContent,
       config: {
        temperature: 0.6,
      },
    });
    if (typeof response.text !== 'string') {
      throw new Error("Failed to analyze backtest results: No text response from API.");
    }
    return response.text;
  } catch (error) {
    console.error("Error analyzing backtest results:", error);
    throw error;
  }
};

// Context-based implementation for backtest analysis
export const analyzeBacktestResultsWithContext = async (apiKey: string, resultsSummary: string): Promise<string> => {
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject("Gemini API key is missing. Please provide a valid API key.");
  }

  try {
    const context7Chain = createContext7Chain(apiKey, `
      You are an expert trading algorithm analyst. Your task is to analyze backtest results and provide:
      1. A summary of the performance metrics
      2. Identification of strengths and weaknesses
      3. Specific suggestions for improvement
      4. Risk assessment
      5. Comparison to market benchmarks (if data is available)

      Be thorough but concise. Focus on actionable insights.
    `);

    const promptContent = `Analyze these trading algorithm backtest results:

    ${resultsSummary}

    Provide a comprehensive analysis with actionable recommendations.`;

    const result = await context7Chain.invoke({ input: promptContent });
    return result;
  } catch (error) {
    console.error("Error analyzing backtest results with context:", error);
    throw error;
  }
};

export const checkApiKeyValidity = async (apiKey: string): Promise<boolean> => {
  if (!apiKey || apiKey.trim() === "") {
    console.warn("Gemini API key is missing for validity check.");
    return false;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.list(); // A simple call to check if the key is functional
    return true;
  } catch (error) {
    console.error("API Key validity check failed:", error);
    return false;
  }
};
