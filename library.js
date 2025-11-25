// ===============================
// LIBRARY.JS — EduHub Library (Server Connected)
// ===============================

const BASE_URL = 'http://localhost:5000'; // adjust if needed

// DOM Elements
const searchInput = document.getElementById('searchInput');
const categoryGrid = document.getElementById('categoryGrid');
const bookList = document.getElementById('bookList');
const addBookBtn = document.getElementById('addBookBtn');
const bookTitle = document.getElementById('bookTitle');
const bookAuthor = document.getElementById('bookAuthor');
const bookCategory = document.getElementById('bookCategory');
const bookURL = document.getElementById('bookURL');

// State
let library = []; // server-synced books

// Helper: fetch with auth
async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('edu_token');
  if (!token) throw new Error('No token');
  options.headers = { ...options.headers, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const res = await fetch(BASE_URL + endpoint, options);
  if (!res.ok) throw new Error(`Fetch error ${res.status}`);
  return res.json();
}

// ------------------------------
// Render Functions
// ------------------------------
function renderBooks(filter = '') {
  bookList.innerHTML = '';
  const filtered = library.filter(book =>
    book.title.toLowerCase().includes(filter.toLowerCase()) ||
    book.author.toLowerCase().includes(filter.toLowerCase()) ||
    book.category.toLowerCase().includes(filter.toLowerCase())
  );

  if (!filtered.length) {
    bookList.innerHTML = '<li>No resources found.</li>';
    return;
  }

  filtered.forEach((book, index) => {
    const li = document.createElement('li');
    li.className = 'book-item fadeIn';
    li.innerHTML = `
      <h3>${book.title}</h3>
      <p>Author: ${book.author}</p>
      <p>Category: ${book.category}</p>
      ${book.url ? `<a href="${book.url}" target="_blank">Open Link</a>` : ''}
      <span class="favorite ${book.favorite ? 'active' : ''}" data-index="${index}">★</span>
      <button class="delete-book" data-id="${book.id || ''}" data-index="${index}">🗑 Delete</button>
    `;
    bookList.appendChild(li);
  });

  document.querySelectorAll('.favorite').forEach(star => star.addEventListener('click', toggleFavorite));
  document.querySelectorAll('.delete-book').forEach(btn => btn.addEventListener('click', deleteBook));
}

function renderCategories() {
  const categories = [...new Set(library.map(book => book.category))];
  categoryGrid.innerHTML = '';
  if (!categories.length) { categoryGrid.innerHTML = '<p>No categories yet.</p>'; return; }

  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-card';
    div.textContent = cat;
    div.addEventListener('click', () => renderBooks(cat));
    categoryGrid.appendChild(div);
  });
}

// ------------------------------
// CRUD Functions
// ------------------------------
async function loadLibrary() {
  try {
    library = await authFetch('/api/library'); // create this endpoint in your server
  } catch {
    library = JSON.parse(localStorage.getItem('eduHubLibrary')) || [];
  }
  renderBooks();
  renderCategories();
}

async function addBook() {
  const title = bookTitle.value.trim();
  const author = bookAuthor.value.trim();
  const category = bookCategory.value.trim();
  const url = bookURL.value.trim();
  if (!title || !author || !category) return alert('Please fill Title, Author, Category');

  const newBook = { title, author, category, url, favorite: false };

  try {
    const created = await authFetch('/api/library', { method: 'POST', body: JSON.stringify(newBook) });
    library.unshift(created);
  } catch {
    library.unshift(newBook); // fallback local
    localStorage.setItem('eduHubLibrary', JSON.stringify(library));
  }

  renderBooks();
  renderCategories();
  bookTitle.value = bookAuthor.value = bookCategory.value = bookURL.value = '';
}

async function toggleFavorite(e) {
  const index = e.target.dataset.index;
  library[index].favorite = !library[index].favorite;

  if (library[index].id) {
    try { await authFetch(`/api/library/${library[index].id}`, { method: 'PUT', body: JSON.stringify(library[index]) }); } catch {}
  }

  localStorage.setItem('eduHubLibrary', JSON.stringify(library));
  renderBooks(searchInput.value);
}

async function deleteBook(e) {
  const index = e.target.dataset.index;
  const id = e.target.dataset.id;
  if (id) {
    try { await authFetch(`/api/library/${id}`, { method: 'DELETE' }); } catch {}
  }
  library.splice(index, 1);
  localStorage.setItem('eduHubLibrary', JSON.stringify(library));
  renderBooks(searchInput.value);
  renderCategories();
}

// ------------------------------
// Events
// ------------------------------
searchInput.addEventListener('input', () => renderBooks(searchInput.value));
addBookBtn.addEventListener('click', addBook);

// ------------------------------
// Initialize
// ------------------------------
loadLibrary();
