/**
 * HTTP layer for the Threshold campaign backend.
 *
 * Three routes: a health check, and `POST /campaigns` — the contract
 * `mobile/src/lib/campaign-service.ts` already implements. No dependencies:
 * `node:http` plus Node 20's global `fetch` covers everything, so this runs with
 * `node index.js` and no `npm install`.
 *
 * Two ordering details in here are load-bearing, and both produce confusing
 * errors if reversed — see `handle()` and `cors()`.
 */
import { createServer } from 'node:http';

import { CampaignError, generateCampaign, readSeed } from './campaigns.js';
import { assertConfigured, config } from './config.js';

const MAX_BODY_BYTES = 16 * 1024;

const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
        console.error('[error] unhandled:', error);
        if (!response.headersSent) sendJson(response, 500, { error: 'internal error' });
    });
});

async function handle(request, response) {
    cors(response);

    // 1. Preflight first, before auth. An OPTIONS request carries no
    //    Authorization header by design, so an auth check ordered before this
    //    rejects the preflight and the browser reports a generic CORS failure
    //    that looks nothing like an auth problem.
    if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
    }

    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/health') {
        sendJson(response, 200, {
            ok: true,
            service: 'threshold-campaigns',
            model: config.llmModel,
            gateway: config.llmBaseUrl,
        });
        return;
    }

    if (path !== '/campaigns') {
        sendJson(response, 404, { error: `no route for ${request.method} ${path}` });
        return;
    }

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST, OPTIONS');
        sendJson(response, 405, { error: 'use POST' });
        return;
    }

    // 2. Auth after the preflight, before reading a body.
    if (!isAuthorized(request)) {
        console.warn('[auth] rejected a request with a missing or wrong client key');
        sendJson(response, 401, { error: 'invalid client key' });
        return;
    }

    if (!allowRequest(clientKey(request))) {
        sendJson(response, 429, {
            error: `rate limit reached (${config.rateLimitPerHour}/hour). Try again later.`,
        });
        return;
    }

    let body;
    try {
        body = await readJsonBody(request);
    } catch (error) {
        sendJson(response, 413, { error: error.message });
        return;
    }

    const started = Date.now();

    try {
        const seed = readSeed(body?.seed ?? body);
        const campaign = await generateCampaign(seed);

        console.log(
            `[campaign] ok id=${campaign.id} missions=${campaign.missions.length} total=${Date.now() - started}ms`,
        );
        sendJson(response, 200, campaign);
    } catch (error) {
        if (error instanceof CampaignError) {
            console.warn(`[campaign] failed status=${error.status} total=${Date.now() - started}ms — ${error.message}`);
            sendJson(response, error.status, { error: error.message });
            return;
        }

        console.error('[campaign] unexpected failure:', error);
        sendJson(response, 500, { error: 'internal error' });
    }
}

/**
 * Permissive CORS: the app runs on `localhost:8081` and this server on
 * `localhost:8787`, and the request is preflighted because it carries
 * `Authorization` and `Content-Type: application/json`.
 */
function cors(response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * A blank `CLIENT_API_KEY` disables the check, which is convenient on a laptop
 * and never acceptable anywhere else — hence the warning at boot.
 */
function isAuthorized(request) {
    if (!config.clientApiKey) return true;
    return clientKey(request) === config.clientApiKey;
}

function clientKey(request) {
    const header = request.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match ? match[1].trim() : '';
}

/* ------------------------------------------------------------ rate limit ---- */

/**
 * In-memory token bucket, keyed by whichever client key was presented.
 *
 * Inherited limitation, worth stating plainly: `EXPO_PUBLIC_API_KEY` ships
 * inside the Expo bundle, so this key is public and anyone can present it. The
 * limit slows abuse; it does not stop a determined caller. Real protection
 * needs a server-issued token per install, which is out of scope here.
 */
const buckets = new Map();

function allowRequest(key) {
    const limit = config.rateLimitPerHour;
    if (!limit || limit <= 0) return true;

    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const recent = (buckets.get(key) ?? []).filter((time) => time > windowStart);

    if (recent.length >= limit) {
        buckets.set(key, recent);
        return false;
    }

    recent.push(now);
    buckets.set(key, recent);
    return true;
}

/* ------------------------------------------------------------------ body ---- */

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];

        request.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('request body too large'));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });

        request.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8').trim();
            if (!raw) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch {
                reject(new Error('request body was not valid JSON'));
            }
        });

        request.on('error', reject);
    });
}

function sendJson(response, status, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
    });
    response.end(body);
}

/* ------------------------------------------------------------------ boot ---- */

const problems = assertConfigured();

if (problems.length) {
    console.error('\nThreshold campaign backend cannot start:\n');
    for (const problem of problems) console.error(`  • ${problem}`);
    console.error('\nSee server/README.md, or copy server/.env.example to server/.env.\n');
    process.exit(1);
}

if (!config.clientApiKey) {
    console.warn('[warn] CLIENT_API_KEY is empty — the /campaigns route is unauthenticated. Local use only.');
}

server.listen(config.port, () => {
    console.log(`[boot] Threshold campaign backend on http://localhost:${config.port}`);
    console.log(`[boot] model=${config.llmModel} gateway=${config.llmBaseUrl}`);
    console.log(`[boot] rate limit=${config.rateLimitPerHour || 'off'}/hour  deadline=${config.overallDeadlineMs}ms`);
    console.log('[boot] POST /campaigns  ·  GET /health\n');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        console.log(`\n[shutdown] ${signal}`);
        server.close(() => process.exit(0));
    });
}
