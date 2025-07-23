// State
let posts = [];
let collections = [];
let activeCollection = null;
let activeTags = new Set();
let activeCategory = null;

// DOM Elements
let postsGrid;
let searchInput;
let sortSelect;
let clearDataBtn;
let syncBtn;
let exportDataBtn;
let collectionsListEl;
let tagsListEl;
let categoriesListEl;
let modal;
let modalCloseBtn;

// Initialize modal
function initializeModal() {
  if (!document.getElementById('post-modal')) {
    const modalHTML = `
      <div class="modal-overlay" id="post-modal">
        <div class="modal-card">
          <button class="modal-close" type="button">
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
            <div class="modal-dates"></div>
            <div class="modal-metadata">
              <div class="modal-collections">
                <div class="modal-section-title">Collections</div>
                <div class="post-collections"></div>
              </div>
              <div class="modal-tags">
                <div class="modal-section-title">Tags</div>
                <div class="post-tags"></div>
              </div>
              <div class="modal-quick-actions"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize modal elements
    modal = document.getElementById('post-modal');
    modalCloseBtn = modal.querySelector('.modal-close');

    // Add event listeners for modal
    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

// Function to export posts data for category analysis
function exportPostsForAnalysis() {
  // Prepare the data in a format optimized for category analysis
  const analysisData = posts.map(post => {
    return {
      text: post.caption || '',
      tags: post.tags || [],
      collections: post.collections.map(c => c.name) || [],
      assignedCategories: post.categories || [],
      matchedKeywords: Object.entries(categories)
        .map(([categoryName, categoryData]) => {
          // Text to analyze
          const textToAnalyze = [
            post.caption || '',
            ...(post.tags || []),
            ...(post.collections.map(c => c.name) || [])
          ].join(' ').toLowerCase();
          
          // Find matching keywords
          const matches = categoryData.keywords.filter(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            return regex.test(textToAnalyze);
          });
          
          return matches.length > 0 ? {
            category: categoryName,
            keywords: matches
          } : null;
        })
        .filter(Boolean) // Remove null entries
    };
  });

  // Create a Blob with the JSON data
  const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = 'category-analysis.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM elements
  postsGrid = document.getElementById('posts-grid');
  searchInput = document.getElementById('search-input');
  sortSelect = document.getElementById('sort-select');
  clearDataBtn = document.getElementById('clear-data-btn');
  syncBtn = document.getElementById('sync-btn');
  exportDataBtn = document.getElementById('export-data-btn');
  collectionsListEl = document.getElementById('collections-list');
  tagsListEl = document.getElementById('tags-list');
  categoriesListEl = document.getElementById('categories-list');

  // Add keyboard shortcut handler for export button
  document.addEventListener('keydown', (e) => {
    // Check for Ctrl/Cmd + Shift + A
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      exportDataBtn.classList.toggle('visible');
    }
  });

  // Verify all elements exist
  if (!postsGrid || !searchInput || !sortSelect || !clearDataBtn || !syncBtn || !exportDataBtn ||
      !collectionsListEl || !tagsListEl || !categoriesListEl) {
    console.error('Some required elements are missing from the DOM');
    return;
  }

  // Initialize modal
  initializeModal();

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

  exportDataBtn.addEventListener('click', exportPostsForAnalysis);

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

  // Add escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Load initial data
  await loadData();
});

// Modify loadData function
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['posts', 'collections']);
    posts = result.posts || [];
    collections = result.collections || [];

    // Analyze posts that don't have categories
    let hasNewCategories = false;
    for (const post of posts) {
      // Initialize categories as an array if it doesn't exist
      if (!Array.isArray(post.categories)) {
        post.categories = [];
      }
      
      // Only analyze if categories array is empty
      if (post.categories.length === 0) {
        const relevantCategories = analyzePostContent(post);
        post.categories = relevantCategories;
        hasNewCategories = true;
      }
    }

    // If we added categories to any posts, save back to storage
    if (hasNewCategories) {
      await chrome.storage.local.set({ posts });
    }

    renderPosts();
    renderCollections();
    renderCategories();
    renderTags();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Function to load image through proxy
async function loadProxiedImage(imgElement, originalUrl) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'proxyImage',
      url: originalUrl
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    imgElement.src = response.dataUrl;
  } catch (error) {
    console.error('Error loading image:', error);
    imgElement.src = imgElement.dataset.fallback;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderPostTypeIndicator(post) {
  if (post.isVideo) {
    return `
      <div class="post-type-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>
        </svg>
        Video
      </div>
    `;
  }
  return '';
}

function renderQuickActions(post) {
  return `
    <div class="quick-actions">
      <button class="quick-action-btn copy-link" data-url="${post.instagramUrl}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        Copy Link
      </button>
      <a href="${post.instagramUrl}" target="_blank" class="quick-action-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
        Open in Instagram
      </a>
    </div>
  `;
}

function renderDates(post) {
  return `
    <div class="post-dates">
      <div class="post-date">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
          <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
        Posted: ${formatDate(post.createdAt)}
      </div>
    </div>
  `;
}

function renderPosts() {
  if (!postsGrid) return;

  let filteredPosts = getFilteredPosts();

  // Sort posts
  const sortValue = sortSelect.value;
  switch (sortValue) {
    case 'newest-saved':
      filteredPosts = [...filteredPosts]; // Keep original order (newest first)
      break;
    case 'oldest-saved':
      filteredPosts = [...filteredPosts].reverse(); // Reverse to get oldest first
      break;
    case 'newest-posted':
      filteredPosts = filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest-posted':
      filteredPosts = filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
  }

  postsGrid.innerHTML = filteredPosts.map((post, index) => `
    <div class="post-card" data-index="${index}" role="button" tabindex="0">
      <div class="post-image-container">
        ${renderPostTypeIndicator(post)}
        <img 
          class="post-image" 
          src="icons/icon128.png"
          data-original-url="${post.imageUrl}"
          alt="${post.caption}"
          data-fallback="icons/icon128.png"
          loading="lazy"
        >
      </div>
      <div class="post-info">
        ${post.author ? `<div class="post-author">${post.author}</div>` : ''}
        <div class="post-caption">
          <div class="post-caption-content">${post.caption ? post.caption.slice(0, 100) + '...' : ''}</div>
        </div>
        ${renderDates(post)}
        ${renderQuickActions(post)}
      </div>
    </div>
  `).join('');

  // Load images through proxy
  document.querySelectorAll('.post-image').forEach(img => {
    if (img.dataset.originalUrl) {
      loadProxiedImage(img, img.dataset.originalUrl);
    }
  });

  // Add click handlers to post cards
  document.querySelectorAll('.post-card').forEach(card => {
    // Handle click
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking on quick action buttons
      if (e.target.closest('.quick-actions')) {
        return;
      }
      const index = card.dataset.index;
      const post = filteredPosts[index];
      openModal(post);
    });

    // Handle keyboard navigation
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const index = card.dataset.index;
        const post = filteredPosts[index];
        openModal(post);
      }
    });
  });

  // Add copy link button listeners
  document.querySelectorAll('.copy-link').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent modal from opening
      const url = button.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        const originalText = button.innerHTML;
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Copied!
        `;
        setTimeout(() => {
          button.innerHTML = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });
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

// Add after loadData function
async function analyzePostContent(post) {
  const textToAnalyze = [
    post.caption,
    ...post.tags,
    ...post.collections.map(c => c.name)
  ].join(' ').toLowerCase();

  const assignedCategories = [];
  
  // Calculate scores for each category
  const categoryScores = Object.entries(categories).map(([categoryName, categoryData]) => {
    let score = 0;
    
    // Check main category keywords
    categoryData.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textToAnalyze.match(regex) || [];
      score += matches.length;
    });
    
    // Check subcategory keywords
    Object.entries(categoryData.subcategories).forEach(([subcategoryName, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = textToAnalyze.match(regex) || [];
        score += matches.length;
      });
    });
    
    return { categoryName, score };
  });
  
  // Sort by score and get categories with scores > 0
  const relevantCategories = categoryScores
    .filter(cat => cat.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(cat => cat.categoryName);
  
  return relevantCategories;
}

