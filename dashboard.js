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
});
