// background.js - Service Worker for Instagram Saved Posts Viewer

// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed if the tab has finished loading and it's Instagram's main page
  if (changeInfo.status === 'complete' && 
      tab.url === 'https://www.instagram.com/') {
    // Try to inject the sync button
    chrome.tabs.sendMessage(tabId, { action: 'showSyncButton' })
      .catch(error => console.log('Tab not ready yet'));
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openInstagramForSync') {
    handleInstagramSync();
    sendResponse({ status: 'Processing sync request' });
  }
  return true; // Keep message channel open for async response
});

// Handle Instagram sync process
async function handleInstagramSync() {
  try {
    // Check if Instagram tab is already open
    const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
    
    if (tabs.length > 0) {
      // Instagram is open, navigate to main page and focus
      await chrome.tabs.update(tabs[0].id, { 
        url: 'https://www.instagram.com/',
        active: true 
      });
    } else {
      // Create new Instagram tab
      await chrome.tabs.create({ 
        url: 'https://www.instagram.com/',
        active: true
      });
    }
  } catch (error) {
    console.error('Error handling Instagram sync:', error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INSTAGRAM_SAVED_POSTS') {
    handleNewPosts(msg.posts);
    sendResponse({ status: 'ok' });
  } else if (msg.type === 'INSTAGRAM_SAVED_POSTS_ERROR') {
    // Optionally handle error (log, notify, etc.)
    console.warn('Content script error:', msg.error);
    sendResponse({ status: 'error', error: msg.error });
  }
  // Return true to indicate async response if needed
});

// Store new posts in chrome.storage.local
function handleNewPosts(newPosts) {
  chrome.storage.local.get(['posts'], (result) => {
    const existing = result.posts || [];
    // Merge by id, avoid duplicates
    const all = [...existing];
    newPosts.forEach(post => {
      if (!all.find(p => p.id === post.id)) {
        all.push(post);
      }
    });
    chrome.storage.local.set({ posts: all }, () => {
      updateBadge(all.length);
    });
  });
}

// Update badge with post count
function updateBadge(count) {
  if (chrome.action && chrome.action.setBadgeText) {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e1306c' });
  }
}

// Context menu, import/export, etc. (framework ready)
// chrome.contextMenus.create({ ... }); 