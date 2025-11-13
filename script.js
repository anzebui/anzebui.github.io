// ===============================
// FIREBASE INITIALIZATION
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyCjzrcgGMtii60UuqXi-eFGUh_faITedA4",
  authDomain: "wishlist-app-e7566.firebaseapp.com",
  projectId: "wishlist-app-e7566",
  storageBucket: "wishlist-app-e7566.firebasestorage.app",
  messagingSenderId: "367130005272",
  appId: "1:367130005272:web:42589bcb1539af0d01586d",
  measurementId: "G-JHS3QHNLBV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set up offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser does not support all of the features required to enable persistence');
    }
  });


// ===============================
// STATE VARIABLES
// ===============================

let wishlist = [];
let editingItemId = null;
let currentSort = 'newest';
let searchQuery = '';
let activeCategory = null;
let currentUser = null;
let isSyncing = false;


// ===============================
// DOM ELEMENTS
// ===============================

const loginScreen = document.getElementById('loginScreen');
const wishlistScreen = document.getElementById('wishlistScreen');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const itemInput = document.getElementById('itemInput');
const itemLinkInput = document.getElementById('itemLinkInput');
const addBtn = document.getElementById('addBtn');
const searchInput = document.getElementById('searchInput');
const wishlistItems = document.getElementById('wishlistItems');
const emptyState = document.getElementById('emptyState');

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


// ===============================
// AUTHENTICATION EVENT LISTENERS
// ===============================

googleLoginBtn.addEventListener('click', handleGoogleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Listen for authentication state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loginScreen.classList.remove('active');
    wishlistScreen.classList.add('active');
    
    // Load user's wishlist from Firestore
    loadWishlistFromFirestore();
    
    // Set up real-time listener for wishlist updates
    setupWishlistListener();
  } else {
    currentUser = null;
    loginScreen.classList.add('active');
    wishlistScreen.classList.remove('active');
    
    // Clear wishlist on logout
    wishlist = [];
    displayWishlist();
  }
});


// ===============================
// GOOGLE AUTHENTICATION
// ===============================

function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  auth.signInWithPopup(provider)
    .then((result) => {
      console.log('Login successful:', result.user.email);
      showToast('✨ Welcome! ' + result.user.displayName);
    })
    .catch((error) => {
      console.error('Login error:', error);
      showToast('❌ Login failed. Please try again.');
    });
}


function handleLogout() {
  auth.signOut()
    .then(() => {
      console.log('Logout successful');
      showToast('👋 See you later!');
    })
    .catch((error) => {
      console.error('Logout error:', error);
      showToast('❌ Logout failed. Please try again.');
    });
}


// ===============================
// FIRESTORE OPERATIONS
// ===============================

function loadWishlistFromFirestore() {
  if (!currentUser) return;
  
  const userDocRef = db.collection('users').doc(currentUser.uid);
  
  userDocRef.get()
    .then((doc) => {
      if (doc.exists && doc.data().wishlist) {
        wishlist = doc.data().wishlist;
        console.log('Wishlist loaded from Firestore:', wishlist.length, 'items');
      } else {
        wishlist = [];
        console.log('No wishlist found, starting fresh');
      }
      
      displayWishlist();
      updateStats();
    })
    .catch((error) => {
      console.error('Error loading wishlist:', error);
      showToast('⚠️ Could not load wishlist');
    });
}


function setupWishlistListener() {
  if (!currentUser) return;
  
  const userDocRef = db.collection('users').doc(currentUser.uid);
  
  // Real-time listener for wishlist changes on other devices
  userDocRef.onSnapshot((doc) => {
    if (doc.exists && doc.data().wishlist) {
      // Only update if the change wasn't from this device
      if (!isSyncing) {
        const remoteWishlist = doc.data().wishlist;
        wishlist = remoteWishlist;
        console.log('Wishlist synced from another device');
        displayWishlist();
        updateStats();
      }
    }
  });
}


function saveWishlistToFirestore() {
  if (!currentUser || isSyncing) return;
  
  isSyncing = true;
  const userDocRef = db.collection('users').doc(currentUser.uid);
  
  userDocRef.set({
    wishlist: wishlist,
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
    email: currentUser.email,
    displayName: currentUser.displayName
  }, { merge: true })
    .then(() => {
      console.log('Wishlist saved to Firestore');
      isSyncing = false;
    })
    .catch((error) => {
      console.error('Error saving wishlist:', error);
      showToast('⚠️ Could not save to cloud');
      isSyncing = false;
    });
}


// ===============================
// WISHLIST MANAGEMENT
// ===============================

// Ripple effect on click
document.addEventListener('click', function(e) {
  if (e.target.closest('button, input, textarea, select, a')) return;
  
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = e.clientX + 'px';
  ripple.style.top = e.clientY + 'px';
  document.body.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
});


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
  saveWishlistToFirestore();
  
  itemInput.value = '';
  itemLinkInput.value = '';
  itemInput.focus();
  
  updateStats();
  displayWishlist();
  showToast('✨ Item added to wishlist!');
}


function deleteItem(id) {
  if (confirm('Are you sure? 😭')) {
    wishlist = wishlist.filter(item => item.id !== id);
    saveWishlistToFirestore();
    updateStats();
    displayWishlist();
    showToast('Item deleted');
  }
}


function toggleDone(id) {
  const item = wishlist.find(item => item.id === id);
  if (item) {
    item.done = !item.done;
  }
  saveWishlistToFirestore();
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
    
    saveWishlistToFirestore();
    updateStats();
    displayWishlist();
    showToast('✨ Item updated!');
  }
  
  closeEditModal();
}


// ===============================
// DISPLAY & FILTERING
// ===============================

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
  
  const unreceived = sorted.filter(item => !item.done);
  const received = sorted.filter(item => item.done);
  
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
  
  received.sort((a, b) => b.id - a.id);
  
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


// ===============================
// UTILITY FUNCTIONS
// ===============================

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
