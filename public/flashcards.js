/* ============================================================
   FLASHCARDS.CLEANED.JS — EduHub Flashcard System (Cleaned)
   - Single authFetch
   - Robust event binding (no inline onclick strings)
   - Clear error handling and comments
   - Protects against missing token by redirecting to login
============================================================ */

'use strict';

// ----- Configuration -----
const BASE_URL = 'http://localhost:5000'; // adjust if your backend runs elsewhere

// ----- Global state -----
let decks = {};           // { [deckId]: { name, cards: [] } }
let activeDeck = null;    // current deck id (string or number)
let studyIndex = 0;
let studyCards = [];

// ----- UI elements -----
const deckList = document.getElementById('deckList');
const deckNameInput = document.getElementById('deckName');
const deckTitle = document.getElementById('activeDeckTitle');

const fcFront = document.getElementById('fcFront');
const fcBack = document.getElementById('fcBack');
const cardList = document.getElementById('cardList');

const studyCard = document.getElementById('studyCard');
const studyInner = document.getElementById('studyInner');
const studyFront = document.getElementById('studyFront');
const studyBack = document.getElementById('studyBack');

// ----- Authenticated fetch (single implementation) -----
async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('edu_token');
  if (!token) {
    alert('You must log in to access flashcards.');
    window.location.href = 'login.html';
    throw new Error('No JWT token found');
  }

  const url = BASE_URL + endpoint;
  options.headers = {
    ...options.headers,
    'Authorization': 'Bearer ' + token
  };

  const res = await fetch(url, options).catch(err => {
    console.error('Network error:', err);
    throw err;
  });

  if (res.status === 401) {
    // token expired or invalid
    alert('Session expired. Please log in again.');
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
    window.location.href = 'login.html';
    throw new Error('Unauthorized');
  }

  return res;
}

// ----- Load decks -----
async function loadDeckList() {
  try {
    const res = await authFetch('/api/decks');
    if (!res.ok) throw new Error('Failed to fetch decks');
    const data = await res.json();

    decks = {};
    data.forEach(deck => {
      decks[String(deck.id)] = { name: deck.name, cards: [] };
    });

    // If an active deck was previously selected, reload its cards
    if (activeDeck && decks[activeDeck]) {
      await loadCards(activeDeck);
    }

    renderDeckList();
  } catch (err) {
    console.error(err);
    alert('Failed to load decks. Make sure you are logged in and the backend is running.');
  }
}

// ----- Render deck list -----
function renderDeckList() {
  deckList.innerHTML = '';

  Object.keys(decks).forEach(deckId => {
    const deck = decks[deckId];

    const li = document.createElement('li');
    li.className = 'deck-item';
    if (String(activeDeck) === String(deckId)) li.classList.add('deck-active');

    const row = document.createElement('div');
    row.className = 'deck-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'deck-name';
    nameSpan.textContent = deck.name;
    nameSpan.style.cursor = 'pointer';
    nameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDeck(deckId);
    });

    const actions = document.createElement('div');
    actions.className = 'deck-actions';

    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn delete-deck';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteDeck(deckId);
    });

    actions.appendChild(delBtn);
    row.appendChild(nameSpan);
    row.appendChild(actions);
    li.appendChild(row);

    // clicking the li also selects deck
    li.addEventListener('click', () => selectDeck(deckId));

    deckList.appendChild(li);
  });
}

// ----- Create deck -----
const createDeckBtn = document.getElementById('createDeckBtn');
createDeckBtn.addEventListener('click', async () => {
  const name = deckNameInput.value.trim();
  if (!name) return alert('Please enter a deck name.');

  try {
    const res = await authFetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Failed to create deck');
    const newDeck = await res.json();

    decks[String(newDeck.id)] = { name: newDeck.name, cards: [] };
    deckNameInput.value = '';
    renderDeckList();
  } catch (err) {
    console.error(err);
    alert('Failed to create deck.');
  }
});

// ----- Select deck -----
async function selectDeck(deckId) {
  activeDeck = String(deckId);
  deckTitle.textContent = decks[activeDeck] ? decks[activeDeck].name : 'Select a deck';
  await loadCards(activeDeck);
  renderDeckList();
}

// ----- Load cards for a deck -----
async function loadCards(deckId) {
  if (!deckId) return;

  try {
    const res = await authFetch(`/api/decks/${deckId}/cards`);
    if (!res.ok) throw new Error('Failed to fetch cards');
    const cards = await res.json();
    decks[deckId].cards = cards;
    renderCards();
  } catch (err) {
    console.error(err);
    alert('Failed to load cards.');
  }
}

