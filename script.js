// Ripple effect on click
document.addEventListener('click', function(e) {
   // Don't create ripple on buttons/inputs
   if (e.target.closest('button, input, textarea, select, a')) return;
  
   const ripple = document.createElement('div');
   ripple.className = 'ripple';
   ripple.style.left = e.clientX + 'px';
   ripple.style.top = e.clientY + 'px';
   document.body.appendChild(ripple);
  
   // Remove ripple after animation
   setTimeout(() => ripple.remove(), 600);
});


// Get elements from HTML
const itemInput = document.getElementById('itemInput');
const itemLinkInput = document.getElementById('itemLinkInput');
const addBtn = document.getElementById('addBtn');
const searchInput = document.getElementById('searchInput');
const wishlistItems = document.getElementById('wishlistItems');
const emptyState = document.getElementById('emptyState');


// Modal elements
const editModal = document.getElementById('editModal');
const editInput = document.getElementById('editInput');
const editCategorySelect = document.getElementById('editCategorySelect');
const editLinkInput = document.getElementById('editLinkInput');
const editPriceInput = document.getElementById('editPriceInput');
const editImageInput = document.getElementById('editImageInput');
const editNotesInput = document.getElementById('editNotesInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const closeModalBtn = document.querySelector('.close-modal');


// Load wishlist from localStorage when page loads
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let editingItemId = null;
let currentSort = 'newest'; // default sort
let searchQuery = ''; // search filter
let activeCategory = null; // for category filtering


// Display items on page load
displayWishlist();
updateStats();


// Add item when button is clicked
addBtn.addEventListener('click', addItem);


// Add item when Enter key is pressed
itemInput.addEventListener('keypress', function(event) {
   if (event.key === 'Enter') {
       addItem();
   }
});


// Search functionality
searchInput.addEventListener('input', function(event) {
   searchQuery = event.target.value.toLowerCase();
   displayWishlist();
});


// Sort button event listeners
document.getElementById('sortPriceLow').addEventListener('click', () => setSortType('priceLow'));
document.getElementById('sortPriceHigh').addEventListener('click', () => setSortType('priceHigh'));
document.getElementById('sortNewest').addEventListener('click', () => setSortType('newest'));
document.getElementById('sortOldest').addEventListener('click', () => setSortType('oldest'));


// Modal event listeners
closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
saveEditBtn.addEventListener('click', saveEdit);
editInput.addEventListener('keypress', function(event) {
   if (event.key === 'Enter') {
       saveEdit();
   }
});


// Close modal when clicking outside
editModal.addEventListener('click', function(event) {
   if (event.target === editModal) {
       closeEditModal();
   }
});


function isValidUrl(string) {
   try {
       new URL(string);
       return true;
   } catch (_) {
       return false;
   }
}


function getMetaTagContent(html, property) {
   const regex = new RegExp(`<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
   const match = html.match(regex);
   return match ? match[1] : null;
}


function extractMetadata(html, url) {
   let title = getMetaTagContent(html, 'og:title');
   let image = getMetaTagContent(html, 'og:image');
   let description = getMetaTagContent(html, 'og:description');
  
   if (!title) title = getMetaTagContent(html, 'title') || extractTitleFromHTML(html);
   if (!description) description = getMetaTagContent(html, 'description');
  
   return { title: title || 'Untitled', image, description };
}


function extractTitleFromHTML(html) {
   const match = html.match(/<title>([^<]+)<\/title>/i);
   return match ? match[1] : null;
}


async function fetchLinkPreview(url) {
   try {
       // Try using a CORS proxy service
       const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
       const response = await fetch(proxyUrl);
       const html = await response.text();
       const metadata = extractMetadata(html, url);
      
       // If we got an image, make sure it's absolute URL
       if (metadata.image && !metadata.image.startsWith('http')) {
           const baseUrl = new URL(url).origin;
           metadata.image = baseUrl + (metadata.image.startsWith('/') ? '' : '/') + metadata.image;
       }
      
       return metadata;
   } catch (error) {
       console.log('Could not fetch preview for link:', error);
       return {
           title: new URL(url).hostname,
           image: null,
           description: null
       };
   }
}


function addItem() {
   const itemText = itemInput.value.trim();
   const itemLink = itemLinkInput.value.trim();
  
   if (itemText === '') {
       itemInput.focus();
       return;
   }
  
   const item = {
       id: Date.now(),
       text: itemText,
       done: false,
       customImage: null,
       link: itemLink || null,
       price: null,
       category: null,
       notes: null
   };
  
   wishlist.push(item);
   saveWishlist();
  
   itemInput.value = '';
   itemLinkInput.value = '';
   itemInput.focus();
  
   updateStats();
   displayWishlist();
}


function deleteItem(id) {
   wishlist = wishlist.filter(item => item.id !== id);
   saveWishlist();
   updateStats();
   displayWishlist();
}


function toggleDone(id) {
   const item = wishlist.find(item => item.id === id);
   if (item) {
       item.done = !item.done;
   }
   saveWishlist();
   updateStats();
   displayWishlist();
}


function openEditModal(id) {
   editingItemId = id;
   const item = wishlist.find(item => item.id === id);
   if (item) {
       editInput.value = item.text;
       editCategorySelect.value = item.category || '';
       editLinkInput.value = item.link || '';
       editPriceInput.value = item.price || '';
       editImageInput.value = item.customImage || '';
       editNotesInput.value = item.notes || '';
       editModal.classList.remove('hidden');
       editInput.focus();
       editInput.select();
   }
}


function closeEditModal() {
   editModal.classList.add('hidden');
   editingItemId = null;
   editInput.value = '';
   editCategorySelect.value = '';
   editLinkInput.value = '';
   editPriceInput.value = '';
   editImageInput.value = '';
   editNotesInput.value = '';
}


function saveEdit() {
   if (editingItemId === null) return;
  
   const newText = editInput.value.trim();
   const newCategory = editCategorySelect.value;
   const newLink = editLinkInput.value.trim();
   const newPrice = editPriceInput.value.trim();
   const newImage = editImageInput.value.trim();
   const newNotes = editNotesInput.value.trim();
  
   if (newText === '') {
       alert('Please enter something!');
       return;
   }
  
   const item = wishlist.find(item => item.id === editingItemId);
   if (item) {
       item.text = newText;
       item.category = newCategory || 'Other';
       item.link = newLink || null;
       item.price = newPrice || null;
       item.customImage = newImage || null;
       item.notes = newNotes || null;
      
       saveWishlist();
       updateStats();
       displayWishlist();
   }
  
   closeEditModal();
}


function getFilteredWishlist() {
   return wishlist.filter(item => {
       const matchesSearch = item.text.toLowerCase().includes(searchQuery) ||
           (item.category && item.category.toLowerCase().includes(searchQuery)) ||
           (item.notes && item.notes.toLowerCase().includes(searchQuery));
      
       const matchesCategory = !activeCategory || item.category === activeCategory;
      
       return matchesSearch && matchesCategory;
   });
}


function updateStats() {
   const total = wishlist.length;
   const received = wishlist.filter(item => item.done).length;
   const remaining = total - received;
   const totalPrice = wishlist
       .filter(item => !item.done && item.price)
       .reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
       .toFixed(2);
  
   document.getElementById('totalItems').textContent = total;
   document.getElementById('receivedItems').textContent = received;
   document.getElementById('remainingItems').textContent = remaining;
   document.getElementById('totalPrice').textContent = `€ ${totalPrice}`;
}


function setSortType(type) {
   currentSort = type;
   updateSortButtons();
   displayWishlist();
}


function updateSortButtons() {
   document.getElementById('sortPriceLow').classList.toggle('active', currentSort === 'priceLow');
   document.getElementById('sortPriceHigh').classList.toggle('active', currentSort === 'priceHigh');
   document.getElementById('sortNewest').classList.toggle('active', currentSort === 'newest');
   document.getElementById('sortOldest').classList.toggle('active', currentSort === 'oldest');
}


function getSortedWishlist() {
   let sorted = [...getFilteredWishlist()];
  
   // Separate received and unreceived items
   const unreceived = sorted.filter(item => !item.done);
   const received = sorted.filter(item => item.done);
  
   // Sort unreceived items based on current sort type
   switch(currentSort) {
       case 'priceLow':
           unreceived.sort((a, b) => {
               const priceA = a.price ? parseFloat(a.price) : Infinity;
               const priceB = b.price ? parseFloat(b.price) : Infinity;
               return priceA - priceB;
           });
           break;
       case 'priceHigh':
           unreceived.sort((a, b) => {
               const priceA = a.price ? parseFloat(a.price) : -Infinity;
               const priceB = b.price ? parseFloat(b.price) : -Infinity;
               return priceB - priceA;
           });
           break;
       case 'newest':
           unreceived.sort((a, b) => b.id - a.id);
           break;
       case 'oldest':
           unreceived.sort((a, b) => a.id - b.id);
           break;
   }
  
   // Sort received items by newest first
   received.sort((a, b) => b.id - a.id);
  
   // Combine: unreceived items first, then received items at the end
   return [...unreceived, ...received];
}


function displayWishlist() {
   wishlistItems.innerHTML = '';
  
   if (wishlist.length === 0) {
       emptyState.classList.remove('hidden');
   } else {
       emptyState.classList.add('hidden');
   }
  
   const sortedWishlist = getSortedWishlist();
  
   // Get all unique categories for filter buttons
   const allCategories = [...new Set(wishlist.filter(item => item.category).map(item => item.category))].sort();
   const categoryFilterContainer = document.getElementById('categoryFilters');
  
   if (categoryFilterContainer && allCategories.length > 0) {
       categoryFilterContainer.innerHTML = allCategories.map(cat =>
           `<button class="category-filter-btn ${activeCategory === cat ? 'active' : ''}" data-category="${cat}" onclick="setActiveCategory('${cat}')">${cat}</button>`
       ).join('');
   }
  
   sortedWishlist.forEach(item => {
       const card = document.createElement('div');
       card.className = `wishlist-item ${item.done ? 'done' : ''}`;
      
       let imageHtml = '';
      
       if (item.customImage) {
           imageHtml = `<img src="${escapeHtml(item.customImage)}" alt="item" class="item-image" onerror="this.replaceWith(this.nextElementSibling)">`;
       } else {
           imageHtml = `<div class="item-image-placeholder clickable" onclick="openEditModal(${item.id})">click to add image 📸</div>`;
       }
      
       const linkHtml = item.link ? `<div style="display: flex; gap: 4px;"><a href="${escapeHtml(item.link)}" target="_blank" class="item-link">🔗 View</a><button class="item-link-copy" onclick="copyToClipboard('${escapeHtml(item.link)}')" style="background: none; border: none; cursor: pointer; font-size: 0.8em; color: #5e3fb5; padding: 0;" title="Copy link">📋</button></div>` : '<div class="item-link-placeholder"></div>';
       const priceHtml = item.price ? `<div class="item-price">${escapeHtml(item.price)}</div>` : '<div class="item-price-placeholder"></div>';
       const categoryHtml = item.category ? `<span class="item-category">${escapeHtml(item.category)}</span>` : '';
       const notesHtml = item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : '<div class="item-notes-placeholder"></div>';
      
       card.innerHTML = `
           ${imageHtml}
           <div class="item-content">
               <div class="item-header">
                   <div class="item-title">${escapeHtml(item.text)}</div>
                   ${categoryHtml}
               </div>
               <div class="item-details">
                   ${priceHtml}
                   ${notesHtml}
                   ${linkHtml}
               </div>
               <div class="item-actions">
                   <button class="item-btn edit-btn" onclick="openEditModal(${item.id})">✏️</button>
                   <button class="item-btn check-btn" onclick="toggleDone(${item.id})" title="${item.done ? 'Mark as unwanted' : 'Mark as received'}">
                       ${item.done ? '✔️' : '☐'}
                   </button>
                   <button class="item-btn delete-btn" onclick="deleteItem(${item.id})" title="Delete">🗑️</button>
               </div>
           </div>
       `;
      
       wishlistItems.appendChild(card);
   });
}


function saveWishlist() {
   localStorage.setItem('wishlist', JSON.stringify(wishlist));
}


function escapeHtml(text) {
   const map = {
       '&': '&amp;',
       '<': '&lt;',
       '>': '&gt;',
       '"': '&quot;',
       "'": '&#039;'
   };
   return text.replace(/[&<>"']/g, m => map[m]);
}


function showToast(message) {
   const toast = document.createElement('div');
   toast.className = 'toast';
   toast.textContent = message;
   document.body.appendChild(toast);
  
   setTimeout(() => toast.remove(), 3000);
}


function copyToClipboard(text) {
   navigator.clipboard.writeText(text).then(() => {
       showToast('✨ Link copied to clipboard!');
   }).catch(() => {
       showToast('Failed to copy link');
   });
}


function setActiveCategory(category) {
   activeCategory = activeCategory === category ? null : category;
   updateCategoryFilterButtons();
   displayWishlist();
}


function updateCategoryFilterButtons() {
   const buttons = document.querySelectorAll('.category-filter-btn');
   buttons.forEach(btn => {
       if (btn.dataset.category === activeCategory) {
           btn.classList.add('active');
       } else {
           btn.classList.remove('active');
       }
   });
}

