// script.js - top section
const currentPage = window.location.pathname.split('/').pop();

// Define which pages require login
const protectedPages = ['index.html', 'planner.html', 'flashcards.html', 'library.html', 'dashboard.html'];

// Simple check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('edu_token'); // token stored after login
}

// If the current page is protected and user is not logged in -> redirect
if (protectedPages.includes(currentPage) && !isLoggedIn()) {
  // Optionally store where the user wanted to go
  localStorage.setItem('redirectAfterLogin', currentPage);
  window.location.href = 'login.html';
}

// After login, you can redirect back using:
const redirect = localStorage.getItem('redirectAfterLogin') || 'index.html';
localStorage.removeItem('redirectAfterLogin');
window.location.href = redirect;


if (protectedPages.includes(currentPage) && !isLoggedIn()) {
  // Trying to access a protected page while logged out
  redirectAfterLogin = currentPage; 
  window.location.href = redirectAfterLogin;
}

// ===== Sidebar Toggle =====
const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

function openMenu() {
  sideMenu.classList.add('active');
  overlay.classList.add('active');
}

function closeMenu() {
  sideMenu.classList.remove('active');
  overlay.classList.remove('active');
}

hamburger.addEventListener('click', openMenu);
overlay.addEventListener('click', closeMenu);

// Add close button inside sidebar
const closeBtn = document.createElement('div');
closeBtn.innerHTML = '&times;';
closeBtn.className = 'close-btn';
sideMenu.prepend(closeBtn);
closeBtn.addEventListener('click', closeMenu);

// ===== Authentication helpers =====
function isLoggedIn() {
  return !!localStorage.getItem('edu_token');
}

// If on login page and already logged in, send to index
if (currentPage === 'login.html' && isLoggedIn()) {
  window.location.href = 'index.html';
}

// Logout button handler (clears local storage and redirects
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      const token = localStorage.getItem('edu_token');
      // Optionally inform backend to invalidate token
      await fetch('http://localhost:5000/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch(e) {}
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
    window.location.href = 'login.html';
  });
}

// Change password
const changePasswordBtn = document.getElementById('changePasswordBtn');
changePasswordBtn.addEventListener('click', async () => {
  const current = prompt('Enter current password:');
  const newPass = prompt('Enter new password:');
  if (!current || !newPass) return alert('Both fields are required');

  const token = localStorage.getItem('edu_token');
  try {
    const res = await fetch('http://localhost:5000/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    const data = await res.json();
    if (res.ok) alert(data.message);
    else alert(data.error);
  } catch (err) { console.error(err); alert('Server error'); }
});

// ===== Registration =====
const registerBtnGlobal = document.getElementById('registerBtn'); // in case other pages use same id
if (registerBtnGlobal) {
  registerBtnGlobal.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName') ? document.getElementById('regName').value.trim() : '';
    const username = document.getElementById('regUser') ? document.getElementById('regUser').value.trim() : '';
    const email = document.getElementById('regEmail') ? document.getElementById('regEmail').value.trim() : '';
    const password = document.getElementById('regPass') ? document.getElementById('regPass').value : '';
    const confirm = document.getElementById('regConfirm') ? document.getElementById('regConfirm').value : '';

    if (!name || !username || !email || !password) {
      alert('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        // Save token & user and redirect
        localStorage.setItem('edu_token', data.token);
        localStorage.setItem('edu_user', JSON.stringify(data.user));
        alert('Registration successful! Redirecting...');
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Try again later.');
    }
  });
}


