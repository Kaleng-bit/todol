// ============================================================
// PERSONAL OS — FIRESTORE SERVICE DATA LAYER
// All data operations strictly isolated and scoped to users/{uid}
// ============================================================

(function (window) {
    'use strict';

    function getDb() {
        const db = window.FirebaseApp?.getDb();
        if (!db) {
            throw new Error('Firestore Database belum terhubung.');
        }
        return db;
    }

    function getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    const FirestoreService = {
        // ========================================================
        // 1. USER PROFILE (users/{uid})
        // ========================================================
        async syncUserProfile(user) {
            if (!user || !user.uid) return null;
            const db = getDb();
            const userRef = db.collection('users').doc(user.uid);

            const doc = await userRef.get();
            const now = getServerTimestamp();

            if (!doc.exists) {
                // First-time user creation
                const profileData = {
                    uid: user.uid,
                    displayName: user.displayName || 'Personal OS User',
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                    createdAt: now,
                    updatedAt: now,
                    lastLoginAt: now
                };
                await userRef.set(profileData);

                // Auto-create standard workspaces for first-time user
                await FirestoreService.seedDefaultWorkspaces(user.uid);
                return profileData;
            } else {
                // Existing user: update latest login info
                const updates = {
                    displayName: user.displayName || doc.data().displayName || 'Personal OS User',
                    email: user.email || doc.data().email || '',
                    photoURL: user.photoURL || doc.data().photoURL || '',
                    lastLoginAt: now,
                    updatedAt: now
                };
                await userRef.update(updates);
                return { ...doc.data(), ...updates };
            }
        },

        async getUserProfile(uid) {
            const db = getDb();
            const doc = await db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        },

        async updateUserProfile(uid, data) {
            const db = getDb();
            await db.collection('users').doc(uid).set({
                ...data,
                updatedAt: getServerTimestamp()
            }, { merge: true });
        },

        // ========================================================
        // 2. WORKSPACES (users/{uid}/workspaces/{workspaceId})
        // ========================================================
        async seedDefaultWorkspaces(uid) {
            const db = getDb();
            const wsCol = db.collection('users').doc(uid).collection('workspaces');
            const snapshot = await wsCol.limit(1).get();
            if (!snapshot.empty) return;

            const defaults = [
                { name: 'Work', icon: '💼', color: '#0071e3', isDefault: true },
                { name: 'Personal', icon: '🏠', color: '#34c759', isDefault: false },
                { name: 'Freelance', icon: '🚀', color: '#ff9500', isDefault: false }
            ];

            const batch = db.batch();
            defaults.forEach((ws) => {
                const docRef = wsCol.doc();
                batch.set(docRef, {
                    ...ws,
                    userId: uid,
                    createdAt: getServerTimestamp(),
                    updatedAt: getServerTimestamp()
                });
            });
            await batch.commit();
        },

        async getWorkspaces(uid) {
            const db = getDb();
            const snap = await db.collection('users').doc(uid)
                .collection('workspaces')
                .orderBy('createdAt', 'asc')
                .get();

            const items = [];
            snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

            // If empty, auto seed
            if (items.length === 0) {
                await FirestoreService.seedDefaultWorkspaces(uid);
                return FirestoreService.getWorkspaces(uid);
            }
            return items;
        },

        subscribeWorkspaces(uid, callback) {
            const db = getDb();
            return db.collection('users').doc(uid)
                .collection('workspaces')
                .orderBy('createdAt', 'asc')
                .onSnapshot(snap => {
                    const items = [];
                    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                    callback(items);
                }, err => {
                    console.error('[FirestoreService] subscribeWorkspaces error:', err);
                });
        },

        async createWorkspace(uid, wsData) {
            const db = getDb();
            const docRef = db.collection('users').doc(uid).collection('workspaces').doc();
            const data = {
                name: wsData.name.trim(),
                icon: wsData.icon || '📁',
                color: wsData.color || '#0071e3',
                userId: uid,
                isDefault: false,
                createdAt: getServerTimestamp(),
                updatedAt: getServerTimestamp()
            };
            await docRef.set(data);
            return { id: docRef.id, ...data };
        },

        async updateWorkspace(uid, wsId, updates) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('workspaces').doc(wsId).update({
                ...updates,
                updatedAt: getServerTimestamp()
            });
        },

        async deleteWorkspace(uid, wsId) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('workspaces').doc(wsId).delete();
        },

        // ========================================================
        // 3. TASKS (users/{uid}/tasks/{taskId})
        // ========================================================
        subscribeTasks(uid, callback) {
            const db = getDb();
            return db.collection('users').doc(uid)
                .collection('tasks')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snap => {
                    const tasks = [];
                    snap.forEach(doc => {
                        const d = doc.data();
                        tasks.push({
                            id: doc.id,
                            ...d,
                            // Ensure backward compatibility of field names
                            text: d.text || d.title || '',
                            title: d.title || d.text || '',
                            done: d.status === 'done' || Boolean(d.done)
                        });
                    });
                    callback(tasks);
                }, err => {
                    console.error('[FirestoreService] subscribeTasks error:', err);
                });
        },

        async createTask(uid, taskData) {
            const db = getDb();
            const docRef = db.collection('users').doc(uid).collection('tasks').doc();
            const title = (taskData.text || taskData.title || '').trim();
            const status = taskData.status || (taskData.done ? 'done' : 'pending');

            const payload = {
                userId: uid,
                workspaceId: taskData.workspaceId || 'all',
                title: title,
                text: title,
                description: taskData.description || '',
                category: taskData.category || 'Work',
                priority: taskData.priority || 'medium',
                status: status, // 'pending' | 'in-progress' | 'done'
                done: status === 'done',
                dueDate: taskData.dueDate || null,
                createdAt: getServerTimestamp(),
                updatedAt: getServerTimestamp()
            };

            await docRef.set(payload);
            return { id: docRef.id, ...payload };
        },

        async updateTask(uid, taskId, updates) {
            const db = getDb();
            const patch = { ...updates, updatedAt: getServerTimestamp() };
            if (patch.status) {
                patch.done = patch.status === 'done';
            }
            if (patch.title && !patch.text) {
                patch.text = patch.title;
            }
            await db.collection('users').doc(uid).collection('tasks').doc(taskId).update(patch);
        },

        async deleteTask(uid, taskId) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('tasks').doc(taskId).delete();
        },

        // ========================================================
        // 4. NOTES (users/{uid}/notes/{noteId})
        // ========================================================
        subscribeNotes(uid, callback) {
            const db = getDb();
            return db.collection('users').doc(uid)
                .collection('notes')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snap => {
                    const notes = [];
                    snap.forEach(doc => {
                        const d = doc.data();
                        notes.push({
                            id: doc.id,
                            ...d,
                            body: d.body || d.content || '',
                            content: d.content || d.body || ''
                        });
                    });
                    callback(notes);
                }, err => {
                    console.error('[FirestoreService] subscribeNotes error:', err);
                });
        },

        async createNote(uid, noteData) {
            const db = getDb();
            const docRef = db.collection('users').doc(uid).collection('notes').doc();
            const title = (noteData.title || 'Catatan Baru').trim();
            const body = (noteData.body || noteData.content || '').trim();

            const payload = {
                userId: uid,
                workspaceId: noteData.workspaceId || 'all',
                title: title,
                body: body,
                content: body,
                type: noteData.type || 'note', // 'note' | 'audio'
                audioDuration: noteData.audioDuration || null,
                date: noteData.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                createdAt: getServerTimestamp(),
                updatedAt: getServerTimestamp()
            };

            await docRef.set(payload);
            return { id: docRef.id, ...payload };
        },

        async updateNote(uid, noteId, updates) {
            const db = getDb();
            const patch = { ...updates, updatedAt: getServerTimestamp() };
            if (patch.body && !patch.content) patch.content = patch.body;
            if (patch.content && !patch.body) patch.body = patch.content;
            await db.collection('users').doc(uid).collection('notes').doc(noteId).update(patch);
        },

        async deleteNote(uid, noteId) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('notes').doc(noteId).delete();
        },

        // ========================================================
        // 5. CALENDAR EVENTS (users/{uid}/calendarEvents/{eventId})
        // ========================================================
        subscribeCalendarEvents(uid, callback) {
            const db = getDb();
            return db.collection('users').doc(uid)
                .collection('calendarEvents')
                .orderBy('date', 'asc')
                .onSnapshot(snap => {
                    const events = [];
                    snap.forEach(doc => {
                        events.push({ id: doc.id, ...doc.data() });
                    });
                    callback(events);
                }, err => {
                    console.error('[FirestoreService] subscribeCalendarEvents error:', err);
                });
        },

        async createCalendarEvent(uid, eventData) {
            const db = getDb();
            const docRef = db.collection('users').doc(uid).collection('calendarEvents').doc();
            const payload = {
                userId: uid,
                workspaceId: eventData.workspaceId || 'all',
                title: eventData.title.trim(),
                description: eventData.description || '',
                date: eventData.date || new Date().toISOString().split('T')[0],
                time: eventData.time || '10:00',
                location: eventData.location || 'Online',
                done: Boolean(eventData.done),
                createdAt: getServerTimestamp(),
                updatedAt: getServerTimestamp()
            };
            await docRef.set(payload);
            return { id: docRef.id, ...payload };
        },

        async updateCalendarEvent(uid, eventId, updates) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('calendarEvents').doc(eventId).update({
                ...updates,
                updatedAt: getServerTimestamp()
            });
        },

        async deleteCalendarEvent(uid, eventId) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('calendarEvents').doc(eventId).delete();
        },

        // ========================================================
        // 6. REMINDERS (users/{uid}/reminders/{reminderId})
        // ========================================================
        subscribeReminders(uid, callback) {
            const db = getDb();
            return db.collection('users').doc(uid)
                .collection('reminders')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snap => {
                    const reminders = [];
                    snap.forEach(doc => {
                        reminders.push({ id: doc.id, ...doc.data() });
                    });
                    callback(reminders);
                }, err => {
                    console.error('[FirestoreService] subscribeReminders error:', err);
                });
        },

        async createReminder(uid, remData) {
            const db = getDb();
            const docRef = db.collection('users').doc(uid).collection('reminders').doc();
            const payload = {
                userId: uid,
                workspaceId: remData.workspaceId || 'all',
                title: remData.title.trim(),
                remindAt: remData.remindAt || null,
                completed: false,
                createdAt: getServerTimestamp(),
                updatedAt: getServerTimestamp()
            };
            await docRef.set(payload);
            return { id: docRef.id, ...payload };
        },

        async updateReminder(uid, remId, updates) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('reminders').doc(remId).update({
                ...updates,
                updatedAt: getServerTimestamp()
            });
        },

        async deleteReminder(uid, remId) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('reminders').doc(remId).delete();
        },

        // ========================================================
        // 7. ERASER STUDIO DOC (users/{uid}/documents/eraserCanvas)
        // ========================================================
        async getEraserDoc(uid) {
            const db = getDb();
            const doc = await db.collection('users').doc(uid).collection('documents').doc('eraserCanvas').get();
            return doc.exists ? doc.data().content : null;
        },

        async saveEraserDoc(uid, content) {
            const db = getDb();
            await db.collection('users').doc(uid).collection('documents').doc('eraserCanvas').set({
                content: content,
                updatedAt: getServerTimestamp()
            }, { merge: true });
        }
    };

    window.FirestoreService = FirestoreService;

})(window);
