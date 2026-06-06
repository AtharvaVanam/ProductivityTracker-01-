/**
 * FocusOS — 21-Day Challenge Tracker
 * script.js
 *
 * Pure JS · No dependencies · LocalStorage persistence
 * Sections:
 *   1. Constants & Config
 *   2. LocalStorage Helpers
 *   3. Date Utilities
 *   4. State Bootstrap
 *   5. Render Functions
 *   6. Task Interaction
 *   7. Journal Auto-save
 *   8. Dashboard Updates
 *   9. Streak Calculation
 *  10. Celebration Animation
 *  11. Reset Flow
 *  12. Motivational Quotes
 *  13. Init
 */

/* ── 1. Constants & Config ─────────────────────── */

const TASKS = [
  { id: 'gym',       name: 'Gym',                       emoji: '🏋️' },
  { id: 'startup',   name: 'Startup Plan (Journal)',     emoji: '📓' },
  { id: 'learning',  name: 'Learning (be10X Included)',  emoji: '📚' },
  { id: 'youtube',   name: 'YouTube Channel (Startup)',  emoji: '🎬' },
  { id: 'internship',name: 'Internship',                emoji: '💼' },
];

const TOTAL_DAYS = 21;
const QUOTES = [
  "The difference between who you are and who you want to be is what you do. Start now.",
  "Discipline is choosing between what you want now and what you want most.",
  "Build in silence. Let the results make the noise.",
  "Every expert was once a beginner. Every pro was once an amateur. Start.",
  "The best investment you can make is in yourself.",
  "Don't count the days. Make the days count.",
  "Small daily improvements over time lead to stunning results.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your habits will determine your future. Choose wisely today.",
  "One day or day one — you decide.",
  "Execution separates the dreamers from the builders.",
  "Focus on the process. The results will follow.",
  "The grind is real. So is the reward on the other side.",
  "Consistency beats intensity. Show up every single day.",
  "You don't need motivation. You need discipline.",
  "Startup life: build something, learn something, ship something. Every. Day.",
  "The founder who wins is not the smartest — it's the most consistent.",
  "Every task you check off is a vote for the person you're becoming.",
  "21 days to rewire. Choose to be different from who you were yesterday.",
  "Your future self is watching. Don't let them down.",
  "Urgency is not stress. It's clarity about what matters.",
];

/* ── 2. LocalStorage Helpers ───────────────────── */

const LS_KEYS = {
  START_DATE:  'focusos_start_date',
  TASK_DATA:   'focusos_task_data',   // { "YYYY-MM-DD": { gym: true, ... } }
  JOURNAL:     'focusos_journal',     // { "YYYY-MM-DD": "text..." }
  BEST_STREAK: 'focusos_best_streak',
};

function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ── 3. Date Utilities ─────────────────────────── */

/** Returns 'YYYY-MM-DD' for a Date object (local time). */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() { return toDateStr(new Date()); }

/** Number of calendar days from startDate to today (0-indexed). */
function daysSinceStart(startDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const now   = new Date(todayStr()   + 'T00:00:00');
  return Math.floor((now - start) / 86400000);
}

/** Format date for display: "Sat, Jun 7 2025" */
function formatDisplayDate(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

/* ── 4. State Bootstrap ────────────────────────── */

let state = {
  startDate:  null,   // 'YYYY-MM-DD'
  taskData:   {},     // { date: { taskId: bool } }
  journal:    {},     // { date: string }
  bestStreak: 0,
  today:      todayStr(),
};

function initState() {
  // Challenge start date
  let startDate = lsGet(LS_KEYS.START_DATE);
  if (!startDate) {
    startDate = todayStr();
    lsSet(LS_KEYS.START_DATE, startDate);
  }
  state.startDate  = startDate;
  state.taskData   = lsGet(LS_KEYS.TASK_DATA, {});
  state.journal    = lsGet(LS_KEYS.JOURNAL,   {});
  state.bestStreak = lsGet(LS_KEYS.BEST_STREAK, 0);

  // Ensure today's task map exists
  if (!state.taskData[state.today]) {
    state.taskData[state.today] = {};
    TASKS.forEach(t => { state.taskData[state.today][t.id] = false; });
    lsSet(LS_KEYS.TASK_DATA, state.taskData);
  }
}

/* ── 5. Render Functions ───────────────────────── */

/** Build the task list HTML */
function renderTaskList() {
  const container = document.getElementById('tasks-list');
  container.innerHTML = '';

  const todayTasks = state.taskData[state.today] || {};

  TASKS.forEach((task, idx) => {
    const done = !!todayTasks[task.id];

    const item = document.createElement('div');
    item.className = `task-item${done ? ' completed' : ''}`;
    item.dataset.taskId = task.id;
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', done ? 'true' : 'false');
    item.setAttribute('tabindex', '0');

    item.innerHTML = `
      <div class="task-checkbox" aria-hidden="true">
        <span class="check-icon">✓</span>
      </div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
      </div>
      <div class="task-emoji">${task.emoji}</div>
      <div class="task-status-tag">${done ? 'Done' : 'Pending'}</div>
    `;

    // Click or keyboard toggle
    item.addEventListener('click', () => toggleTask(task.id));
    item.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTask(task.id); }
    });

    container.appendChild(item);
  });
}