const editProfileBtn = document.getElementById('editProfileBtn');

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('edu_token'); // use the correct key
    if (!token) return alert('You are not logged in');

    try {
      // Fetch current user info
      const res = await fetch('http://localhost:5000/profile', { 
        headers: { 'Authorization': 'Bearer ' + token } 
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Failed to fetch profile');

      // Ask for new values
      const newName = prompt('Edit Name:', data.user.name);
      const newEmail = prompt('Edit Email:', data.user.email);

      if (!newName || !newEmail) return alert('Both fields are required');

      // Send update request
      const updateRes = await fetch(`http://localhost:5000/users/${data.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name: newName, email: newEmail })
      });

      const updated = await updateRes.json();
      if (updateRes.ok) {
        alert('Profile updated successfully!');
      } else {
        alert(updated.error || 'Failed to update profile');
      }

    } catch (err) {
      console.error(err);
      alert('Error fetching/updating profile');
    }
  });
}

// ===== Font Size =====
const fontSizeSelect = document.getElementById('fontSizeSelect');
if (fontSizeSelect) {
  fontSizeSelect.addEventListener('change', (e) => {
    const sizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.fontSize = sizeMap[e.target.value] || '16px';
  });
}
// ===== Update quote color to match accent =====
const quoteEl = document.getElementById('quote');

function updateQuoteColor(accent) {
  if (quoteEl) quoteEl.style.color = accent;
}
// Note: the actual accentSelect element is defined later.
// We update the quote color from the main accent handler below.

// Load a quote: try remote API, fallback to local list
async function loadQuote() {
  if (!quoteEl) return;
  quoteEl.textContent = 'Loading quote...';
  const setQuote = (text, author) => {
    quoteEl.textContent = text + (author ? ` — ${author}` : '');
    // apply current accent color
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#ff7a59';
    updateQuoteColor(accent.trim());
  };

  // Try public API first
  try {
    const res = await fetch('https://api.quotable.io/random');
    if (res.ok) {
      const data = await res.json();
      setQuote(data.content, data.author);
      return;
    }
  } catch (e) {
    // network failed — fallback to local
  }

  // Local fallback quotes
  const local = [
    {q: 'Study hard, stay curious.', a: 'EduHub'},
    {q: 'Small progress each day adds up to big results.', a: 'Unknown'},
    {q: 'Practice makes progress, not perfection.', a: 'Unknown'},
    {q: 'Read. Reflect. Repeat.', a: 'EduHub'},
    {q: 'Learning never exhausts the mind.', a: 'Leonardo da Vinci'}
  ];
  const pick = local[Math.floor(Math.random() * local.length)];
  setQuote(pick.q, pick.a);
}

// allow clicking the quote to refresh
if (quoteEl) quoteEl.addEventListener('click', loadQuote);


// ===== Pomodoro Timer =====
let timerDisplay = document.getElementById('timer');
if (timerDisplay) {
  let startBtn = document.getElementById('startBtn');
  let pauseBtn = document.getElementById('pauseBtn');
  let resetBtn = document.getElementById('resetBtn');
  let timer, timeLeft = 25*60;

  function updateTimerDisplay() {
    let minutes = Math.floor(timeLeft/60);
    let seconds = timeLeft%60;
    timerDisplay.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }

  if (startBtn) startBtn.addEventListener('click', () => {
    clearInterval(timer);
    timer = setInterval(() => {
      if(timeLeft <= 0) clearInterval(timer);
      else timeLeft--;
      updateTimerDisplay();
    }, 1000);
  });

  if (pauseBtn) pauseBtn.addEventListener('click', () => clearInterval(timer));
  if (resetBtn) resetBtn.addEventListener('click', () => { clearInterval(timer); timeLeft = 25*60; updateTimerDisplay(); });
  updateTimerDisplay();
}

// Function to calculate contrasting text color (black or white)
function getContrastColor(hexColor) {
  hexColor = hexColor.replace('#', '');
  const r = parseInt(hexColor.substr(0,2),16);
  const g = parseInt(hexColor.substr(2,2),16);
  const b = parseInt(hexColor.substr(4,2),16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? '#000000' : '#ffffff';
}

const menuTitles = document.querySelectorAll('.menu-title');

menuTitles.forEach(title => {
  title.addEventListener('click', () => {
    const parentSection = title.parentElement;

    // Toggle the clicked section
    parentSection.classList.toggle('active');

    // Close other sections (optional: only one open at a time)
    menuTitles.forEach(t => {
      if (t !== title) t.parentElement.classList.remove('active');
    });
  });
});
  // Theme mode (light / dark)
  const themeMode = document.getElementById('themeMode');
  function applyTheme(mode) {
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('edu_theme_mode', mode);
  }
  if (themeMode) {
    const saved = localStorage.getItem('edu_theme_mode') || 'light';
    themeMode.value = saved;
    applyTheme(saved);
    themeMode.addEventListener('change', (e) => applyTheme(e.target.value));
  }

const heroBtnEl = document.querySelector('.hero-btn');
if (heroBtnEl) {
  heroBtnEl.addEventListener('click', () => {
    const quick = document.querySelector('.quick-links');
    if (quick) quick.scrollIntoView({ behavior: 'smooth' });
  });
}

/* =========================
      GOOGLE-LIKE CALENDAR
   ========================= */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
// tasks structure now: { "YYYY-MM-DD": [ {id, title}, {id, title}, ... ] }
// fallback for older local-only runs accepted: strings in arrays remain supported
let tasks = JSON.parse(localStorage.getItem('edu_tasks') || '{}');  // stored like: {"2025-02-18": [{"id":1,"title":"Math review"}, "Exam"]}

function saveTasksToStorage() {
  localStorage.setItem('edu_tasks', JSON.stringify(tasks));
}

// Update a single day-box DOM to reflect tasks for `date` without reloading the whole calendar
function updateDayBox(date) {
  try {
    const day = document.querySelector(`.day-box[data-date="${date}"]`);
    if (!day) return;
    const list = tasks[date] || [];
    // remove old top title if present
    const old = day.querySelector('.task-top-title');
    if (old) old.remove();
    // toggle has-task class
    if (list.length === 0) {
      day.classList.remove('has-task');
      return;
    }
    day.classList.add('has-task');

    // accept either strings or objects {id, title}
    const raw = (typeof list[0] === 'string') ? list[0] : (list[0].title || '');
    const safe = String(raw).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
    const short = safe.length > 18 ? safe.slice(0,18) + '...' : safe;
    const top = document.createElement('div');
    top.className = 'task-top-title';
    top.title = safe;
    top.textContent = short;
    // insert before day-number
    const dayNumber = day.querySelector('.day-number');
    if (dayNumber) day.insertBefore(top, dayNumber);
  } catch (e) { /* ignore DOM errors */ }
}

function loadCalendar(month, year) {
  const calDays = document.getElementById("calDays");
  const calTitle = document.getElementById("calTitle");

  calDays.innerHTML = "";
  calTitle.textContent = `${monthNames[month]} ${year}`;

  let firstDay = new Date(year, month, 1).getDay();
  let daysInMonth = new Date(year, month + 1, 0).getDate();

  // empty cells before the first day
  for (let i = 0; i < firstDay; i++) {
    calDays.innerHTML += `<div class="empty"></div>`;
  }

  // dates
  for (let date = 1; date <= daysInMonth; date++) {
    let fullDate = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;

    let hasTask = tasks[fullDate] && tasks[fullDate].length > 0;
    // If there's a task, add a short title above the number and mark the day-box so CSS can color the number
    let topTitleHtml = '';
    const dayClass = hasTask ? 'day-box has-task' : 'day-box';
    if (hasTask) {
      const first = tasks[fullDate][0];
      const raw = (typeof first === 'string') ? first : (first.title || '');
      const safe = String(raw).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
      const short = safe.length > 18 ? safe.slice(0,18) + '...' : safe;
      topTitleHtml = `<div class="task-top-title" title="${safe}">${short}</div>`;
    }

    calDays.innerHTML += `
      <div class="${dayClass}" data-date="${fullDate}">
        ${topTitleHtml}
        <div class="day-number">${date}</div>
      </div>`;
  }

  enableDateClicks();
}

function enableDateClicks() {
  document.querySelectorAll(".day-box").forEach(day => {
    day.onclick = () => {
      const selectedDate = day.getAttribute("data-date");
      openTaskPopup(selectedDate);
    };
  });
}

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

document.getElementById("prevMonth").onclick = () => {
  if (currentMonth === 0) { currentMonth = 11; currentYear--; }
  else currentMonth--;
  loadCalendar(currentMonth, currentYear);
};

document.getElementById("nextMonth").onclick = () => {
  if (currentMonth === 11) { currentMonth = 0; currentYear++; }
  else currentMonth++;
  loadCalendar(currentMonth, currentYear);
};


/* ===== TASK POPUP ===== */
const taskPopup = document.getElementById("taskPopup");
const popupDate = document.getElementById("popupDate");
const popupTasksEl = document.getElementById('popupTasks');
const taskInput = document.getElementById("taskInput");

let activeDate = null;
let editingIndex = null;

function renderPopupTasks(date) {
  popupTasksEl.innerHTML = '';
  const list = tasks[date] || [];
  if (list.length === 0) {
    popupTasksEl.innerHTML = '<p style="opacity:.8">No tasks for this date.</p>';
    return;
  }
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';
  ul.style.margin = '0 0 8px 0';
  list.forEach((t, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '6px 8px';
    li.style.borderRadius = '6px';
    li.style.background = 'var(--card-bg)';
    li.style.marginBottom = '6px';

    const span = document.createElement('span');
    const titleText = (typeof t === 'string') ? t : (t.title || '');
    span.textContent = titleText;
    span.style.flex = '1';
    span.style.marginRight = '8px';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.style.marginRight = '6px';

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';

    editBtn.addEventListener('click', () => {
      taskInput.value = titleText;
      editingIndex = idx;
      taskInput.focus();
    });

    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;

      const item = t;
      const headers = getAuthHeaders();

      // If item is legacy string or no auth -> remove locally
      if (!headers || typeof item === 'string' || !item.id) {
        tasks[date].splice(idx, 1);
        if (tasks[date].length === 0) delete tasks[date];
        saveTasksToStorage();
        renderPopupTasks(date);
        updateDayBox(date);
        updateTaskProgress();
        return;
      }

      // Otherwise call server delete using the stored id
      try {
        const res = await fetch(`${API_BASE}/api/cal_tasks/${item.id}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) {
          const body = await res.json().catch(()=>({ error: 'unknown' }));
          throw new Error(body.error || 'Failed to delete');
        }
        // remove locally and re-sync
        tasks[date].splice(idx, 1);
        if (tasks[date].length === 0) delete tasks[date];
        saveTasksToStorage();
        await loadCalendarFromDB();
        renderPopupTasks(date);
        updateTaskProgress();
      } catch (err) {
        console.error('Failed to delete task', err);
        alert('Failed to delete task on server');
      }
    });

    const btnWrap = document.createElement('div');
    btnWrap.appendChild(editBtn);
    btnWrap.appendChild(delBtn);

    li.appendChild(span);
    li.appendChild(btnWrap);
    ul.appendChild(li);
  });
  popupTasksEl.appendChild(ul);
}