// Modify the existing renderPosts function to include category filtering
function getFilteredPosts() {
  let filtered = [...posts];

  // Filter by category
  if (activeCategory) {
    filtered = filtered.filter(post => {
      const postCategories = Array.isArray(post.categories) ? post.categories : [];
      return postCategories.includes(activeCategory);
    });
  }

  // Filter by collection (existing code)
  if (activeCollection) {
    filtered = filtered.filter(post => 
      post.collections.some(c => c.id === activeCollection.id)
    );
  }

  // Filter by search (existing code)
  if (searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase();
    filtered = filtered.filter(post =>
      post.caption?.toLowerCase().includes(searchTerm) ||
      post.author?.toLowerCase().includes(searchTerm) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Filter by tags (existing code)
  if (activeTags.size > 0) {
    filtered = filtered.filter(post =>
      post.tags.some(tag => activeTags.has(tag))
    );
  }

  return filtered;
} 

// Add new function to render categories
function renderCategories() {
  if (!categoriesListEl) return;

  // Get category counts from posts
  const categoryCounts = {};
  posts.forEach(post => {
    // Ensure post.categories is an array
    const postCategories = Array.isArray(post.categories) ? post.categories : [];
    postCategories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  // Start with All Posts option
  let categoriesHTML = `
    <button class="category-btn ${activeCategory === null ? 'active' : ''}" data-category="all">
      All Posts
      <span class="count">${posts.length}</span>
    </button>
  `;

  // Add each category that has posts
  Object.keys(categories).forEach(category => {
    if (categoryCounts[category]) {
      categoriesHTML += `
        <button class="category-btn ${activeCategory === category ? 'active' : ''}" data-category="${category}">
          ${category}
          <span class="count">${categoryCounts[category] || 0}</span>
        </button>
      `;
    }
  });

  categoriesListEl.innerHTML = categoriesHTML;

  // Add click handlers
  categoriesListEl.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      activeCategory = category === 'all' ? null : category;
      renderCategories();
      renderPosts();
    });
  });
}

