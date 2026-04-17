require('dotenv').config({ path: '../.env' }); // Load .env from root
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// Read secrets — prefer non-prefixed names (server-only),
// fall back to EXPO_PUBLIC_ names for backwards compatibility.
const CLIENT_ID =
    process.env.FATSECRET_CLIENT_ID ||
    process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID;
const CLIENT_SECRET =
    process.env.FATSECRET_CLIENT_SECRET ||
    process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
        '❌ Missing FatSecret credentials!\n' +
        '   Set FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET in your .env file.'
    );
    process.exit(1);
}

let cachedToken = null;
let tokenExpiry = null;

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

// ── Fetch public IP so the user knows what to whitelist in FatSecret ──
const fetchPublicIp = async () => {
    const services = [
        'https://api.ipify.org?format=json',
        'https://httpbin.org/ip',
        'https://api.my-ip.io/v2/ip.json',
    ];

    for (const url of services) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            const data = await res.json();
            // Different services use different keys
            return data.ip || data.origin || null;
        } catch {
            continue; // Try next service
        }
    }
    return null;
};

// ── Health check — lets the app verify the proxy is reachable ──
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Food search endpoint ──
app.get('/api/foods/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
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
            const errCode = data.error.code;
            const errMsg = data.error.message || 'Unknown FatSecret error';

            console.error('FatSecret API error:', data.error);

            // ── Error 21: Invalid IP address ──
            if (errCode === 21 || errMsg.toLowerCase().includes('invalid ip')) {
                const publicIp = await fetchPublicIp();
                const ipInfo = publicIp
                    ? `Your server's public IP is: ${publicIp}`
                    : 'Could not detect your public IP automatically.';

                console.error(
                    '\n' +
                    '═══════════════════════════════════════════════════════\n' +
                    '  ❌ FatSecret IP RESTRICTION ERROR (Code 21)\n' +
                    '═══════════════════════════════════════════════════════\n' +
                    `  ${ipInfo}\n\n` +
                    '  TO FIX:\n' +
                    '  1. Go to https://platform.fatsecret.com/api/\n' +
                    '  2. Log in → Open your API application\n' +
                    '  3. Find "IP Restrictions" or "Allowed IPs"\n' +
                    `  4. Add this IP: ${publicIp || '<your public IP>'}\n` +
                    '  5. Save & wait 1-2 minutes for it to propagate\n' +
                    '═══════════════════════════════════════════════════════\n'
                );

                return res.status(502).json({
                    error: `IP address blocked by FatSecret. Whitelist ${publicIp || 'your public IP'} at platform.fatsecret.com → API Settings → IP Restrictions.`,
                    code: 'IP_RESTRICTED',
                    publicIp: publicIp,
                });
            }

            return res.status(502).json({ error: errMsg });
        }

        // Normalize: FatSecret returns single item as object, not array
        let foods = data.foods?.food;
        if (!foods) foods = [];
        if (!Array.isArray(foods)) foods = [foods];

        res.json(foods);
    } catch (error) {
        console.error('Proxy search error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── Start server & print all LAN IPs + public IP for easy setup ──
const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n🚀 FatSecret Proxy Server running on port ${PORT}\n`);

    // Print LAN IPs
    const interfaces = os.networkInterfaces();
    const lanAddresses = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs || []) {
            if (addr.family === 'IPv4' && !addr.internal) {
                lanAddresses.push({ name, address: addr.address });
            }
        }
    }

    if (lanAddresses.length > 0) {
        console.log('📱 Your phone can reach this proxy at:');
        lanAddresses.forEach(({ name, address }) => {
            console.log(`   http://${address}:${PORT}  (${name})`);
        });
    }

    // Detect and display public IP
    console.log('\n🌐 Detecting your public IP for FatSecret whitelisting...');
    const publicIp = await fetchPublicIp();
    if (publicIp) {
        console.log(`✅ Your PUBLIC IP is: ${publicIp}`);
        console.log(`\n   ⚠️  Make sure this IP is whitelisted in FatSecret:`);
        console.log(`   → https://platform.fatsecret.com/api/`);
        console.log(`   → Open your app → IP Restrictions → Add: ${publicIp}\n`);
    } else {
        console.log('⚠️  Could not detect public IP. Visit https://whatismyip.com manually.\n');
    }

    console.log('💡 Expo auto-detects the proxy URL in development — no .env change needed!');
    console.log('   For production, set EXPO_PUBLIC_PROXY_BASE_URL in .env.\n');
});