function openTaskPopup(date) {
  taskPopup.style.display = "block";
  popupDate.textContent = "For: " + date;
  activeDate = date;
  editingIndex = null;
  taskInput.value = '';
  renderPopupTasks(date);
}

document.getElementById("closeTaskBtn").onclick = () => {
  taskPopup.style.display = "none";
  taskInput.value = "";
  editingIndex = null;
};

// ========== SAVE / EDIT HANDLER (uses server when logged in) ==========
document.getElementById("saveTaskBtn").onclick = async () => {
  const taskText = taskInput.value.trim();
  if (!taskText) return;
  if (!activeDate) return;

  const headers = getAuthHeaders();

  if (editingIndex !== null) {
    // editing an existing entry (if it has id -> send PUT, otherwise local update)
    const item = tasks[activeDate] && tasks[activeDate][editingIndex];
    if (item && item.id && headers) {
      try {
        const res = await fetch(`${API_BASE}/api/cal_tasks/${item.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ title: taskText, date: activeDate })
        });
        if (!res.ok) {
          const body = await res.json().catch(()=>({ error: 'unknown' }));
          throw new Error(body.error || 'Failed to update task on server');
        }
        await loadCalendarFromDB();
      } catch (err) {
        console.error('Failed to update server task', err);
        alert('Failed to update task on server');
      }
    } else {
      // local fallback edit
      if (!tasks[activeDate]) tasks[activeDate] = [];
      tasks[activeDate][editingIndex] = { id: tasks[activeDate][editingIndex]?.id || `local-${Date.now()}`, title: taskText };
      saveTasksToStorage();
    }
  } else {
    // create new
    if (!headers) {
      if (!tasks[activeDate]) tasks[activeDate] = [];
      tasks[activeDate].push({ id: `local-${Date.now()}`, title: taskText });
      saveTasksToStorage();
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/cal_tasks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: taskText, date: activeDate })
        });
        if (!res.ok) {
          const body = await res.json().catch(()=>({ error: 'unknown' }));
          throw new Error(body.error || 'Failed to create task on server');
        }
        // Use server response; server returns created row
        const created = await res.json();
        const d = (created.date || activeDate).split('T')[0];
        if (!tasks[d]) tasks[d] = [];
        tasks[d].push({ id: created.id, title: created.title });
        saveTasksToStorage();
        await loadCalendarFromDB();
      } catch (err) {
        console.error('Failed to create server task', err);
        alert('Failed to create task on server');
      }
    }
  }

  taskInput.value = "";
  editingIndex = null;
  renderPopupTasks(activeDate);
  updateTaskProgress();
  updateDayBox(activeDate);
};


/* ===== PROGRESS UPDATE ===== */
function updateTaskProgress() {
  let totalTasks = 0, completed = 0;

  for (let date in tasks) {
    totalTasks += tasks[date].length;
  }

  // temporarily, completed = total (users can check off later if you want)
  completed = totalTasks;

  let percent = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);

  // only update if those elements exist
  if (document.getElementById("taskProgress")) document.getElementById("taskProgress").textContent = percent + "%";
  if (document.getElementById("taskBar")) document.getElementById("taskBar").style.width = percent + "%";
}

// Load initial calendar
loadCalendar(currentMonth, currentYear);
// Apply saved theme on load (handled above by themeMode init)

// === STREAK SYSTEM ===
function getToday() {
  return new Date().toLocaleDateString();
}

let streakData = JSON.parse(localStorage.getItem("streakData")) || {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null
};

function updateStreak() {
  const today = getToday();

  if (streakData.lastStudyDate === today) {
    // Already counted today
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();

    if (streakData.lastStudyDate === yesterdayStr) {
      streakData.currentStreak++;
    } else {
      streakData.currentStreak = 1; // reset
    }

    // update longest
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    streakData.lastStudyDate = today;
    localStorage.setItem("streakData", JSON.stringify(streakData));
  }

  // UI Update
  if (document.getElementById("currentStreak")) document.getElementById("currentStreak").innerText = streakData.currentStreak;
  if (document.getElementById("longestStreak")) document.getElementById("longestStreak").innerText = streakData.longestStreak;

  generateStreakCalendar();
}

// Generate last 7 days mini calendar
function generateStreakCalendar() {
  const container = document.getElementById("miniStreakCalendar");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dateStr = date.toLocaleDateString();
    const dayLetter = date.toLocaleString("en-US", { weekday: "short" })[0];

    const div = document.createElement("div");
    div.classList.add("streak-day");
    div.innerText = dayLetter;

    if (dateStr === streakData.lastStudyDate) {
      div.classList.add("active");
    }

    container.appendChild(div);
  }
}

// Fake daily goal progress (you can connect this to tasks/flashcards later)
function updateDailyGoal() {
  let percent = Math.floor(Math.random() * 100); // placeholder
  if (document.getElementById("dailyGoalPct")) document.getElementById("dailyGoalPct").innerText = percent + "%";
  if (document.getElementById("dailyGoalFill")) document.getElementById("dailyGoalFill").style.width = percent + "%";
}

// Run on load
updateStreak();
updateDailyGoal();
// Load the quote on startup
loadQuote();

// Highlight current page in sidebar / quick links
function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop();
  const links = document.querySelectorAll('.side-menu a, .quick-links a');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active-link');
    } else {
      link.classList.remove('active-link');
    }
  });
}

// Call on page load
highlightCurrentPage();

/* ============================
   USER SETTINGS SYNC
============================ */

// Call this on page load
async function loadUserSettingsFromDB() {
  const user = JSON.parse(localStorage.getItem('edu_user'));
  if (!user) return;

  const userId = user.id;

  try {
    // try both endpoints (some versions used /users/:id/settings)
    let res = await fetch(`http://localhost:5000/api/settings`, { headers: getAuthHeaders() });
    if (!res.ok) {
      // fallback to legacy
      res = await fetch(`http://localhost:5000/users/${userId}/settings`, { headers: getAuthHeaders() });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');

    // your server returns the row directly; normalize into s
    const s = data.settings || data || {};

    // Appearance
    if (document.getElementById('themeMode') && s.theme_mode) document.getElementById('themeMode').value = s.theme_mode;
    if (document.getElementById('fontSizeSelect') && s.font_size) document.getElementById('fontSizeSelect').value = s.font_size;

    if (s.accent) {
      document.querySelectorAll('.accent-swatch').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.accent === s.accent);
      });
      updateQuoteColor(s.accent);
    }

    if (s.theme_mode) applyTheme(s.theme_mode);
    if (s.font_size) document.documentElement.style.fontSize = s.font_size === 'small' ? '14px' : s.font_size === 'large' ? '18px' : '16px';

    // Notifications (parsed as JSON)
    const notifs = (typeof s.notifications === 'string') ? JSON.parse(s.notifications || '{}') : (s.notifications || {});
    if (document.getElementById('appNotifToggle')) document.getElementById('appNotifToggle').checked = notifs.app ?? true;
    if (document.getElementById('dailyReminderToggle')) document.getElementById('dailyReminderToggle').checked = notifs.dailyReminder ?? false;
    if (document.getElementById('taskAlertToggle')) document.getElementById('taskAlertToggle').checked = notifs.taskAlert ?? false;

    // Study Preferences
    if (document.getElementById('pomodoroTimeSelect') && s.pomodoro_time) document.getElementById('pomodoroTimeSelect').value = s.pomodoro_time;
    if (document.getElementById('breakTimeSelect') && s.break_time) document.getElementById('breakTimeSelect').value = s.break_time;
    if (document.getElementById('autoSaveNotesToggle')) document.getElementById('autoSaveNotesToggle').checked = !!s.auto_save_notes;

  } catch (err) {
    console.error("Failed to load user settings:", err);
  }
}

// Save settings to DB whenever a change is made
async function saveUserSettingsToDB() {
  const user = JSON.parse(localStorage.getItem('edu_user'));
  if (!user) return;
  const userId = user.id;

  const settings = {
    theme_mode: document.getElementById('themeMode')?.value || 'light',
    font_size: document.getElementById('fontSizeSelect')?.value || 'medium',
    accent: document.querySelector('.accent-swatch.selected')?.dataset.accent || '#ff7a59',
    pomodoro_time: parseInt(document.getElementById('pomodoroTimeSelect')?.value || 25),
    break_time: parseInt(document.getElementById('breakTimeSelect')?.value || 5),
    auto_save_notes: document.getElementById('autoSaveNotesToggle')?.checked ?? true,
    notifications: {
      app: document.getElementById('appNotifToggle')?.checked ?? true,
      dailyReminder: document.getElementById('dailyReminderToggle')?.checked ?? false,
      taskAlert: document.getElementById('taskAlertToggle')?.checked ?? false
    }
  };

  try {
    const res = await fetch(`http://localhost:5000/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() || {}) },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save settings');
    console.log("Settings saved:", data);
  } catch (err) {
    console.error("Failed to save user settings:", err);
  }
}

/* ============================
   EVENT LISTENERS
============================ */

// Appearance
const themeModeEl = document.getElementById('themeMode');
if (themeModeEl) {
  themeModeEl.addEventListener('change', () => {
    applyTheme(themeModeEl.value);
    saveUserSettingsToDB();
  });
}

const fontSizeEl = document.getElementById('fontSizeSelect');
if (fontSizeEl) {
  fontSizeEl.addEventListener('change', () => {
    const sizeMap = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizeMap[fontSizeEl.value] || '16px';
    saveUserSettingsToDB();
  });
}

// Accent
document.querySelectorAll('.accent-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.accent-swatch').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateQuoteColor(btn.dataset.accent);
    saveUserSettingsToDB();
  });
});

// Notifications & Study Preferences
['appNotifToggle', 'dailyReminderToggle', 'taskAlertToggle', 'pomodoroTimeSelect', 'breakTimeSelect', 'autoSaveNotesToggle'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', saveUserSettingsToDB);
});

// Load settings on page load
loadUserSettingsFromDB();

/* ============================
   EVENT HELPERS: AUTH & API
============================ */

const API_BASE = 'http://localhost:5000';

// Helpers
function getAuthHeaders() {
  const token = localStorage.getItem('edu_token');
  return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : null;
}

/* ============= DB INTEGRATION: Calendar / Notes / Streak / Pomodoro ============= */

// Load calendar from DB and keep tasks as {date: [{id,title}, ...]}
async function loadCalendarFromDB() {
  const headers = getAuthHeaders();
  if (!headers) {
    // no token -> keep local storage behavior (already present)
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/cal_tasks`, { headers });
    if (!res.ok) throw new Error('Failed to fetch calendar tasks');
    const rows = await res.json();
    // convert to tasks object grouped by date, values are objects {id, title}
    tasks = {}; // replace local tasks with server data
    rows.forEach(r => {
      // normalize date to YYYY-MM-DD
      const d = (r.date || '').split('T')[0];
      if (!d) return;
      if (!tasks[d]) tasks[d] = [];
      tasks[d].push({ id: r.id, title: r.title });
    });
    saveTasksToStorage();
    loadCalendar(currentMonth, currentYear);
    // update day boxes for current month
    Object.keys(tasks).forEach(d => updateDayBox(d));
  } catch (err) {
    console.error('loadCalendarFromDB error', err);
  }
}

async function saveCalTaskToDB(title, date, details, time) {
  const headers = getAuthHeaders();
  if (!headers) {
    // fallback to localStorage
    if (!tasks[date]) tasks[date] = [];
    tasks[date].push({ id: `local-${Date.now()}`, title });
    saveTasksToStorage();
    updateDayBox(date);
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/cal_tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, details, date, time })
    });
    if (!res.ok) {
      const body = await res.json().catch(()=>({ error: 'unknown' }));
      throw new Error(body.error || 'Failed to save task');
    }
    const created = await res.json();
    // refresh calendar from DB (keeps things consistent)
    await loadCalendarFromDB();
  } catch (err) {
    console.error('saveCalTaskToDB error', err);
  }
}

