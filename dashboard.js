// ============================================================
// PERSONAL OS DASHBOARD - Full SPA Logic
// ============================================================

// --- Firebase Config (replace with yours when ready) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let auth;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
}

// ============================================================
// GLOBAL STATE (In-memory store)
// ============================================================
let state = {
    tasks: [
        { id: 1, text: "Review annual report", category: "Urgent", done: false },
        { id: 2, text: "Client follow-up email", category: "Work", done: false },
        { id: 3, text: "Design Sync preparation", category: "Work", done: false },
        { id: 4, text: "Buy groceries", category: "Personal", done: false },
    ],
    events: [
        { id: 1, title: "Design Sync", date: new Date().toISOString().split('T')[0], time: "10:00", location: "Google Meet" },
        { id: 2, title: "Lunch with Client", date: new Date().toISOString().split('T')[0], time: "13:00", location: "Central Cafe" },
        { id: 3, title: "Weekly Review", date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: "15:30", location: "Zoom" },
    ],
    notes: [
        { id: 1, title: "Marketing Strategy Sync", body: "We need to focus on the Q3 deliverables by next week. Also discussed the new campaign budget.", date: "Yesterday, 4:00 PM", type: "audio" },
        { id: 2, title: "Idea: Habit Tracker", body: "Add a habit tracking module into the Personal OS dashboard. Could include streak counters and daily goals.", date: "Oct 24, 9:15 AM", type: "note" },
    ],
    calCurrentDate: new Date(),
    nextId: 100,
};

// ============================================================
// ROUTER / NAVIGATION
// ============================================================
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    // Render page content on navigate
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'tasks': renderTasks(); break;
        case 'calendar': renderCalendar(); break;
        case 'notes': renderNotes(); break;
        case 'settings': renderSettings(); break;
    }
}

// ============================================================
// HELPERS
// ============================================================
function genId() { return ++state.nextId; }

function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hNum = parseInt(h);
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function greetingByTime() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function attachCheckboxBehavior(container, taskId, onChange) {
    const cb = container.querySelector('input[type="checkbox"]');
    if (!cb) return;
    cb.addEventListener('change', () => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) { task.done = cb.checked; }
        if (onChange) onChange();
    });
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
function renderDashboard() {
    const userName = document.getElementById('user-name')?.textContent || 'User';
    document.getElementById('ai-greeting').textContent =
        `${greetingByTime()}, ${userName}! Here is your overview for today.`;

    // Tasks summary (show first 3)
    const dashTaskList = document.getElementById('dash-task-list');
    const pending = state.tasks.filter(t => !t.done).slice(0, 3);
    dashTaskList.innerHTML = pending.map(t => `
        <label class="task-item">
            <input type="checkbox" ${t.done ? 'checked' : ''}>
            <span class="checkmark">${t.done ? '✓' : ''}</span>
            <span class="task-text">${t.text}</span>
            <span class="task-tag ${t.category}">${t.category}</span>
        </label>
    `).join('') || '<p style="color:var(--muted);padding:10px">All tasks completed! 🎉</p>';
    document.getElementById('dash-task-badge').textContent = state.tasks.filter(t => !t.done).length;

    // Attach checkbox listeners
    pending.forEach(t => {
        const labels = dashTaskList.querySelectorAll('.task-item');
        labels.forEach(label => {
            const cb = label.querySelector('input');
            cb.addEventListener('change', () => {
                const taskFound = state.tasks.find(t => t.text === label.querySelector('.task-text')?.textContent);
                if (taskFound) taskFound.done = cb.checked;
                renderDashboard();
            });
        });
    });

    // Events (today only)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = state.events.filter(e => e.date === todayStr);
    const dashEventList = document.getElementById('dash-event-list');
    dashEventList.innerHTML = todayEvents.map(e => `
        <div class="event-item">
            <div class="event-time">${formatTime(e.time)}</div>
            <div class="event-details">
                <div class="event-title">${e.title}</div>
                <div class="event-duration">${e.location}</div>
            </div>
        </div>
    `).join('') || '<p style="color:var(--muted);padding:10px">No events today.</p>';

    // Notes (show 2)
    const dashNotes = document.getElementById('dash-notes-list');
    const recentNotes = state.notes.slice(0, 2);
    dashNotes.innerHTML = recentNotes.map(n => `
        <div class="note-card">
            <div class="note-icon">${n.type === 'audio' ? '🎙️' : '📝'}</div>
            <div class="note-content">
                <h4>${n.title}</h4>
                <p class="note-preview">${n.body}</p>
                <span class="note-date">${n.date}</span>
            </div>
        </div>
    `).join('') || '<p style="color:var(--muted)">No notes yet.</p>';
}

