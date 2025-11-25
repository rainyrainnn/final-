/* ============================================
   planner.js — Production version (PG Tasks)
   - Fully connected to /api/tasks
   - Uses JWT from localStorage
   - Falls back to localStorage if no token
   ============================================ */

'use strict';

const BASE_URL = 'http://localhost:5000';
const LOCAL_KEY = 'plannerTasks';

// ----- Auth fetch -----
async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('edu_token');
  if (!token) throw new Error('No token');

  const url = BASE_URL + endpoint;
  options.headers = {
    ...options.headers,
    'Authorization': 'Bearer ' + token
  };

  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
    throw new Error('Unauthorized');
  }
  return res;
}

// ----- LocalStorage helpers -----
function saveLocalTasks(tasks) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));
}

function loadLocalTasks() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { localStorage.removeItem(LOCAL_KEY); return []; }
}

// ----- DOM refs -----
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDesc');
const taskDue = document.getElementById('taskDue');
const taskPriority = document.getElementById('taskPriority');
const taskCategory = document.getElementById('taskCategory');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const weekColumns = document.querySelectorAll('.day-column ul');

// ----- App state -----
let tasks = [];
let forceLocal = false;

// ----- Utilities -----
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getWeekday(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[d.getDay()];
}

// ----- Rendering -----
function clearViews() {
  if (!taskList) return;
  taskList.innerHTML = '';
  weekColumns.forEach(col => col.innerHTML = '');
}

function renderTasks() {
  clearViews();

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.style.borderLeftColor = task.completed ? 'gray' : 'var(--accent)';

    const metaDue = task.due || 'No date';
    li.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span>${escapeHtml(task.category)}</span>
        <span>${metaDue}</span>
      </div>
      <div class="task-actions">
        <button class="task-btn complete-btn">${task.completed ? '↺ Undo' : '✔ Done'}</button>
        <button class="task-btn delete-btn">🗑 Delete</button>
      </div>
    `;

    li.querySelector('.complete-btn').addEventListener('click', async () => {
      task.completed = !task.completed;
      await persistTask(task);
      await reloadTasks();
    });

    li.querySelector('.delete-btn').addEventListener('click', async () => {
      if (task.id) {
        await deleteTaskOnServer(task.id);
      } else {
        tasks.splice(index, 1);
        saveLocalTasks(tasks);
      }
      await reloadTasks();
    });

    taskList.appendChild(li);

    if (task.due) {
      const day = getWeekday(task.due);
      const column = document.querySelector(`.day-column ul[data-day="${day}"]`);
      if (column) {
        const dayItem = document.createElement('li');
        dayItem.textContent = `${task.title}`;
        column.appendChild(dayItem);
      }
    }
  });
}

// ----- Server Data Layer -----
async function fetchTasksFromServer() {
  if (forceLocal) return null;

  const token = localStorage.getItem('edu_token');
  if (!token) return null;

  try {
    const res = await authFetch('/api/tasks');
    if (!res.ok) return null;
    const data = await res.json();
    return data.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due: t.due_date ? (new Date(t.due_date)).toISOString().slice(0,10) : null,
      priority: t.priority,
      category: t.category,
      completed: t.completed
    }));
  } catch {
    return null;
  }
}

async function persistTask(task) {
  const token = localStorage.getItem('edu_token');
  if (!token) {
    if (!task.id) task._localId = task._localId || `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    saveLocalTasks(tasks);
    return;
  }

  try {
    if (task.id) {
      const res = await authFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          due_date: task.due || null,
          priority: task.priority,
          category: task.category,
          completed: task.completed
        })
      });
      if (res.ok) {
        const updated = await res.json();
        task.id = updated.id;
        saveLocalTasks(tasks);
      }
    } else {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          due_date: task.due || null,
          priority: task.priority,
          category: task.category
        })
      });
      if (res.ok) {
        const created = await res.json();
        task.id = created.id;
        saveLocalTasks(tasks);
      }
    }
  } catch {
    if (!task.id) task._localId = task._localId || `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    saveLocalTasks(tasks);
  }
}

async function deleteTaskOnServer(id) {
  const token = localStorage.getItem('edu_token');
  if (!token) {
    tasks = tasks.filter(t => String(t.id) !== String(id));
    saveLocalTasks(tasks);
    return;
  }
  try {
    const res = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      tasks = tasks.filter(t => String(t.id) !== String(id));
      saveLocalTasks(tasks);
    }
  } catch {
    tasks = tasks.filter(t => String(t.id) !== String(id));
    saveLocalTasks(tasks);
  }
}

// ----- High-level reload -----
async function reloadTasks() {
  const serverTasks = await fetchTasksFromServer();
  if (serverTasks) {
    tasks = serverTasks;
    saveLocalTasks(tasks);
  } else {
    tasks = loadLocalTasks();
  }
  renderTasks();
}

// ----- UI: Add new task -----
if (addTaskBtn) {
  addTaskBtn.addEventListener('click', async () => {
    const newTask = {
      title: taskTitle.value.trim(),
      description: taskDesc.value.trim(),
      due: taskDue.value || null,
      priority: taskPriority.value,
      category: taskCategory.value,
      completed: false
    };

    if (!newTask.title) return alert('Please enter a task title.');

    tasks.unshift(newTask);
    renderTasks();
    await persistTask(newTask);
    await reloadTasks();

    // reset inputs
    taskTitle.value = '';
    taskDesc.value = '';
    taskDue.value = '';
    taskPriority.value = 'medium';
    taskCategory.value = 'General';
  });
}

// ----- Start -----
reloadTasks();
