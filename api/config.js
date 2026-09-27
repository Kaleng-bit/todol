// Vercel Serverless Function: GET /api/config
// Safely exposes Firebase public client configuration from Vercel Environment Variables

module.exports = (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const config = {
        apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "",
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    };

    return res.status(200).json(config);
};
