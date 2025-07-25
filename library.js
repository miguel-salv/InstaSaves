// State
let posts = [];
let collections = [];
let activeCollection = null;
let activeTags = new Set();
let activeCategory = null;
let activeDateFilter = {
  type: 'all', // 'all', 'preset', 'custom'
  preset: 'all', // 'all', 'today', 'week', 'month', 'quarter', 'year'
  customFrom: null,
  customTo: null
};

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
let dateFilterToggle;
let dateFilterDropdown;
let dateFilterLabel;
let dateFromInput;
let dateToInput;
let sortFilterToggle;
let sortFilterDropdown;
let sortFilterLabel;
let postsCounter;

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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM elements
  postsGrid = document.getElementById('posts-grid');
  searchInput = document.getElementById('search-input');
  sortSelect = document.getElementById('sort-select'); // Keep for backwards compatibility
  clearDataBtn = document.getElementById('clear-data-btn');
  syncBtn = document.getElementById('sync-btn');
  exportDataBtn = document.getElementById('export-data-btn');
  collectionsListEl = document.getElementById('collections-list');
  tagsListEl = document.getElementById('tags-list');
  categoriesListEl = document.getElementById('categories-list');
  dateFilterToggle = document.getElementById('date-filter-toggle');
  dateFilterDropdown = document.getElementById('date-filter-dropdown');
  dateFilterLabel = document.getElementById('date-filter-label');
  dateFromInput = document.getElementById('date-from');
  dateToInput = document.getElementById('date-to');
  sortFilterToggle = document.getElementById('sort-filter-toggle');
  sortFilterDropdown = document.getElementById('sort-filter-dropdown');
  sortFilterLabel = document.getElementById('sort-filter-label');
  postsCounter = document.getElementById('posts-counter');

  // Add keyboard shortcut handler for export button
  document.addEventListener('keydown', (e) => {
    // Check for Ctrl/Cmd + Shift + A
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      exportDataBtn.classList.toggle('visible');
    }
  });

  // Verify all elements exist
  if (!postsGrid || !searchInput || !clearDataBtn || !syncBtn || !exportDataBtn ||
      !collectionsListEl || !tagsListEl || !categoriesListEl || !dateFilterToggle || 
      !dateFilterDropdown || !dateFilterLabel || !dateFromInput || !dateToInput ||
      !sortFilterToggle || !sortFilterDropdown || !sortFilterLabel || !postsCounter) {
    console.error('Some required elements are missing from the DOM');
    return;
  }

  // Initialize modal
  initializeModal();

  // Initialize sidebar sections
  renderCollections();
  renderTags();
  renderCategories();

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

  // Old sort select (for backwards compatibility)
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      renderPosts();
    });
  }

  // Sort filter event listeners
  sortFilterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSortFilterDropdown();
  });

  // Sort option buttons
  document.querySelectorAll('.sort-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sortValue = btn.dataset.sort;
      setSortOption(sortValue);
    });
  });

  // Date filter event listeners
  dateFilterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDateFilterDropdown();
  });

  // Date preset buttons
  document.querySelectorAll('.date-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      setDatePreset(preset);
    });
  });

  // Custom date inputs
  document.getElementById('apply-date-filter').addEventListener('click', () => {
    applyCustomDateFilter();
  });

  document.getElementById('clear-date-filter').addEventListener('click', () => {
    clearDateFilter();
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!dateFilterToggle.contains(e.target) && !dateFilterDropdown.contains(e.target)) {
      closeDateFilterDropdown();
    }
    if (!sortFilterToggle.contains(e.target) && !sortFilterDropdown.contains(e.target)) {
      closeSortFilterDropdown();
    }
  });

  // Add escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDateFilterDropdown();
      closeSortFilterDropdown();
    }
  });

  // Initialize filter labels
  updateDateFilterLabel();
  updateSortFilterLabel();

  // Load data
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

function updatePostsCounter(count) {
  if (!postsCounter) return;
  
  if (count === 0) {
    postsCounter.textContent = 'No posts';
  } else if (count === 1) {
    postsCounter.textContent = '1 post';
  } else {
    postsCounter.textContent = `${count} posts`;
  }
}

