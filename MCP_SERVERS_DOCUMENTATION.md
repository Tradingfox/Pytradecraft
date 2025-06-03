# MCP Servers Documentation

## Overview

This document provides information about the Model Control Protocol (MCP) servers implemented in the PyTradeCraft application. MCP servers enhance the capabilities of AI models by providing specialized processing pipelines for different use cases.

## Implemented MCP Servers

### 1. Sequential Thinking MCP

**Description**: Breaks down complex reasoning tasks into sequential steps, improving the quality of generated code by following a structured approach.

**Implementation**: Uses a three-step process:
1. Analyze requirements
2. Design algorithm structure
3. Implement code

**Benefits**:
- Produces more thoughtful and well-structured code
- Reduces errors by considering the problem from multiple angles
- Provides better handling of edge cases

**Usage Example**:
```typescript
import { generatePythonCodeWithSequentialThinking } from '../services/geminiService';

// Generate code using Sequential Thinking MCP
const code = await generatePythonCodeWithSequentialThinking(apiKey, prompt);
```

### 2. Context7 MCP

**Description**: Enhances the model's ability to maintain context and produce more coherent responses.

**Implementation**: Uses a specialized prompt template and system instructions to provide better context handling.

**Benefits**:
- Improved coherence in responses
- Better understanding of complex requirements
- More consistent output

**Usage Example**:
```typescript
import { generatePythonCodeWithContext } from '../services/geminiService';

// Generate code using Context7 MCP
const code = await generatePythonCodeWithContext(apiKey, prompt);
```

### 3. Memory MCP

**Description**: Maintains conversation history to enable follow-up questions and continuous interaction.

**Implementation**: Uses a buffer memory system to store previous interactions and maintain context across multiple requests.

**Benefits**:
- Enables follow-up questions about generated code
- Maintains context across multiple interactions
- Provides more interactive experience

**Usage Example**:
```typescript
import { explainPythonCodeWithMemory } from '../services/geminiService';

// Initial explanation
const explanation = await explainPythonCodeWithMemory(apiKey, code);

// Follow-up question
const followUpResponse = await explainPythonCodeWithMemory(apiKey, '', "How would I modify this to use a different indicator?");
```

### 4. Structured Output MCP

**Description**: Generates structured data in a specific format, ensuring consistency and enabling programmatic use of the output.

**Implementation**: Uses Zod schema validation to enforce a specific output structure and provides error correction.

**Benefits**:
- Consistent output format
- Easier integration with application logic
- Automatic error correction

**Usage Example**:
```typescript
import { generateStructuredAlgorithm } from '../services/geminiService';

// Generate structured algorithm
const result = await generateStructuredAlgorithm(apiKey, prompt);
console.log(result.name);        // Algorithm name
console.log(result.description); // Algorithm description
console.log(result.parameters);  // Algorithm parameters
console.log(result.code);        // Algorithm code
```

## Integration in the UI

The MCP servers are integrated into the PyTradeCraft UI in two main areas:

### 1. Algorithm View

In the Algorithm View, users can select which MCP server to use for code generation and explanation:

- **Standard**: Uses the basic Gemini API
- **Sequential Thinking**: Uses the Sequential Thinking MCP
- **Context-aware**: Uses the Context7 MCP
- **Memory**: Uses the Memory MCP for code explanation with follow-up questions
- **Structured Output**: Uses the Structured Output MCP to generate algorithms with structured metadata

### 2. Backtesting View

In the Backtesting View, users can select which analysis method to use:

- **Standard Analysis**: Uses the basic Gemini API
- **Context-aware Analysis**: Uses the Context7 MCP for more detailed and structured analysis

## Technical Implementation

The MCP servers are implemented using LangChain, a framework for building applications with large language models. The implementation uses the following components:

- **@langchain/core**: Core LangChain functionality
- **@langchain/google-genai**: LangChain integration with Google's Generative AI
- **langchain**: The main LangChain library
- **@langchain/community**: Community extensions for LangChain
- **zod**: Schema validation library

The implementation is modular and can be extended with additional MCP servers as needed.

## Future Enhancements

Potential future enhancements for the MCP servers include:

1. **Tool-using MCP**: Enable the model to use external tools and APIs
2. **Retrieval-augmented MCP**: Enhance the model with knowledge from external documents
3. **Multi-agent MCP**: Use multiple specialized agents for different aspects of code generation
4. **Fine-tuned MCP**: Use fine-tuned models for specific trading algorithm domains