// ============================================================
// RENDER: TASKS
// ============================================================
function renderTasks(filter = 'all') {
    const list = document.getElementById('full-task-list');
    let tasks = state.tasks;
    if (filter === 'pending') tasks = state.tasks.filter(t => !t.done);
    if (filter === 'done') tasks = state.tasks.filter(t => t.done);

    list.innerHTML = tasks.map(t => `
        <div class="task-row" data-id="${t.id}">
            <label style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer">
                <input type="checkbox" ${t.done ? 'checked' : ''} class="task-cb">
                <span class="checkmark">${t.done ? '✓' : ''}</span>
                <span class="task-text">${t.text}</span>
            </label>
            <span class="task-tag ${t.category}" style="font-size:0.78rem;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.08)">${t.category}</span>
            <button class="delete-btn" data-id="${t.id}" title="Delete task">🗑️</button>
        </div>
    `).join('') || '<p style="color:var(--muted);padding:20px">No tasks found.</p>';

    // Checkbox events
    list.querySelectorAll('.task-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            const row = cb.closest('.task-row');
            const id = parseInt(row.dataset.id);
            const task = state.tasks.find(t => t.id === id);
            if (task) task.done = cb.checked;
            const mark = cb.nextElementSibling;
            mark.textContent = cb.checked ? '✓' : '';
            mark.style.background = cb.checked ? 'var(--accent)' : '';
            mark.style.borderColor = cb.checked ? 'var(--accent)' : '';
            const textEl = cb.closest('label').querySelector('.task-text');
            textEl.style.textDecoration = cb.checked ? 'line-through' : '';
            textEl.style.color = cb.checked ? 'var(--muted)' : '';
            // Sync dashboard badge
            document.getElementById('dash-task-badge').textContent = state.tasks.filter(t => !t.done).length;
        });
    });

    // Delete events
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            state.tasks = state.tasks.filter(t => t.id !== id);
            renderTasks(filter);
        });
    });
}

// ============================================================
// RENDER: CALENDAR
// ============================================================
function renderCalendar() {
    const d = state.calCurrentDate;
    const year = d.getFullYear();
    const month = d.getMonth();

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById('cal-month-label').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let grid = '';
    // Prev month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        grid += `<div class="cal-day other-month"><div class="day-num">${prevDays - i}</div></div>`;
    }
    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;
        const dayEvents = state.events.filter(e => e.date === dateStr);
        const hasEvent = dayEvents.length > 0;
        grid += `
            <div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${dateStr}">
                <div class="day-num">${day}</div>
                ${dayEvents.slice(0,2).map(e => `<div class="day-event-dot">${e.title}</div>`).join('')}
            </div>
        `;
    }
    // Next month padding
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 1; i <= totalCells - firstDay - daysInMonth; i++) {
        grid += `<div class="cal-day other-month"><div class="day-num">${i}</div></div>`;
    }
    document.getElementById('cal-grid').innerHTML = grid;

    // Render event list
    const sorted = [...state.events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const container = document.getElementById('event-items-container');
    container.innerHTML = sorted.map(e => {
        const d = new Date(e.date + 'T00:00:00');
        return `
            <div class="event-item-full">
                <div class="event-date-badge">
                    <div class="day">${d.getDate()}</div>
                    <div class="month">${d.toLocaleDateString('en-US', {month:'short'})}</div>
                </div>
                <div class="event-details">
                    <div class="event-title">${e.title}</div>
                    <div class="event-duration">${formatTime(e.time)} • ${e.location}</div>
                </div>
                <button class="delete-btn" data-id="${e.id}" title="Delete event">🗑️</button>
            </div>
        `;
    }).join('') || '<p style="color:var(--muted)">No events scheduled.</p>';

    // Delete events
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            state.events = state.events.filter(e => e.id !== id);
            renderCalendar();
        });
    });
}

