/**
 * api-client.mjs
 * Rate-limited AWIN API client with retry + backoff.
 * 20 calls/min hard limit. Respects Retry-After on 429.
 */

const AWIN_API = 'https://api.awin.com';
const MIN_CALL_GAP_MS = 3100; // ~19.4 calls/min — stays under 20/min limit

let lastCallAt = 0;

async function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < MIN_CALL_GAP_MS) {
    await sleep(MIN_CALL_GAP_MS - elapsed);
  }
  lastCallAt = Date.now();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * awinFetch(path, options)
 * Makes a rate-limited, authenticated request to the AWIN API.
 * Retries on 429 (rate limit) and 5xx (server errors) up to 3 times.
 *
 * @param {string} path — e.g. '/publisher/2861861/promotions'
 * @param {object} options — { method, body, token, timeout, label }
 * @returns {{ ok: boolean, status: number, data: any, error?: string }}
 */
export async function awinFetch(path, options = {}) {
  const {
    method = 'GET',
    body = null,
    token = process.env.AWIN_OAUTH2_TOKEN ?? '',
    timeout = 25000,
    label = path,
  } = options;

  if (!token) {
    return { ok: false, status: 0, data: null, error: 'AWIN_OAUTH2_TOKEN not set' };
  }

  const url = `${AWIN_API}${path}`;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    await rateLimitWait();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOpts = {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
      if (body) fetchOpts.body = JSON.stringify(body);

      const res = await fetch(url, fetchOpts);
      clearTimeout(timer);

      // Rate limited — respect Retry-After or back off
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? 0);
        const wait = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 2000;
        console.warn(`[awin-api] 429 rate limit on ${label} (attempt ${attempt}/${maxAttempts}). Waiting ${wait}ms.`);
        if (attempt < maxAttempts) {
          await sleep(wait);
          continue;
        }
        return { ok: false, status: 429, data: null, error: 'Rate limit exceeded after retries' };
      }

      // Server error — retry
      if (res.status >= 500 && attempt < maxAttempts) {
        const wait = Math.pow(2, attempt) * 1500;
        console.warn(`[awin-api] ${res.status} server error on ${label} (attempt ${attempt}/${maxAttempts}). Waiting ${wait}ms.`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }

      const data = await res.json().catch(() => null);
      console.log(`[awin-api] ${method} ${label} → ${res.status}`);
      return { ok: true, status: res.status, data };

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[awin-api] Timeout on ${label} (attempt ${attempt}/${maxAttempts})`);
        if (attempt < maxAttempts) continue;
        return { ok: false, status: 0, data: null, error: `Timeout after ${timeout}ms` };
      }
      console.warn(`[awin-api] Network error on ${label} (attempt ${attempt}/${maxAttempts}): ${err.message}`);
      if (attempt < maxAttempts) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      return { ok: false, status: 0, data: null, error: err.message };
    }
  }

  return { ok: false, status: 0, data: null, error: 'Max retries exceeded' };
}