// ----- Render cards -----
function renderCards() {
  cardList.innerHTML = '';

  if (!activeDeck) return;
  const cards = decks[activeDeck].cards || [];

  cards.forEach((card, index) => {
    const li = document.createElement('li');
    li.className = 'card-item';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'card-item-title';
    titleDiv.textContent = card.front;

    const descDiv = document.createElement('div');
    descDiv.className = 'card-item-desc';
    descDiv.textContent = card.back;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'card-item-buttons';

    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteCard(index);
    });

    btnContainer.appendChild(delBtn);

    li.appendChild(titleDiv);
    li.appendChild(descDiv);
    li.appendChild(btnContainer);

    cardList.appendChild(li);
  });
}

// ----- Create card -----
const createCardBtn = document.getElementById('createCardBtn');
createCardBtn.addEventListener('click', async () => {
  if (!activeDeck) return alert('Select or create a deck first!');

  const front = fcFront.value.trim();
  const back = fcBack.value.trim();
  if (!front || !back) return alert('Both sides must be filled!');

  try {
    const res = await authFetch(`/api/decks/${activeDeck}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front, back })
    });

    if (!res.ok) throw new Error('Failed to create card');
    const card = await res.json();
    decks[activeDeck].cards.push(card);

    fcFront.value = '';
    fcBack.value = '';
    renderCards();
  } catch (err) {
    console.error(err);
    alert('Failed to create card.');
  }
});

// ----- Delete card -----
async function deleteCard(index) {
  const card = decks[activeDeck]?.cards[index];
  if (!card) return;

  try {
    const res = await authFetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete card');
    decks[activeDeck].cards.splice(index, 1);
    renderCards();
  } catch (err) {
    console.error(err);
    alert('Failed to delete card.');
  }
}

// ----- Delete deck -----
async function deleteDeck(deckId) {
  if (!decks[deckId]) return;
  if (!confirm(`Delete deck "${decks[deckId].name}"? This cannot be undone.`)) return;

  try {
    const res = await authFetch(`/api/decks/${deckId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete deck');
    delete decks[deckId];
    if (String(activeDeck) === String(deckId)) {
      activeDeck = null;
      deckTitle.textContent = 'Select a deck';
      cardList.innerHTML = '';
    }
    renderDeckList();
  } catch (err) {
    console.error(err);
    alert('Failed to delete deck.');
  }
}

// ----- Study mode -----
function startStudyMode() {
  if (!activeDeck) return;

  studyCards = decks[activeDeck].cards || [];
  studyIndex = 0;

  if (studyCards.length === 0) {
    studyFront.textContent = 'No cards in this deck';
    studyBack.textContent = '';
    return;
  }

  loadStudyCard();
}

function loadStudyCard() {
  if (!studyCards.length) return;
  const card = studyCards[studyIndex];
  studyInner.classList.remove('flipped');
  studyFront.textContent = card.front;
  studyBack.textContent = card.back;
}

// Flip, next, prev handlers
document.getElementById('flipCard').addEventListener('click', () => {
  studyInner.classList.toggle('flipped');
});

document.getElementById('nextCard').addEventListener('click', () => {
  if (!studyCards.length) return;
  studyIndex = (studyIndex + 1) % studyCards.length;
  loadStudyCard();
});

document.getElementById('prevCard').addEventListener('click', () => {
  if (!studyCards.length) return;
  studyIndex = (studyIndex - 1 + studyCards.length) % studyCards.length;
  loadStudyCard();
});

// ----- Spaced repetition rating -----
function applyRatingToCurrentCard(rate) {
  const card = studyCards[studyIndex];
  if (!card) return;

  const now = Date.now();

  if (rate === 'again') {
    card.difficulty = Math.max(1, (card.difficulty || 1) - 1);
    card.due = now + 1000 * 60 * 5;
  } else if (rate === 'good') {
    card.difficulty = (card.difficulty || 1) + 1;
    card.due = now + 1000 * 60 * 60;
  } else if (rate === 'easy') {
    card.difficulty = (card.difficulty || 1) + 2;
    card.due = now + 1000 * 60 * 60 * 12;
  }

  // Send update to backend (fire-and-forget, but log errors)
  authFetch(`/api/cards/${card.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card)
  }).catch(err => console.error('Failed to update card SR info', err));

  // Move to next card
  document.getElementById('nextCard').click();
}

// Wire rating buttons
document.querySelectorAll('.rate-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyRatingToCurrentCard(btn.dataset.rate);
  });
});

// ----- Tabs -----
const tabs = document.querySelectorAll('.tab');
const tabsContent = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabsContent.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'studyTab') startStudyMode();
  });
});

// ----- Initial load -----
loadDeckList();
