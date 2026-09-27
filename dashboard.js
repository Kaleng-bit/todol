// ============================================================
// PERSONAL OS — macOS Clean Minimalist Dashboard Logic
// Powered by Google AI Studio (Gemini 2.0 API & Eraser AI Studio)
// ============================================================

// Firebase Configuration (Mockup fallback)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let app, auth;
try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
    }
} catch (e) {
    console.warn("Firebase not configured, running in local mockup mode.");
}

// ============================================================
// APPLICATION STATE (With Realtime LocalStorage Persistence)
// ============================================================
const initialTasks = [
    { id: 1, text: "Review Q3 Marketing Strategy deliverables", category: "Work", status: "in-progress", done: false },
    { id: 2, text: "Send follow-up email to client regarding contract", category: "Urgent", status: "pending", done: false },
    { id: 3, text: "Weekly team sprint planning & retro", category: "Work", status: "done", done: true },
    { id: 4, text: "Gym workout: 45 min cardio & core", category: "Personal", status: "pending", done: false },
    { id: 5, text: "Read 20 pages of 'Designing Data-Intensive Applications'", category: "Personal", status: "in-progress", done: false },
];

const initialEvents = [
    { id: 1, title: "Product Strategy Sync", date: new Date().toISOString().split('T')[0], time: "10:00", location: "Google Meet", done: false },
    { id: 2, title: "Design Review: Personal OS", date: new Date().toISOString().split('T')[0], time: "14:30", location: "Room A2", done: true },
    { id: 3, title: "Coffee chat with Alex", date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: "16:00", location: "Starbucks", done: false },
];

const initialNotes = [
    { id: 1, title: "Marketing Strategy Sync", body: "Focus on Q3 deliverables by next week. Allocate budget to search campaigns and developer outreach.", date: "Hari ini, 10:45", type: "audio" },
    { id: 2, title: "Idea: Habit Tracker Module", body: "Integrate a habit tracking streak counter into Personal OS dashboard with daily check-ins.", date: "Kemarin, 15:15", type: "note" },
    { id: 3, title: "Books to Read", body: "1. Staff Engineer\n2. Fundamentals of Software Architecture\n3. The Psychology of Money", date: "25 Sep, 14:00", type: "note" }
];

const defaultEraserContent = `# 🚀 Personal OS Architecture & Visual Notes

Dokumentasi visual & catatan cerdas tersimpan secara realtime di web browser Anda.

## Alur Integrasi Sistem
\`\`\`mermaid
graph TD
    A[Pengguna] -->|Input Tasks & Agenda| B(Personal OS Dashboard)
    B -->|Konteks Harian| C[Google Gemini 2.0 Flash]
    C -->|AI Briefing & Chat| B
    B -->|Realtime Auto-Save| D[(Local Storage)]
    B -->|Audio Recording| E[AI Transcription]
    E -->|Action Items| B
\`\`\`

## Status Proyek Personal OS
- [x] Tema Clean Minimalis macOS
- [x] Pilihan status Task (Belum Berjalan, Sedang Berjalan, Selesai)
- [x] Ceklis agenda event selesai
- [x] Google Gemini 2.0 Flash integration
- [x] Edit catatan kembali (Notes)
- [x] Eraser AI Canvas dengan auto-save realtime
`;

// Load persisted state or fallback
const state = {
    tasks: JSON.parse(localStorage.getItem('pos_tasks') || 'null') || initialTasks,
    events: JSON.parse(localStorage.getItem('pos_events') || 'null') || initialEvents,
    notes: JSON.parse(localStorage.getItem('pos_notes') || 'null') || initialNotes,
    eraserContent: localStorage.getItem('pos_eraser_content') || defaultEraserContent,
    calCurrentDate: new Date(),
    nextId: 1000,
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    geminiModel: localStorage.getItem('gemini_model') || 'gemini-3.8-flash',
    theme: localStorage.getItem('pos_theme') || 'theme-mac-light'
};

// Ensure all tasks have valid status property
state.tasks.forEach(t => {
    if (!t.status) {
        t.status = t.done ? 'done' : 'pending';
    }
});

// Save state helpers
function saveTasks() {
    localStorage.setItem('pos_tasks', JSON.stringify(state.tasks));
}

function saveEvents() {
    localStorage.setItem('pos_events', JSON.stringify(state.events));
}

function saveNotes() {
    localStorage.setItem('pos_notes', JSON.stringify(state.notes));
}

