# PyTradeCraft

A web application for developing, backtesting, and managing Python-based trading algorithms with AI assistance.

## Features

- **AI-Powered Algorithm Generation**: Create trading algorithms using Google's Gemini AI
- **Advanced MCP Servers**: Enhanced AI capabilities with Model Control Protocol servers
  - Sequential Thinking
  - Context-aware Processing
  - Memory for Follow-up Questions
  - Structured Output
- **Backtesting**: Test your algorithms against historical data
- **Trading API Integration**: Connect to trading platforms

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Documentation

- [MCP Servers Documentation](MCP_SERVERS_DOCUMENTATION.md): Learn about the Model Control Protocol servers and how to use them

# Dashboard Data Extension

A Chrome extension to safely handle data communication between the dashboard and background processes.

## Problem Solved

This extension addresses the following errors that were occurring in the original code:

```
Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
Uncaught (in promise) Error: No tab with id: 1909664913.
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
```

These errors occur due to:

1. **Messaging to non-existent tabs**: When trying to send messages to tabs that no longer exist or to chrome:// pages where content scripts cannot run.
2. **Race conditions in messaging**: When the receiver of a message is not ready or has been unloaded.
3. **Background service worker inactivity**: When the service worker goes inactive but content scripts still try to communicate with it.

## Solution Architecture

The extension implements several best practices to avoid these errors:

1. **Safe tab messaging**: Always checks if a tab exists before sending messages to it.
2. **Proper error handling**: Catches and handles all potential message-related errors.
3. **Response guarantees**: Always sends a response to avoid "message channel closed" errors.
4. **Tab tracking**: Keeps track of active tabs to avoid sending messages to closed tabs.
5. **Proper initialization**: Handles initial state correctly when the extension is installed or updated.

## How to Use

1. Install the extension in Chrome
2. The extension will automatically handle communication errors
3. Use the popup interface to check the status of the extension components
4. Implement your specific dashboard data handling using the provided safe messaging patterns

## Files

- **background.js**: Service worker script that runs in the background
- **content.js**: Content script that runs in web pages
- **popup.html/popup.js**: User interface for the extension
- **manifest.json**: Extension configuration

## API Usage Example

To safely send data from a web page to the background:

```javascript
// In your web page or content script
const sendData = async (data) => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'YOUR_MESSAGE_TYPE',
      data
    }).catch(error => {
      console.warn('Error sending message:', error);
      return false;
    });
    
    return response && response.success;
  } catch (error) {
    console.error('Error sending data:', error);
    return false;
  }
};
```

## Developer Notes

- Always handle messaging errors using try/catch and Promise.catch()
- Avoid sending messages to chrome:// URLs
- Always send a response when receiving a message
- Use async/await for clearer error handling with Promises
- Check if tabs exist before sending messages to them

This approach ensures that your extension will be robust against common messaging errors and will gracefully handle edge cases like tabs being closed or background workers becoming inactive.