// ============================================================
// RENDER: NOTES
// ============================================================
function renderNotes() {
    const grid = document.getElementById('notes-full-grid');
    grid.innerHTML = state.notes.map(n => `
        <div class="note-full-card glass-panel" data-id="${n.id}">
            <div class="note-header">
                <h4>${n.type === 'audio' ? '🎙️ ' : '📝 '}${n.title}</h4>
                <button class="delete-note-btn" data-id="${n.id}" title="Delete note">🗑️</button>
            </div>
            <p class="note-body">${n.body}</p>
            <div class="note-footer">
                <span class="note-date">${n.date}</span>
                <span class="note-type-badge ${n.type}">${n.type === 'audio' ? '🎙 Audio' : '📝 Note'}</span>
            </div>
        </div>
    `).join('') || '<p style="color:var(--muted);padding:20px">No notes yet. Create one!</p>';

    grid.querySelectorAll('.delete-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            state.notes = state.notes.filter(n => n.id !== id);
            renderNotes();
        });
    });
}

// ============================================================
// RENDER: SETTINGS
// ============================================================
function renderSettings() {
    const nameEl = document.getElementById('settings-name');
    if (nameEl) {
        const currentName = document.getElementById('user-name')?.textContent || 'Demo User';
        nameEl.value = currentName;
    }
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Auth & User Info ---
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                userNameEl.textContent = user.displayName || 'User';
                if (user.photoURL) userAvatarEl.src = user.photoURL;
                else userAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=6366f1&color=fff`;
            } else {
                window.location.href = 'index.html';
            }
        });
    } else {
        // Mockup mode
        userNameEl.textContent = 'Demo User';
    }

    // --- Date Display ---
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- Sidebar Navigation ---
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navigate(item.dataset.page);
        });
    });

    // --- Logout ---
    function doLogout() {
        if (auth) auth.signOut().then(() => window.location.href = 'index.html');
        else window.location.href = 'index.html';
    }
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);

    // ========== DASHBOARD Buttons ==========
    document.getElementById('dash-new-task-btn')?.addEventListener('click', () => navigate('tasks'));
    document.getElementById('dash-record-btn')?.addEventListener('click', () => navigate('notes'));
    document.getElementById('dash-view-all-tasks')?.addEventListener('click', () => navigate('tasks'));
    document.getElementById('dash-view-calendar')?.addEventListener('click', () => navigate('calendar'));
    document.getElementById('dash-view-notes')?.addEventListener('click', () => navigate('notes'));

    // ========== TASKS Page ==========
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskForm = document.getElementById('add-task-form');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const taskFilter = document.getElementById('task-filter');

    addTaskBtn?.addEventListener('click', () => {
        addTaskForm.style.display = addTaskForm.style.display === 'none' ? 'block' : 'none';
        document.getElementById('task-input')?.focus();
    });

    saveTaskBtn?.addEventListener('click', () => {
        const text = document.getElementById('task-input').value.trim();
        const cat = document.getElementById('task-category').value;
        if (!text) return;
        state.tasks.push({ id: genId(), text, category: cat, done: false });
        document.getElementById('task-input').value = '';
        addTaskForm.style.display = 'none';
        renderTasks(taskFilter.value);
    });

    document.getElementById('task-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveTaskBtn?.click();
    });

    cancelTaskBtn?.addEventListener('click', () => {
        addTaskForm.style.display = 'none';
    });

    taskFilter?.addEventListener('change', () => renderTasks(taskFilter.value));

    // ========== CALENDAR Page ==========
    document.getElementById('cal-prev')?.addEventListener('click', () => {
        state.calCurrentDate = new Date(state.calCurrentDate.getFullYear(), state.calCurrentDate.getMonth() - 1, 1);
        renderCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
        state.calCurrentDate = new Date(state.calCurrentDate.getFullYear(), state.calCurrentDate.getMonth() + 1, 1);
        renderCalendar();
    });

    const addEventBtn = document.getElementById('add-event-btn');
    const addEventForm = document.getElementById('add-event-form');
    const saveEventBtn = document.getElementById('save-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event-btn');

    // Pre-fill today's date
    const todayStr = new Date().toISOString().split('T')[0];
    const eventDateInput = document.getElementById('event-date-input');
    if (eventDateInput) eventDateInput.value = todayStr;

    addEventBtn?.addEventListener('click', () => {
        addEventForm.style.display = addEventForm.style.display === 'none' ? 'block' : 'none';
        document.getElementById('event-title-input')?.focus();
    });

    saveEventBtn?.addEventListener('click', () => {
        const title = document.getElementById('event-title-input').value.trim();
        const date = document.getElementById('event-date-input').value;
        const time = document.getElementById('event-time-input').value;
        if (!title || !date) { alert('Please fill in at least a title and date.'); return; }
        state.events.push({ id: genId(), title, date, time: time || '09:00', location: 'Personal OS' });
        document.getElementById('event-title-input').value = '';
        document.getElementById('event-time-input').value = '';
        addEventForm.style.display = 'none';
        renderCalendar();
    });

    cancelEventBtn?.addEventListener('click', () => {
        addEventForm.style.display = 'none';
    });

    // ========== NOTES Page ==========
    const addNoteBtn = document.getElementById('add-note-btn');
    const addNoteForm = document.getElementById('add-note-form');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');

    addNoteBtn?.addEventListener('click', () => {
        addNoteForm.style.display = addNoteForm.style.display === 'none' ? 'block' : 'none';
        document.getElementById('note-title-input')?.focus();
    });

    saveNoteBtn?.addEventListener('click', () => {
        const title = document.getElementById('note-title-input').value.trim();
        const body = document.getElementById('note-body-input').value.trim();
        if (!title) { alert('Please enter a title.'); return; }
        const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        state.notes.unshift({ id: genId(), title, body: body || '(empty note)', date: now, type: 'note' });
        document.getElementById('note-title-input').value = '';
        document.getElementById('note-body-input').value = '';
        addNoteForm.style.display = 'none';
        renderNotes();
    });

    cancelNoteBtn?.addEventListener('click', () => {
        addNoteForm.style.display = 'none';
    });

    // Audio Record Button
    let isRecording = false;
    let recordInterval = null;
    const recordBtn = document.getElementById('record-btn');

    recordBtn?.addEventListener('click', () => {
        isRecording = !isRecording;
        if (isRecording) {
            recordBtn.innerHTML = `<span class="recording-indicator"><span class="rec-dot"></span> Recording... Click to Stop</span>`;
        } else {
            recordBtn.innerHTML = '🎙️ Record Audio';
            const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            state.notes.unshift({
                id: genId(),
                title: `Audio Note - ${now}`,
                body: 'AI is transcribing your audio... Action items will appear here once processing is complete.',
                date: now,
                type: 'audio'
            });
            renderNotes();
        }
    });

    // ========== SETTINGS Page ==========
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        const newName = document.getElementById('settings-name').value.trim();
        if (newName && userNameEl) {
            userNameEl.textContent = newName;
            alert(`Name updated to "${newName}" ✅`);
        }
    });

    document.getElementById('theme-select')?.addEventListener('change', (e) => {
        document.body.className = '';
        if (e.target.value !== 'dark') document.body.classList.add(`theme-${e.target.value}`);
    });

    document.getElementById('settings-logout-btn')?.addEventListener('click', doLogout);

    // ========== Initial Render ==========
    navigate('dashboard');
});
