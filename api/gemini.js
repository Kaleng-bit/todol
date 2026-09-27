// Vercel Serverless Function: POST /api/gemini
// Handles AI Assistant generation using GEMINI_API_KEY environment variable securely on server

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid JSON body' });
            }
        }

        const { prompt, model = 'gemini-3.8-flash' } = body || {};

        if (!prompt) {
            return res.status(400).json({ error: 'Field "prompt" is required' });
        }

        // Priority: Vercel environment variable GEMINI_API_KEY, fallback to client header x-gemini-key
        const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-key'];

        if (!apiKey) {
            return res.status(503).json({
                error: 'NO_API_KEY',
                message: 'Gemini API key is not configured in Vercel environment variables (GEMINI_API_KEY) and no custom key was provided.'
            });
        }

        // Available models on Google Generative Language API
        // gemini-3.8-flash, gemini-2.0-flash, gemini-1.5-flash
        const modelName = model || 'gemini-3.8-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!geminiRes.ok) {
            let errorDetail = `Upstream error HTTP ${geminiRes.status}`;
            try {
                const errJson = await geminiRes.json();
                if (errJson.error?.message) {
                    errorDetail = errJson.error.message;
                }
            } catch (_) {}
            return res.status(geminiRes.status).json({ error: errorDetail });
        }

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({
            text,
            model: modelName
        });
    } catch (err) {
        console.error('Error in /api/gemini:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
