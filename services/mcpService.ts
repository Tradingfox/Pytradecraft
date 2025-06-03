import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { 
  StructuredOutputParser
} from "@langchain/core/output_parsers";
import { OutputFixingParser } from "langchain/output_parsers";
import { z } from "zod";
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate, 
  SystemMessagePromptTemplate 
} from "@langchain/core/prompts";
import { 
  BufferMemory, 
  ChatMessageHistory 
} from "langchain/memory";
import { 
  ConversationChain, 
  LLMChain, 
  SequentialChain 
} from "langchain/chains";
import { GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION } from '../constants';

// Sequential Thinking MCP
export const createSequentialThinkingChain = (apiKey: string, systemInstruction?: string) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    modelName: "gemini-2.5-flash-preview-04-17",
    temperature: 0.3,
  });

  // Step 1: Analyze the requirements
  const analyzePrompt = PromptTemplate.fromTemplate(
    `Analyze the following trading algorithm requirements:
    {input}

    Think step by step about what this algorithm needs to do.`
  );

  // Step 2: Design the algorithm structure
  const designPrompt = PromptTemplate.fromTemplate(
    `Based on this analysis:
    {analysis}

    Design the high-level structure of the Python trading algorithm.`
  );

  // Step 3: Implement the algorithm
  const implementPrompt = PromptTemplate.fromTemplate(
    `Based on this design:
    {design}

    Implement the complete Python trading algorithm code.

    System Instruction: ${systemInstruction || GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION}`
  );

  // Create the sequential chain
  const analyzeChain = RunnableSequence.from([
    analyzePrompt,
    model,
    new StringOutputParser(),
  ]);

  const designChain = RunnableSequence.from([
    designPrompt,
    model,
    new StringOutputParser(),
  ]);

  const implementChain = RunnableSequence.from([
    implementPrompt,
    model,
    new StringOutputParser(),
  ]);

  // Combine into a sequential chain
  const sequentialChain = async (input: string) => {
    const analysis = await analyzeChain.invoke({ input });
    const design = await designChain.invoke({ analysis });
    const implementation = await implementChain.invoke({ design });
    return implementation;
  };

  return sequentialChain;
};

// Context7 MCP
export const createContext7Chain = (apiKey: string, systemInstruction?: string) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    modelName: "gemini-2.5-flash-preview-04-17",
    temperature: 0.3,
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      systemInstruction || GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION
    ),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);

  const chain = RunnableSequence.from([
    chatPrompt,
    model,
    new StringOutputParser(),
  ]);

  return chain;
};

// Memory MCP
export const createMemoryChain = (apiKey: string, systemInstruction?: string) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    modelName: "gemini-2.5-flash-preview-04-17",
    temperature: 0.3,
  });

  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "history",
    inputKey: "input",
  });

  const chain = new ConversationChain({
    llm: model,
    memory,
    prompt: ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        systemInstruction || GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION
      ),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]),
  });

  return chain;
};

// Structured Output MCP
export const createStructuredOutputChain = (apiKey: string, systemInstruction?: string) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    modelName: "gemini-2.5-flash-preview-04-17",
    temperature: 0.3,
  });

  // Define the schema for the structured output
  const algorithmSchema = z.object({
    name: z.string().describe("The name of the trading algorithm"),
    description: z.string().describe("A brief description of what the algorithm does"),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      default: z.any(),
      description: z.string()
    })).describe("The parameters used by the algorithm"),
    code: z.string().describe("The Python code for the algorithm"),
  });

  // Create a parser for the structured output
  const parser = StructuredOutputParser.fromZodSchema(algorithmSchema);

  // Create a fixing parser to handle potential errors
  const fixingParser = OutputFixingParser.fromLLM(model, parser);

  // Create the prompt template
  const prompt = PromptTemplate.fromTemplate(
    `${systemInstruction || GEMINI_PYTRADECRAFT_SYSTEM_INSTRUCTION}

    Generate a trading algorithm based on the following requirements:
    {input}

    ${parser.getFormatInstructions()}`
  );

  // Create the chain
  const chain = RunnableSequence.from([
    prompt,
    model,
    fixingParser,
  ]);

  return chain;
};

// Combined MCP with all capabilities
export const createCombinedMCP = (apiKey: string, systemInstruction?: string) => {
  const sequentialThinking = createSequentialThinkingChain(apiKey, systemInstruction);
  const context7 = createContext7Chain(apiKey, systemInstruction);
  const memory = createMemoryChain(apiKey, systemInstruction);
  const structuredOutput = createStructuredOutputChain(apiKey, systemInstruction);

  return {
    sequentialThinking,
    context7,
    memory,
    structuredOutput
  };
};