// ============================================================
// GEMINI 2.0 API INTEGRATION (Google AI Studio)
// ============================================================
function getGeminiEndpoint() {
    const model = state.geminiModel || 'gemini-3.8-flash';
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/**
 * Call Google Generative Language API using Gemini 2.0 or selected model
 */
async function callGemini(prompt) {
    const key = (localStorage.getItem('gemini_api_key') || state.geminiApiKey || '').trim();
    if (!key) {
        throw new Error('NO_KEY');
    }

    const endpoint = `${getGeminiEndpoint()}?key=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800
            }
        })
    });

    if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            if (errData.error?.message) {
                errMessage = errData.error.message;
            }
        } catch (_) {}
        throw new Error(errMessage);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(Tidak ada respon dari Gemini)';
}

/**
 * Build rich context string from user's current tasks, events, and notes
 */
function buildContextSummary() {
    const inProgressTasks = state.tasks.filter(t => t.status === 'in-progress');
    const pendingTasks = state.tasks.filter(t => t.status === 'pending');
    const urgentTasks = state.tasks.filter(t => t.category === 'Urgent' && t.status !== 'done');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = state.events.filter(e => e.date === todayStr);
    const recentNotes = state.notes.slice(0, 3);

    return `
Context Pengguna di Personal OS:
- Tugas SEDANG BERJALAN (${inProgressTasks.length}): ${inProgressTasks.map(t => `"${t.text}"`).join(', ') || 'Belum ada task yang dimulai'}
- Tugas BELUM BERJALAN (${pendingTasks.length}): ${pendingTasks.map(t => `"${t.text}" [${t.category}]`).join(', ') || 'Semua sudah berjalan/selesai'}
- Tugas URGENT: ${urgentTasks.map(t => `"${t.text}"`).join(', ') || 'Tidak ada'}
- Jadwal Event Hari Ini (${todayEvents.length}): ${todayEvents.map(e => `${e.title} pukul ${formatTime(e.time)} (${e.done ? 'SUDAH SELESAI' : 'BELUM SELESAI'})`).join(', ') || 'Tidak ada acara'}
- Catatan Terbaru: ${recentNotes.map(n => `"${n.title}"`).join(', ')}
- Waktu Lokal: ${new Date().toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
`.trim();
}

/**
 * Generate AI Daily Briefing with guaranteed visual refresh
 */
async function generateAIBrief() {
    const badge = document.getElementById('ai-status-badge');
    const loading = document.getElementById('ai-loading');
    const briefText = document.getElementById('ai-brief-text');
    const refreshBtn = document.getElementById('refresh-brief-btn');

    if (!badge || !loading || !briefText) return;

    // Refresh state key
    state.geminiApiKey = localStorage.getItem('gemini_api_key') || state.geminiApiKey || '';
    state.geminiModel = localStorage.getItem('gemini_model') || state.geminiModel || 'gemini-3.8-flash';

    // Update Model label in UI
    const modelLabel = document.getElementById('ai-model-label');
    if (modelLabel) {
        modelLabel.textContent = `${state.geminiModel.replace('gemini-', 'Gemini ')} Assistant`;
    }

    // Visual button & loading state
    if (refreshBtn) {
        refreshBtn.innerHTML = '🔄 Memperbarui…';
        refreshBtn.disabled = true;
    }
    badge.className = 'ai-status-loading';
    badge.textContent = 'Generating…';
    loading.style.display = 'flex';
    briefText.style.display = 'none';

    // Micro-delay so user sees the refresh action clearly
    await new Promise(r => setTimeout(r, 350));

    try {
        if (!state.geminiApiKey) {
            throw new Error('NO_KEY');
        }

        const prompt = `${buildContextSummary()}

Anda adalah asisten produktivitas AI cerdas untuk Personal OS (Menggunakan ${state.geminiModel}).
Berdasarkan data konteks di atas, buatkan briefing harian yang ramah, ringkas, dan actionable dalam Bahasa Indonesia.
Poin-poin yang perlu dimasukkan:
1. Sapaan singkat sesuai waktu saat ini.
2. Tugas yang sedang berjalan (On Progress) & prioritas berikutnya yang harus diselesaikan.
3. Agenda/event penting yang belum selesai hari ini.
4. Satu tips atau saran produktivitas praktis.

Gunakan nada profesional, bersih, seperti asisten MacBook pribadi. Maksimal 140 kata.`;

        const text = await callGemini(prompt);
        briefText.innerHTML = formatMarkdownText(text);
        badge.className = 'ai-status-ok';
        badge.textContent = `✓ ${state.geminiModel.replace('gemini-', 'Gemini ')} Active`;
    } catch (e) {
        if (e.message === 'NO_KEY') {
            briefText.innerHTML = generateFallbackBrief();
            badge.className = 'ai-status-idle';
            badge.textContent = 'Offline Summary';
        } else {
            briefText.innerHTML = `
                <div style="background:var(--danger-light);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,59,48,0.2)">
                    <p style="color:var(--danger);font-weight:600;margin-bottom:4px">⚠️ Gagal memanggil ${escapeHtml(state.geminiModel)}</p>
                    <p style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(e.message)}</p>
                    <button class="btn-link" onclick="navigate('settings')" style="margin-top:6px;font-weight:600">Periksa API Key di Settings →</button>
                </div>
            `;
            badge.className = 'ai-status-error';
            badge.textContent = 'API Error';
        }
    } finally {
        loading.style.display = 'none';
        briefText.style.display = 'block';
        if (refreshBtn) {
            refreshBtn.innerHTML = '🔄 Refresh Brief';
            refreshBtn.disabled = false;
        }
    }
}

/**
 * Dynamic fallback when no API key is provided yet
 */
function generateFallbackBrief() {
    const inProgress = state.tasks.filter(t => t.status === 'in-progress');
    const pending = state.tasks.filter(t => t.status === 'pending');
    const urgent = state.tasks.filter(t => t.category === 'Urgent' && t.status !== 'done');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = state.events.filter(e => e.date === todayStr);
    const pendingEvents = todayEvents.filter(e => !e.done);
    const greeting = greetingByTime();
    const userName = document.getElementById('user-name')?.textContent || 'Pengguna';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const tips = [
        "Fokus selesaikan 1 task sedang berjalan sebelum beralih ke task lain.",
        "Gunakan teknik Pomodoro 25 menit fokus untuk meningkatkan konsentrasi.",
        "Catat hal baru langsung di Eraser AI Studio agar ide tidak hilang.",
        "Ceklis agenda yang sudah Anda selesaikan untuk memantau progres harian."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    let lines = [`<strong>${greeting}, ${userName}!</strong> (Diperbarui pukul ${nowTime})`];
    
    if (inProgress.length) {
        lines.push(`⚡ <strong>Sedang Berjalan (${inProgress.length}):</strong> ${inProgress.map(t => `"${escapeHtml(t.text)}"`).join(', ')}.`);
    }
    if (urgent.length) {
        lines.push(`🔴 <strong>Tugas Mendesak (${urgent.length}):</strong> ${urgent.map(t => `"${escapeHtml(t.text)}"`).join(', ')}.`);
    }
    lines.push(`⏳ <strong>Belum Berjalan:</strong> ${pending.length} tugas menanti untuk dimulai.`);
    if (pendingEvents.length) {
        lines.push(`📅 <strong>Agenda Hari Ini (${pendingEvents.length} belum selesai):</strong> ${pendingEvents.map(e => `${escapeHtml(e.title)} (${formatTime(e.time)})`).join(', ')}.`);
    } else {
        lines.push(`✅ Semua agenda acara hari ini sudah Anda ceklis selesai! 🎉`);
    }
    lines.push(`💡 <em>Tips Hari Ini:</em> ${randomTip}`);
    lines.push(`
        <div class="mac-callout-info" style="margin-top:10px;margin-bottom:0">
            🤖 <strong>Ingin analisis AI nyata?</strong> Masukkan <strong>Gemini 2.0 API Key</strong> gratis di <a href="#" onclick="navigate('settings');return false;" style="color:var(--accent);font-weight:600">Settings ⚙️</a> untuk briefing real-time dari Google Gemini.
        </div>
    `);

    return `<ul class="brief-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
}

/**
 * Ask AI Assistant interactive chat
 */
async function askAI(question) {
    const chatLog = document.getElementById('ai-chat-log');
    if (!chatLog) return;

    // Append User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = question;
    chatLog.appendChild(userBubble);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Append Typing Indicator Bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai ai-typing';
    typingBubble.innerHTML = `
        <span style="font-size:0.82rem">Gemini 2.0 is thinking</span>
        <div class="typing-dots">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    chatLog.appendChild(typingBubble);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Check if API key is present
    state.geminiApiKey = localStorage.getItem('gemini_api_key') || state.geminiApiKey;
    if (!state.geminiApiKey) {
        setTimeout(() => {
            typingBubble.className = 'chat-bubble ai';
            typingBubble.innerHTML = `
                <div style="line-height:1.5">
                    Halo! Untuk mendapatkan jawaban langsung dari AI, silakan tambahkan <strong>Google AI Studio API Key</strong> gratis di halaman 
                    <a href="#" onclick="navigate('settings');return false;" style="color:var(--accent);font-weight:600">Settings ⚙️</a>.
                    <br><br>
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-weight:600">
                        🔗 Dapatkan API Key gratis di Google AI Studio →
                    </a>
                </div>
            `;
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 400);
        return;
    }

    try {
        const prompt = `${buildContextSummary()}

Pertanyaan pengguna: "${question}"

Anda adalah asisten pribadi MacBook yang ramah, efisien, dan cerdas di Personal OS (Gemini 2.0).
Jawab pertanyaan pengguna secara langsung, praktis, dan kontekstual menggunakan data tugas, jadwal, atau catatan pengguna di atas jika relevan.
Gunakan Bahasa Indonesia yang alami, ringkas (2-4 kalimat atau poin-poin sederhana).`;

        const answer = await callGemini(prompt);
        typingBubble.className = 'chat-bubble ai';
        typingBubble.innerHTML = formatMarkdownText(answer);
    } catch (e) {
        typingBubble.className = 'chat-bubble ai';
        typingBubble.innerHTML = `
            <span style="color:var(--danger)">⚠️ Gagal memuat respon AI: ${escapeHtml(e.message)}. Pastikan API key Anda valid di menu Settings.</span>
        `;
    }
    chatLog.scrollTop = chatLog.scrollHeight;
}

// ============================================================
// ROUTING & NAVIGATION
// ============================================================
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'tasks': renderTasks(); break;
        case 'calendar': renderCalendar(); break;
        case 'notes': renderNotes(); break;
        case 'eraser': renderEraser(); break;
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
    const hNum = parseInt(h, 10);
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function greetingByTime() {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMarkdownText(text) {
    if (!text) return '';
    let formatted = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\s*-\s+(.*)/g, '<li style="margin-left:14px">$1</li>')
        .replace(/\n/g, '<br>');
    return formatted;
}

function updateTaskBadges() {
    const inProgressCount = state.tasks.filter(t => t.status === 'in-progress').length;
    const pendingCount = state.tasks.filter(t => t.status === 'pending').length;
    const doneCount = state.tasks.filter(t => t.status === 'done').length;

    const dashBadge = document.getElementById('dash-task-badge');
    const sideBadge = document.getElementById('sidebar-task-count');
    const statusCounters = document.getElementById('dash-task-status-counters');

    const totalActive = inProgressCount + pendingCount;
    if (dashBadge) dashBadge.textContent = totalActive;
    if (sideBadge) sideBadge.textContent = totalActive;

    if (statusCounters) {
        statusCounters.innerHTML = `
            <span style="color:var(--accent);font-weight:600">⚡ ${inProgressCount} Berjalan</span> • 
            <span style="color:var(--text-secondary)">⏳ ${pendingCount} Belum</span> • 
            <span style="color:var(--success)">✅ ${doneCount} Selesai</span>
        `;
    }
}

// ============================================================
// THEME MANAGEMENT (macOS Light & Dark)
// ============================================================
function applyTheme(themeName) {
    state.theme = themeName;
    localStorage.setItem('pos_theme', themeName);
    document.body.className = themeName;

    const lightBtn = document.getElementById('btn-theme-light');
    const darkBtn = document.getElementById('btn-theme-dark');
    if (lightBtn && darkBtn) {
        if (themeName === 'theme-mac-dark') {
            lightBtn.classList.remove('active');
            darkBtn.classList.add('active');
        } else {
            darkBtn.classList.remove('active');
            lightBtn.classList.add('active');
        }
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = themeName === 'theme-mac-dark' ? 'mac-dark' : 'mac-light';
    }
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
function renderDashboard() {
    generateAIBrief();
    updateTaskBadges();

    // 1. Dashboard Tasks List (Prioritize In-Progress, then Pending)
    const dashTaskList = document.getElementById('dash-task-list');
    const sortedTasks = [...state.tasks].sort((a, b) => {
        const order = { 'in-progress': 1, 'pending': 2, 'done': 3 };
        return (order[a.status] || 2) - (order[b.status] || 2);
    }).slice(0, 4);

    if (dashTaskList) {
        dashTaskList.innerHTML = sortedTasks.map(t => `
            <label class="task-item">
                <input type="checkbox" data-id="${t.id}" ${t.status === 'done' ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="task-text">${escapeHtml(t.text)}</span>
                <span class="status-pill ${t.status}">${t.status === 'in-progress' ? '⚡ Berjalan' : (t.status === 'done' ? '✅ Selesai' : '⏳ Belum')}</span>
                <span class="task-tag ${t.category}">${t.category}</span>
            </label>
        `).join('') || '<p style="color:var(--text-secondary);font-size:0.85rem;padding:8px">Belum ada tugas. Buat task baru!</p>';

        dashTaskList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = parseInt(cb.dataset.id, 10);
                const task = state.tasks.find(t => t.id === id);
                if (task) {
                    task.status = cb.checked ? 'done' : 'in-progress';
                    task.done = cb.checked;
                    saveTasks();
                    renderDashboard();
                }
            });
        });
    }

    // 2. Dashboard Upcoming Events & Agenda Checklist
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = state.events.filter(e => e.date === todayStr);
    const dashEventList = document.getElementById('dash-event-list');
    const dashEventBadge = document.getElementById('dash-event-badge');

    if (dashEventBadge) {
        const pendingEventsCount = todayEvents.filter(e => !e.done).length;
        dashEventBadge.textContent = pendingEventsCount;
    }

    if (dashEventList) {
        dashEventList.innerHTML = todayEvents.map(e => `
            <label class="event-item" title="Klik untuk menandai agenda selesai">
                <input type="checkbox" class="event-cb" data-id="${e.id}" ${e.done ? 'checked' : ''}>
                <span class="checkmark"></span>
                <div class="event-time">${formatTime(e.time)}</div>
                <div class="event-info-wrap" style="flex:1">
                    <div class="event-title" style="${e.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${escapeHtml(e.title)}</div>
                    <div class="event-duration">${escapeHtml(e.location)} ${e.done ? '• <span style="color:var(--success)">Selesai</span>' : ''}</div>
                </div>
            </label>
        `).join('') || '<p style="color:var(--text-secondary);font-size:0.85rem;padding:8px">Tidak ada acara terjadwal hari ini.</p>';

        dashEventList.querySelectorAll('.event-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = parseInt(cb.dataset.id, 10);
                const ev = state.events.find(e => e.id === id);
                if (ev) {
                    ev.done = cb.checked;
                    saveEvents();
                    renderDashboard();
                }
            });
        });
    }

    // 3. Dashboard Notes List
    const dashNotes = document.getElementById('dash-notes-list');
    const recentNotes = state.notes.slice(0, 2);

    if (dashNotes) {
        dashNotes.innerHTML = recentNotes.map(n => `
            <div class="note-card" onclick="navigate('notes')">
                <div class="note-icon">${n.type === 'audio' ? '🎙️' : '📝'}</div>
                <div class="note-content" style="flex:1">
                    <h4>${escapeHtml(n.title)}</h4>
                    <p class="note-preview">${escapeHtml(n.body)}</p>
                    <span class="note-date">${n.date}</span>
                </div>
            </div>
        `).join('') || '<p style="color:var(--text-secondary);font-size:0.85rem">Belum ada catatan.</p>';
    }
}

// ============================================================
// RENDER: TASKS (3-Column Kanban Board UI)
// ============================================================
function renderTasks() {
    updateTaskBadges();

    const pendingTasks = state.tasks.filter(t => t.status === 'pending');
    const inProgressTasks = state.tasks.filter(t => t.status === 'in-progress');
    const doneTasks = state.tasks.filter(t => t.status === 'done');

    // Update column count badges
    const countPendingEl = document.getElementById('count-pending');
    const countInProgressEl = document.getElementById('count-in-progress');
    if (countPendingEl) countPendingEl.textContent = pendingTasks.length;
    if (countInProgressEl) countInProgressEl.textContent = inProgressTasks.length;

    // Update bank data count badges
    const bankDataCountEl = document.getElementById('bank-data-count');
    const dashBankCountEl = document.getElementById('dash-bank-count');
    if (bankDataCountEl) bankDataCountEl.textContent = doneTasks.length;
    if (dashBankCountEl) dashBankCountEl.textContent = doneTasks.length;

    // Helper to generate active task kanban card (pending & in-progress only)
    function renderCard(t) {
        return `
            <div class="kanban-card card-${t.status}" data-id="${t.id}">
                <div class="kanban-card-top">
                    <span class="kanban-card-text">${escapeHtml(t.text)}</span>
                    <button class="delete-btn" data-id="${t.id}" title="Hapus task">🗑️</button>
                </div>
                <div class="kanban-card-meta">
                    <span class="task-tag ${t.category}">${t.category}</span>
                    <div class="kanban-actions">
                        ${t.status === 'pending' ? `
                            <button class="action-btn-pill primary" data-id="${t.id}" data-action="start">▶️ Mulai</button>
                            <button class="action-btn-pill success" data-id="${t.id}" data-action="complete">✅ Selesai</button>
                        ` : ''}
                        ${t.status === 'in-progress' ? `
                            <button class="action-btn-pill" data-id="${t.id}" data-action="pause">⏸️ Tunda</button>
                            <button class="action-btn-pill success" data-id="${t.id}" data-action="complete">✅ Selesai</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Render active lists — ONLY pending & in-progress. Done tasks go to Bank Data Vault.
    const listPending = document.getElementById('list-pending');
    const listInProgress = document.getElementById('list-in-progress');
    if (listPending) {
        listPending.innerHTML = pendingTasks.map(renderCard).join('') ||
            '<p style="color:var(--text-tertiary);font-size:0.8rem;text-align:center;padding:20px 0">Tidak ada task pending — buat task baru ↑</p>';
    }
    if (listInProgress) {
        listInProgress.innerHTML = inProgressTasks.map(renderCard).join('') ||
            '<p style="color:var(--text-tertiary);font-size:0.8rem;text-align:center;padding:20px 0">Tidak ada task sedang berjalan — klik ▶️ Mulai</p>';
    }

    // Refresh bank data list if vault is currently open
    const vault = document.getElementById('bank-data-vault');
    if (vault && vault.style.display !== 'none') {
        renderBankData(document.getElementById('bank-data-search')?.value || '');
    }

    // Attach Action Listeners on active kanban cards
    document.querySelectorAll('.kanban-actions .action-btn-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            const action = btn.dataset.action;
            const task = state.tasks.find(t => t.id === id);
            if (!task) return;

            if (action === 'start') {
                task.status = 'in-progress';
                task.done = false;
                delete task.completedAt;
            } else if (action === 'pause') {
                task.status = 'pending';
                task.done = false;
                delete task.completedAt;
            } else if (action === 'complete') {
                task.status = 'done';
                task.done = true;
                task.completedAt = new Date().toISOString();
                showToast(`✅ "${task.text.slice(0, 32)}${task.text.length > 32 ? '…' : ''}" diarsipkan ke Bank Data`);
            }

            saveTasks();
            renderTasks();
        });
    });

    // Attach Delete Listeners on active cards
    document.querySelectorAll('.kanban-card .delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        });
    });
}

// ============================================================
// RENDER: BANK DATA VAULT — Completed Tasks Archive
// ============================================================
function renderBankData(searchQuery = '') {
    const list = document.getElementById('bank-data-list');
    if (!list) return;

    let doneTasks = state.tasks.filter(t => t.status === 'done');

    // Update count badges
    const bankDataCountEl = document.getElementById('bank-data-count');
    const dashBankCountEl = document.getElementById('dash-bank-count');
    if (bankDataCountEl) bankDataCountEl.textContent = doneTasks.length;
    if (dashBankCountEl) dashBankCountEl.textContent = doneTasks.length;

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        doneTasks = doneTasks.filter(t =>
            t.text.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q)
        );
    }

    // Sort: most recently completed first
    doneTasks = [...doneTasks].sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
    });

    if (doneTasks.length === 0) {
        list.innerHTML = `<p style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:28px 0">
            ${searchQuery ? '🔍 Tidak ada task yang cocok dengan pencarian.' : '📭 Belum ada task yang diselesaikan. Task yang ditandai ✅ Selesai akan otomatis muncul di sini.'}
        </p>`;
        return;
    }

    list.innerHTML = doneTasks.map(t => {
        const completedDate = t.completedAt
            ? new Date(t.completedAt).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })
            : 'Tidak diketahui';
        return `
            <div class="bank-data-row" data-id="${t.id}">
                <div class="bank-data-info">
                    <span style="color:var(--success);font-size:1.1rem;flex-shrink:0">✅</span>
                    <div style="flex:1;min-width:0">
                        <div class="bank-data-text">${escapeHtml(t.text)}</div>
                        <div style="display:flex;gap:6px;margin-top:4px;align-items:center;flex-wrap:wrap">
                            <span class="task-tag ${t.category}">${t.category}</span>
                            <span class="bank-data-timestamp">📅 Selesai: ${completedDate}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0;align-items:center">
                    <button class="action-btn-pill restore-btn" data-id="${t.id}" title="Pulihkan task ke daftar aktif" style="color:var(--accent);border-color:var(--accent)">↺ Pulihkan</button>
                    <button class="delete-btn permanent-delete-btn" data-id="${t.id}" title="Hapus permanen">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Restore task → move back to pending
    list.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.status = 'pending';
                task.done = false;
                delete task.completedAt;
                saveTasks();
                renderTasks();
                updateTaskBadges();
                showToast(`↺ "${task.text.slice(0, 32)}${task.text.length > 32 ? '…' : ''}" dipulihkan ke Pending`);
                const vault = document.getElementById('bank-data-vault');
                if (vault) vault.style.display = 'none';
            }
        });
    });

    // Permanent delete from bank data
    list.querySelectorAll('.permanent-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            const task = state.tasks.find(t => t.id === id);
            if (confirm(`Hapus "${task?.text?.slice(0, 40) || 'task'}" secara permanen?\n\nTindakan ini tidak bisa dibatalkan.`)) {
                state.tasks = state.tasks.filter(t => t.id !== id);
                saveTasks();
                renderBankData(document.getElementById('bank-data-search')?.value || '');
            }
        });
    });
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, duration = 3200) {
    let toast = document.getElementById('pos-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pos-toast';
        toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--bg-window);border:1px solid var(--border-card);box-shadow:0 8px 24px rgba(0,0,0,0.15);border-radius:12px;padding:10px 22px;font-size:0.88rem;font-weight:500;color:var(--text-primary);z-index:9999;opacity:0;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);pointer-events:none;white-space:nowrap';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, duration);
}