/** Refresh every dashboard metric */
function updateDashboard() {
  const today = state.today;
  const todayTasks = state.taskData[today] || {};
  const completedToday = TASKS.filter(t => todayTasks[t.id]).length;
  const totalTasks = TASKS.length;
  const todayPct = Math.round((completedToday / totalTasks) * 100);

  // ── Today's card ──────────
  document.getElementById('today-fraction').textContent = `${completedToday}/${totalTasks}`;
  document.getElementById('today-percent-label').textContent = `${todayPct}% Complete`;
  document.getElementById('today-progress-bar').style.width = `${todayPct}%`;

  // Mini task dots
  const miniPreview = document.getElementById('tasks-mini-preview');
  miniPreview.innerHTML = TASKS.map(t =>
    `<div class="task-dot${todayTasks[t.id] ? ' done' : ''}" title="${t.name}"></div>`
  ).join('');

  // ── 21-Day card ───────────
  const dayIndex   = Math.min(daysSinceStart(state.startDate), TOTAL_DAYS - 1);
  const currentDay = Math.min(dayIndex + 1, TOTAL_DAYS);
  const challengePct = Math.round((currentDay / TOTAL_DAYS) * 100);
  const daysLeft  = TOTAL_DAYS - currentDay;

  document.getElementById('current-day-num').textContent = currentDay;
  document.getElementById('challenge-percent-label').textContent = `${challengePct}% Complete`;
  document.getElementById('challenge-progress-bar').style.width = `${challengePct}%`;
  document.getElementById('days-remaining-label').textContent =
    daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : '🎉 Challenge Complete!';

  document.getElementById('checklist-day-badge').textContent = `Day ${currentDay}`;

  // ── Overall productivity ──
  const allDates = Object.keys(state.taskData);
  let totalCompleted = 0;
  let daysActive = 0;

  allDates.forEach(date => {
    const dayTasks = state.taskData[date];
    const dayDone  = TASKS.filter(t => dayTasks[t.id]).length;
    totalCompleted += dayDone;
    if (dayDone > 0) daysActive++;
  });

  const totalPossible = allDates.length * totalTasks;
  const prodScore = totalPossible > 0
    ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  document.getElementById('productivity-score').textContent = `${prodScore}%`;
  document.getElementById('productivity-fraction').textContent =
    `${totalCompleted} / ${totalPossible} tasks`;

  // Score ring (circumference of r=32 circle ≈ 201)
  const circumference = 201;
  const offset = circumference - (prodScore / 100) * circumference;
  document.getElementById('score-ring-fill').style.strokeDashoffset = offset;
  document.getElementById('score-ring-inner-text').textContent = `${prodScore}%`;

  // ── Streaks ───────────────
  const { current, best } = calculateStreaks();
  state.bestStreak = best;
  lsSet(LS_KEYS.BEST_STREAK, best);

  document.getElementById('current-streak-num').innerHTML = `${current} <span class="streak-fire">🔥</span>`;
  document.getElementById('best-streak-num').textContent = `${best} days`;

  // ── Stats row ─────────────
  document.getElementById('stat-completed').textContent = totalCompleted;
  document.getElementById('stat-possible').textContent  = totalPossible;
  document.getElementById('stat-score').textContent     = `${prodScore}%`;
  document.getElementById('stat-current-streak').textContent = current;
  document.getElementById('stat-best-streak').textContent    = best;
  document.getElementById('stat-days-done').textContent      = daysActive;
}

/* ── 6. Task Interaction ───────────────────────── */

function toggleTask(taskId) {
  const today = state.today;
  if (!state.taskData[today]) {
    state.taskData[today] = {};
    TASKS.forEach(t => { state.taskData[today][t.id] = false; });
  }

  // Flip
  state.taskData[today][taskId] = !state.taskData[today][taskId];
  lsSet(LS_KEYS.TASK_DATA, state.taskData);

  // Re-render task that was toggled (find DOM element)
  const item = document.querySelector(`[data-task-id="${taskId}"]`);
  if (item) {
    const done = state.taskData[today][taskId];
    item.classList.toggle('completed', done);
    item.setAttribute('aria-checked', done ? 'true' : 'false');
    item.querySelector('.task-status-tag').textContent = done ? 'Done' : 'Pending';
  }

  updateDashboard();

  // Check if all done → celebrate
  const allDone = TASKS.every(t => state.taskData[today][t.id]);
  if (allDone) triggerCelebration();
}

