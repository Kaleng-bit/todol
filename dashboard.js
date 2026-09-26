// --- FIREBASE CONFIGURATION ---
// TODO: Replace with the exact same config from script.js
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let app, auth;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
}

document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const dateDisplay = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);

    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');

    if (auth) {
        // Real Firebase Auth
        auth.onAuthStateChanged((user) => {
            if (user) {
                userNameEl.textContent = user.displayName || "User";
                if (user.photoURL) {
                    userAvatarEl.src = user.photoURL;
                }
            } else {
                // If not logged in, redirect back to landing page
                window.location.href = "index.html";
            }
        });

        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = "index.html";
            });
        });
    } else {
        // MOCKUP MODE
        userNameEl.textContent = "Demo User";
        logoutBtn.addEventListener('click', () => {
            window.location.href = "index.html";
        });
    }

    // Audio record simulation
    const recordBtn = document.getElementById('record-btn');
    let isRecording = false;
    recordBtn.addEventListener('click', () => {
        isRecording = !isRecording;
        if (isRecording) {
            recordBtn.textContent = "🛑 Stop Recording";
            recordBtn.style.background = "var(--danger)";
            recordBtn.classList.add('pulse');
        } else {
            recordBtn.textContent = "🎙️ Record Audio";
            recordBtn.style.background = "";
            recordBtn.classList.remove('pulse');
            alert("Audio saved! AI is processing the transcript and extracting action items...");
        }
    });
    // Add New Task
    const newTaskBtn = document.getElementById('new-task-btn');
    const taskList = document.querySelector('.task-list');
    
    if (newTaskBtn) {
        newTaskBtn.addEventListener('click', () => {
            const taskText = prompt("Enter your new task:");
            if (taskText && taskText.trim() !== "") {
                const label = document.createElement('label');
                label.className = 'task-item';
                label.innerHTML = `
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="task-text">${taskText}</span>
                    <span class="task-tag personal">New</span>
                `;
                taskList.prepend(label);
                
                // Update badge
                const badge = document.querySelector('.tasks-widget .badge');
                if (badge) {
                    badge.textContent = parseInt(badge.textContent) + 1;
                }
                
                // Re-attach listener to new checkbox
                attachCheckboxListeners();
            }
        });
    }

    // Sidebar Navigation
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Checkbox Interactions
    function attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
        checkboxes.forEach(cb => {
            // Remove old listeners to prevent duplicates
            const newCb = cb.cloneNode(true);
            cb.parentNode.replaceChild(newCb, cb);
            
            newCb.addEventListener('change', function() {
                const taskItem = this.closest('.task-item');
                if (this.checked) {
                    taskItem.style.opacity = '0.5';
                    taskItem.style.transition = 'all 0.5s ease';
                    // Optional: remove after 2 seconds
                    setTimeout(() => {
                        taskItem.style.display = 'none';
                        // Update badge
                        const badge = document.querySelector('.tasks-widget .badge');
                        if (badge) {
                            const count = parseInt(badge.textContent);
                            if (count > 0) badge.textContent = count - 1;
                        }
                    }, 2000);
                } else {
                    taskItem.style.opacity = '1';
                }
            });
        });
    }
    
    // Attach initial listeners
    attachCheckboxListeners();

    // Notes View All Simulation
    const viewAllLinks = document.querySelectorAll('.view-all');
    viewAllLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert("This would open the full Notes archive.");
        });
    });

});
