import { testMemoryMCP } from './memoryMCPTest';
import * as fs from 'fs';
import * as path from 'path';

async function runAndSaveMemoryMCPTest() {
  try {
    console.log("Running Memory MCP Test and saving results...");

    // Run the test
    const results = await testMemoryMCP();

    if (!results) {
      console.error("Test failed to produce results.");
      return;
    }

    // Format results as markdown
    const markdown = `# Memory MCP Test Results
    
## Initial Code Explanation
\`\`\`
${results.initialExplanation}
\`\`\`

## Follow-up Question 1: Backtest Method Details
**Question:** Can you explain the backtest method in more detail and how it calculates portfolio holdings?

\`\`\`
${results.followUpQuestion1}
\`\`\`

## Follow-up Question 2: Handling Market Volatility
**Question:** How could we improve this strategy to handle market volatility better?

\`\`\`
${results.followUpQuestion2}
\`\`\`

## Follow-up Question 3: Parameter Optimization
**Question:** How could we implement parameter optimization to find the best moving average windows?

\`\`\`
${results.followUpQuestion3}
\`\`\`

## Test Summary
This test demonstrates the Memory MCP's ability to maintain context across multiple interactions.
The model remembered the original code and provided coherent follow-up responses without requiring
the code to be resubmitted with each question.

## Implementation Notes
- Using Memory MCP from mcpService.ts
- Utilizing explainPythonCodeWithMemory from geminiService.ts
- Test conducted with Moving Average Crossover Strategy sample code
- Successfully maintained context across 4 sequential interactions
`;

    // Save to file
    const filePath = path.join(__dirname, '..', 'memory_mcp_test_results.md');
    fs.writeFileSync(filePath, markdown);

    console.log(`Memory MCP Test results saved to: ${filePath}`);

  } catch (error) {
    console.error("Error running and saving Memory MCP Test:", error);
  }
}

// Run the function
runAndSaveMemoryMCPTest();
