// Content script for Chrome extension
console.log('Content script loaded');

// Function to safely send messages to the background script with proper error handling
const sendMessageToBackground = async (message) => {
  try {
    // Check if runtime is available (extension might be disabled/reloading)
    if (!chrome.runtime) {
      console.warn('Chrome runtime not available');
      return false;
    }
    
    // Use Promise-based approach with error handling
    return await chrome.runtime.sendMessage(message)
      .catch(error => {
        // Handle specific error types
        if (error.message.includes('Receiving end does not exist')) {
          console.warn('Background script not ready or service worker inactive');
        } else if (error.message.includes('The message port closed')) {
          console.warn('Message port closed before response was received');
        } else {
          console.error('Error sending message to background:', error);
        }
        return false;
      });
  } catch (error) {
    console.error('Error in sendMessageToBackground:', error);
    return false;
  }
};

// Example function that safely sends data to the background script
const sendChatData = async (chat, meetId) => {
  try {
    // Check if runtime is available
    if (!chrome.runtime) {
      console.warn('Chrome runtime not available for sending chat data');
      return false;
    }
    
    // Prepare the message
    const message = {
      type: 'CURRENT_CHAT',
      data: { chat, meetId }
    };
    
    // Send it with error handling
    const response = await sendMessageToBackground(message);
    console.log('Received response from background:', response);
    return response && response.success;
  } catch (error) {
    console.error('Error sending chat data:', error);
    return false;
  }
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in content script:', message);
  
  // Handle ping message from popup (via background)
  if (message.type === 'PING') {
    console.log('Ping received in content script');
    sendResponse({ success: true, timestamp: Date.now(), source: 'content.js' });
    return true;
  }
  
  // Always send a response to avoid "The message port closed before a response was received" error
  sendResponse({ success: true, source: 'content.js' });
  return true; // Indicates async response
});

// Example usage:
// This would be triggered by some user action or event in your actual extension
// For example, when new chat data is available:
/*
document.addEventListener('chat-updated', async (event) => {
  const { chat, meetId } = event.detail;
  await sendChatData(chat, meetId);
});
*/ 