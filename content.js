// content.js - Extract Instagram Saved Posts

// Function to check if we're on Instagram's main page
function isInstagramMainPage() {
  return window.location.hostname === 'www.instagram.com' && window.location.pathname === '/';
}

// Function to inject the sync button
async function injectSyncButton() {
  if (!document.body) {
    await new Promise(resolve => {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          obs.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    });
  }

  // Remove any existing sync button
  const existingButton = document.getElementById('instasaves-start-sync');
  if (existingButton) {
    existingButton.remove();
  }

  // Create sync button container
  const syncContainer = document.createElement('div');
  syncContainer.id = 'instasaves-start-sync';
  syncContainer.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1f25;
      border: 1px solid #2f3336;
      border-radius: 12px;
      padding: 24px;
      width: 320px;
      text-align: center;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <h2 style="
        margin: 0 0 16px 0;
        font-size: 20px;
        background: linear-gradient(45deg, #fa7e1e, #d62976, #962fbf);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 600;
      ">InstaSave</h2>
      <p style="
        margin: 0 0 20px 0;
        color: #8899a6;
        font-size: 14px;
        line-height: 1.4;
      ">Ready to sync your saved posts? This will fetch all your saved posts and collections.</p>
      <button id="start-sync-btn" style="
        background: linear-gradient(45deg, #fa7e1e, #d62976, #962fbf);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 12px 24px;
        font-size: 16px;
        cursor: pointer;
        transition: opacity 0.2s;
      ">Start Sync</button>
    </div>
  `;

  document.body.appendChild(syncContainer);

  // Add click handler
  document.getElementById('start-sync-btn').addEventListener('click', () => {
    syncContainer.remove();
    startSync();
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSyncButton') {
    injectSyncButton();
    sendResponse({ status: 'Sync button injected' });
  }
});

// Remove automatic sync button injection on page load
// The sync button will only be shown when explicitly requested through the extension

// Main sync function
async function startSync() {
  try {
    // Clear existing data first
    await new Promise(resolve => chrome.storage.local.remove(['posts', 'collections'], resolve));
    
    // Create and show status overlay
    if (!document.body) {
      await new Promise(resolve => {
        const observer = new MutationObserver((mutations, obs) => {
          if (document.body) {
            obs.disconnect();
            resolve();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      });
    }

    // Create status overlay container
    const statusOverlay = document.createElement('div');
    statusOverlay.id = 'instasaves-overlay';
    statusOverlay.innerHTML = `
      <div id="instasaves-status" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1f25;
        border: 1px solid #2f3336;
        border-radius: 12px;
        padding: 16px 20px;
        width: 300px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; background: linear-gradient(45deg, #fa7e1e, #d62976, #962fbf); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">InstaSave Sync</h3>
          <div id="instasaves-spinner" style="
            width: 20px;
            height: 20px;
            border: 2px solid #2f3336;
            border-top-color: #d62976;
            border-radius: 50%;
            animation: instasaves-spin 1s linear infinite;
          "></div>
        </div>
        <div id="instasaves-message" style="
          color: #8899a6;
          margin-bottom: 12px;
          font-size: 14px;
        ">Starting sync...</div>
        <div id="instasaves-progress" style="
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
        ">
          <div>Collections: <span id="instasaves-collections">0</span></div>
          <div>Posts: <span id="instasaves-posts">0</span></div>
        </div>
      </div>
      <style>
        @keyframes instasaves-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(statusOverlay);

    // Get status elements
    const status = document.getElementById('instasaves-status');
    const messageEl = document.getElementById('instasaves-message');
    const collectionsEl = document.getElementById('instasaves-collections');
    const postsEl = document.getElementById('instasaves-posts');

    function updateStatus(message, data = {}) {
      if (!status || !messageEl || !collectionsEl || !postsEl) return;
      status.style.display = 'block';
      messageEl.textContent = message;
      if (data.collections !== undefined) collectionsEl.textContent = data.collections;
      if (data.posts !== undefined) postsEl.textContent = data.posts;
      if (data.error) {
        messageEl.style.color = '#ff4444';
        setTimeout(() => status.remove(), 5000);
      }
    }

    // Update status: Starting
    updateStatus('Fetching your collections...', { collections: 0, posts: 0 });

    // Common fetch options
    const fetchOptions = {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'X-ASBD-ID': '198387',
        'X-CSRFToken': document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    };

    // Fetch collections first
    const collectionsResponse = await fetch('https://www.instagram.com/api/v1/collections/list/', fetchOptions);
    if (!collectionsResponse.ok) throw new Error('Failed to fetch collections. Please make sure you are logged into Instagram.');
    const collectionsData = await collectionsResponse.json();
    const collections = collectionsData.items.map(item => ({
      id: item.collection_id,
      name: item.collection_name
    }));

    updateStatus('Fetching saved posts...', { collections: collections.length, posts: 0 });

    // Fetch all saved posts with pagination
    let allPosts = [];
    let maxId = null;
    let totalPosts = 0;

    do {
      const url = maxId 
        ? `https://www.instagram.com/api/v1/feed/saved/posts/?max_id=${maxId}`
        : 'https://www.instagram.com/api/v1/feed/saved/posts/';
      
      const response = await fetch(url, fetchOptions);
      if (!response.ok) throw new Error('Failed to fetch posts. Please make sure you are logged into Instagram.');
      
      const data = await response.json();
      const posts = data.items.map(item => {
        const post = item.media;
        const createdAt = post.taken_at ? new Date(post.taken_at * 1000).toISOString() : null;
        // Use the item's taken_at as the saved timestamp since it represents when the post was saved
        const savedAt = item.taken_at ? new Date(item.taken_at * 1000).toISOString() : new Date().toISOString();

        return {
          id: post.id,
          instagramUrl: `https://www.instagram.com/p/${post.code}/`,
          imageUrl: post.image_versions2?.candidates[0]?.url || post.carousel_media?.[0]?.image_versions2?.candidates[0]?.url,
          caption: post.caption?.text || '',
          author: post.user?.username || '',
          tags: (post.caption?.text.match(/#\w+/g) || []).map(t => t.replace('#', '')),
          createdAt,
          savedAt,
          collections: [],
          categories: [] // Initialize as empty array
        };
      }).filter(post => post.imageUrl);

      allPosts = allPosts.concat(posts);
      totalPosts = allPosts.length;
      updateStatus(`Fetching saved posts (${totalPosts} found)...`, { collections: collections.length, posts: totalPosts });

      // Get next page token
      maxId = data.next_max_id;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } while (maxId);

    // Update status: Fetching collection posts
    updateStatus('Mapping collections to posts...', { collections: collections.length, posts: totalPosts });

    // Fetch posts for each collection
    for (const collection of collections) {
      const response = await fetch(`https://www.instagram.com/api/v1/feed/collection/${collection.id}/posts/`, fetchOptions);
      if (!response.ok) continue;
      
      const data = await response.json();
      const collectionPostIds = new Set(data.items.map(item => item.media.id));
      
      // Map collection to posts
      allPosts = allPosts.map(post => ({
        ...post,
        collections: [...post.collections, ...(collectionPostIds.has(post.id) ? [collection] : [])]
      }));

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Before saving to storage, analyze and categorize posts
    for (const post of allPosts) {
      // Initialize categories as an array if it doesn't exist
      if (!Array.isArray(post.categories)) {
        post.categories = [];
      }
      
      // Only analyze if categories array is empty
      if (post.categories.length === 0) {
        const relevantCategories = analyzePostContent(post);
        post.categories = relevantCategories;
      }
    }

    // Save to storage
    await chrome.storage.local.set({
      posts: allPosts,
      collections: collections
    });

    // Update status: Complete
    updateStatus('Sync complete!', { collections: collections.length, posts: totalPosts });
    setTimeout(() => status.remove(), 3000);

  } catch (error) {
    console.error('Sync error:', error);
    updateStatus('Error during sync: ' + error.message, { error: true });
  }
} 