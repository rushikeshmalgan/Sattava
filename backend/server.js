require('dotenv').config({ path: '../.env' }); // Load .env from root
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = null;

// Helper to Base64 encode
const getBasicAuthString = () => {
    return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
};

const getToken = async () => {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${getBasicAuthString()}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=basic',
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('FatSecret Token Error:', err);
        throw new Error('Failed to fetch FatSecret token');
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // 5 min buffer
    return cachedToken;
};

app.get('/api/foods/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const token = await getToken();
        const url = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=15`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.error) {
            console.error('FatSecret API error:', data.error);
            return res.status(502).json({ error: data.error.message });
        }

        // Normalize response
        let foods = data.foods?.food;
        if (!foods) foods = [];
        if (!Array.isArray(foods)) foods = [foods];

        res.json(foods);
    } catch (error) {
        console.error('Proxy search error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FatSecret Proxy Server running on http://0.0.0.0:${PORT}`);
    console.log(`This proxy uses the VPN/network of this computer, avoiding mobile IP issues.`);
});
