// Background script for Chrome extension
console.log('Background script loaded');

// Keep track of active tabs
let activeTabs = {};

// Listen for tab updates to track active tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    activeTabs[tabId] = true;
  }
});

// Track when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete activeTabs[tabId];
});

// Track active tab changes
chrome.tabs.onActivated.addListener(({ tabId }) => {
  // Mark this tab as active
  activeTabs[tabId] = true;
});

// Helper function to check if a tab exists before sending a message
const safelyMessageTab = async (tabId, message) => {
  try {
    // First check if the tab exists
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) {
      console.log(`Tab ${tabId} does not exist, skipping message`);
      return false;
    }

    // Then try to send the message with proper error handling
    return await chrome.tabs.sendMessage(tabId, message)
      .catch(error => {
        console.log(`Error sending message to tab ${tabId}:`, error.message);
        return false;
      });
  } catch (error) {
    console.log("Error in safelyMessageTab:", error.message);
    return false;
  }
};

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  
  // Handle different message types
  if (request.type === 'CURRENT_CHAT') {
    // Process chat data
    console.log('Processing chat data:', request.data);
    
    // Always respond to avoid "The message port closed before a response was received" error
    sendResponse({ success: true });
    return true; // Indicates async response
  }
  
  // Handle ping message from popup
  if (request.type === 'PING') {
    console.log('Ping received');
    sendResponse({ success: true, timestamp: Date.now() });
    return true;
  }
  
  // Handle get active tabs count
  if (request.type === 'GET_ACTIVE_TABS') {
    const count = Object.keys(activeTabs).length;
    console.log(`Active tabs count: ${count}`);
    sendResponse({ success: true, count });
    return true;
  }
  
  // Always send a response to avoid connection errors
  sendResponse({ success: true });
  return true; // Indicates async response
});

// Properly initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  
  // Get all currently open tabs and inject content scripts if needed
  try {
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} existing tabs`);
    
    // Process each tab if needed
    for (const tab of tabs) {
      // Only inject into http/https pages, not chrome:// pages
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        activeTabs[tab.id] = tab.active;
      }
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}); 