function renderPosts() {
  if (!postsGrid) return;

  let filteredPosts = getFilteredPosts();
  
  // Update counter
  updatePostsCounter(filteredPosts.length);

  // Sort posts
  const sortValue = currentSortValue; // Use the global sort value instead of select
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

  // Show empty state if no posts
  if (filteredPosts.length === 0) {
    if (searchInput.value || activeTags.size > 0 || activeCollection || activeCategory || activeDateFilter.type !== 'all') {
      // No results for filters
      const activeFilters = [];
      if (searchInput.value) activeFilters.push('search');
      if (activeTags.size > 0) activeFilters.push('tags');
      if (activeCollection) activeFilters.push('collection');
      if (activeCategory) activeFilters.push('category');
      if (activeDateFilter.type !== 'all') activeFilters.push('date range');
      
      postsGrid.innerHTML = `
        <div class="empty-state">
          No posts match your current filters (${activeFilters.join(', ')}). Try adjusting your search criteria or clearing filters.
        </div>
      `;
    } else {
      // No posts at all
      postsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-spacer"></div>
          <p>Click the <span class="sync-suggestion">Sync with Instagram</span> button to get started!</p>
        </div>
      `;
    }
    return;
  }

  postsGrid.innerHTML = filteredPosts.map((post, index) => `
    <div class="post-card" data-index="${index}" role="button" tabindex="0">
      <div class="post-image-container">
        ${renderPostTypeIndicator(post)}
        ${post.imageUrl ? `<img 
          class="post-image"
          src="${post.imageUrl}"
          data-original-url="${post.imageUrl}"
          alt="${post.caption}"
          data-fallback="icons/icon128.png"
          loading="lazy"
        >` : ''}
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

function handleSectionCollapse(titleContainer) {
  const section = titleContainer.closest('.sidebar-section');
  const content = section.querySelector('.sidebar-content');
  
  if (!section.classList.contains('collapsed')) {
    // Collapsing
    const height = content.scrollHeight;
    content.style.height = height + 'px';
    // Force a reflow
    content.offsetHeight;
    content.style.height = '0';
    section.classList.add('collapsed');
  } else {
    // Expanding
    section.classList.remove('collapsed');
    const height = content.scrollHeight;
    content.style.height = '0';
    // Force a reflow
    content.offsetHeight;
    content.style.height = height + 'px';
    
    // Remove the explicit height after the transition
    content.addEventListener('transitionend', function handler() {
      content.style.height = 'auto';
      content.removeEventListener('transitionend', handler);
    });
  }
}

function renderCollections() {
  if (!collectionsListEl) return;

  const collectionCounts = {};
  posts.forEach(post => {
    post.collections.forEach(collection => {
      collectionCounts[collection.id] = (collectionCounts[collection.id] || 0) + 1;
    });
  });

  // Get search value
  const searchValue = document.getElementById('collection-search')?.value.toLowerCase() || '';

  // Create title container and search input if they don't exist
  let titleContainer = collectionsListEl.closest('.sidebar-section')?.querySelector('.sidebar-title-container');
  let contentWrapper = collectionsListEl.closest('.sidebar-content');
  let searchWrapper = collectionsListEl.previousElementSibling;

  // Always create title container if it doesn't exist
  if (!titleContainer) {
    // Create new title container
    const newTitleContainer = document.createElement('div');
    newTitleContainer.className = 'sidebar-title-container';
    newTitleContainer.innerHTML = `
      <div class="sidebar-title-wrapper">
        <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          <path d="M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
        <div class="sidebar-title">Collections</div>
        <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
    `;

    // Get the sidebar section
    const sidebarSection = collectionsListEl.closest('.sidebar-section');
    if (!sidebarSection) {
      // If no sidebar section exists, create one
      const newSidebarSection = document.createElement('div');
      newSidebarSection.className = 'sidebar-section';
      collectionsListEl.parentNode.insertBefore(newSidebarSection, collectionsListEl);
      newSidebarSection.appendChild(newTitleContainer);
    } else {
      // Insert at the beginning of the sidebar section
      sidebarSection.insertBefore(newTitleContainer, sidebarSection.firstChild);
    }

    titleContainer = newTitleContainer;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', (e) => {
      if (e.target.closest('.tag-search')) return;
      handleSectionCollapse(titleContainer);
    });
  }

  // Create search wrapper if it doesn't exist
  if (!searchWrapper) {
    searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper';
    searchWrapper.innerHTML = `
      <input type="text" id="collection-search" class="tag-search" placeholder="Search collections...">
    `;
    contentWrapper?.insertBefore(searchWrapper, collectionsListEl);

    // Add event listener to search input if it's new
    const searchInput = searchWrapper.querySelector('input');
    if (searchInput && !searchInput.hasEventListener) {
      searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        renderCollections();
      });
      searchInput.hasEventListener = true;
    }
  }

  // Filter and sort collections
  const filteredCollections = collections
    .filter(collection => collection.name.toLowerCase().includes(searchValue))
    .sort((a, b) => {
      // First sort by count
      const countDiff = (collectionCounts[b.id] || 0) - (collectionCounts[a.id] || 0);
      if (countDiff !== 0) return countDiff;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  let collectionsHTML = '';
  
  // Add "All Posts" only if it matches the search or there's no search
  if ('all posts'.includes(searchValue)) {
    collectionsHTML += `
      <button class="collection-btn ${activeCollection === null ? 'active' : ''}" data-collection-id="all">
        All Posts
        <span class="count">${posts.length}</span>
      </button>
    `;
  }

  // Add filtered collections
  collectionsHTML += filteredCollections.map(collection => `
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

  // Get tag counts
  const tagCounts = {};
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Sort tags by count and then alphabetically
  const sortedTags = Object.entries(tagCounts)
    .sort(([tagA, countA], [tagB, countB]) => {
      // First sort by count in descending order
      if (countB !== countA) {
        return countB - countA;
      }
      // If counts are equal, sort alphabetically
      return tagA.localeCompare(tagB);
    })
    .map(([tag]) => tag);

  // Get search value
  const searchValue = document.getElementById('tag-search')?.value.toLowerCase() || '';

  // Create title container and search input if they don't exist
  let titleContainer = tagsListEl.closest('.sidebar-section')?.querySelector('.sidebar-title-container');
  let contentWrapper = tagsListEl.closest('.sidebar-content');
  let searchWrapper = tagsListEl.previousElementSibling;

  // Always create title container if it doesn't exist
  if (!titleContainer) {
    // Create new title container
    const newTitleContainer = document.createElement('div');
    newTitleContainer.className = 'sidebar-title-container';
    newTitleContainer.innerHTML = `
      <div class="sidebar-title-wrapper">
        <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
        </svg>
        <div class="sidebar-title">Tags</div>
        <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
    `;

    // Get the sidebar section
    const sidebarSection = tagsListEl.closest('.sidebar-section');
    if (!sidebarSection) {
      // If no sidebar section exists, create one
      const newSidebarSection = document.createElement('div');
      newSidebarSection.className = 'sidebar-section';
      tagsListEl.parentNode.insertBefore(newSidebarSection, tagsListEl);
      newSidebarSection.appendChild(newTitleContainer);
    } else {
      // Insert at the beginning of the sidebar section
      sidebarSection.insertBefore(newTitleContainer, sidebarSection.firstChild);
    }

    titleContainer = newTitleContainer;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', (e) => {
      if (e.target.closest('.tag-search')) return;
      handleSectionCollapse(titleContainer);
    });
  }

  // Create search wrapper if it doesn't exist
  if (!searchWrapper) {
    searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper';
    searchWrapper.innerHTML = `
      <input type="text" id="tag-search" class="tag-search" placeholder="Search tags...">
    `;
    contentWrapper?.insertBefore(searchWrapper, tagsListEl);

    // Add event listener to search input if it's new
    const searchInput = searchWrapper.querySelector('input');
    if (searchInput && !searchInput.hasEventListener) {
      searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        renderTags();
      });
      searchInput.hasEventListener = true;
    }
  }

  // Filter tags based on search
  const filteredTags = sortedTags.filter(tag => 
    tag.toLowerCase().includes(searchValue)
  );

  // Render filtered tags
  tagsListEl.innerHTML = filteredTags.map(tag => `
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

function renderCategories() {
  if (!categoriesListEl) return;

  // Ensure posts array exists
  if (!Array.isArray(posts)) {
    console.warn('Posts array is not initialized');
    return;
  }

  // Get category counts from posts
  const categoryCounts = {};
  posts.forEach(post => {
    if (!post) return;
    // Ensure post.categories is an array
    const postCategories = Array.isArray(post.categories) ? post.categories : [];
    postCategories.forEach(category => {
      if (category) {  // Only count valid category strings
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
  });

  // Get search value
  const searchValue = document.getElementById('category-search')?.value?.toLowerCase() || '';

  // Create title container and search input if they don't exist
  let titleContainer = categoriesListEl.closest('.sidebar-section')?.querySelector('.sidebar-title-container');
  let contentWrapper = categoriesListEl.closest('.sidebar-content');
  let searchWrapper = categoriesListEl.previousElementSibling;

  // Always create title container if it doesn't exist
  if (!titleContainer) {
    // Create new title container
    const newTitleContainer = document.createElement('div');
    newTitleContainer.className = 'sidebar-title-container';
    newTitleContainer.innerHTML = `
      <div class="sidebar-title-wrapper">
        <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
        <div class="sidebar-title">Categories</div>
        <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
    `;

    // Get the sidebar section
    const sidebarSection = categoriesListEl.closest('.sidebar-section');
    if (!sidebarSection) {
      // If no sidebar section exists, create one
      const newSidebarSection = document.createElement('div');
      newSidebarSection.className = 'sidebar-section';
      categoriesListEl.parentNode.insertBefore(newSidebarSection, categoriesListEl);
      newSidebarSection.appendChild(newTitleContainer);
    } else {
      // Insert at the beginning of the sidebar section
      sidebarSection.insertBefore(newTitleContainer, sidebarSection.firstChild);
    }

    titleContainer = newTitleContainer;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', (e) => {
      if (e.target.closest('.tag-search')) return;
      handleSectionCollapse(titleContainer);
    });
  }

  // Create search wrapper if it doesn't exist
  if (!searchWrapper) {
    searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper';
    searchWrapper.innerHTML = `
      <input type="text" id="category-search" class="tag-search" placeholder="Search categories...">
    `;
    contentWrapper?.insertBefore(searchWrapper, categoriesListEl);

    // Add event listener to search input if it's new
    const searchInput = searchWrapper.querySelector('input');
    if (searchInput && !searchInput.hasEventListener) {
      searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        renderCategories();
      });
      searchInput.hasEventListener = true;
    }
  }

  // Filter and sort categories
  const filteredCategories = Object.keys(categories)
    .filter(category => {
      // Only include categories that have posts and match the search
      return categoryCounts[category] && category.toLowerCase().includes(searchValue);
    })
    .sort((a, b) => {
      // First sort by count
      const countDiff = (categoryCounts[b] || 0) - (categoryCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      // Then alphabetically
      return a.localeCompare(b);
    });

  let categoriesHTML = '';
  
  // Add "All Posts" only if it matches the search or there's no search
  if ('all posts'.includes(searchValue)) {
    categoriesHTML += `
      <button class="category-btn ${activeCategory === null ? 'active' : ''}" data-category="all">
        All Posts
        <span class="count">${posts.length}</span>
      </button>
    `;
  }

  // Add filtered categories
  categoriesHTML += filteredCategories.map(category => `
    <button class="category-btn ${activeCategory === category ? 'active' : ''}" data-category="${category}">
      ${category}
      <span class="count">${categoryCounts[category] || 0}</span>
    </button>
  `).join('');

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
    ${post.imageUrl ? `<img 
      class="modal-image"
      src="${post.imageUrl}"
      data-original-url="${post.imageUrl}"
      alt="${post.caption}"
      data-fallback="icons/icon128.png"
    >` : ''}
    ${renderPostTypeIndicator(post)}
  `;
  
  // Load image
  const modalImage = modalImageContainer.querySelector('.modal-image');
  if (modalImage && modalImage.dataset.originalUrl) {
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
            post.tags.map(tag => `<button class="post-tag" data-tag="${tag}">#${tag}</button>`).join('') : 
            ''}
        </div>
      </div>
      <div class="modal-quick-actions">
        ${renderQuickActions(post)}
      </div>
    </div>
  `;

  // Add click handlers for tags
  modalContent.querySelectorAll('.post-tag').forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      const tag = tagBtn.dataset.tag;
      activeTags.clear(); // Clear existing tags
      activeTags.add(tag); // Add clicked tag
      closeModal();
      renderTags(); // Update tag list in sidebar
      renderPosts(); // Update posts grid
    });
  });

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

// Date filter functions
function toggleDateFilterDropdown() {
  const isActive = dateFilterDropdown.classList.contains('active');
  if (isActive) {
    closeDateFilterDropdown();
  } else {
    openDateFilterDropdown();
  }
}

function openDateFilterDropdown() {
  // Close sort filter dropdown if open
  closeSortFilterDropdown();
  
  dateFilterDropdown.classList.add('active');
  dateFilterToggle.classList.add('active');
}

function closeDateFilterDropdown() {
  dateFilterDropdown.classList.remove('active');
  dateFilterToggle.classList.remove('active');
}

function setDatePreset(preset) {
  // Clear active state from all preset buttons
  document.querySelectorAll('.date-preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set active state on clicked button
  document.querySelector(`[data-preset="${preset}"]`).classList.add('active');
  
  // Update active date filter
  activeDateFilter = {
    type: preset === 'all' ? 'all' : 'preset',
    preset: preset,
    customFrom: null,
    customTo: null
  };
  
  // Clear custom date inputs
  dateFromInput.value = '';
  dateToInput.value = '';
  
  // Update label and close dropdown
  updateDateFilterLabel();
  closeDateFilterDropdown();
  renderPosts();
}

function applyCustomDateFilter() {
  const fromDate = dateFromInput.value;
  const toDate = dateToInput.value;
  
  if (!fromDate && !toDate) {
    alert('Please select at least one date');
    return;
  }
  
  // Clear preset active states
  document.querySelectorAll('.date-preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Helper function to create a date in local timezone
  const createLocalDate = (dateStr, isEndOfDay = false) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isEndOfDay) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };
  
  // Update active date filter
  activeDateFilter = {
    type: 'custom',
    preset: null,
    customFrom: createLocalDate(fromDate),
    customTo: createLocalDate(toDate, true)
  };
  
  // Update label and close dropdown
  updateDateFilterLabel();
  closeDateFilterDropdown();
  renderPosts();
}

function clearDateFilter() {
  // Reset to "All Time"
  setDatePreset('all');
}

function updateDateFilterLabel() {
  let label = 'All Time';
  let hasFilter = false;
  
  if (activeDateFilter.type === 'preset' && activeDateFilter.preset !== 'all') {
    const presetLabels = {
      'today': 'Today',
      'week': 'Last 7 Days',
      'month': 'Last 30 Days',
      'quarter': 'Last 3 Months',
      'year': 'Last Year'
    };
    label = presetLabels[activeDateFilter.preset] || 'All Time';
    hasFilter = true;
  } else if (activeDateFilter.type === 'custom') {
    const formatDate = (date) => {
      if (!date) return null;
      // Create a new date using local timezone components
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const fromStr = activeDateFilter.customFrom ? formatDate(activeDateFilter.customFrom) : 'Start';
    const toStr = activeDateFilter.customTo ? formatDate(activeDateFilter.customTo) : 'End';
    label = `${fromStr} - ${toStr}`;
    hasFilter = true;
  }
  
  dateFilterLabel.textContent = label;
  
  // Update visual indicator
  if (hasFilter) {
    dateFilterToggle.classList.add('has-filter');
  } else {
    dateFilterToggle.classList.remove('has-filter');
  }
}

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of day
      };
    case 'week':
      return {
        from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
      };
    case 'month':
      return {
        from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
      };
    case 'quarter':
      return {
        from: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
      };
    case 'year':
      return {
        from: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
      };
    default:
      return { from: null, to: null };
  }
}

function filterPostsByDate(posts) {
  if (activeDateFilter.type === 'all') {
    return posts;
  }
  
  let dateRange;
  
  if (activeDateFilter.type === 'preset') {
    dateRange = getDateRange(activeDateFilter.preset);
  } else if (activeDateFilter.type === 'custom') {
    dateRange = {
      from: activeDateFilter.customFrom,
      to: activeDateFilter.customTo
    };
  }
  
  if (!dateRange.from && !dateRange.to) {
    return posts;
  }
  
  return posts.filter(post => {
    // Use createdAt for filtering (when the post was originally posted)
    const postDate = new Date(post.createdAt);
    
    // Skip posts without a valid creation date
    if (!post.createdAt || isNaN(postDate.getTime())) {
      return false;
    }
    
    if (dateRange.from && postDate < dateRange.from) {
      return false;
    }
    
    if (dateRange.to && postDate > dateRange.to) {
      return false;
    }
    
    return true;
  });
}

// Sort filter functions
let currentSortValue = 'newest-saved';

function toggleSortFilterDropdown() {
  const isActive = sortFilterDropdown.classList.contains('active');
  if (isActive) {
    closeSortFilterDropdown();
  } else {
    openSortFilterDropdown();
  }
}

function openSortFilterDropdown() {
  // Close date filter dropdown if open
  closeDateFilterDropdown();
  
  sortFilterDropdown.classList.add('active');
  sortFilterToggle.classList.add('active');
}

function closeSortFilterDropdown() {
  sortFilterDropdown.classList.remove('active');
  sortFilterToggle.classList.remove('active');
}

function setSortOption(sortValue) {
  // Clear active state from all sort buttons
  document.querySelectorAll('.sort-option-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set active state on clicked button
  document.querySelector(`[data-sort="${sortValue}"]`).classList.add('active');
  
  // Update current sort value
  currentSortValue = sortValue;
  
  // Update label
  updateSortFilterLabel();
  
  // Close dropdown
  closeSortFilterDropdown();
  
  // Re-render posts with new sort
  renderPosts();
}

function updateSortFilterLabel() {
  const sortLabels = {
    'newest-saved': 'Recently Saved',
    'oldest-saved': 'Oldest Saved',
    'newest-posted': 'Recently Posted',
    'oldest-posted': 'Oldest Posted'
  };
  
  sortFilterLabel.textContent = sortLabels[currentSortValue] || 'Recently Saved';
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
    
    // Check category keywords
    categoryData.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textToAnalyze.match(regex) || [];
      score += matches.length;
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

  // Filter by date first
  filtered = filterPostsByDate(filtered);

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

  // Ensure posts array exists
  if (!Array.isArray(posts)) {
    console.warn('Posts array is not initialized');
    return;
  }

  // Get category counts from posts
  const categoryCounts = {};
  posts.forEach(post => {
    if (!post) return;
    // Ensure post.categories is an array
    const postCategories = Array.isArray(post.categories) ? post.categories : [];
    postCategories.forEach(category => {
      if (category) {  // Only count valid category strings
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
  });

  // Get search value
  const searchValue = document.getElementById('category-search')?.value?.toLowerCase() || '';

  // Create title container and search input if they don't exist
  let titleContainer = categoriesListEl.closest('.sidebar-section')?.querySelector('.sidebar-title-container');
  let contentWrapper = categoriesListEl.closest('.sidebar-content');
  let searchWrapper = categoriesListEl.previousElementSibling;

  // Always create title container if it doesn't exist
  if (!titleContainer) {
    // Create new title container
    const newTitleContainer = document.createElement('div');
    newTitleContainer.className = 'sidebar-title-container';
    newTitleContainer.innerHTML = `
      <div class="sidebar-title-wrapper">
        <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
        <div class="sidebar-title">Categories</div>
        <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
    `;

    // Get the sidebar section
    const sidebarSection = categoriesListEl.closest('.sidebar-section');
    if (!sidebarSection) {
      // If no sidebar section exists, create one
      const newSidebarSection = document.createElement('div');
      newSidebarSection.className = 'sidebar-section';
      categoriesListEl.parentNode.insertBefore(newSidebarSection, categoriesListEl);
      newSidebarSection.appendChild(newTitleContainer);
    } else {
      // Insert at the beginning of the sidebar section
      sidebarSection.insertBefore(newTitleContainer, sidebarSection.firstChild);
    }

    titleContainer = newTitleContainer;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', (e) => {
      if (e.target.closest('.tag-search')) return;
      handleSectionCollapse(titleContainer);
    });
  }

  // Create search wrapper if it doesn't exist
  if (!searchWrapper) {
    searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper';
    searchWrapper.innerHTML = `
      <input type="text" id="category-search" class="tag-search" placeholder="Search categories...">
    `;
    contentWrapper?.insertBefore(searchWrapper, categoriesListEl);

    // Add event listener to search input if it's new
    const searchInput = searchWrapper.querySelector('input');
    if (searchInput && !searchInput.hasEventListener) {
      searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        renderCategories();
      });
      searchInput.hasEventListener = true;
    }
  }

  // Filter and sort categories
  const filteredCategories = Object.keys(categories)
    .filter(category => {
      // Only include categories that have posts and match the search
      return categoryCounts[category] && category.toLowerCase().includes(searchValue);
    })
    .sort((a, b) => {
      // First sort by count
      const countDiff = (categoryCounts[b] || 0) - (categoryCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      // Then alphabetically
      return a.localeCompare(b);
    });

  let categoriesHTML = '';
  
  // Add "All Posts" only if it matches the search or there's no search
  if ('all posts'.includes(searchValue)) {
    categoriesHTML += `
      <button class="category-btn ${activeCategory === null ? 'active' : ''}" data-category="all">
        All Posts
        <span class="count">${posts.length}</span>
      </button>
    `;
  }

  // Add filtered categories
  categoriesHTML += filteredCategories.map(category => `
    <button class="category-btn ${activeCategory === category ? 'active' : ''}" data-category="${category}">
      ${category}
      <span class="count">${categoryCounts[category] || 0}</span>
    </button>
  `).join('');

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