// Modal functions
function openModal(post) {
  const modal = document.getElementById('post-modal');
  const modalImageContainer = modal.querySelector('.modal-image-container');
  const modalContent = modal.querySelector('.modal-content');
  
  // Reset modal content
  modalImageContainer.innerHTML = `
    <img 
      class="modal-image" 
      src="icons/icon128.png"
      data-original-url="${post.imageUrl}"
      alt="${post.caption}"
      data-fallback="icons/icon128.png"
    >
    ${renderPostTypeIndicator(post)}
  `;
  
  // Load image
  const modalImage = modalImageContainer.querySelector('.modal-image');
  if (modalImage.dataset.originalUrl) {
    loadProxiedImage(modalImage, modalImage.dataset.originalUrl);
  }

  // Reset and populate modal content
  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-author">${post.author || ''}</div>
    </div>
    <div class="modal-caption">${post.caption || ''}</div>
    <div class="modal-dates">${renderDates(post)}</div>
    <div class="modal-metadata">
      <div class="modal-collections">
        <div class="modal-section-title">Collections</div>
        <div class="post-collections">
          ${post.collections && post.collections.length ? 
            post.collections.map(c => `<span class="collection-tag">${c.name}</span>`).join('') : 
            ''}
        </div>
      </div>
      <div class="modal-tags">
        <div class="modal-section-title">Tags</div>
        <div class="post-tags">
          ${post.tags && post.tags.length ? 
            post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('') : 
            ''}
        </div>
      </div>
      <div class="modal-quick-actions">
        ${renderQuickActions(post)}
      </div>
    </div>
  `;

  // Add copy link button listener
  modal.querySelector('.copy-link')?.addEventListener('click', async () => {
    const url = post.instagramUrl;
    try {
      await navigator.clipboard.writeText(url);
      const button = modal.querySelector('.copy-link');
      const originalText = button.innerHTML;
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('post-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
} 