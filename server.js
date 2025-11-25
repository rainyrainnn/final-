// =====================
// SERVER.JS - CLEAN VERSION
// =====================

app.get('/api/db-test', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    res.json({ db: 'ok', rows: r.rows });
  } catch (err) {
    console.error('DB test failed', err);
    res.status(500).json({ error: 'db test failed', details: err.message });
  }
});

// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // PostgreSQL connection

// Initialize Express
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // parse JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend files

// =====================
// JWT AUTHENTICATION MIDDLEWARE
// =====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = user.userId;
    next();
  });
}

// =====================
// ROUTES
// =====================

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test API
app.get('/api/test', async (req, res) => res.send('API is working!'));

// =====================
// AUTH ROUTES
// =====================

// Register
app.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username=$1 OR email=$2',
      [username, email]
    );
    if (userExists.rows.length > 0)
      return res.status(400).json({ error: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      'INSERT INTO users (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, username, email',
      [name, username, email, hashedPassword]
    );

    const token = jwt.sign({ userId: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (userQuery.rows.length === 0)
      return res.status(400).json({ error: 'User not found' });

    const user = userQuery.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =====================
// PROFILE & ACCOUNT ROUTES
// =====================

// Get profile
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query('SELECT id, name, username, email FROM users WHERE id=$1', [req.userId]);
    if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userQuery.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
app.put('/users/:id', authenticateToken, async (req,res) => {
  const userId = req.params.id;
  const { name, email } = req.body;
  if (parseInt(userId) !== req.userId)
    return res.status(403).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, updated_at=NOW() WHERE id=$3 RETURNING id, name, username, email',
      [name, email, userId]
    );
    res.json(result.rows[0]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.post('/users/change-password', authenticateToken, async (req,res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new passwords are required' });

  try {
    const userQuery = await pool.query('SELECT password FROM users WHERE id=$1', [req.userId]);
    if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, userQuery.rows[0].password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [newHashedPassword, req.userId]);
    res.json({ message: 'Password updated successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Delete account
app.delete('/users/delete', authenticateToken, async (req,res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.userId]);
    res.json({ message: 'Account deleted successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// =====================
// SETTINGS, NOTES, TASKS, FLASHCARDS, POMODORO, STREAKS, QUOTES
// =====================

// ... keep all your routes as-is here, just ensure they all use `pool`
// No duplicate `pool` declarations anywhere

// =====================
// START SERVER
// =====================
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));



// Get settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) return res.json({}); // no settings yet
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  const {
    theme_mode,
    font_size,
    accent,
    notifications,
    pomodoro_time,
    break_time,
    auto_save_notes
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO user_settings
        (user_id, theme_mode, font_size, accent, notifications, pomodoro_time, break_time, auto_save_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        theme_mode = EXCLUDED.theme_mode,
        font_size = EXCLUDED.font_size,
        accent = EXCLUDED.accent,
        notifications = EXCLUDED.notifications,
        pomodoro_time = EXCLUDED.pomodoro_time,
        break_time = EXCLUDED.break_time,
        auto_save_notes = EXCLUDED.auto_save_notes,
        updated_at = NOW()
      RETURNING *;
    `,
      [
        req.userId,
        theme_mode,
        font_size,
        accent,
        JSON.stringify(notifications),
        pomodoro_time,
        break_time,
        auto_save_notes
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});


// -----------------------------
// Calendar / Notes / Streaks / Pomodoro API
// -----------------------------

// GET calendar tasks for logged-in user
app.get('/api/cal_tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, details, date, time, completed
       FROM cal_tasks
       WHERE user_id=$1
       ORDER BY date ASC, time ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch calendar tasks:', err);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
});

// Create calendar task
app.post('/api/cal_tasks', authenticateToken, async (req, res) => {
  const { title, details, date, time } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });

  try {
    const result = await pool.query(
      `INSERT INTO cal_tasks (user_id, title, details, date, time, completed)
       VALUES ($1,$2,$3,$4,$5,false)
       RETURNING id, title, details, date, time, completed`,
      [req.userId, title, details || null, date, time || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create calendar task:', err);
    res.status(500).json({ error: 'Failed to create calendar task' });
  }
});

// Update calendar task
app.put('/api/cal_tasks/:id', authenticateToken, async (req,res) => {
  const taskId = req.params.id;
  const { title, details, date, time, completed } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cal_tasks SET title=$1, details=$2, date=$3, time=$4, completed=$5, updated_at=NOW()
       WHERE id=$6 AND user_id=$7 RETURNING id, title, details, date, time, completed`,
      [title, details||null, date||null, time||null, !!completed, taskId, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update calendar task:', err);
    res.status(500).json({ error: 'Failed to update calendar task' });
  }
});

// Delete calendar task
app.delete('/api/cal_tasks/:id', authenticateToken, async (req,res) => {
  try {
    const result = await pool.query('DELETE FROM cal_tasks WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Failed to delete calendar task:', err);
    res.status(500).json({ error: 'Failed to delete calendar task' });
  }
});

// NOTES (if not already present) - get/create/delete are idempotent with your earlier code
app.get('/api/notes', authenticateToken, async (req,res)=>{
  try {
    const result = await pool.query('SELECT id, content, created_at, updated_at FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to fetch notes' }); }
});

app.post('/api/notes', authenticateToken, async (req,res)=>{
  const { content } = req.body;
  if(!content) return res.status(400).json({ error:'Content required' });
  try{
    const result = await pool.query('INSERT INTO notes (user_id, content) VALUES ($1,$2) RETURNING id, content, created_at', [req.userId, content]);
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to create note' }); }
});

app.delete('/api/notes/:id', authenticateToken, async (req,res)=>{
  try{
    const result = await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message:'Note deleted', id: result.rows[0].id });
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to delete note' }); }
});

// STREAKS (get / update) - uses user_streaks table
app.get('/api/streak', authenticateToken, async (req,res)=>{
  try{
    const result = await pool.query('SELECT current_streak, longest_streak, last_active FROM user_streaks WHERE user_id=$1', [req.userId]);
    if(result.rows.length===0) return res.json({ current_streak:0, longest_streak:0, last_active:null });
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to fetch streak' }); }
});

app.put('/api/streak', authenticateToken, async (req,res)=>{
  const { current_streak, longest_streak, last_active } = req.body;
  try{
    const result = await pool.query(`
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET current_streak=$2, longest_streak=$3, last_active=$4, updated_at=NOW()
      RETURNING *;
    `,[req.userId, current_streak||0, longest_streak||0, last_active||null]);
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to update streak' }); }
});

// POMODORO sessions (save completed session, list recent sessions)
app.post('/api/pomodoro/sessions', authenticateToken, async (req,res)=>{
  const { duration, session_type, started_at } = req.body;
  if (!duration) return res.status(400).json({ error: 'duration required (seconds)' });
  try {
    const result = await pool.query(
      `INSERT INTO pomodoro_sessions (user_id, duration, session_type, started_at)
       VALUES ($1,$2,$3,$4) RETURNING id, duration, session_type, started_at, created_at`,
      [req.userId, duration, session_type || 'work', started_at || new Date().toISOString()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to save pomodoro session:', err);
    res.status(500).json({ error: 'Failed to save pomodoro session' });
  }
});

app.get('/api/pomodoro/sessions', authenticateToken, async (req,res)=>{
  try {
    const result = await pool.query('SELECT id, duration, session_type, started_at, created_at FROM pomodoro_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch pomodoro sessions:', err);
    res.status(500).json({ error: 'Failed to fetch pomodoro sessions' });
  }
});


// ===================== FLASHCARD ROUTES =====================

// Get all decks for user
app.get('/api/decks', authenticateToken, async (req, res) => {
  try {
    const decksQuery = await pool.query(
      'SELECT * FROM decks WHERE user_id=$1 ORDER BY id ASC',
      [req.userId]
    );
    res.json(decksQuery.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// Create a new deck
app.post('/api/decks', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Deck name required' });

  try {
    const newDeck = await pool.query(
      'INSERT INTO decks (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    );
    res.json(newDeck.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Delete a deck
app.delete('/api/decks/:id', authenticateToken, async (req, res) => {
  const deckId = req.params.id;
  try {
    await pool.query('DELETE FROM cards WHERE deck_id=$1', [deckId]);
    await pool.query('DELETE FROM decks WHERE id=$1 AND user_id=$2', [deckId, req.userId]);
    res.json({ message: 'Deck deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Get all cards for a deck
app.get('/api/decks/:id/cards', authenticateToken, async (req, res) => {
  const deckId = req.params.id;
  try {
    const cardsQuery = await pool.query(
      'SELECT * FROM cards WHERE deck_id=$1 ORDER BY id ASC',
      [deckId]
    );
    res.json(cardsQuery.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Create a card
app.post('/api/decks/:id/cards', authenticateToken, async (req, res) => {
  const deckId = req.params.id;
  const { front, back } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'Card front/back required' });

  try {
    const newCard = await pool.query(
      'INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *',
      [deckId, front, back]
    );
    res.json(newCard.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update a card
app.put('/api/cards/:id', authenticateToken, async (req, res) => {
  const cardId = req.params.id;
  const { front, back, difficulty, due } = req.body;

  try {
    const updatedCard = await pool.query(
      'UPDATE cards SET front=$1, back=$2, difficulty=$3, due=$4 WHERE id=$5 RETURNING *',
      [front, back, difficulty, due, cardId]
    );
    res.json(updatedCard.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete a card
app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
  const cardId = req.params.id;
  try {
    await pool.query('DELETE FROM cards WHERE id=$1', [cardId]);
    res.json({ message: 'Card deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ===================== NOTES =====================
app.get('/api/notes', authenticateToken, async (req,res)=>{
  try {
    const result = await pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to fetch notes' }); }
});

app.post('/api/notes', authenticateToken, async (req,res)=>{
  const { content } = req.body;
  if(!content) return res.status(400).json({ error:'Content required' });
  try{
    const result = await pool.query('INSERT INTO notes (user_id, content) VALUES ($1,$2) RETURNING *', [req.userId, content]);
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to create note' }); }
});

app.put('/api/notes/:id', authenticateToken, async (req,res)=>{
  const noteId = req.params.id;
  const { content } = req.body;
  try{
    const result = await pool.query('UPDATE notes SET content=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *', [content, noteId, req.userId]);
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to update note' }); }
});

app.delete('/api/notes/:id', authenticateToken, async (req,res)=>{
  const noteId = req.params.id;
  try{
    await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2', [noteId, req.userId]);
    res.json({ message:'Note deleted' });
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to delete note' }); }
});

// ===================== CALENDAR TASKS =====================

// Get all calendar tasks for the logged-in user
app.get('/api/cal_tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, details, date, time, completed 
       FROM cal_tasks 
       WHERE user_id=$1 
       ORDER BY date ASC, time ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch calendar tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new calendar task
app.post('/api/cal_tasks', authenticateToken, async (req, res) => {
  const { title, details, date, time } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });

  try {
    const result = await pool.query(
      `INSERT INTO cal_tasks (user_id, title, details, date, time, completed) 
       VALUES ($1, $2, $3, $4, $5, false) 
       RETURNING id, title, details, date, time, completed`,
      [req.userId, title, details || null, date, time || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create calendar task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a calendar task
app.put('/api/cal_tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { title, details, date, time, completed } = req.body;

  try {
    const result = await pool.query(
      `UPDATE cal_tasks 
       SET title=$1, details=$2, date=$3, time=$4, completed=$5, updated_at=NOW() 
       WHERE id=$6 AND user_id=$7 
       RETURNING id, title, details, date, time, completed`,
      [title, details || null, date, time || null, !!completed, taskId, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update calendar task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a calendar task
app.delete('/api/cal_tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  try {
    const result = await pool.query(
      `DELETE FROM cal_tasks 
       WHERE id=$1 AND user_id=$2 
       RETURNING id`,
      [taskId, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted', id: taskId });
  } catch (err) {
    console.error('Failed to delete calendar task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


// ===================== USER STREAKS =====================
app.get('/api/streak', authenticateToken, async (req,res)=>{
  try{
    const result = await pool.query('SELECT * FROM user_streaks WHERE user_id=$1', [req.userId]);
    if(result.rows.length===0) return res.json({ current_streak:0, longest_streak:0, last_active:null });
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to fetch streak' }); }
});

app.put('/api/streak', authenticateToken, async (req,res)=>{
  const { current_streak, longest_streak, last_active } = req.body;
  try{
    const result = await pool.query(`
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id)
      DO UPDATE SET current_streak=$2, longest_streak=$3, last_active=$4
      RETURNING *;
    `,[req.userId, current_streak, longest_streak, last_active]);
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to update streak' }); }
});

// ===================== QUOTES =====================
app.get('/api/quotes', async (req,res)=>{
  try{
    const result = await pool.query('SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1');
    res.json(result.rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Failed to fetch quote' }); }
});

// ===================== LIBRARY ROUTES =====================
// (Already in your original server.js)

// ===================== PLANNER TASKS =====================

// Get all tasks for user
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id=$1 ORDER BY due_date ASC, id ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, due_date, priority, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required' });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, due_date, priority, category, completed)
       VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *`,
      [req.userId, title, description||null, due_date||null, priority||'medium', category||'General']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { title, description, due_date, priority, category, completed } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks 
       SET title=$1, description=$2, due_date=$3, priority=$4, category=$5, completed=$6, updated_at=NOW()
       WHERE id=$7 AND user_id=$8
       RETURNING *`,
      [title, description||null, due_date||null, priority||'medium', category||'General', !!completed, taskId, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [taskId, req.userId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ===================== START SERVER =====================
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
