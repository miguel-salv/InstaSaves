document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('sync-btn');
  const libraryBtn = document.getElementById('open-library');

  // Sync button click handler
  syncBtn.addEventListener('click', async () => {
    // Disable the button while we process
    syncBtn.disabled = true;
    
    try {
      // Let background script handle everything
      await chrome.runtime.sendMessage({ action: 'openInstagramForSync' });
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      // Re-enable the button
      syncBtn.disabled = false;
    }
  });

  // Library button click handler
  libraryBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
  });

  loadPosts();
}); 