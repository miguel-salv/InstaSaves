// background.js - Service Worker for Instagram Saved Posts Viewer

// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openInstagramForSync') {
    // First check if Instagram is already open
    chrome.tabs.query({ url: 'https://www.instagram.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        // Instagram is already open, use the first tab
        const tab = tabs[0];
        // If not on main page, navigate to it
        if (tab.url !== 'https://www.instagram.com/') {
          chrome.tabs.update(tab.id, { 
            url: 'https://www.instagram.com/',
            active: true 
          }, () => {
            // Wait for the page to load before injecting the sync button
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.sendMessage(tab.id, { action: 'showSyncButton' })
                  .catch(error => console.log('Tab not ready yet'));
              }
            });
          });
        } else {
          // Already on main page, just show the sync button and focus the tab
          chrome.tabs.update(tab.id, { active: true }, () => {
            chrome.tabs.sendMessage(tab.id, { action: 'showSyncButton' })
              .catch(error => console.log('Tab not ready yet'));
          });
        }
        sendResponse({ status: 'Using existing Instagram tab' });
      } else {
        // No Instagram tab open, create new one
        chrome.tabs.create({ url: 'https://www.instagram.com/' }, (tab) => {
          // Wait for the page to load before injecting the sync button
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.sendMessage(tab.id, { action: 'showSyncButton' })
                .catch(error => console.log('Tab not ready yet'));
            }
          });
        });
        sendResponse({ status: 'Created new Instagram tab' });
      }
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'proxyImage') {
    // Proxy the image request
    fetch(request.url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
        'Referer': 'https://www.instagram.com/',
        'User-Agent': navigator.userAgent
      },
      credentials: 'omit'
    })
    .then(response => response.blob())
    .then(blob => {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        sendResponse({ dataUrl: reader.result });
      };
      reader.readAsDataURL(blob);
    })
    .catch(error => {
      console.error('Error proxying image:', error);
      sendResponse({ error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});

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