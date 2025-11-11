// ============ PROFILE MANAGEMENT ============

let profiles = JSON.parse(localStorage.getItem('profiles')) || {};
let currentProfileId = localStorage.getItem('currentProfileId');

// Initialize first profile if none exist
if (Object.keys(profiles).length === 0) {
    const defaultId = 'profile_' + Date.now();
    profiles[defaultId] = {
        id: defaultId,
        name: 'My Wishlist',
        createdAt: new Date().getTime(),
        wishlist: []
    };
    currentProfileId = defaultId;
    saveProfiles();
}

// Get current profile
function getCurrentProfile() {
    return profiles[currentProfileId];
}

function saveProfiles() {
    localStorage.setItem('profiles', JSON.stringify(profiles));
    localStorage.setItem('currentProfileId', currentProfileId);
}

function switchProfile(profileId) {
    if (profiles[profileId]) {
        currentProfileId = profileId;
        saveProfiles();
        updateProfileName();
        displayWishlist();
        updateStats();
    }
}

function createProfile() {
    const name = document.getElementById('newProfileName').value.trim();
    
    if (!name) {
        alert('Please enter a profile name!');
        return;
    }
    
    const newId = 'profile_' + Date.now();
    profiles[newId] = {
        id: newId,
        name: name,
        createdAt: new Date().getTime(),
        wishlist: []
    };
    
    currentProfileId = newId;
    saveProfiles();
    
    displayProfiles();
    updateProfileName();
    closeCreateProfileModal();
    displayWishlist();
    updateStats();
}

function deleteCurrentProfile() {
    const currentProfile = getCurrentProfile();
    
    if (Object.keys(profiles).length === 1) {
        alert('You must have at least one profile!');
        return;
    }
    
    if (confirm(`Delete profile "${currentProfile.name}"? This cannot be undone.`)) {
        delete profiles[currentProfileId];
        
        // Switch to first remaining profile
        currentProfileId = Object.keys(profiles)[0];
        saveProfiles();
        
        displayProfiles();
        updateProfileName();
        displayWishlist();
        updateStats();
    }
}

function updateProfileName() {
    const profile = getCurrentProfile();
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('currentProfileName').textContent = profile.name;
    document.getElementById('profileItemCount').textContent = `${profile.wishlist.length} item${profile.wishlist.length !== 1 ? 's' : ''}`;
}

function displayProfiles() {
    const profilesList = document.getElementById('profilesList');
    profilesList.innerHTML = '';
    
    Object.values(profiles).forEach(profile => {
        const div = document.createElement('div');
        div.className = `profile-list-item ${profile.id === currentProfileId ? 'active' : ''}`;
        
        div.innerHTML = `
            <div class="profile-list-name" onclick="switchProfile('${profile.id}')">
                👤 ${profile.name}
                <span style="color: #8b7db8; font-size: 0.8em; font-weight: 400;">(${profile.wishlist.length})</span>
            </div>
        `;
        
        profilesList.appendChild(div);
    });
}

function openCreateProfileModal() {
    document.getElementById('createProfileModal').classList.remove('hidden');
    document.getElementById('newProfileName').focus();
}

function closeCreateProfileModal() {
    document.getElementById('createProfileModal').classList.add('hidden');
    document.getElementById('newProfileName').value = '';
}

// Screen Navigation
function goToHome() {
    document.getElementById('homeScreen').classList.add('active');
    document.getElementById('profileScreen').classList.remove('active');
    document.getElementById('homeNavBtn').classList.add('active');
    document.getElementById('profileNavBtn').classList.remove('active');
}

function goToProfile() {
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('profileScreen').classList.add('active');
    document.getElementById('homeNavBtn').classList.remove('active');
    document.getElementById('profileNavBtn').classList.add('active');
    displayProfiles();
}

// ============ WISHLIST MANAGEMENT ============

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

let editingItemId = null;
let currentSort = 'newest';
let searchQuery = '';
let activeCategory = null;

// Initialize
displayWishlist();
updateStats();
updateProfileName();

// Event listeners
addBtn.addEventListener('click', addItem);
itemInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') addItem();
});

searchInput.addEventListener('input', function(event) {
    searchQuery = event.target.value.toLowerCase();
    displayWishlist();
});

document.getElementById('sortPriceLow').addEventListener('click', () => setSortType('priceLow'));
document.getElementById('sortPriceHigh').addEventListener('click', () => setSortType('priceHigh'));
document.getElementById('sortNewest').addEventListener('click', () => setSortType('newest'));
document.getElementById('sortOldest').addEventListener('click', () => setSortType('oldest'));

if (closeModalBtn) closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
saveEditBtn.addEventListener('click', saveEdit);
editInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') saveEdit();
});

editModal.addEventListener('click', function(event) {
    if (event.target === editModal) closeEditModal();
});

// ============ WISHLIST FUNCTIONS ============

function getWishlist() {
    return getCurrentProfile().wishlist;
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
    
    getWishlist().push(item);
    saveProfiles();
    
    itemInput.value = '';
    itemLinkInput.value = '';
    itemInput.focus();
    
    updateStats();
    displayWishlist();
}

function deleteItem(id) {
    const wishlist = getWishlist();
    const index = wishlist.findIndex(item => item.id === id);
    if (index > -1) {
        wishlist.splice(index, 1);
        saveProfiles();
        updateStats();
        displayWishlist();
    }
}

function toggleDone(id) {
    const item = getWishlist().find(item => item.id === id);
    if (item) {
        item.done = !item.done;
        saveProfiles();
        updateStats();
        displayWishlist();
    }
}

function openEditModal(id) {
    editingItemId = id;
    const item = getWishlist().find(item => item.id === id);
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
    
    const item = getWishlist().find(item => item.id === editingItemId);
    if (item) {
        item.text = newText;
        item.category = newCategory || 'Other';
        item.link = newLink || null;
        item.price = newPrice || null;
        item.customImage = newImage || null;
        item.notes = newNotes || null;
        
        saveProfiles();
        updateStats();
        displayWishlist();
    }
    
    closeEditModal();
}

function getFilteredWishlist() {
    return getWishlist().filter(item => {
        const matchesSearch = item.text.toLowerCase().includes(searchQuery) ||
            (item.category && item.category.toLowerCase().includes(searchQuery)) ||
            (item.notes && item.notes.toLowerCase().includes(searchQuery));
        
        const matchesCategory = !activeCategory || item.category === activeCategory;
        
        return matchesSearch && matchesCategory;
    });
}

function updateStats() {
    const wishlist = getWishlist();
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

function displayWishlist() {
    wishlistItems.innerHTML = '';
    
    if (getWishlist().length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
    
    const sortedWishlist = getSortedWishlist();
    
    const allCategories = [...new Set(getWishlist().filter(item => item.category).map(item => item.category))].sort();
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
