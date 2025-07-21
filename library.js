// State
let posts = [];
let collections = [];
let activeCollection = null;
let activeTags = new Set();

// DOM Elements
let postsGrid;
let searchInput;
let sortSelect;
let clearDataBtn;
let syncBtn;
let collectionsListEl;
let tagsListEl;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM elements
  postsGrid = document.getElementById('posts-grid');
  searchInput = document.getElementById('search-input');
  sortSelect = document.getElementById('sort-select');
  clearDataBtn = document.getElementById('clear-data-btn');
  syncBtn = document.getElementById('sync-btn');
  collectionsListEl = document.getElementById('collections-list');
  tagsListEl = document.getElementById('tags-list');

  // Verify all elements exist
  if (!postsGrid || !searchInput || !sortSelect || !clearDataBtn || !syncBtn || !collectionsListEl || !tagsListEl) {
    console.error('Some required elements are missing from the DOM');
    return;
  }

  // Event Listeners
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    try {
      await chrome.runtime.sendMessage({ action: 'openInstagramForSync' });
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      syncBtn.disabled = false;
    }
  });

  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved posts? This cannot be undone.')) {
      chrome.storage.local.remove(['posts', 'collections'], () => {
        alert('All data has been cleared!');
        postsGrid.innerHTML = '';
        collectionsListEl.innerHTML = '';
        tagsListEl.innerHTML = '';
        posts = [];
        collections = [];
        activeCollection = null;
        activeTags.clear();
      });
    }
  });

  searchInput.addEventListener('input', () => {
    renderPosts();
  });

  sortSelect.addEventListener('change', () => {
    renderPosts();
  });

  // Create modal container
  if (!document.getElementById('post-modal')) {
    const modalHTML = `
      <div class="modal-overlay" id="post-modal">
        <div class="modal-card">
          <button class="modal-close" onclick="closeModal()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div class="modal-image-container">
            <img class="modal-image" src="" alt="">
          </div>
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-author"></div>
            </div>
            <div class="modal-caption"></div>
            <div class="modal-metadata">
              <div class="modal-collections">
                <div class="modal-section-title">Collections</div>
                <div class="post-collections"></div>
              </div>
              <div class="modal-tags">
                <div class="modal-section-title">Tags</div>
                <div class="post-tags"></div>
              </div>
              <a href="" target="_blank" class="view-link">View on Instagram</a>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Load initial data
  await loadData();
});

// Load data from storage
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['posts', 'collections']);
    posts = result.posts || [];
    collections = result.collections || [];
    renderPosts();
    renderCollections();
    renderTags();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Render functions
function renderPosts() {
  if (!postsGrid) return;

  let filteredPosts = getFilteredPosts();

  // Sort posts
  const sortValue = sortSelect.value;
  switch (sortValue) {
    case 'newest-saved':
      // Keep original order (most recent first)
      filteredPosts = [...filteredPosts];
      break;
    case 'oldest-saved':
      // Reverse the order for oldest first
      filteredPosts = [...filteredPosts].reverse();
      break;
    case 'newest-posted':
      filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest-posted':
      filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
  }

  // Add debug logging for sorting
  console.log('Sorted posts:', filteredPosts.map(post => ({
    id: post.id,
    savedAt: post.savedAt,
    createdAt: post.createdAt,
    caption: post.caption.slice(0, 30)
  })));

  // Render posts
  postsGrid.innerHTML = filteredPosts.map((post, index) => `
    <div class="post-card">
      <img class="post-image" src="${post.imageUrl}" alt="${post.caption}">
      <div class="post-info">
        ${post.author ? `<div class="post-author">${post.author}</div>` : ''}
        <div class="post-caption collapsed">
          <div class="post-caption-content">${post.caption ? post.caption.slice(0, 100) + '...' : ''}</div>
        </div>
        ${post.caption ? `
          <button class="post-expand-btn" data-index="${index}">
            View more
          </button>
        ` : ''}
        <a href="${post.instagramUrl}" target="_blank" class="view-link">View on Instagram</a>
      </div>
    </div>
  `).join('');

  // Add event listeners to expand buttons
  document.querySelectorAll('.post-expand-btn').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.dataset.index;
      const post = filteredPosts[index];
      openModal(post);
    });
  });

  // Handle escape key for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Modal functions
  window.openModal = (post) => {
    const modal = document.getElementById('post-modal');
    modal.querySelector('.modal-image').src = post.imageUrl;
    modal.querySelector('.modal-author').textContent = post.author || '';
    modal.querySelector('.modal-caption').textContent = post.caption || '';
    
    const collectionsContainer = modal.querySelector('.modal-collections');
    if (post.collections && post.collections.length) {
      collectionsContainer.style.display = 'block';
      collectionsContainer.querySelector('.post-collections').innerHTML = 
        post.collections.map(c => `<span class="collection-tag">${c.name}</span>`).join('');
    } else {
      collectionsContainer.style.display = 'none';
    }

    const tagsContainer = modal.querySelector('.modal-tags');
    if (post.tags && post.tags.length) {
      tagsContainer.style.display = 'block';
      tagsContainer.querySelector('.post-tags').innerHTML = 
        post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');
    } else {
      tagsContainer.style.display = 'none';
    }

    modal.querySelector('.view-link').href = post.instagramUrl;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = () => {
    const modal = document.getElementById('post-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };
}

function renderCollections() {
  if (!collectionsListEl) return;

  const collectionCounts = {};
  posts.forEach(post => {
    post.collections.forEach(collection => {
      collectionCounts[collection.id] = (collectionCounts[collection.id] || 0) + 1;
    });
  });

  // Start with All Posts option
  let collectionsHTML = `
    <button class="collection-btn ${activeCollection === null ? 'active' : ''}" data-collection-id="all">
      All Posts
      <span class="count">${posts.length}</span>
    </button>
  `;

  // Add rest of collections
  collectionsHTML += collections.map(collection => `
    <button class="collection-btn ${activeCollection?.id === collection.id ? 'active' : ''}" data-collection-id="${collection.id}">
      ${collection.name}
      <span class="count">${collectionCounts[collection.id] || 0}</span>
    </button>
  `).join('');

  collectionsListEl.innerHTML = collectionsHTML;

  // Add click handlers for collections
  document.querySelectorAll('.collection-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const collectionId = btn.dataset.collectionId;
      
      // Clear active state from all buttons
      document.querySelectorAll('.collection-btn').forEach(b => b.classList.remove('active'));
      
      // Set active state on clicked button
      btn.classList.add('active');

      // Update active collection
      if (collectionId === 'all') {
        activeCollection = null;
      } else {
        activeCollection = collections.find(c => c.id === collectionId);
      }

      // Reset any active tags when switching collections
      activeTags.clear();
      renderTags();
      renderPosts();
    });
  });
}

function renderTags() {
  if (!tagsListEl) return;

  const tagCounts = {};
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([tag]) => tag);

  tagsListEl.innerHTML = sortedTags.map(tag => `
    <button class="tag-btn ${activeTags.has(tag) ? 'active' : ''}" data-tag="${tag}">
      #${tag}
      <span class="tag-count">${tagCounts[tag]}</span>
    </button>
  `).join('');

  // Add tag click handlers
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
      } else {
        activeTags.add(tag);
      }
      renderTags();
      renderPosts();
    });
  });
} 

// Update the filtered posts logic
function getFilteredPosts() {
  let filtered = [...posts];

  // Filter by collection
  if (activeCollection) {
    filtered = filtered.filter(post => 
      post.collections.some(c => c.id === activeCollection.id)
    );
  }

  // Filter by search
  if (searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase();
    filtered = filtered.filter(post =>
      post.caption?.toLowerCase().includes(searchTerm) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Filter by tags
  if (activeTags.size > 0) {
    filtered = filtered.filter(post =>
      post.tags.some(tag => activeTags.has(tag))
    );
  }

  return filtered;
} 