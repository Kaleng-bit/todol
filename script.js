// --- FIREBASE CONFIGURATION ---
// TODO: Replace with your actual Firebase Project Configuration
// 1. Go to https://console.firebase.google.com/
// 2. Create a Project
// 3. Go to Build > Authentication > Get Started > Sign-in method > Enable Google
// 4. Go to Project Settings > General > Add Web App (</>)
// 5. Copy the config below
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
}

document.addEventListener('DOMContentLoaded', () => {
    // Scroll reveal animation
    const reveals = document.querySelectorAll('.reveal');

    function revealOnScroll() {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;

        reveals.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    }

    // Trigger once on load
    revealOnScroll();

    // Add scroll event listener
    window.addEventListener('scroll', revealOnScroll);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mockup interactivity simulation
    const taskItems = document.querySelectorAll('.widget.task-widget li');
    taskItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateX(5px)';
            item.style.color = '#fff';
        });
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateX(0)';
            item.style.color = 'inherit';
        });
    });

    // --- GOOGLE LOGIN LOGIC ---
    const loginBtns = [document.getElementById('login-btn'), document.getElementById('login-btn-bottom')];
    const getStartedBtn = document.getElementById('get-started-btn');
    
    // Wire up "Get Started" to trigger login
    if (getStartedBtn && loginBtns[0]) {
        getStartedBtn.addEventListener('click', () => {
            loginBtns[0].click();
        });
    }

    const howItWorksBtn = document.getElementById('how-it-works-btn');
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', () => {
            const workflowSection = document.getElementById('workflow');
            if (workflowSection) {
                window.scrollTo({
                    top: workflowSection.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    }
    
    loginBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                // MOCKUP MODE: If Firebase is not configured, simulate login to show dashboard
                alert("Simulasi Login Berhasil!\n\n(Karena konfigurasi Firebase API Key belum diisi, kita akan langsung diarahkan ke Mockup Dashboard).");
                window.location.href = "dashboard.html";
                return;
            }

            // ACTUAL FIREBASE LOGIN
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).then((result) => {
                // The signed-in user info
                const user = result.user;
                console.log("Logged in as:", user.displayName);
                
                // Redirect to dashboard
                window.location.href = "dashboard.html";
            }).catch((error) => {
                console.error("Login failed:", error);
                alert("Gagal login: " + error.message);
            });
        });
    });

    // Check if user is already logged in
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, automatically redirect to dashboard
                // window.location.href = "dashboard.html"; 
                // (Commented out to prevent infinite loops if they go back to landing page)
            }
        });
    }
});
