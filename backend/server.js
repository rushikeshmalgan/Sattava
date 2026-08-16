require('dotenv').config({ path: '../.env' }); // Load .env from root
const express = require('express');
const cors = require('cors');
const os = require('os');
const { verifyToken } = require('@clerk/backend');

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory per-IP rate limiter (no external dep) ──────────────────────────
// Sliding window: tracks timestamps of each request per IP within a 60-second
// window. Automatically purges old entries so memory stays bounded.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;      // per IP per window
const rateLimitMap = new Map(); // ip → number[] (timestamps)

/**
 * Returns { allowed: true } or { allowed: false, retryAfter: number }.
 * retryAfter is seconds until the oldest request falls out of the window.
 */
function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    let timestamps = rateLimitMap.get(ip) ?? [];
    // Purge timestamps outside the current window
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        const oldest = timestamps[0];
        const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
        rateLimitMap.set(ip, timestamps);
        return { allowed: false, retryAfter };
    }

    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    return { allowed: true };
}

// Periodically sweep stale IPs to prevent unbounded growth (~every 10 min)
setInterval(() => {
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [ip, timestamps] of rateLimitMap.entries()) {
        const fresh = timestamps.filter(t => t > windowStart);
        if (fresh.length === 0) rateLimitMap.delete(ip);
        else rateLimitMap.set(ip, fresh);
    }
}, 10 * 60 * 1000);

// ── Input validation helper ───────────────────────────────────────────────────
const MAX_QUERY_LENGTH = 100;
// Strip characters that have no place in a food search query
const DANGEROUS_CHARS_RE = /[<>'"`;\\{}[\]]/g;

function validateSearchQuery(raw) {
    if (!raw || typeof raw !== 'string') {
        return { valid: false, error: 'Query parameter is required' };
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Query cannot be empty' };
    }
    if (trimmed.length > MAX_QUERY_LENGTH) {
        return { valid: false, error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` };
    }
    const sanitized = trimmed.replace(DANGEROUS_CHARS_RE, '');
    if (sanitized.length === 0) {
        return { valid: false, error: 'Query contains only invalid characters' };
    }
    return { valid: true, sanitized };
}

// ── Rate-limit middleware (applied per-route, not globally) ───────────────────
function rateLimitMiddleware(req, res, next) {
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        'unknown';

    const result = checkRateLimit(ip);
    if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter));
        return res.status(429).json({
            error: `Too many requests. Please wait ${result.retryAfter}s before trying again.`,
            code: 'RATE_LIMITED',
            retryAfter: result.retryAfter,
        });
    }
    next();
}

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

// ── Firebase Admin (for minting custom tokens) ────────────────────────────────
// Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env as a JSON string.
// Generate one at: Firebase Console → Project Settings → Service Accounts
const admin = require('firebase-admin');
let firebaseAdminApp = null;

try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('[Firebase Admin] Initialized successfully');
} catch (err) {
    console.error('[Firebase Admin] Failed to initialize — custom-token endpoint will be unavailable:', err.message);
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

// ── Firebase Auth: exchange Clerk session token for Firebase custom token ──
// The mobile app authenticates with Clerk only. Firestore security rules require
// Firebase Auth, so we mint a Firebase custom token here to bridge the two.
app.post('/api/auth/firebase-token', async (req, res) => {
    if (!firebaseAdminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not configured on the server.' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
        return res.status(401).json({ error: 'Missing Authorization header. Expected: Bearer <clerk_session_token>' });
    }

    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        if (!payload?.sub) {
            return res.status(401).json({ error: 'Invalid token payload.' });
        }

        const customToken = await admin.auth().createCustomToken(payload.sub);
        res.json({ firebaseCustomToken: customToken });
    } catch (err) {
        console.error('[Firebase Auth] Token exchange failed:', err);
        res.status(401).json({ error: 'Invalid or expired Clerk session token.' });
    }
});

// ── Food search endpoint ──
app.get('/api/foods/search', rateLimitMiddleware, async (req, res) => {
    try {
        // ── Input validation ──
        const validation = validateSearchQuery(req.query.query);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error, code: 'INVALID_QUERY' });
        }
        const query = validation.sanitized;

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

            return res.status(502).json({ error: errMsg, code: 'FATSECRET_ERROR' });
        }

        // Normalize: FatSecret returns single item as object, not array
        let foods = data.foods?.food;
        if (!foods) foods = [];
        if (!Array.isArray(foods)) foods = [foods];

        res.json(foods);
    } catch (error) {
        console.error('Proxy search error:', error);
        res.status(500).json({ error: 'Internal server error. Please try again shortly.', code: 'SERVER_ERROR' });
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