// ============================================================
// RENDER: CALENDAR & AGENDA
// ============================================================
function renderCalendar() {
    const year = state.calCurrentDate.getFullYear();
    const month = state.calCurrentDate.getMonth();
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const monthLabel = document.getElementById('cal-month-label');
    if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let grid = '';
    for (let i = 0; i < firstDay; i++) {
        grid += `<div class="cal-day other-month"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;
        const dayEvents = state.events.filter(e => e.date === dateStr);
        const hasEvent = dayEvents.length > 0;

        grid += `
            <div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${dateStr}">
                <div class="day-num">${day}</div>
                ${dayEvents.slice(0, 2).map(e => `
                    <div class="day-event-dot" style="${e.done ? 'opacity:0.5;text-decoration:line-through' : ''}">
                        ${e.done ? '✓ ' : ''}${escapeHtml(e.title)}
                    </div>
                `).join('')}
            </div>
        `;
    }
    const calGrid = document.getElementById('cal-grid');
    if (calGrid) calGrid.innerHTML = grid;

    // Render Event Items with Checkbox
    const container = document.getElementById('event-items-container');
    if (container) {
        const sorted = [...state.events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
        container.innerHTML = sorted.map(e => {
            const d = new Date(e.date + 'T00:00:00');
            return `
                <div class="event-item-full">
                    <label>
                        <input type="checkbox" class="agenda-cb" data-id="${e.id}" ${e.done ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <div class="event-date-badge">
                        <div class="day">${d.getDate()}</div>
                        <div class="month">${d.toLocaleDateString('id-ID', { month: 'short' })}</div>
                    </div>
                    <div style="flex:1">
                        <div style="font-weight:600;font-size:0.92rem;${e.done ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">
                            ${escapeHtml(e.title)}
                        </div>
                        <div class="event-duration">${formatTime(e.time)} • ${escapeHtml(e.location)} ${e.done ? '• <span style="color:var(--success);font-weight:600">Selesai</span>' : ''}</div>
                    </div>
                    <button class="delete-btn" data-id="${e.id}" title="Hapus acara">🗑️</button>
                </div>
            `;
        }).join('') || '<p style="color:var(--text-secondary);font-size:0.88rem">Belum ada acara yang dijadwalkan.</p>';

        // Event Checkboxes
        container.querySelectorAll('.agenda-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = parseInt(cb.dataset.id, 10);
                const ev = state.events.find(e => e.id === id);
                if (ev) {
                    ev.done = cb.checked;
                    saveEvents();
                    renderCalendar();
                }
            });
        });

        // Delete Event
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id, 10);
                state.events = state.events.filter(e => e.id !== id);
                saveEvents();
                renderCalendar();
            });
        });
    }
}

// ============================================================
// RENDER: NOTES & AUDIO (With Edit Modal)
// ============================================================
function renderNotes() {
    const grid = document.getElementById('notes-full-grid');
    if (!grid) return;

    grid.innerHTML = state.notes.map(n => `
        <div class="note-full-card" data-id="${n.id}">
            <div class="note-header">
                <h4>${n.type === 'audio' ? '🎙️ ' : '📝 '}${escapeHtml(n.title)}</h4>
                <div class="note-actions">
                    <button class="edit-note-btn" data-id="${n.id}" title="Edit catatan">✏️ Edit</button>
                    <button class="delete-btn delete-note-btn" data-id="${n.id}" title="Hapus note">🗑️</button>
                </div>
            </div>
            <p class="note-body" style="white-space:pre-line">${escapeHtml(n.body)}</p>
            <div class="note-footer">
                <span class="note-date">${n.date}</span>
                <span class="note-type-badge ${n.type}">${n.type === 'audio' ? '🎙️ Audio Transcript' : '📝 Note'}</span>
            </div>
        </div>
    `).join('') || '<p style="color:var(--text-secondary);padding:24px;text-align:center">Belum ada catatan. Buat catatan baru sekarang!</p>';

    // Edit Note Click
    grid.querySelectorAll('.edit-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            openEditNoteModal(id);
        });
    });

    // Delete Note Click
    grid.querySelectorAll('.delete-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            state.notes = state.notes.filter(n => n.id !== id);
            saveNotes();
            renderNotes();
        });
    });
}

function openEditNoteModal(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;

    const modal = document.getElementById('edit-note-modal');
    const idInput = document.getElementById('edit-note-id');
    const titleInput = document.getElementById('edit-note-title');
    const bodyInput = document.getElementById('edit-note-body');

    if (modal && idInput && titleInput && bodyInput) {
        idInput.value = note.id;
        titleInput.value = note.title;
        bodyInput.value = note.body;
        modal.style.display = 'flex';
        titleInput.focus();
    }
}

function closeEditNoteModal() {
    const modal = document.getElementById('edit-note-modal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// RENDER: ERASER AI STUDIO (Realtime Auto-Save & Mermaid Diagrams)
// ============================================================
let eraserDebounceTimer = null;

function renderEraser() {
    const editor = document.getElementById('eraser-editor');
    if (!editor) return;

    // Load content
    if (!editor.value) {
        editor.value = state.eraserContent;
    }
    updateEraserPreview();
}

function updateEraserPreview() {
    const editor = document.getElementById('eraser-editor');
    const preview = document.getElementById('eraser-preview');
    if (!editor || !preview) return;

    const raw = editor.value;
    state.eraserContent = raw;

    // Parse simple Markdown and Mermaid blocks
    let html = '';
    const parts = raw.split(/```mermaid([\s\S]*?)```/g);

    parts.forEach((part, index) => {
        if (index % 2 === 1) {
            // Mermaid block
            const cleanCode = part.trim();
            const graphId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            html += `<div class="mermaid" id="${graphId}">${escapeHtml(cleanCode)}</div>`;
        } else {
            // Markdown text
            let md = escapeHtml(part)
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- \[ \] (.*$)/gim, '<div style="margin:4px 0">☐ $1</div>')
                .replace(/^- \[x\] (.*$)/gim, '<div style="margin:4px 0;color:var(--success)">☑ $1</div>')
                .replace(/^- (.*$)/gim, '<li style="margin-left:18px">$1</li>')
                .replace(/\n\n/g, '<p></p>')
                .replace(/\n/g, '<br>');
            html += `<div>${md}</div>`;
        }
    });

    preview.innerHTML = html;

    // Re-render Mermaid diagrams
    if (typeof mermaid !== 'undefined') {
        try {
            mermaid.run({ nodes: preview.querySelectorAll('.mermaid') });
        } catch (_) {}
    }
}

function handleEraserRealtimeInput() {
    const statusText = document.getElementById('eraser-status-text');
    if (statusText) statusText.textContent = 'Menyimpan…';

    updateEraserPreview();

    clearTimeout(eraserDebounceTimer);
    eraserDebounceTimer = setTimeout(() => {
        const content = document.getElementById('eraser-editor')?.value || '';
        localStorage.setItem('pos_eraser_content', content);
        if (statusText) statusText.textContent = 'Tersimpan realtime ✓';
    }, 300);
}

// ============================================================
// RENDER: SETTINGS PAGE
// ============================================================
function renderSettings() {
    const nameEl = document.getElementById('settings-name');
    if (nameEl) {
        nameEl.value = document.getElementById('user-name')?.textContent || 'Demo User';
    }

    const keyInput = document.getElementById('gemini-api-key-input');
    if (keyInput) {
        keyInput.value = state.geminiApiKey || '';
    }

    const modelSelect = document.getElementById('gemini-model-select');
    if (modelSelect) {
        modelSelect.value = state.geminiModel || 'gemini-3.8-flash';
    }

    const keyStatus = document.getElementById('api-key-status');
    if (keyStatus) {
        if (state.geminiApiKey) {
            keyStatus.style.display = 'block';
            keyStatus.style.color = 'var(--success)';
            keyStatus.innerHTML = `✓ API Key Google AI Studio tersimpan (${state.geminiApiKey.slice(0, 7)}...${state.geminiApiKey.slice(-4)}) • Menggunakan ${state.geminiModel}`;
        } else {
            keyStatus.style.display = 'block';
            keyStatus.style.color = 'var(--text-secondary)';
            keyStatus.textContent = 'Belum ada API Key. Masukkan kunci Anda untuk mengaktifkan AI.';
        }
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = state.theme === 'theme-mac-dark' ? 'mac-dark' : 'mac-light';
    }
}

// ============================================================
// DOM READY & EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // 0. Mermaid Initialization
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: state.theme === 'theme-mac-dark' ? 'dark' : 'default',
            securityLevel: 'loose'
        });
    }

    // 1. Initial Theme Setup
    applyTheme(state.theme);

    document.getElementById('btn-theme-light')?.addEventListener('click', () => applyTheme('theme-mac-light'));
    document.getElementById('btn-theme-dark')?.addEventListener('click', () => applyTheme('theme-mac-dark'));

    document.getElementById('theme-select')?.addEventListener('change', (e) => {
        const selected = e.target.value === 'mac-dark' ? 'theme-mac-dark' : 'theme-mac-light';
        applyTheme(selected);
    });

    // 2. Auth & User Info
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                if (userNameEl) userNameEl.textContent = user.displayName || 'User';
                if (userAvatarEl) {
                    userAvatarEl.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0071e3&color=fff`;
                }
            } else {
                window.location.href = 'index.html';
            }
        });
    } else {
        if (userNameEl) userNameEl.textContent = 'Mac User';
    }

    // Date Display
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // 3. Sidebar Navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigate(page);
        });
    });

    function doLogout() {
        if (auth) {
            auth.signOut().then(() => window.location.href = 'index.html');
        } else {
            window.location.href = 'index.html';
        }
    }
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);
    document.getElementById('settings-logout-btn')?.addEventListener('click', doLogout);

    // 4. Dashboard Quick Links
    document.getElementById('dash-new-task-btn')?.addEventListener('click', () => {
        navigate('tasks');
        const form = document.getElementById('add-task-form');
        if (form) form.style.display = 'block';
        document.getElementById('task-input')?.focus();
    });

    document.getElementById('dash-record-btn')?.addEventListener('click', () => {
        navigate('notes');
        document.getElementById('record-btn')?.click();
    });

    document.getElementById('dash-view-all-tasks')?.addEventListener('click', () => navigate('tasks'));
    document.getElementById('dash-view-calendar')?.addEventListener('click', () => navigate('calendar'));
    document.getElementById('dash-view-notes')?.addEventListener('click', () => navigate('notes'));

    // 5. AI Daily Brief & Ask AI Listeners
    // Refresh Brief Button (GUARANTEED WORKING)
    document.getElementById('refresh-brief-btn')?.addEventListener('click', () => {
        generateAIBrief();
    });

    // Ask AI Button & Input
    const askAiBtn = document.getElementById('ask-ai-btn');
    const aiQuestionInput = document.getElementById('ai-question-input');

    function handleAskAI() {
        const q = aiQuestionInput?.value.trim();
        if (!q) return;
        askAI(q);
        if (aiQuestionInput) aiQuestionInput.value = '';
    }

    askAiBtn?.addEventListener('click', handleAskAI);
    aiQuestionInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAskAI();
    });

    // Prompt Chips
    document.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            if (prompt) {
                if (aiQuestionInput) aiQuestionInput.value = prompt;
                handleAskAI();
            }
        });
    });

    // 6. Settings: Gemini API Key & Model 2.0 Handling
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
    const apiKeyInput = document.getElementById('gemini-api-key-input');
    const apiKeyStatus = document.getElementById('api-key-status');
    const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
    const geminiModelSelect = document.getElementById('gemini-model-select');

    geminiModelSelect?.addEventListener('change', (e) => {
        state.geminiModel = e.target.value;
        localStorage.setItem('gemini_model', state.geminiModel);
        const modelLabel = document.getElementById('ai-model-label');
        if (modelLabel) modelLabel.textContent = `${state.geminiModel.replace('gemini-', 'Gemini ')} Assistant`;
    });

    toggleKeyVisibility?.addEventListener('click', () => {
        if (apiKeyInput) {
            apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
        }
    });

    saveApiKeyBtn?.addEventListener('click', async () => {
        const key = apiKeyInput?.value.trim();
        if (!key) {
            if (apiKeyStatus) {
                apiKeyStatus.style.display = 'block';
                apiKeyStatus.style.color = 'var(--danger)';
                apiKeyStatus.textContent = 'Silakan masukkan Google AI Studio API Key.';
            }
            return;
        }

        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Testing 2.0…';
        if (apiKeyStatus) {
            apiKeyStatus.style.display = 'block';
            apiKeyStatus.style.color = 'var(--accent)';
            apiKeyStatus.textContent = `⏳ Menguji koneksi dengan ${state.geminiModel}…`;
        }

        const originalKey = state.geminiApiKey;
        state.geminiApiKey = key;

        try {
            await callGemini('Jawab satu kata: "OK"');
            localStorage.setItem('gemini_api_key', key);
            if (apiKeyStatus) {
                apiKeyStatus.style.color = 'var(--success)';
                apiKeyStatus.innerHTML = `✓ Berhasil! Model ${state.geminiModel} aktif dan siap digunakan.`;
            }
            updateTaskBadges();
            generateAIBrief();
        } catch (err) {
            state.geminiApiKey = originalKey;
            if (apiKeyStatus) {
                apiKeyStatus.style.color = 'var(--danger)';
                apiKeyStatus.innerHTML = `⚠️ Pengujian Gagal: ${escapeHtml(err.message)}. Pastikan API key disalin dari Google AI Studio.`;
            }
        } finally {
            saveApiKeyBtn.disabled = false;
            saveApiKeyBtn.textContent = 'Save & Test Key';
        }
    });

    clearApiKeyBtn?.addEventListener('click', () => {
        state.geminiApiKey = '';
        localStorage.removeItem('gemini_api_key');
        if (apiKeyInput) apiKeyInput.value = '';
        if (apiKeyStatus) {
            apiKeyStatus.style.display = 'block';
            apiKeyStatus.style.color = 'var(--text-secondary)';
            apiKeyStatus.textContent = 'API Key telah dihapus. Menggunakan ringkasan lokal offline.';
        }
        updateTaskBadges();
        generateAIBrief();
    });

    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        const newName = document.getElementById('settings-name')?.value.trim();
        if (newName && userNameEl) {
            userNameEl.textContent = newName;
            alert(`Nama berhasil diperbarui menjadi "${newName}"`);
        }
    });

    // 7. Tasks Page Listeners
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskForm = document.getElementById('add-task-form');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    // task-filter removed — done tasks go to Bank Data Vault, not a filter column

    addTaskBtn?.addEventListener('click', () => {
        if (addTaskForm) {
            addTaskForm.style.display = addTaskForm.style.display === 'none' ? 'block' : 'none';
            document.getElementById('task-input')?.focus();
        }
    });

    saveTaskBtn?.addEventListener('click', () => {
        const text = document.getElementById('task-input')?.value.trim();
        const cat = document.getElementById('task-category')?.value || 'Work';
        const status = document.getElementById('task-status-input')?.value || 'pending';
        if (!text) return;

        const newTask = { id: genId(), text, category: cat, status, done: status === 'done' };
        if (status === 'done') newTask.completedAt = new Date().toISOString();
        state.tasks.unshift(newTask);
        saveTasks();

        if (document.getElementById('task-input')) document.getElementById('task-input').value = '';
        if (addTaskForm) addTaskForm.style.display = 'none';
        renderTasks();
        if (status === 'done') showToast('📦 Task langsung diarsipkan ke Bank Data');
    });

    document.getElementById('task-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveTaskBtn?.click();
    });

    cancelTaskBtn?.addEventListener('click', () => {
        if (addTaskForm) addTaskForm.style.display = 'none';
    });

    // 8. Bank Data Vault Toggle, Close & Search
    document.getElementById('toggle-bank-data-btn')?.addEventListener('click', () => {
        const vault = document.getElementById('bank-data-vault');
        if (!vault) return;
        const isHidden = vault.style.display === 'none' || vault.style.display === '';
        if (isHidden) {
            vault.style.display = 'block';
            renderBankData();
            setTimeout(() => vault.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        } else {
            vault.style.display = 'none';
        }
    });

    document.getElementById('close-bank-data-btn')?.addEventListener('click', () => {
        const vault = document.getElementById('bank-data-vault');
        if (vault) vault.style.display = 'none';
    });

    document.getElementById('bank-data-search')?.addEventListener('input', (e) => {
        renderBankData(e.target.value);
    });

    // Eraser Sub-Tab Switcher: Internal Canvas <-> eraser.io/ai
    document.getElementById('tab-eraser-internal')?.addEventListener('click', () => {
        document.getElementById('eraser-internal-view').style.display = '';
        document.getElementById('eraser-web-view').style.display = 'none';
        document.getElementById('tab-eraser-internal').classList.add('active');
        document.getElementById('tab-eraser-web').classList.remove('active');
    });
    document.getElementById('tab-eraser-web')?.addEventListener('click', () => {
        document.getElementById('eraser-internal-view').style.display = 'none';
        document.getElementById('eraser-web-view').style.display = 'flex';
        document.getElementById('tab-eraser-internal').classList.remove('active');
        document.getElementById('tab-eraser-web').classList.add('active');
    });

    // Dashboard → open Bank Data Vault directly
    document.getElementById('dash-open-bank-data')?.addEventListener('click', () => {
        navigate('tasks');
        setTimeout(() => {
            const vault = document.getElementById('bank-data-vault');
            if (vault) {
                vault.style.display = 'block';
                renderBankData();
                vault.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    });

    // 9. Calendar & Agenda Listeners
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

    addEventBtn?.addEventListener('click', () => {
        if (addEventForm) {
            addEventForm.style.display = addEventForm.style.display === 'none' ? 'block' : 'none';
            const eventDate = document.getElementById('event-date-input');
            if (eventDate && !eventDate.value) {
                eventDate.value = new Date().toISOString().split('T')[0];
            }
            document.getElementById('event-title-input')?.focus();
        }
    });

    saveEventBtn?.addEventListener('click', () => {
        const title = document.getElementById('event-title-input')?.value.trim();
        const date = document.getElementById('event-date-input')?.value;
        const time = document.getElementById('event-time-input')?.value || '09:00';
        if (!title || !date) {
            alert('Silakan isi judul dan tanggal acara.');
            return;
        }

        state.events.push({ id: genId(), title, date, time, location: "Personal OS", done: false });
        saveEvents();

        if (document.getElementById('event-title-input')) document.getElementById('event-title-input').value = '';
        if (addEventForm) addEventForm.style.display = 'none';
        renderCalendar();
    });

    cancelEventBtn?.addEventListener('click', () => {
        if (addEventForm) addEventForm.style.display = 'none';
    });

    // 9. Notes & Edit Note Modal Listeners
    const addNoteBtn = document.getElementById('add-note-btn');
    const addNoteForm = document.getElementById('add-note-form');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');

    addNoteBtn?.addEventListener('click', () => {
        if (addNoteForm) {
            addNoteForm.style.display = addNoteForm.style.display === 'none' ? 'block' : 'none';
            document.getElementById('note-title-input')?.focus();
        }
    });

    saveNoteBtn?.addEventListener('click', () => {
        const title = document.getElementById('note-title-input')?.value.trim();
        const body = document.getElementById('note-body-input')?.value.trim();
        if (!title) {
            alert('Silakan masukkan judul catatan.');
            return;
        }

        const now = new Date().toLocaleDateString('id-ID', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        state.notes.unshift({ id: genId(), title, body: body || '(Catatan kosong)', date: now, type: 'note' });
        saveNotes();

        if (document.getElementById('note-title-input')) document.getElementById('note-title-input').value = '';
        if (document.getElementById('note-body-input')) document.getElementById('note-body-input').value = '';
        if (addNoteForm) addNoteForm.style.display = 'none';
        renderNotes();
    });

    cancelNoteBtn?.addEventListener('click', () => {
        if (addNoteForm) addNoteForm.style.display = 'none';
    });

    // Edit Note Modal Buttons
    document.getElementById('close-edit-note-modal')?.addEventListener('click', closeEditNoteModal);
    document.getElementById('cancel-edit-note-btn')?.addEventListener('click', closeEditNoteModal);

    document.getElementById('save-edit-note-btn')?.addEventListener('click', () => {
        const id = parseInt(document.getElementById('edit-note-id')?.value, 10);
        const title = document.getElementById('edit-note-title')?.value.trim();
        const body = document.getElementById('edit-note-body')?.value.trim();

        if (!title) {
            alert('Judul tidak boleh kosong.');
            return;
        }

        const note = state.notes.find(n => n.id === id);
        if (note) {
            note.title = title;
            note.body = body;
            note.date = `Diedit ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
            saveNotes();
            closeEditNoteModal();
            renderNotes();
            renderDashboard();
        }
    });

    // Audio Recording
    let isRecording = false;
    const recordBtn = document.getElementById('record-btn');

    recordBtn?.addEventListener('click', async () => {
        isRecording = !isRecording;
        if (isRecording) {
            recordBtn.innerHTML = `<span class="recording-indicator"><span class="rec-dot"></span> Merekam Suara… Klik untuk Selesai</span>`;
        } else {
            recordBtn.innerHTML = '🎙️ Record Audio';
            const now = new Date().toLocaleDateString('id-ID', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const newNote = {
                id: genId(),
                title: `Audio Rekaman — ${now}`,
                body: '⏳ Memproses audio dengan Gemini 2.0…',
                date: now,
                type: 'audio'
            };
            state.notes.unshift(newNote);
            saveNotes();
            renderNotes();

            if (state.geminiApiKey) {
                try {
                    const prompt = `Buatkan simulasi transkrip audio meeting singkat profesional dan 3 butir action item tugas terkait proyek Personal OS.`;
                    const aiResult = await callGemini(prompt);
                    newNote.body = aiResult;
                } catch (_) {
                    newNote.body = "Transkrip Audio:\nDiskusi strategi peluncuran Personal OS. Tim memprioritaskan fitur Eraser AI, model Gemini 2.0, dan status Kanban Tasks.\n\nAction Items:\n- Review status tugas di Kanban\n- Uji coba visual canvas Eraser AI";
                }
            } else {
                newNote.body = "Transkrip Audio:\nDiskusi strategi peluncuran Personal OS. Tim memprioritaskan fitur Eraser AI, model Gemini 2.0, dan status Kanban Tasks.\n\nAction Items:\n- Review status tugas di Kanban\n- Uji coba visual canvas Eraser AI";
            }
            saveNotes();
            renderNotes();
        }
    });

    // 10. Eraser AI Studio Listeners
    const eraserEditor = document.getElementById('eraser-editor');
    eraserEditor?.addEventListener('input', handleEraserRealtimeInput);

    // Eraser Quick Snippets
    document.querySelectorAll('.snippet-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.insert;
            let snippet = '';
            if (type === 'flowchart') {
                snippet = `\n\`\`\`mermaid\ngraph TD\n    Start[Mulai] --> Decision{Kondisi?}\n    Decision -->|Ya| ActionA[Langkah A]\n    Decision -->|Tidak| ActionB[Langkah B]\n    ActionA --> End[Selesai]\n    ActionB --> End\n\`\`\`\n`;
            } else if (type === 'sequence') {
                snippet = `\n\`\`\`mermaid\nsequenceDiagram\n    Pengguna->>PersonalOS: Buka Dashboard\n    PersonalOS->>Gemini20: Minta AI Daily Brief\n    Gemini20-->>PersonalOS: Kirim Hasil Briefing\n    PersonalOS-->>Pengguna: Tampilkan Notifikasi\n\`\`\`\n`;
            } else if (type === 'mindmap') {
                snippet = `\n\`\`\`mermaid\nmindmap\n  root((Personal OS))\n    Tasks\n      Pending\n      On Progress\n      Done\n    AI\n      Daily Brief\n      Ask Assistant\n      Eraser AI\n    Calendar\n      Events\n      Checklist\n\`\`\`\n`;
            } else if (type === 'checklist') {
                snippet = `\n### 📝 Checklist Tugas\n- [ ] Task prioritas 1\n- [ ] Task prioritas 2\n- [x] Task selesai\n`;
            }

            if (eraserEditor) {
                const start = eraserEditor.selectionStart || eraserEditor.value.length;
                const end = eraserEditor.selectionEnd || eraserEditor.value.length;
                eraserEditor.value = eraserEditor.value.substring(0, start) + snippet + eraserEditor.value.substring(end);
                handleEraserRealtimeInput();
                eraserEditor.focus();
            }
        });
    });

    // Eraser Copy Button
    document.getElementById('eraser-copy-btn')?.addEventListener('click', () => {
        if (eraserEditor) {
            navigator.clipboard.writeText(eraserEditor.value).then(() => {
                alert('Teks Eraser AI berhasil disalin ke clipboard! 📋');
            });
        }
    });

    // Eraser Clear Button
    document.getElementById('eraser-clear-btn')?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mengosongkan canvas Eraser AI?')) {
            if (eraserEditor) {
                eraserEditor.value = '';
                handleEraserRealtimeInput();
            }
        }
    });

    // Eraser AI Generate Diagram Button
    document.getElementById('eraser-ai-diagram-btn')?.addEventListener('click', async () => {
        const topic = prompt('Masukkan topik atau arsitektur diagram yang ingin dibuat AI (misal: "Alur autentikasi user", "Sistem e-commerce", "Workflow kerja Personal OS"):', 'Workflow kerja Personal OS');
        if (!topic) return;

        const btn = document.getElementById('eraser-ai-diagram-btn');
        btn.textContent = '⏳ AI Membuat Diagram…';
        btn.disabled = true;

        try {
            const promptText = `Buatkan diagram Mermaid (hanya kode mermaid di dalam blok \`\`\`mermaid dan \`\`\`) untuk topik: "${topic}". Gunakan sintaks Mermaid graph TD atau sequenceDiagram yang valid, bersih, dan modern. Jangan sertakan teks obrolan di luar blok.`;
            const result = await callGemini(promptText);

            if (eraserEditor) {
                eraserEditor.value += `\n\n## 📊 Diagram: ${topic}\n${result}\n`;
                handleEraserRealtimeInput();
            }
        } catch (err) {
            alert(`Gagal membuat diagram: ${err.message}. Pastikan API key Google AI Studio sudah terpasang.`);
        } finally {
            btn.textContent = '✨ AI Buat Diagram';
            btn.disabled = false;
        }
    });

    // Eraser AI Polish & Format Notes Button
    document.getElementById('eraser-ai-polish-btn')?.addEventListener('click', async () => {
        if (!eraserEditor || !eraserEditor.value.trim()) {
            alert('Tulis beberapa catatan terlebih dahulu di editor sebelum dirapikan AI.');
            return;
        }

        const btn = document.getElementById('eraser-ai-polish-btn');
        btn.textContent = '⏳ AI Merapikan…';
        btn.disabled = true;

        try {
            const promptText = `Rapikan dan format catatan berikut ini menjadi dokumen spesifikasi/meeting notes yang sangat rapi, terstruktur, gunakan markdown dengan heading, bullet points, checklist, dan jika relevan sertakan diagram mermaid:\n\n${eraserEditor.value}`;
            const result = await callGemini(promptText);

            eraserEditor.value = result;
            handleEraserRealtimeInput();
        } catch (err) {
            alert(`Gagal merapikan catatan: ${err.message}.`);
        } finally {
            btn.textContent = '🧹 AI Rapikan Catatan';
            btn.disabled = false;
        }
    });

    // 11. Initial Render
    navigate('dashboard');
});