/* ── 7. Journal Auto-save ──────────────────────── */

let journalSaveTimer = null;

function initJournal() {
  const textarea = document.getElementById('journal-textarea');
  const indicator = document.getElementById('save-indicator');

  // Load today's note
  textarea.value = state.journal[state.today] || '';

  textarea.addEventListener('input', () => {
    // Clear any pending save
    clearTimeout(journalSaveTimer);
    indicator.classList.remove('visible');

    journalSaveTimer = setTimeout(() => {
      state.journal[state.today] = textarea.value;
      lsSet(LS_KEYS.JOURNAL, state.journal);
      indicator.classList.add('visible');
      // Fade out after 2s
      setTimeout(() => indicator.classList.remove('visible'), 2000);
    }, 800);
  });
}

/* ── 9. Streak Calculation ─────────────────────── */

function calculateStreaks() {
  // Build sorted list of all dates that have data
  const allDates = Object.keys(state.taskData).sort();
  if (!allDates.length) return { current: 0, best: state.bestStreak };

  // For each date, was at least 1 task done?
  const activeDates = new Set(
    allDates.filter(d => TASKS.some(t => state.taskData[d][t.id]))
  );

  // Build consecutive runs
  let currentStreak = 0;
  let bestStreak    = state.bestStreak;
  let tempStreak    = 0;

  // Walk day-by-day from start to today
  const start = new Date(state.startDate + 'T00:00:00');
  const today = new Date(state.today   + 'T00:00:00');

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d);
    if (activeDates.has(ds)) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  bestStreak   = Math.max(bestStreak, tempStreak);

  // Current streak: count backwards from today
  let temp = 0;
  for (let d = new Date(today); d >= start; d.setDate(d.getDate() - 1)) {
    if (activeDates.has(toDateStr(d))) { temp++; } else { break; }
  }
  currentStreak = temp;

  return { current: currentStreak, best: bestStreak };
}

/* ── 10. Celebration Animation ─────────────────── */

let celebrationTimeout = null;

function triggerCelebration() {
  const overlay  = document.getElementById('celebration-overlay');
  const sparks   = document.getElementById('sparks-container');

  overlay.classList.remove('hidden');
  sparks.innerHTML = '';

  const colors = ['#4ade80','#60a5fa','#fbbf24','#f97316','#f472b6','#a78bfa'];

  // Spawn 28 spark particles
  for (let i = 0; i < 28; i++) {
    const spark = document.createElement('div');
    spark.className = 'spark';

    const angle  = Math.random() * 360;
    const dist   = 60 + Math.random() * 160;
    const tx     = Math.cos(angle * Math.PI / 180) * dist;
    const ty     = Math.sin(angle * Math.PI / 180) * dist;
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const delay  = Math.random() * 0.3;
    const size   = 6 + Math.random() * 8;

    spark.style.cssText = `
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      top: 50%; left: 50%;
      --tx: ${tx}px;
      --ty: ${ty}px;
      animation-delay: ${delay}s;
      box-shadow: 0 0 6px ${color};
    `;
    sparks.appendChild(spark);
  }

  // Auto-dismiss after 3s
  clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => {
    overlay.classList.add('hidden');
  }, 3000);

  // Click to dismiss early
  overlay.onclick = () => overlay.classList.add('hidden');
}

/* ── 11. Reset Flow ────────────────────────────── */

function initResetFlow() {
  const resetBtn  = document.getElementById('reset-btn');
  const modal     = document.getElementById('reset-modal');
  const confirmBtn= document.getElementById('confirm-reset-btn');
  const cancelBtn = document.getElementById('cancel-reset-btn');

  resetBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  confirmBtn.addEventListener('click', () => {
    // Wipe all keys
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    modal.classList.add('hidden');
    // Reinit
    initState();
    renderTaskList();
    initJournal();
    updateDashboard();
    setDailyQuote();
  });
}

/* ── 12. Motivational Quotes ───────────────────── */

function setDailyQuote() {
  const today   = state.today;
  // Use date hash to pick consistent quote for the day
  const hash    = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const index   = hash % QUOTES.length;
  document.getElementById('motivational-quote').textContent = `"${QUOTES[index]}"`;
}

/* ── Header date ───────────────────────────────── */
function setHeaderDate() {
  document.getElementById('today-date-label').textContent =
    formatDisplayDate(new Date());
}

/* ── 13. Init ──────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initState();
  setHeaderDate();
  setDailyQuote();
  renderTaskList();
  initJournal();
  updateDashboard();
  initResetFlow();
});
