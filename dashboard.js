// ============================================================
// PERSONAL OS — PRODUCTION DASHBOARD ARCHITECTURE
// Isolated per Firebase User UID • Cloud Firestore • Gemini AI
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // APPLICATION STATE (Scoped to Authenticated User)
    // ============================================================
    let currentUser = null;
    let unsubscribes = [];

    const state = {
        workspaces: [],
        activeWorkspaceId: 'all',
        tasks: [],
        events: [],
        notes: [],
        reminders: [],
        eraserContent: '',
        calCurrentDate: new Date(),
        geminiApiKey: localStorage.getItem('gemini_api_key') || '',
        geminiModel: localStorage.getItem('gemini_model') || 'gemini-3.8-flash',
        theme: localStorage.getItem('pos_theme') || 'theme-mac-light',
        activeFilter: 'all',
        activeTab: 'all'
    };

    // ============================================================
    // TOAST NOTIFICATIONS
    // ============================================================
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.mac-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `mac-toast toast-${type}`;
        toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    // ============================================================
    // THEME MANAGEMENT
    // ============================================================
    function applyTheme(themeName) {
        document.body.classList.remove('theme-mac-light', 'theme-mac-dark');
        document.body.classList.add(themeName);
        state.theme = themeName;
        localStorage.setItem('pos_theme', themeName);

        const isDark = themeName === 'theme-mac-dark';
        document.getElementById('btn-theme-light')?.classList.toggle('active', !isDark);
        document.getElementById('btn-theme-dark')?.classList.toggle('active', isDark);
        const sel = document.getElementById('theme-select');
        if (sel) sel.value = isDark ? 'mac-dark' : 'mac-light';
    }

    // ============================================================
    // AUTHENTICATION & DATA SYNCHRONIZATION
    // ============================================================
    async function initAuth() {
        const loadingOverlay = document.getElementById('auth-loading-overlay');
        const loadingStatus = document.getElementById('auth-loading-status');

        if (!window.FirebaseApp) {
            console.error('[Personal OS] FirebaseApp service not found');
            window.location.href = 'index.html';
            return;
        }

        window.FirebaseApp.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log('[Personal OS] User is not authenticated. Redirecting to login…');
                if (loadingOverlay) loadingOverlay.style.display = 'flex';
                if (loadingStatus) loadingStatus.textContent = 'Mengarahkan ke halaman login…';
                window.location.href = 'index.html';
                return;
            }

            currentUser = user;
            console.log('[Personal OS] Authenticated as:', user.displayName, `(${user.uid})`);

            if (loadingStatus) loadingStatus.textContent = 'Menyiapkan data cloud Anda…';

            // 1. Sync User Profile in Firestore
            try {
                if (window.FirestoreService) {
                    await window.FirestoreService.syncUserProfile(user);
                }
            } catch (err) {
                console.warn('[Personal OS] Profile sync notice:', err);
            }

            // 2. Update Profile in UI
            updateProfileUI(user);

            // 3. Bind Realtime Firestore Subscriptions
            bindFirestoreSubscriptions(user.uid);

            // 4. Load Eraser Document
            loadEraserDocument(user.uid);

            // 5. Hide Loading Overlay
            setTimeout(() => {
                if (loadingOverlay) {
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 300);
                }
            }, 400);

            // 6. Generate Initial AI Brief after data settles
            setTimeout(() => {
                generateAIBrief();
            }, 800);
        });
    }

    function updateProfileUI(user) {
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        const settingsName = document.getElementById('settings-name');
        const settingsEmail = document.getElementById('settings-email');
        const settingsUid = document.getElementById('settings-uid');

        const name = user.displayName || user.email?.split('@')[0] || 'User';
        const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0071e3&color=fff`;

        if (userNameEl) userNameEl.textContent = name;
        if (userAvatarEl) userAvatarEl.src = photo;
        if (settingsName) settingsName.value = name;
        if (settingsEmail) settingsEmail.value = user.email || '';
        if (settingsUid) settingsUid.value = user.uid || '';

        // Status cards in Settings
        const authBadge = document.getElementById('settings-status-auth-badge');
        const authDesc = document.getElementById('settings-status-auth-desc');
        if (authBadge) authBadge.textContent = 'Connected';
        if (authDesc) authDesc.textContent = `Google: ${user.email}`;

        const dbBadge = document.getElementById('settings-status-db-badge');
        const dbDesc = document.getElementById('settings-status-db-desc');
        if (dbBadge) dbBadge.textContent = 'Active (UID)';
        if (dbDesc) dbDesc.textContent = `users/${user.uid.slice(0, 10)}…`;
    }

    function cleanupSubscriptions() {
        unsubscribes.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        unsubscribes = [];
    }

    function bindFirestoreSubscriptions(uid) {
        cleanupSubscriptions();
        if (!window.FirestoreService) return;

        // 1. Workspaces Listener
        const unsubWs = window.FirestoreService.subscribeWorkspaces(uid, (workspaces) => {
            state.workspaces = workspaces;
            renderWorkspaceDropdown();
            populateWorkspaceSelects();
        });
        unsubscribes.push(unsubWs);

        // 2. Tasks Listener
        const unsubTasks = window.FirestoreService.subscribeTasks(uid, (tasks) => {
            state.tasks = tasks;
            renderDashboard();
            renderTasks();
            updateSidebarCounts();
        });
        unsubscribes.push(unsubTasks);

        // 3. Notes Listener
        const unsubNotes = window.FirestoreService.subscribeNotes(uid, (notes) => {
            state.notes = notes;
            renderDashboard();
            renderNotes();
        });
        unsubscribes.push(unsubNotes);

        // 4. Calendar Events Listener
        const unsubEvents = window.FirestoreService.subscribeCalendarEvents(uid, (events) => {
            state.events = events;
            renderDashboard();
            renderCalendar();
        });
        unsubscribes.push(unsubEvents);

        // 5. Reminders Listener
        const unsubRem = window.FirestoreService.subscribeReminders(uid, (reminders) => {
            state.reminders = reminders;
            renderReminders();
        });
        unsubscribes.push(unsubRem);
    }

    async function loadEraserDocument(uid) {
        if (!window.FirestoreService) return;
        try {
            const savedContent = await window.FirestoreService.getEraserDoc(uid);
            if (savedContent) {
                state.eraserContent = savedContent;
                const textarea = document.getElementById('eraser-markdown-input');
                if (textarea) textarea.value = savedContent;
                updateEraserPreview(savedContent);
            }
        } catch (e) {
            console.warn('[Personal OS] Eraser load notice:', e);
        }
    }

    // ============================================================
    // WORKSPACE LOGIC
    // ============================================================
    function renderWorkspaceDropdown() {
        const listEl = document.getElementById('workspace-dropdown-list');
        const activeNameEl = document.getElementById('ws-active-name');
        const activeIconEl = document.getElementById('ws-active-icon');
        if (!listEl) return;

        // Find active workspace object
        let activeWs = null;
        if (state.activeWorkspaceId !== 'all') {
            activeWs = state.workspaces.find(w => w.id === state.activeWorkspaceId);
        }

        if (activeWs) {
            if (activeNameEl) activeNameEl.textContent = activeWs.name;
            if (activeIconEl) activeIconEl.textContent = activeWs.icon || '📁';
        } else {
            if (activeNameEl) activeNameEl.textContent = 'All Workspaces';
            if (activeIconEl) activeIconEl.textContent = '💼';
        }

        let html = `
            <div class="ws-menu-item ${state.activeWorkspaceId === 'all' ? 'active' : ''}" data-ws-id="all">
                <span>💼</span>
                <span style="flex:1">All Workspaces</span>
            </div>
        `;

        state.workspaces.forEach(ws => {
            const isActive = state.activeWorkspaceId === ws.id;
            html += `
                <div class="ws-menu-item ${isActive ? 'active' : ''}" data-ws-id="${ws.id}">
                    <span>${ws.icon || '📁'}</span>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ws.name)}</span>
                    <div class="ws-menu-actions">
                        <button type="button" class="ws-menu-btn delete-ws-btn" data-id="${ws.id}" title="Hapus Workspace">✕</button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;

        // Click handlers on menu items
        listEl.querySelectorAll('.ws-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-ws-btn')) return;
                const wsId = item.dataset.wsId;
                state.activeWorkspaceId = wsId;
                document.getElementById('workspace-dropdown-menu').style.display = 'none';
                renderWorkspaceDropdown();
                // Re-render components with active workspace filter
                renderDashboard();
                renderTasks();
                renderCalendar();
                renderNotes();
                renderReminders();
                showToast(`Workspace: ${activeWs?.name || 'All Workspaces'}`);
            });
        });

        // Delete workspace handler
        listEl.querySelectorAll('.delete-ws-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const wsId = btn.dataset.id;
                const ws = state.workspaces.find(w => w.id === wsId);
                if (!ws) return;
                if (!confirm(`Hapus workspace "${ws.name}"? Data di dalamnya akan tetap tersimpan.`)) return;

                try {
                    await window.FirestoreService.deleteWorkspace(currentUser.uid, wsId);
                    if (state.activeWorkspaceId === wsId) {
                        state.activeWorkspaceId = 'all';
                    }
                    showToast('Workspace dihapus');
                } catch (err) {
                    alert('Gagal menghapus workspace: ' + err.message);
                }
            });
        });
    }

    function populateWorkspaceSelects() {
        const selects = [
            document.getElementById('task-workspace-select'),
            document.getElementById('note-workspace-select'),
            document.getElementById('event-workspace-select'),
            document.getElementById('reminder-workspace-select')
        ].filter(Boolean);

        selects.forEach(sel => {
            let options = '<option value="all">Workspace: Default</option>';
            state.workspaces.forEach(ws => {
                const selected = state.activeWorkspaceId === ws.id ? 'selected' : '';
                options += `<option value="${ws.id}" ${selected}>${ws.icon || '📁'} ${escapeHtml(ws.name)}</option>`;
            });
            sel.innerHTML = options;
        });
    }

    // Filter data by active workspace
    function filterByActiveWs(items) {
        if (!state.activeWorkspaceId || state.activeWorkspaceId === 'all') {
            return items;
        }
        return items.filter(item => item.workspaceId === state.activeWorkspaceId || !item.workspaceId || item.workspaceId === 'all');
    }

    // ============================================================
    // DASHBOARD RENDERING
    // ============================================================
    function renderDashboard() {
        const filteredTasks = filterByActiveWs(state.tasks);
        const filteredEvents = filterByActiveWs(state.events);
        const filteredNotes = filterByActiveWs(state.notes);

        // 1. Task Counters & Status
        const activeTasks = filteredTasks.filter(t => !t.done && t.status !== 'done');
        const doneTasks = filteredTasks.filter(t => t.done || t.status === 'done');
        const pendingCount = activeTasks.filter(t => t.status === 'pending').length;
        const progressCount = activeTasks.filter(t => t.status === 'in-progress').length;

        const badge = document.getElementById('dash-task-badge');
        if (badge) badge.textContent = activeTasks.length;

        const bankCount = document.getElementById('dash-bank-count');
        if (bankCount) bankCount.textContent = doneTasks.length;

        const countersEl = document.getElementById('dash-task-status-counters');
        if (countersEl) {
            countersEl.innerHTML = `
                <span style="color:#ff9500">⏳ ${pendingCount} Belum Berjalan</span> &nbsp;•&nbsp; 
                <span style="color:#0071e3">⚡ ${progressCount} Sedang Berjalan</span>
            `;
        }

        // 2. Dash Task List (Active only)
        const taskList = document.getElementById('dash-task-list');
        if (taskList) {
            if (!activeTasks.length) {
                taskList.innerHTML = `<div class="empty-state">Semua task telah selesai! Lihat di Bank Data. 🎉</div>`;
            } else {
                taskList.innerHTML = activeTasks.slice(0, 5).map(task => {
                    const isProgress = task.status === 'in-progress';
                    return `
                        <div class="task-item">
                            <label class="checkbox-container">
                                <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
                                <span class="checkmark"></span>
                            </label>
                            <div class="task-info">
                                <span class="task-title">${escapeHtml(task.text)}</span>
                                <div style="display:flex;gap:6px;margin-top:2px">
                                    <span class="category-tag ${task.category.toLowerCase()}">${task.category}</span>
                                    <span class="status-pill status-${task.status}">${isProgress ? '⚡ On Progress' : '⏳ Pending'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                taskList.querySelectorAll('.task-checkbox').forEach(cb => {
                    cb.addEventListener('change', async () => {
                        const id = cb.dataset.id;
                        await toggleTaskComplete(id);
                    });
                });
            }
        }

        // 3. Dash Event List
        const eventList = document.getElementById('dash-event-list');
        const eventBadge = document.getElementById('dash-event-badge');
        if (eventBadge) eventBadge.textContent = filteredEvents.length;

        if (eventList) {
            if (!filteredEvents.length) {
                eventList.innerHTML = `<div class="empty-state">Tidak ada jadwal acara mendatang.</div>`;
            } else {
                eventList.innerHTML = filteredEvents.slice(0, 4).map(event => `
                    <div class="event-item ${event.done ? 'completed' : ''}">
                        <label class="checkbox-container" style="margin-right:10px;">
                            <input type="checkbox" class="event-checkbox" data-id="${event.id}" ${event.done ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                        <div class="event-time">${formatTime(event.time)}</div>
                        <div class="event-info">
                            <div class="event-title">${escapeHtml(event.title)}</div>
                            <div class="event-location">📍 ${escapeHtml(event.location)}</div>
                        </div>
                    </div>
                `).join('');

                eventList.querySelectorAll('.event-checkbox').forEach(cb => {
                    cb.addEventListener('change', async () => {
                        const id = cb.dataset.id;
                        await toggleEventComplete(id);
                    });
                });
            }
        }

        // 4. Dash Notes List
        const notesList = document.getElementById('dash-notes-list');
        if (notesList) {
            if (!filteredNotes.length) {
                notesList.innerHTML = `<div class="empty-state">Belum ada catatan. Klik "+ New Note" untuk menulis.</div>`;
            } else {
                notesList.innerHTML = filteredNotes.slice(0, 3).map(note => `
                    <div class="note-card ${note.type === 'audio' ? 'audio-note' : ''}">
                        <div class="note-header">
                            <span class="note-type">${note.type === 'audio' ? '🎙️ Transcript' : '📝 Note'}</span>
                            <span class="note-date">${note.date}</span>
                        </div>
                        <h4 class="note-title">${escapeHtml(note.title)}</h4>
                        <p class="note-body">${escapeHtml(note.body)}</p>
                    </div>
                `).join('');
            }
        }
    }

    // ============================================================
    // TASK MANAGEMENT (2-Column Kanban & Bank Data Vault)
    // ============================================================
    function renderTasks() {
        const filtered = filterByActiveWs(state.tasks);
        const pendingTasks = filtered.filter(t => t.status === 'pending' && !t.done);
        const progressTasks = filtered.filter(t => t.status === 'in-progress' && !t.done);
        const doneTasks = filtered.filter(t => t.status === 'done' || t.done);

        // Update Counter Badges
        const countPendingEl = document.getElementById('count-pending');
        const countProgressEl = document.getElementById('count-progress');
        const bankDataCountEl = document.getElementById('bank-data-count');

        if (countPendingEl) countPendingEl.textContent = pendingTasks.length;
        if (countProgressEl) countProgressEl.textContent = progressTasks.length;
        if (bankDataCountEl) bankDataCountEl.textContent = doneTasks.length;

        // Render List Pending
        const listPending = document.getElementById('list-pending');
        if (listPending) {
            if (!pendingTasks.length) {
                listPending.innerHTML = `<div class="empty-state-kanban">Tidak ada task yang belum berjalan.</div>`;
            } else {
                listPending.innerHTML = pendingTasks.map(t => renderKanbanCard(t)).join('');
            }
        }

        // Render List Progress
        const listProgress = document.getElementById('list-in-progress');
        if (listProgress) {
            if (!progressTasks.length) {
                listProgress.innerHTML = `<div class="empty-state-kanban">Belum ada task yang sedang dikerjakan.</div>`;
            } else {
                listProgress.innerHTML = progressTasks.map(t => renderKanbanCard(t)).join('');
            }
        }

        // Attach action handlers
        attachTaskCardActions();

        // Render Bank Data Vault if open
        renderBankDataVault(doneTasks);
    }

    function renderKanbanCard(task) {
        const isProgress = task.status === 'in-progress';
        return `
            <div class="kanban-card" data-id="${task.id}">
                <div class="kanban-card-top">
                    <span class="category-tag ${task.category.toLowerCase()}">${task.category}</span>
                    <button type="button" class="btn-delete-task" data-id="${task.id}" title="Hapus Task">✕</button>
                </div>
                <div class="kanban-card-title">${escapeHtml(task.text)}</div>
                <div class="kanban-card-footer">
                    <button type="button" class="btn-kanban-action btn-move-status" data-id="${task.id}" data-target="${isProgress ? 'pending' : 'in-progress'}">
                        ${isProgress ? '↩ Kembalikan ke Pending' : '⚡ Mulai Kerjakan'}
                    </button>
                    <button type="button" class="btn-kanban-action btn-complete-task" data-id="${task.id}" title="Selesaikan & Arsipkan ke Bank Data">
                        ✅ Selesai
                    </button>
                </div>
            </div>
        `;
    }

    function attachTaskCardActions() {
        // Move between Pending and Progress
        document.querySelectorAll('.btn-move-status').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const target = btn.dataset.target;
                if (!currentUser) return;
                try {
                    await window.FirestoreService.updateTask(currentUser.uid, id, { status: target });
                    showToast(`Status task diubah ke ${target === 'in-progress' ? 'Sedang Berjalan' : 'Pending'}`);
                } catch (e) {
                    alert('Gagal update task: ' + e.message);
                }
            });
        });

        // Complete & Vault to Bank Data
        document.querySelectorAll('.btn-complete-task').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await toggleTaskComplete(id);
            });
        });

        // Delete Task
        document.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Hapus task ini secara permanen?')) return;
                if (!currentUser) return;
                try {
                    await window.FirestoreService.deleteTask(currentUser.uid, id);
                    showToast('Task telah dihapus');
                } catch (e) {
                    alert('Gagal menghapus task: ' + e.message);
                }
            });
        });
    }

    async function toggleTaskComplete(id) {
        if (!currentUser) return;
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        const willBeDone = !task.done;
        try {
            await window.FirestoreService.updateTask(currentUser.uid, id, {
                status: willBeDone ? 'done' : 'pending',
                done: willBeDone
            });
            if (willBeDone) {
                showToast('Task selesai & diarsipkan ke Bank Data! 📦');
            } else {
                showToast('Task dipulihkan kembali ke board');
            }
        } catch (e) {
            alert('Gagal memperbarui task: ' + e.message);
        }
    }

    function renderBankDataVault(doneTasks) {
        const vaultList = document.getElementById('bank-data-list');
        if (!vaultList) return;

        const searchVal = (document.getElementById('bank-data-search')?.value || '').toLowerCase().trim();
        const displayTasks = searchVal
            ? doneTasks.filter(t => t.text.toLowerCase().includes(searchVal))
            : doneTasks;

        if (!displayTasks.length) {
            vaultList.innerHTML = `<div class="empty-state" style="padding:24px 0">Belum ada task selesai di Bank Data.</div>`;
            return;
        }

        vaultList.innerHTML = displayTasks.map(t => `
            <div class="bank-data-item">
                <div style="flex:1">
                    <span class="bank-data-title">${escapeHtml(t.text)}</span>
                    <div style="display:flex;gap:6px;margin-top:4px">
                        <span class="category-tag ${t.category.toLowerCase()}">${t.category}</span>
                        <span style="font-size:0.75rem;color:var(--text-secondary)">✓ Selesai</span>
                    </div>
                </div>
                <button type="button" class="btn-restore-task btn-secondary small" data-id="${t.id}">
                    ↩ Pulihkan Task
                </button>
            </div>
        `).join('');

        vaultList.querySelectorAll('.btn-restore-task').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await toggleTaskComplete(id);
            });
        });
    }

    // ============================================================
    // CALENDAR & AGENDA & REMINDERS
    // ============================================================
    function renderCalendar() {
        const filteredEvents = filterByActiveWs(state.events);
        const year = state.calCurrentDate.getFullYear();
        const month = state.calCurrentDate.getMonth();

        const monthLabel = document.getElementById('cal-month-label');
        if (monthLabel) {
            monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('id-ID', {
                month: 'long', year: 'numeric'
            });
        }

        const grid = document.getElementById('cal-grid');
        if (grid) {
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();

            let cells = '';
            for (let i = 0; i < firstDay; i++) {
                cells += `<div class="cal-cell empty"></div>`;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const dayEvents = filteredEvents.filter(e => e.date === dateStr);

                cells += `
                    <div class="cal-cell ${isToday ? 'today' : ''}">
                        <span class="day-number">${day}</span>
                        ${dayEvents.map(e => `
                            <div class="event-pill ${e.done ? 'completed' : ''}" title="${escapeHtml(e.title)} (${formatTime(e.time)})">
                                ${escapeHtml(e.title)}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            grid.innerHTML = cells;
        }

        // Full Event Checklist List
        const fullContainer = document.getElementById('event-items-container');
        if (fullContainer) {
            if (!filteredEvents.length) {
                fullContainer.innerHTML = `<div class="empty-state">Belum ada agenda terdaftar.</div>`;
            } else {
                fullContainer.innerHTML = filteredEvents.map(event => `
                    <div class="event-item-full ${event.done ? 'completed' : ''}">
                        <label class="checkbox-container">
                            <input type="checkbox" class="event-full-checkbox" data-id="${event.id}" ${event.done ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                        <div style="flex:1">
                            <div class="event-full-title">${escapeHtml(event.title)}</div>
                            <div class="event-full-meta">📅 ${event.date} • ⏰ ${formatTime(event.time)} • 📍 ${escapeHtml(event.location)}</div>
                        </div>
                        <button type="button" class="btn-delete-event btn-icon-subtle" data-id="${event.id}" title="Hapus Event">✕</button>
                    </div>
                `).join('');

                fullContainer.querySelectorAll('.event-full-checkbox').forEach(cb => {
                    cb.addEventListener('change', async () => {
                        const id = cb.dataset.id;
                        await toggleEventComplete(id);
                    });
                });

                fullContainer.querySelectorAll('.btn-delete-event').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        if (!confirm('Hapus acara ini?')) return;
                        if (!currentUser) return;
                        try {
                            await window.FirestoreService.deleteCalendarEvent(currentUser.uid, id);
                            showToast('Acara telah dihapus');
                        } catch (e) {
                            alert('Gagal menghapus acara: ' + e.message);
                        }
                    });
                });
            }
        }
    }

    async function toggleEventComplete(id) {
        if (!currentUser) return;
        const ev = state.events.find(e => e.id === id);
        if (!ev) return;

        const willBeDone = !ev.done;
        try {
            await window.FirestoreService.updateCalendarEvent(currentUser.uid, id, { done: willBeDone });
            showToast(willBeDone ? 'Acara selesai diceklis! ✓' : 'Status acara dibatalkan');
        } catch (e) {
            alert('Gagal update event: ' + e.message);
        }
    }

    function renderReminders() {
        const container = document.getElementById('reminder-items-container');
        if (!container) return;

        const filtered = filterByActiveWs(state.reminders);

        if (!filtered.length) {
            container.innerHTML = `<div class="empty-state" style="padding:14px 0">Belum ada pengingat aktif.</div>`;
            return;
        }

        container.innerHTML = filtered.map(r => `
            <div class="reminder-item ${r.completed ? 'completed' : ''}">
                <div class="reminder-left">
                    <label class="checkbox-container">
                        <input type="checkbox" class="reminder-checkbox" data-id="${r.id}" ${r.completed ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <div>
                        <div class="reminder-title">${escapeHtml(r.title)}</div>
                        ${r.remindAt ? `<div class="reminder-time">⏰ ${new Date(r.remindAt).toLocaleString('id-ID')}</div>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-delete-reminder btn-icon-subtle" data-id="${r.id}" title="Hapus Pengingat">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.reminder-checkbox').forEach(cb => {
            cb.addEventListener('change', async () => {
                const id = cb.dataset.id;
                const rem = state.reminders.find(r => r.id === id);
                if (!rem || !currentUser) return;
                try {
                    await window.FirestoreService.updateReminder(currentUser.uid, id, { completed: !rem.completed });
                    showToast(rem.completed ? 'Pengingat aktif kembali' : 'Pengingat selesai ✓');
                } catch (e) {
                    alert('Gagal update reminder: ' + e.message);
                }
            });
        });

        container.querySelectorAll('.btn-delete-reminder').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Hapus pengingat ini?')) return;
                if (!currentUser) return;
                try {
                    await window.FirestoreService.deleteReminder(currentUser.uid, id);
                    showToast('Pengingat telah dihapus');
                } catch (e) {
                    alert('Gagal hapus reminder: ' + e.message);
                }
            });
        });
    }

    // ============================================================
    // NOTES & AUDIO
    // ============================================================
    function renderNotes() {
        const filtered = filterByActiveWs(state.notes);
        const grid = document.getElementById('notes-full-grid');
        if (!grid) return;

        if (!filtered.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Belum ada catatan. Klik "+ New Note" untuk membuat baru.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(note => `
            <div class="note-card ${note.type === 'audio' ? 'audio-note' : ''}" data-id="${note.id}">
                <div class="note-header">
                    <span class="note-type">${note.type === 'audio' ? '🎙️ Audio Transcript' : '📝 Note'}</span>
                    <span class="note-date">${note.date}</span>
                </div>
                <h4 class="note-title">${escapeHtml(note.title)}</h4>
                <p class="note-body">${escapeHtml(note.body)}</p>
                <div class="note-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
                    <button type="button" class="btn-secondary small edit-note-btn" data-id="${note.id}">✏️ Edit</button>
                    <button type="button" class="btn-secondary small delete-note-btn" data-id="${note.id}" style="color:var(--danger)">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');

        // Edit handlers
        grid.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const note = state.notes.find(n => n.id === id);
                if (!note) return;

                document.getElementById('edit-note-id').value = id;
                document.getElementById('edit-note-title').value = note.title;
                document.getElementById('edit-note-body').value = note.body;
                document.getElementById('edit-note-modal').style.display = 'flex';
            });
        });

        // Delete handlers
        grid.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Hapus catatan ini secara permanen?')) return;
                if (!currentUser) return;
                try {
                    await window.FirestoreService.deleteNote(currentUser.uid, id);
                    showToast('Catatan telah dihapus');
                } catch (e) {
                    alert('Gagal menghapus catatan: ' + e.message);
                }
            });
        });
    }

    // Audio Recorder Handler
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    async function toggleAudioRecord(btn) {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(t => t.stop());

                    // Create note with audio type
                    if (currentUser && window.FirestoreService) {
                        const title = `Audio Transcript: ${new Date().toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
                        const body = `Rekaman audio tersimpan di sesi Personal OS. Siap untuk diproses oleh Gemini AI Assistant.`;
                        await window.FirestoreService.createNote(currentUser.uid, {
                            title,
                            body,
                            type: 'audio',
                            workspaceId: state.activeWorkspaceId
                        });
                        showToast('Rekaman audio berhasil disimpan ke Notes! 🎙️');
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                btn.innerHTML = '⏹️ Hentikan Rekam';
                btn.classList.add('recording-pulse');
                showToast('Merekam audio… Klik kembali untuk selesai');
            } catch (err) {
                alert('Tidak dapat mengakses mikrofon: ' + err.message);
            }
        } else {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            isRecording = false;
            btn.innerHTML = '🎙️ Record Audio';
            btn.classList.remove('recording-pulse');
        }
    }

    // ============================================================
    // ERASER AI STUDIO LOGIC
    // ============================================================
    let eraserSaveTimeout = null;

    function renderEraser() {
        const textarea = document.getElementById('eraser-markdown-input');
        if (textarea && !textarea.value) {
            textarea.value = state.eraserContent;
            updateEraserPreview(state.eraserContent);
        }
    }

    function updateEraserPreview(text) {
        const preview = document.getElementById('eraser-live-preview');
        if (!preview) return;

        // Render basic markdown headings, checklists, and code
        let html = escapeHtml(text)
            .replace(/^# (.*$)/gim, '<h1 style="font-size:1.4rem;font-weight:700;margin:12px 0 6px;">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 style="font-size:1.15rem;font-weight:600;margin:10px 0 4px;">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 style="font-size:1rem;font-weight:600;margin:8px 0 4px;">$1</h3>')
            .replace(/^- \[x\] (.*$)/gim, '<div style="color:#34c759">☑ $1</div>')
            .replace(/^- \[ \] (.*$)/gim, '<div style="color:var(--text-secondary)">☐ $1</div>')
            .replace(/^- (.*$)/gim, '• $1<br>')
            .replace(/\n/g, '<br>');

        preview.innerHTML = html;
    }

    function queueEraserSave(content) {
        state.eraserContent = content;
        clearTimeout(eraserSaveTimeout);
        eraserSaveTimeout = setTimeout(async () => {
            if (currentUser && window.FirestoreService) {
                try {
                    await window.FirestoreService.saveEraserDoc(currentUser.uid, content);
                    const indicator = document.getElementById('eraser-save-indicator');
                    if (indicator) {
                        indicator.textContent = '✓ Cloud Tersimpan';
                        setTimeout(() => { indicator.textContent = 'Auto-Save Cloud'; }, 2000);
                    }
                } catch (e) {
                    console.warn('[Personal OS] Eraser auto-save error:', e);
                }
            }
        }, 1200);
    }

    // ============================================================
    // GEMINI AI INTEGRATION (Vercel Serverless & Context Aware)
    // ============================================================
    async function invokeGeminiAPI(prompt) {
        // Method 1: Try secure Vercel serverless function /api/gemini
        try {
            const serverRes = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': (localStorage.getItem('gemini_api_key') || '').trim()
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: state.geminiModel || 'gemini-3.8-flash'
                })
            });

            if (serverRes.ok) {
                const data = await serverRes.json();
                if (data.text) return data.text;
            }
        } catch (_) {
            // Serverless endpoint not present or offline
        }

        // Method 2: Client-side direct call to Google AI Studio with user key
        const userKey = (localStorage.getItem('gemini_api_key') || state.geminiApiKey || '').trim();
        if (!userKey) {
            throw new Error('NO_KEY');
        }

        const model = state.geminiModel || 'gemini-3.8-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(userKey)}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 900
                }
            })
        });

        if (!response.ok) {
            let errText = `HTTP ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error?.message) errText = errData.error.message;
            } catch (_) {}
            throw new Error(errText);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '(Tidak ada respon dari Gemini)';
    }

    function buildContextSummary() {
        const filteredTasks = filterByActiveWs(state.tasks);
        const inProgress = filteredTasks.filter(t => t.status === 'in-progress' && !t.done);
        const pending = filteredTasks.filter(t => t.status === 'pending' && !t.done);
        const urgent = filteredTasks.filter(t => t.category === 'Urgent' && !t.done);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEvents = state.events.filter(e => e.date === todayStr);
        const activeReminders = state.reminders.filter(r => !r.completed);
        const recentNotes = state.notes.slice(0, 3);
        const activeWs = state.workspaces.find(w => w.id === state.activeWorkspaceId);

        return `
Konteks Data Pengguna Personal OS:
- Akun Pengguna: ${currentUser?.displayName || 'Pengguna'} (${currentUser?.email || ''})
- Workspace Aktif: ${activeWs ? activeWs.name : 'Semua Workspace (All)'}
- Task Sedang Berjalan (${inProgress.length}): ${inProgress.map(t => `"${t.text}"`).join(', ') || 'Belum ada'}
- Task Belum Berjalan (${pending.length}): ${pending.map(t => `"${t.text}" [${t.category}]`).join(', ') || 'Kosong'}
- Task Mendesak / Urgent (${urgent.length}): ${urgent.map(t => `"${t.text}"`).join(', ') || 'Tidak ada'}
- Agenda Hari Ini (${todayEvents.length}): ${todayEvents.map(e => `${e.title} (${e.done ? 'Sudah Selesai' : 'Belum Selesai'})`).join(', ') || 'Tidak ada'}
- Pengingat Aktif (${activeReminders.length}): ${activeReminders.map(r => `"${r.title}"`).join(', ') || 'Tidak ada'}
- Catatan Terbaru: ${recentNotes.map(n => `"${n.title}"`).join(', ') || 'Tidak ada'}
- Waktu Lokal: ${new Date().toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
`.trim();
    }

    async function generateAIBrief() {
        const badge = document.getElementById('ai-status-badge');
        const loading = document.getElementById('ai-loading');
        const briefText = document.getElementById('ai-brief-text');
        const refreshBtn = document.getElementById('refresh-brief-btn');

        if (!badge || !loading || !briefText) return;

        if (refreshBtn) {
            refreshBtn.innerHTML = '🔄 Memperbarui…';
            refreshBtn.disabled = true;
        }

        badge.className = 'ai-status-loading';
        badge.textContent = 'Generating…';
        loading.style.display = 'flex';
        briefText.style.display = 'none';

        try {
            const prompt = `${buildContextSummary()}

Anda adalah Personal OS AI Assistant (${state.geminiModel}).
Buatkan ringkasan briefing harian yang ramah, ringkas, dan actionable untuk pengguna dalam Bahasa Indonesia:
1. Sapaan singkat dengan nama pengguna.
2. Tugas yang sedang berjalan dan prioritas utama hari ini.
3. Agenda acara / pengingat penting hari ini.
4. Satu tips produktivitas praktis.
Maksimal 130 kata, nada profesional dan bersih.`;

            const text = await invokeGeminiAPI(prompt);
            briefText.innerHTML = formatMarkdownText(text);
            badge.className = 'ai-status-ok';
            badge.textContent = `✓ ${state.geminiModel.replace('gemini-', 'Gemini ')} Active`;
        } catch (e) {
            briefText.innerHTML = generateDataFallbackBrief();
            if (e.message === 'NO_KEY') {
                badge.className = 'ai-status-idle';
                badge.textContent = 'Data Fallback Summary';
            } else {
                badge.className = 'ai-status-error';
                badge.textContent = 'AI Offline';
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

    function generateDataFallbackBrief() {
        const filteredTasks = filterByActiveWs(state.tasks);
        const inProgress = filteredTasks.filter(t => t.status === 'in-progress' && !t.done);
        const pending = filteredTasks.filter(t => t.status === 'pending' && !t.done);
        const urgent = filteredTasks.filter(t => t.category === 'Urgent' && !t.done);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEvents = state.events.filter(e => e.date === todayStr && !e.done);
        const name = currentUser?.displayName || 'Pengguna';
        const greeting = greetingByTime();

        let lines = [
            `<strong>${greeting}, ${name}!</strong> Ringkasan harian berbasis data Firestore Anda:`,
            inProgress.length ? `⚡ <strong>Sedang Berjalan (${inProgress.length}):</strong> ${inProgress.map(t => `"${escapeHtml(t.text)}"`).join(', ')}.` : `⚡ Belum ada task yang dimulai.`,
            urgent.length ? `🔴 <strong>Urgent:</strong> ${urgent.map(t => `"${escapeHtml(t.text)}"`).join(', ')}.` : null,
            `⏳ <strong>Menanti Dikerjakan:</strong> ${pending.length} task tersisa di antrian.`,
            todayEvents.length ? `📅 <strong>Agenda Hari Ini (${todayEvents.length}):</strong> ${todayEvents.map(e => `${escapeHtml(e.title)} (${formatTime(e.time)})`).join(', ')}.` : `✅ Tidak ada agenda tersisa hari ini.`
        ].filter(Boolean);

        lines.push(`
            <div class="mac-callout-info" style="margin-top:10px;margin-bottom:0">
                🤖 <strong>Integrasi Gemini AI:</strong> Masukkan <code>GEMINI_API_KEY</code> di Vercel Environment Variables atau masukkan di <a href="#" onclick="navigate('settings');return false;" style="color:var(--accent);font-weight:600">Settings ⚙️</a> untuk briefing AI otomatis.
            </div>
        `);

        return `<ul class="brief-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
    }

    async function askAI(question) {
        const chatLog = document.getElementById('ai-chat-log');
        if (!chatLog) return;

        // User bubble
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = question;
        chatLog.appendChild(userBubble);
        chatLog.scrollTop = chatLog.scrollHeight;

        // AI Typing Bubble
        const typingBubble = document.createElement('div');
        typingBubble.className = 'chat-bubble ai ai-typing';
        typingBubble.innerHTML = `
            <span style="font-size:0.82rem">Gemini AI is thinking…</span>
            <div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
        `;
        chatLog.appendChild(typingBubble);
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
            const prompt = `${buildContextSummary()}

Pertanyaan Pengguna: "${question}"

Anda adalah Personal OS AI Assistant.
Jawab pertanyaan pengguna secara akurat berdasarkan data tugas, agenda, pengingat, atau catatan pengguna di atas.
Jika pengguna menanyakan tugas atau agenda pada workspace tertentu (misal: "freelance"), periksa data sesuai workspace tersebut.
Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan membantu.`;

            const answer = await invokeGeminiAPI(prompt);
            typingBubble.className = 'chat-bubble ai';
            typingBubble.innerHTML = formatMarkdownText(answer);
        } catch (e) {
            typingBubble.className = 'chat-bubble ai';
            if (e.message === 'NO_KEY') {
                typingBubble.innerHTML = `
                    <div style="line-height:1.5">
                        Halo! Gemini API belum terkonfigurasi. Tambahkan <code>GEMINI_API_KEY</code> di Vercel atau masukkan API Key di halaman
                        <a href="#" onclick="navigate('settings');return false;" style="color:var(--accent);font-weight:600">Settings ⚙️</a>.
                    </div>
                `;
            } else {
                typingBubble.innerHTML = `
                    <span style="color:var(--danger)">⚠️ Gagal memanggil AI: ${escapeHtml(e.message)}</span>
                `;
            }
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // ============================================================
    // NAVIGATION & ROUTING
    // ============================================================
    function navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));

        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        const navEl = document.querySelector(`.sidebar-nav .nav-item[data-page="${page}"]`);
        if (navEl) navEl.classList.add('active');

        switch (page) {
            case 'dashboard': renderDashboard(); break;
            case 'tasks': renderTasks(); break;
            case 'calendar': renderCalendar(); renderReminders(); break;
            case 'notes': renderNotes(); break;
            case 'eraser': renderEraser(); break;
            case 'settings': renderSettings(); break;
        }
    }

    function updateSidebarCounts() {
        const taskCountEl = document.getElementById('sidebar-task-count');
        const activeCount = state.tasks.filter(t => !t.done && t.status !== 'done').length;
        if (taskCountEl) taskCountEl.textContent = activeCount;
    }

    function renderSettings() {
        if (currentUser) {
            updateProfileUI(currentUser);
        }
        const keyInput = document.getElementById('gemini-api-key-input');
        if (keyInput) keyInput.value = localStorage.getItem('gemini_api_key') || '';
    }

    // ============================================================
    // UTILITY HELPERS
    // ============================================================
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
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px;font-size:0.95rem">$1</h4>')
            .replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 4px;font-size:1.05rem">$1</h3>')
            .replace(/^\d+\.\s(.*$)/gim, '<div style="margin-left:14px;margin-bottom:4px">• $1</div>')
            .replace(/^-\s(.*$)/gim, '<div style="margin-left:14px;margin-bottom:4px">• $1</div>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }

    // ============================================================
    // LOGOUT HANDLER
    // ============================================================
    async function doLogout() {
        if (!confirm('Apakah Anda yakin ingin keluar dari Personal OS?')) return;
        cleanupSubscriptions();
        try {
            if (window.FirebaseApp) {
                await window.FirebaseApp.signOut();
            }
        } catch (e) {
            console.error('Logout error:', e);
        }
        window.location.href = 'index.html';
    }

    // ============================================================
    // DOM EVENT LISTENERS INITIALIZATION
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Apply saved theme
        applyTheme(state.theme);

        document.getElementById('btn-theme-light')?.addEventListener('click', () => applyTheme('theme-mac-light'));
        document.getElementById('btn-theme-dark')?.addEventListener('click', () => applyTheme('theme-mac-dark'));
        document.getElementById('theme-select')?.addEventListener('change', (e) => {
            applyTheme(e.target.value === 'mac-dark' ? 'theme-mac-dark' : 'theme-mac-light');
        });

        // 2. Navigation
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) navigate(page);
            });
        });

        // 3. Logout Buttons
        document.getElementById('logout-btn')?.addEventListener('click', doLogout);
        document.getElementById('settings-logout-btn')?.addEventListener('click', doLogout);

        // 4. Quick Actions on Top Bar
        document.getElementById('dash-new-task-btn')?.addEventListener('click', () => {
            navigate('tasks');
            const form = document.getElementById('add-task-form');
            if (form) form.style.display = 'block';
            document.getElementById('task-input')?.focus();
        });

        document.getElementById('dash-record-btn')?.addEventListener('click', (e) => {
            toggleAudioRecord(e.currentTarget);
        });

        document.getElementById('record-btn')?.addEventListener('click', (e) => {
            toggleAudioRecord(e.currentTarget);
        });

        document.getElementById('dash-view-all-tasks')?.addEventListener('click', () => navigate('tasks'));
        document.getElementById('dash-view-calendar')?.addEventListener('click', () => navigate('calendar'));
        document.getElementById('dash-view-notes')?.addEventListener('click', () => navigate('notes'));

        // 5. Workspace Switcher Dropdown Click
        const wsTrigger = document.getElementById('workspace-dropdown-trigger');
        const wsMenu = document.getElementById('workspace-dropdown-menu');
        if (wsTrigger && wsMenu) {
            wsTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                wsMenu.style.display = wsMenu.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', () => {
                wsMenu.style.display = 'none';
            });
        }

        // Workspace Modal handlers
        const wsModal = document.getElementById('workspace-modal');
        const openWsModal = () => {
            document.getElementById('ws-name-input').value = '';
            if (wsModal) wsModal.style.display = 'flex';
            if (wsMenu) wsMenu.style.display = 'none';
        };
        const closeWsModal = () => {
            if (wsModal) wsModal.style.display = 'none';
        };

        document.getElementById('btn-add-workspace')?.addEventListener('click', openWsModal);
        document.getElementById('btn-manage-workspaces')?.addEventListener('click', openWsModal);
        document.getElementById('close-workspace-modal')?.addEventListener('click', closeWsModal);
        document.getElementById('cancel-workspace-btn')?.addEventListener('click', closeWsModal);

        document.getElementById('save-workspace-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('ws-name-input')?.value.trim();
            const icon = document.getElementById('ws-icon-input')?.value || '📁';
            const color = document.getElementById('ws-color-input')?.value || '#0071e3';

            if (!name) {
                alert('Silakan masukkan nama workspace.');
                return;
            }

            if (!currentUser || !window.FirestoreService) return;

            try {
                const newWs = await window.FirestoreService.createWorkspace(currentUser.uid, { name, icon, color });
                state.activeWorkspaceId = newWs.id;
                closeWsModal();
                showToast(`Workspace "${name}" berhasil dibuat! 📁`);
            } catch (err) {
                alert('Gagal membuat workspace: ' + err.message);
            }
        });

        // 6. Task Forms & Bank Data
        const addTaskBtn = document.getElementById('add-task-btn');
        const addTaskForm = document.getElementById('add-task-form');
        const cancelTaskBtn = document.getElementById('cancel-task-btn');
        const saveTaskBtn = document.getElementById('save-task-btn');

        if (addTaskBtn && addTaskForm) {
            addTaskBtn.addEventListener('click', () => {
                addTaskForm.style.display = addTaskForm.style.display === 'none' ? 'block' : 'none';
                if (addTaskForm.style.display === 'block') {
                    document.getElementById('task-input')?.focus();
                }
            });
        }
        if (cancelTaskBtn && addTaskForm) {
            cancelTaskBtn.addEventListener('click', () => { addTaskForm.style.display = 'none'; });
        }

        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', async () => {
                const text = document.getElementById('task-input')?.value.trim();
                const category = document.getElementById('task-category')?.value || 'Work';
                const status = document.getElementById('task-status-input')?.value || 'pending';
                const workspaceId = document.getElementById('task-workspace-select')?.value || state.activeWorkspaceId || 'all';

                if (!text) {
                    alert('Silakan masukkan deskripsi task.');
                    return;
                }

                if (!currentUser || !window.FirestoreService) return;

                try {
                    await window.FirestoreService.createTask(currentUser.uid, {
                        text,
                        category,
                        status,
                        workspaceId
                    });
                    document.getElementById('task-input').value = '';
                    addTaskForm.style.display = 'none';
                    showToast('Task berhasil disimpan ke cloud! ✓');
                } catch (e) {
                    alert('Gagal menyimpan task: ' + e.message);
                }
            });
        }

        // Toggle Bank Data Vault
        const toggleVaultBtn = document.getElementById('toggle-bank-data-btn');
        const closeVaultBtn = document.getElementById('close-bank-data-btn');
        const dashOpenBankBtn = document.getElementById('dash-open-bank-data');
        const vaultSection = document.getElementById('bank-data-vault-section');

        const openVault = () => {
            navigate('tasks');
            if (vaultSection) vaultSection.style.display = 'block';
            vaultSection?.scrollIntoView({ behavior: 'smooth' });
        };
        const closeVault = () => {
            if (vaultSection) vaultSection.style.display = 'none';
        };

        if (toggleVaultBtn) toggleVaultBtn.addEventListener('click', () => {
            if (vaultSection) {
                vaultSection.style.display = vaultSection.style.display === 'none' ? 'block' : 'none';
            }
        });
        if (closeVaultBtn) closeVaultBtn.addEventListener('click', closeVault);
        if (dashOpenBankBtn) dashOpenBankBtn.addEventListener('click', openVault);

        document.getElementById('bank-data-search')?.addEventListener('input', () => {
            const doneTasks = state.tasks.filter(t => t.done || t.status === 'done');
            renderBankDataVault(doneTasks);
        });

        // 7. Calendar Event Forms & Reminders
        const addEventBtn = document.getElementById('add-event-btn');
        const addEventForm = document.getElementById('add-event-form');
        const cancelEventBtn = document.getElementById('cancel-event-btn');
        const saveEventBtn = document.getElementById('save-event-btn');

        if (addEventBtn && addEventForm) {
            addEventBtn.addEventListener('click', () => {
                addEventForm.style.display = addEventForm.style.display === 'none' ? 'block' : 'none';
                if (addEventForm.style.display === 'block') {
                    document.getElementById('event-date-input').value = new Date().toISOString().split('T')[0];
                }
            });
        }
        if (cancelEventBtn && addEventForm) {
            cancelEventBtn.addEventListener('click', () => { addEventForm.style.display = 'none'; });
        }

        if (saveEventBtn) {
            saveEventBtn.addEventListener('click', async () => {
                const title = document.getElementById('event-title-input')?.value.trim();
                const date = document.getElementById('event-date-input')?.value || new Date().toISOString().split('T')[0];
                const time = document.getElementById('event-time-input')?.value || '10:00';
                const workspaceId = document.getElementById('event-workspace-select')?.value || state.activeWorkspaceId || 'all';

                if (!title) {
                    alert('Silakan masukkan nama acara/agenda.');
                    return;
                }

                if (!currentUser || !window.FirestoreService) return;

                try {
                    await window.FirestoreService.createCalendarEvent(currentUser.uid, {
                        title,
                        date,
                        time,
                        workspaceId
                    });
                    document.getElementById('event-title-input').value = '';
                    addEventForm.style.display = 'none';
                    showToast('Agenda acara tersimpan! 📅');
                } catch (e) {
                    alert('Gagal menyimpan agenda: ' + e.message);
                }
            });
        }

        // Calendar Month Next/Prev
        document.getElementById('cal-prev')?.addEventListener('click', () => {
            state.calCurrentDate.setMonth(state.calCurrentDate.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('cal-next')?.addEventListener('click', () => {
            state.calCurrentDate.setMonth(state.calCurrentDate.getMonth() + 1);
            renderCalendar();
        });

        // Reminders Form Handlers
        const addRemBtn = document.getElementById('add-reminder-btn');
        const addRemForm = document.getElementById('add-reminder-form');
        const cancelRemBtn = document.getElementById('cancel-reminder-btn');
        const saveRemBtn = document.getElementById('save-reminder-btn');

        if (addRemBtn && addRemForm) {
            addRemBtn.addEventListener('click', () => {
                addRemForm.style.display = addRemForm.style.display === 'none' ? 'block' : 'none';
            });
        }
        if (cancelRemBtn && addRemForm) {
            cancelRemBtn.addEventListener('click', () => { addRemForm.style.display = 'none'; });
        }
        if (saveRemBtn) {
            saveRemBtn.addEventListener('click', async () => {
                const title = document.getElementById('reminder-title-input')?.value.trim();
                const remindAt = document.getElementById('reminder-time-input')?.value || null;
                const workspaceId = document.getElementById('reminder-workspace-select')?.value || state.activeWorkspaceId || 'all';

                if (!title) {
                    alert('Silakan masukkan judul pengingat.');
                    return;
                }

                if (!currentUser || !window.FirestoreService) return;

                try {
                    await window.FirestoreService.createReminder(currentUser.uid, {
                        title,
                        remindAt,
                        workspaceId
                    });
                    document.getElementById('reminder-title-input').value = '';
                    addRemForm.style.display = 'none';
                    showToast('Pengingat tersimpan di cloud! ⏰');
                } catch (e) {
                    alert('Gagal menyimpan pengingat: ' + e.message);
                }
            });
        }

        // 8. Note Forms
        const addNoteBtn = document.getElementById('add-note-btn');
        const addNoteForm = document.getElementById('add-note-form');
        const cancelNoteBtn = document.getElementById('cancel-note-btn');
        const saveNoteBtn = document.getElementById('save-note-btn');

        if (addNoteBtn && addNoteForm) {
            addNoteBtn.addEventListener('click', () => {
                addNoteForm.style.display = addNoteForm.style.display === 'none' ? 'block' : 'none';
            });
        }
        if (cancelNoteBtn && addNoteForm) {
            cancelNoteBtn.addEventListener('click', () => { addNoteForm.style.display = 'none'; });
        }

        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', async () => {
                const title = document.getElementById('note-title-input')?.value.trim();
                const body = document.getElementById('note-body-input')?.value.trim();
                const workspaceId = document.getElementById('note-workspace-select')?.value || state.activeWorkspaceId || 'all';

                if (!title && !body) {
                    alert('Silakan tulis judul atau isi catatan.');
                    return;
                }

                if (!currentUser || !window.FirestoreService) return;

                try {
                    await window.FirestoreService.createNote(currentUser.uid, {
                        title: title || 'Catatan Baru',
                        body: body || '',
                        type: 'note',
                        workspaceId
                    });
                    document.getElementById('note-title-input').value = '';
                    document.getElementById('note-body-input').value = '';
                    addNoteForm.style.display = 'none';
                    showToast('Catatan tersimpan! 📝');
                } catch (e) {
                    alert('Gagal menyimpan catatan: ' + e.message);
                }
            });
        }

        // Edit Note Modal
        const editNoteModal = document.getElementById('edit-note-modal');
        const closeEditNoteModal = () => { if (editNoteModal) editNoteModal.style.display = 'none'; };
        document.getElementById('close-edit-note-modal')?.addEventListener('click', closeEditNoteModal);
        document.getElementById('cancel-edit-note-btn')?.addEventListener('click', closeEditNoteModal);

        document.getElementById('save-edit-note-btn')?.addEventListener('click', async () => {
            const id = document.getElementById('edit-note-id')?.value;
            const title = document.getElementById('edit-note-title')?.value.trim();
            const body = document.getElementById('edit-note-body')?.value.trim();

            if (!id || !currentUser || !window.FirestoreService) return;

            try {
                await window.FirestoreService.updateNote(currentUser.uid, id, {
                    title: title || 'Catatan',
                    body: body || ''
                });
                closeEditNoteModal();
                showToast('Perubahan catatan disimpan! ✓');
            } catch (e) {
                alert('Gagal menyimpan perubahan catatan: ' + e.message);
            }
        });

        // 9. Eraser AI Markdown Input Realtime
        const eraserInput = document.getElementById('eraser-markdown-input');
        if (eraserInput) {
            eraserInput.addEventListener('input', (e) => {
                const text = e.target.value;
                updateEraserPreview(text);
                queueEraserSave(text);
            });
        }

        // Eraser Sub-Tabs Switcher (Studio Canvas vs Official Web Embed)
        document.querySelectorAll('.eraser-tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.eraser-tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const target = tab.dataset.tab;
                const canvasView = document.getElementById('eraser-canvas-view');
                const embedView = document.getElementById('eraser-embed-view');

                if (target === 'embed') {
                    if (canvasView) canvasView.style.display = 'none';
                    if (embedView) embedView.style.display = 'block';
                } else {
                    if (canvasView) canvasView.style.display = 'grid';
                    if (embedView) embedView.style.display = 'none';
                }
            });
        });

        // 10. AI Daily Brief & Assistant Chat
        document.getElementById('refresh-brief-btn')?.addEventListener('click', () => {
            generateAIBrief();
        });

        const aiInput = document.getElementById('ai-chat-input');
        const aiSendBtn = document.getElementById('ai-chat-send');

        const handleSendAI = () => {
            const query = aiInput?.value.trim();
            if (!query) return;
            aiInput.value = '';
            askAI(query);
        };

        if (aiSendBtn) aiSendBtn.addEventListener('click', handleSendAI);
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSendAI();
            });
        }

        // Quick AI Prompts
        document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.textContent.replace(/^"|"$/g, '').trim();
                askAI(prompt);
            });
        });

        // 11. Settings Handlers
        document.getElementById('save-name-btn')?.addEventListener('click', async () => {
            const newName = document.getElementById('settings-name')?.value.trim();
            if (!newName || !currentUser || !window.FirestoreService) return;

            try {
                await window.FirestoreService.updateUserProfile(currentUser.uid, { displayName: newName });
                document.getElementById('user-name').textContent = newName;
                showToast('Nama profil berhasil disimpan! ✓');
            } catch (e) {
                alert('Gagal menyimpan nama: ' + e.message);
            }
        });

        document.getElementById('save-api-key-btn')?.addEventListener('click', () => {
            const key = document.getElementById('gemini-api-key-input')?.value.trim();
            const model = document.getElementById('gemini-model-select')?.value || 'gemini-3.8-flash';

            if (key) {
                localStorage.setItem('gemini_api_key', key);
                localStorage.setItem('gemini_model', model);
                state.geminiApiKey = key;
                state.geminiModel = model;
                showToast('Gemini API key tersimpan! Menghubungkan…');
                generateAIBrief();
            } else {
                alert('Silakan masukkan API key yang valid.');
            }
        });

        document.getElementById('clear-api-key-btn')?.addEventListener('click', () => {
            localStorage.removeItem('gemini_api_key');
            state.geminiApiKey = '';
            document.getElementById('gemini-api-key-input').value = '';
            showToast('Gemini custom key dihapus.');
            generateAIBrief();
        });

        // Initialize Firebase Authentication
        initAuth();
    });

})();
