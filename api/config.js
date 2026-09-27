// Vercel Serverless Function: GET /api/config
// Safely exposes Firebase public client configuration from Vercel Environment Variables
// Supports NEXT_PUBLIC_FIREBASE_*, FIREBASE_*, and VITE_FIREBASE_* naming conventions

module.exports = (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "",
        hasGeminiKey: Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY)
    };

    // If client loads via <script src="/api/config?format=js"></script>
    if (req.query && req.query.format === 'js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send(`window.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};`);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(config);
};