// ---------------- Notes integration ----------------
async function loadNotesFromDB() {
  const headers = getAuthHeaders();
  if (!headers) {
    // fallback to localStorage (or keep current)
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/notes`, { headers });
    if (!res.ok) throw new Error('Failed to fetch notes');
    const rows = await res.json();
    const notesListEl = document.getElementById('notesList');
    if (!notesListEl) return;
    notesListEl.innerHTML = '';
    rows.forEach(n => {
      const li = document.createElement('li');
      li.textContent = n.content;
      li.dataset.id = n.id;
      // attach delete click for each note (optional)
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.style.marginLeft = '8px';
      del.addEventListener('click', async () => {
        if (!confirm('Delete this note?')) return;
        try {
          const hr = getAuthHeaders();
          const resp = await fetch(`${API_BASE}/api/notes/${n.id}`, { method: 'DELETE', headers: hr });
          if (!resp.ok) throw new Error('Failed to delete note');
          await loadNotesFromDB();
        } catch (err) {
          console.error('delete note', err);
          alert('Failed to delete note');
        }
      });
      li.appendChild(del);
      notesListEl.appendChild(li);
    });
  } catch (err) {
    console.error('loadNotesFromDB', err);
  }
}

document.getElementById('saveNote')?.addEventListener('click', async () => {
  const content = document.getElementById('noteInput').value.trim();
  if (!content) return alert('Enter a note');
  const headers = getAuthHeaders();
  if (!headers) {
    // fallback local: append to localStorage or your existing code
    const localNotes = JSON.parse(localStorage.getItem('edu_notes') || '[]');
    localNotes.unshift({ content, created_at: new Date().toISOString() });
    localStorage.setItem('edu_notes', JSON.stringify(localNotes));
    document.getElementById('noteInput').value = '';
    loadNotesFromDB(); // will show local if server not available
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to save note');
    document.getElementById('noteInput').value = '';
    await loadNotesFromDB();
  } catch (err) {
    console.error('save note', err);
    alert('Failed to save note');
  }
});

// ---------------- Streak integration ----------------
async function loadStreakFromDB() {
  const headers = getAuthHeaders();
  if (!headers) return; // keep local fallback
  try {
    const res = await fetch(`${API_BASE}/api/streak`, { headers });
    if (!res.ok) throw new Error('Failed to fetch streak');
    const s = await res.json();
    if (document.getElementById('currentStreak')) document.getElementById('currentStreak').innerText = s.current_streak ?? 0;
    if (document.getElementById('longestStreak')) document.getElementById('longestStreak').innerText = s.longest_streak ?? 0;
    // Update local streakData object so UI (mini calendar) is consistent:
    streakData.currentStreak = s.current_streak ?? 0;
    streakData.longestStreak = s.longest_streak ?? 0;
    streakData.lastStudyDate = s.last_active ? new Date(s.last_active).toLocaleDateString() : streakData.lastStudyDate;
    generateStreakCalendar();
  } catch (err) {
    console.error('loadStreakFromDB', err);
  }
}

async function saveStreakToDB() {
  const headers = getAuthHeaders();
  if (!headers) return;
  try {
    const body = {
      current_streak: streakData.currentStreak,
      longest_streak: streakData.longestStreak,
      last_active: streakData.lastStudyDate
    };
    const res = await fetch(`${API_BASE}/api/streak`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to save streak');
  } catch (err) {
    console.error('saveStreakToDB', err);
  }
}

// Call saveStreakToDB() anytime you update streakData (for example inside updateStreak() add an async call)
const origUpdateStreak = updateStreak;
updateStreak = function() {
  origUpdateStreak();
  // after UI updated, save to DB (fire-and-forget)
  saveStreakToDB().catch(e => console.error(e));
};

// --------------- Pomodoro integration (store completed sessions) ---------------
let pomodoroRunning = false;
let pomodoroStart = null;
let pomodoroDuration = 25 * 60; // seconds default

// Replace your existing start/pause/reset handlers to track sessions
document.getElementById('startBtn')?.addEventListener('click', () => {
  pomodoroRunning = true;
  pomodoroStart = new Date();
  // you already run timer; nothing else needed here
});

document.getElementById('pauseBtn')?.addEventListener('click', async () => {
  if (!pomodoroRunning || !pomodoroStart) return;
  const elapsed = Math.round((Date.now() - pomodoroStart.getTime()) / 1000);
  pomodoroRunning = false;
  pomodoroStart = null;
  // save session
  const headers = getAuthHeaders();
  if (headers) {
    try {
      await fetch(`${API_BASE}/api/pomodoro/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ duration: elapsed, session_type: 'work', started_at: new Date().toISOString() })
      });
    } catch (err) {
      console.error('Failed to save pomodoro session', err);
    }
  }
});

// On reset just clear local UI; optionally save partial session similarly

// ----------------- Initialize DB-backed UI ----------------
(async function initDBBackedUI(){
  // load calendar & notes & streaks from DB if logged in
  const token = localStorage.getItem('edu_token');
  if (token) {
    await loadCalendarFromDB();
    await loadNotesFromDB();
    await loadStreakFromDB();
  } else {
    // use localStorage fallbacks already present
    loadCalendar(currentMonth, currentYear);
  }
})();

/* ===== Robust DB -> Calendar UI sync (legacy support) ===== */
async function refreshCalendarMarksFromDB() {
  // this now simply defers to loadCalendarFromDB which creates proper id/title entries
  await loadCalendarFromDB();
}

// Run once on page load to sync DB -> UI
refreshCalendarMarksFromDB();
