// Popup script that communicates with the background script
document.addEventListener('DOMContentLoaded', async () => {
  const backgroundStatus = document.getElementById('background-status');
  const contentStatus = document.getElementById('content-status');
  const activeTabsCount = document.getElementById('active-tabs-count');
  const refreshDataButton = document.getElementById('refresh-data');
  
  // Check if the background service is running
  const checkBackgroundService = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PING' })
        .catch(error => {
          console.error('Error connecting to background service:', error);
          return false;
        });
      
      // Update UI based on response
      if (response && response.success) {
        backgroundStatus.classList.remove('status-inactive');
        backgroundStatus.classList.add('status-active');
      } else {
        backgroundStatus.classList.remove('status-active');
        backgroundStatus.classList.add('status-inactive');
      }
    } catch (error) {
      console.error('Failed to check background service:', error);
      backgroundStatus.classList.remove('status-active');
      backgroundStatus.classList.add('status-inactive');
    }
  };
  
  // Check if content scripts are working in the active tab
  const checkContentScripts = async () => {
    try {
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab) {
        contentStatus.classList.remove('status-active');
        contentStatus.classList.add('status-inactive');
        return;
      }
      
      // Check if the URL is supported (not chrome:// pages)
      if (activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
        try {
          // Try to send a message to the content script
          const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'PING' })
            .catch(() => false);
          
          if (response && response.success) {
            contentStatus.classList.remove('status-inactive');
            contentStatus.classList.add('status-active');
          } else {
            contentStatus.classList.remove('status-active');
            contentStatus.classList.add('status-inactive');
          }
        } catch (error) {
          console.error('Error communicating with content script:', error);
          contentStatus.classList.remove('status-active');
          contentStatus.classList.add('status-inactive');
        }
      } else {
        // Content scripts can't run on chrome:// pages
        contentStatus.classList.remove('status-active');
        contentStatus.classList.add('status-inactive');
      }
    } catch (error) {
      console.error('Failed to check content scripts:', error);
      contentStatus.classList.remove('status-active');
      contentStatus.classList.add('status-inactive');
    }
  };
  
  // Get active tabs count
  const updateActiveTabsCount = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TABS' })
        .catch(() => ({ count: 0 }));
      
      const count = response?.count || 0;
      activeTabsCount.textContent = `${count} active tab${count !== 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Failed to get active tabs count:', error);
      activeTabsCount.textContent = '0 active tabs';
    }
  };
  
  // Refresh all data
  const refreshData = async () => {
    await checkBackgroundService();
    await checkContentScripts();
    await updateActiveTabsCount();
  };
  
  // Set up button click handler
  refreshDataButton.addEventListener('click', refreshData);
  
  // Initial refresh
  refreshData();
}); 