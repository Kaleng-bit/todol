// ============================================================
// PERSONAL OS — LANDING PAGE LOGIC & AUTHENTICATION
// True Firebase Authentication with Google Sign-In & Firestore
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Scroll reveal animation
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

    revealOnScroll();
    window.addEventListener('scroll', revealOnScroll);

    // 2. Smooth scrolling for navigation links
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

    // 3. Mockup interactivity hover preview
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

    // ============================================================
    // 4. FIREBASE AUTHENTICATION FLOW
    // ============================================================
    const loginBtns = [
        document.getElementById('login-btn'),
        document.getElementById('login-btn-bottom')
    ].filter(Boolean);
    const getStartedBtn = document.getElementById('get-started-btn');

    const setupModal = document.getElementById('firebase-setup-modal');
    const closeSetupModalBtn = document.getElementById('close-setup-modal');
    const cancelSetupModalBtn = document.getElementById('cancel-setup-modal');
    const saveSetupBtn = document.getElementById('save-setup-btn');

    // Populate setup modal fields with active config if available
    function fillSetupFields() {
        if (!setupModal || !window.FirebaseApp) return;
        const cfg = window.FirebaseApp.getConfig();
        document.getElementById('cfg-apiKey').value = cfg.apiKey || '';
        document.getElementById('cfg-authDomain').value = cfg.authDomain || '';
        document.getElementById('cfg-projectId').value = cfg.projectId || '';
        document.getElementById('cfg-storageBucket').value = cfg.storageBucket || '';
        document.getElementById('cfg-messagingSenderId').value = cfg.messagingSenderId || '';
        document.getElementById('cfg-appId').value = cfg.appId || '';
    }

    function openSetupModal() {
        fillSetupFields();
        if (setupModal) setupModal.style.display = 'flex';
    }

    function closeSetupModal() {
        if (setupModal) setupModal.style.display = 'none';
    }

    if (closeSetupModalBtn) closeSetupModalBtn.addEventListener('click', closeSetupModal);
    if (cancelSetupModalBtn) cancelSetupModalBtn.addEventListener('click', closeSetupModal);

    if (saveSetupBtn) {
        saveSetupBtn.addEventListener('click', () => {
            const newConfig = {
                apiKey: document.getElementById('cfg-apiKey').value.trim(),
                authDomain: document.getElementById('cfg-authDomain').value.trim(),
                projectId: document.getElementById('cfg-projectId').value.trim(),
                storageBucket: document.getElementById('cfg-storageBucket').value.trim(),
                messagingSenderId: document.getElementById('cfg-messagingSenderId').value.trim(),
                appId: document.getElementById('cfg-appId').value.trim()
            };

            try {
                window.FirebaseApp.saveConfig(newConfig);
            } catch (err) {
                alert('Gagal menyimpan: ' + err.message);
            }
        });
    }

    // Google Sign-In Handler
    async function handleGoogleLogin(triggerBtn) {
        // Ensure Firebase is initialized
        const initResult = await window.FirebaseApp.init();

        if (!initResult.isConfigured) {
            openSetupModal();
            return;
        }

        const originalText = triggerBtn ? triggerBtn.innerHTML : 'Continue with Google';
        if (triggerBtn) {
            triggerBtn.innerHTML = '🔄 Menghubungkan ke Google…';
            triggerBtn.disabled = true;
        }

        try {
            const result = await window.FirebaseApp.signInWithGoogle();
            const user = result.user;
            console.log('[Personal OS] Logged in successfully:', user.displayName, `(${user.uid})`);

            // Sync user profile in Firestore
            if (window.FirestoreService) {
                await window.FirestoreService.syncUserProfile(user);
            }

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('[Personal OS] Login failed:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed popup, do not show noisy alert
            } else if (error.code === 'auth/unauthorized-domain') {
                alert('Domain ini (' + window.location.hostname + ') belum diizinkan di Firebase Console > Authentication > Settings > Authorized domains.');
            } else {
                alert('Google login gagal: ' + (error.message || error));
            }
        } finally {
            if (triggerBtn) {
                triggerBtn.innerHTML = originalText;
                triggerBtn.disabled = false;
            }
        }
    }

    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => handleGoogleLogin(btn));
    });

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (loginBtns[0]) {
                handleGoogleLogin(loginBtns[0]);
            }
        });
    }

    // Auto-redirect if already signed in
    if (window.FirebaseApp) {
        window.FirebaseApp.onAuthStateChanged((user) => {
            if (user) {
                console.log('[Personal OS] User is already authenticated. Navigating to dashboard…');
                window.location.href = 'dashboard.html';
            }
        });
    }
});
