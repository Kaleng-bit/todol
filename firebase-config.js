// ============================================================
// PERSONAL OS — FIREBASE INITIALIZATION & CONFIGURATION SERVICE
// Supports Vercel Serverless (/api/config), Window Config, and LocalStorage
// ============================================================

(function (window) {
    'use strict';

    // Default placeholder configuration
    const DEFAULT_CONFIG = {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    };

    let activeConfig = null;
    let firebaseAppInstance = null;
    let authInstance = null;
    let dbInstance = null;
    let hasServerGemini = false;
    let isInitialized = false;
    let initPromise = null;

    /**
     * Check if a config object has a valid, non-placeholder API key
     */
    function isValidConfig(cfg) {
        if (!cfg) return false;
        return typeof cfg.apiKey === 'string' &&
            cfg.apiKey.trim().length > 10 &&
            !cfg.apiKey.includes('YOUR_API_KEY') &&
            !cfg.apiKey.includes('PLACEHOLDER') &&
            Boolean(cfg.projectId && !cfg.projectId.includes('YOUR_PROJECT_ID'));
    }

    /**
     * Fetch configuration from serverless /api/config if available
     */
    async function fetchServerConfig() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch('/api/config', {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.hasGeminiKey) {
                    hasServerGemini = true;
                }
                if (isValidConfig(data)) {
                    console.log('[Personal OS] Loaded Firebase config from /api/config');
                    return data;
                }
            }
        } catch (_) {
            // Local dev without serverless or network offline
        }
        return null;
    }

    /**
     * Load configuration in priority order:
     * 0. process.env (Next.js / Bundlers)
     * 1. Window object (populated by /api/config?format=js or pre-injected)
     * 2. Vercel serverless endpoint (/api/config)
     * 3. LocalStorage override
     */
    async function resolveConfig() {
        // 0. Check process.env if available in client/bundler environment
        if (typeof process !== 'undefined' && process.env) {
            const envConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
            };
            if (isValidConfig(envConfig)) {
                return envConfig;
            }
        }

        // 1. Check window object
        if (window.__FIREBASE_CONFIG__ && isValidConfig(window.__FIREBASE_CONFIG__)) {
            return window.__FIREBASE_CONFIG__;
        }
        if (window.ENV_FIREBASE_CONFIG && isValidConfig(window.ENV_FIREBASE_CONFIG)) {
            return window.ENV_FIREBASE_CONFIG;
        }

        // 2. Check Vercel serverless API (/api/config)
        const serverConfig = await fetchServerConfig();
        if (serverConfig) {
            return serverConfig;
        }

        // 3. Check LocalStorage fallback
        try {
            const savedLocal = localStorage.getItem('personal_os_firebase_config');
            if (savedLocal) {
                const parsed = JSON.parse(savedLocal);
                if (isValidConfig(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('[Personal OS] Failed to read local config:', e);
        }

        return DEFAULT_CONFIG;
    }

    /**
     * Initialize Firebase App, Auth, and Firestore
     */
    async function init() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            activeConfig = await resolveConfig();

            if (typeof firebase === 'undefined') {
                console.error('[Personal OS] Firebase SDK scripts not loaded!');
                return { isConfigured: false, error: 'Firebase SDK not found' };
            }

            if (isValidConfig(activeConfig)) {
                try {
                    // Prevent duplicate app initialization
                    if (!firebase.apps || !firebase.apps.length) {
                        firebaseAppInstance = firebase.initializeApp(activeConfig);
                    } else {
                        firebaseAppInstance = firebase.app();
                    }

                    authInstance = firebase.auth();
                    dbInstance = firebase.firestore();

                    // Optional: Enable offline persistence for Firestore if supported
                    try {
                        dbInstance.enablePersistence({ synchronizeTabs: true }).catch(err => {
                            if (err.code === 'failed-precondition' || err.code === 'unimplemented') {
                                // Multiple tabs or browser not supported, graceful continue
                            }
                        });
                    } catch (_) {}

                    isInitialized = true;
                    console.log('[Personal OS] Firebase & Firestore initialized successfully for project:', activeConfig.projectId);
                    return { isConfigured: true, app: firebaseAppInstance, auth: authInstance, db: dbInstance };
                } catch (err) {
                    console.error('[Personal OS] Firebase initialization error:', err);
                    return { isConfigured: false, error: err.message };
                }
            } else {
                console.warn('[Personal OS] Firebase is not yet configured. Real authentication requires valid credentials.');
                return { isConfigured: false, error: 'NOT_CONFIGURED' };
            }
        })();

        return initPromise;
    }

    // Public API
    window.FirebaseApp = {
        init,
        isConfigured: () => isValidConfig(activeConfig),
        hasServerGemini: () => hasServerGemini,
        getConfig: () => ({ ...activeConfig }),
        getAuth: () => authInstance,
        getDb: () => dbInstance,
        getCurrentUser: () => authInstance ? authInstance.currentUser : null,

        /**
         * Save custom configuration to localStorage (useful for UI setup modal)
         */
        saveConfig: (newConfig) => {
            if (!isValidConfig(newConfig)) {
                throw new Error('Konfigurasi Firebase tidak lengkap atau tidak valid.');
            }
            localStorage.setItem('personal_os_firebase_config', JSON.stringify(newConfig));
            // Reload page to reinitialize cleanly
            window.location.reload();
        },

        /**
         * Clear stored custom configuration
         */
        clearConfig: () => {
            localStorage.removeItem('personal_os_firebase_config');
            window.location.reload();
        },

        /**
         * Trigger Google OAuth Popup Sign-In
         */
        signInWithGoogle: async () => {
            await init();
            if (!authInstance) {
                throw new Error('Firebase Authentication belum dikonfigurasi. Silakan tambahkan konfigurasi Firebase.');
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            return authInstance.signInWithPopup(provider);
        },

        /**
         * Sign out from Firebase
         */
        signOut: async () => {
            await init();
            if (authInstance) {
                return authInstance.signOut();
            }
        },

        /**
         * Auth State Listener helper
         */
        onAuthStateChanged: async (callback) => {
            await init();
            if (authInstance) {
                return authInstance.onAuthStateChanged(callback);
            } else {
                callback(null);
                return () => {};
            }
        }
    };

    // Auto-trigger initialization on script load
    init();

})(window);
