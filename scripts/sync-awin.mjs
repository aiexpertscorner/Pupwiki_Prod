#!/usr/bin/env node
/**
 * sync-awin.mjs
 *
 * Safe AWIN Publisher sync for PupWiki.
 *
 * Outputs:
 * - src/data/awin-programs.json
 * - src/data/awin-products.json
 * - src/data/affiliate-banners.json
 *
 * Required for live programme sync:
 * - AWIN_OAUTH2_TOKEN
 *
 * Required for live product feed enrichment:
 * - AWIN_PRODUCT_FEED_API_KEY
 *
 * Optional:
 * - AWIN_PUBLISHER_ID=2861861
 * - AWIN_COUNTRY_CODE=US
 * - AWIN_FETCH_CREATIVES=true
 * - AWIN_PRODUCT_FEED_LIST_URL=<full feedList URL from Awin UI>
 * - AWIN_SYNC_DISABLED=false
 * - AWIN_ALLOW_FALLBACK_WRITE=false
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

loadLocalEnv();

const AWIN_API = 'https://api.awin.com';
const PUBLISHER_ID = env('AWIN_PUBLISHER_ID', '2861861');
const TOKEN = env('AWIN_OAUTH2_TOKEN', '');
const PRODUCT_FEED_KEY = extractProductFeedKey(env('AWIN_PRODUCT_FEED_API_KEY', ''));
const PRODUCT_FEED_LIST_URL = env('AWIN_PRODUCT_FEED_LIST_URL', '');
const COUNTRY_CODE = env('AWIN_COUNTRY_CODE', 'US');
const FETCH_CREATIVES = boolEnv('AWIN_FETCH_CREATIVES', false);
const SYNC_DISABLED = boolEnv('AWIN_SYNC_DISABLED', false);
const ALLOW_FALLBACK_WRITE = boolEnv('AWIN_ALLOW_FALLBACK_WRITE', false);
const STRICT = process.argv.includes('--strict');
const DEBUG_FEEDS = process.argv.includes('--debug-feeds');
const REQUIRE_PRODUCT_FEED_KEY = STRICT || boolEnv('AWIN_REQUIRE_PRODUCT_FEED_KEY', false);
const REQUIRE_FEED_PRODUCTS = boolEnv('AWIN_REQUIRE_FEED_PRODUCTS', false);
const TIMEOUT_MS = Number(env('AWIN_TIMEOUT_MS', '25000')) || 25000;
const PAGE_SIZE = Number(env('AWIN_PRODUCT_PAGE_SIZE', '250')) || 250;

const PRODUCT_COLUMNS = [
  'aw_product_id',
  'merchant_product_id',
  'product_name',
  'description',
  'search_price',
  'currency',
  'aw_deep_link',
  'merchant_image_url',
  'aw_image_url',
  'merchant_name',
  'category_name',
  'merchant_id',
  'in_stock',
  'last_updated',
];

const runtime = {
  warnings: [],
  errors: [],
  fetches: [],
  feedListEndpointUsed: '',
  feedProductFetchFailures: 0,
  feedRowsFetched: 0,
  feedRowsNormalized: 0,
  feedsWithRowsButZeroProducts: [],
};

function env(name, fallback = '') {
  const value = process.env[name];
  return value == null || value === '' ? fallback : value;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function loadLocalEnv() {
  // Node scripts do not automatically load .env.local. This small loader keeps local runs simple
  // without adding a dotenv dependency.
  for (const fileName of ['.env', '.env.local']) {
    const file = join(ROOT, fileName);
    if (!existsSync(file)) continue;

    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] != null) continue;
      process.env[key] = unquoteEnvValue(rawValue);
    }
  }
}

function unquoteEnvValue(value) {
  let output = String(value || '').trim();
  if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'"))) {
    output = output.slice(1, -1);
  }
  return output;
}

function extractProductFeedKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Allows users to paste either the bare key or the full Darwin URL:
  // https://ui.awin.com/productdata-darwin-download/publisher/2861861/<key>/1/feedList
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const publisherIndex = parts.indexOf('publisher');
    if (publisherIndex !== -1 && parts[publisherIndex + 2]) return parts[publisherIndex + 2];
    const apiKeyIndex = parts.indexOf('apikey');
    if (apiKeyIndex !== -1 && parts[apiKeyIndex + 1]) return parts[apiKeyIndex + 1];
  } catch {
    // Not a URL. Treat as a bare API key.
  }
  return raw;
}

function log(msg) { console.log(`[sync-awin] ${msg}`); }
function warn(msg) {
  runtime.warnings.push(msg);
  console.warn(`[sync-awin] WARN ${msg}`);
}
function error(msg) {
  runtime.errors.push(msg);
  console.error(`[sync-awin] ERROR ${msg}`);
}
function ok(msg) { console.log(`[sync-awin] OK ${msg}`); }

function failOrWarn(msg) {
  if (STRICT) {
    error(msg);
    process.exit(1);
  }
  warn(msg);
}

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function compact(value) {
  return normalize(value).replace(/-/g, '');
}

function toArray(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function detectDelimiter(headerLine) {
  const candidates = [',', '\t', ';', '|'];
  return candidates
    .map((delimiter) => ({ delimiter, count: splitDelimitedLine(headerLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseDelimited(text) {
  const normalizedText = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const next = normalizedText[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if (char === '\n' && !quoted) {
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => normalize(header).replace(/-/g, '_'));
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function parseMaybeJsonOrDelimited(text) {
  const clean = stripBom(text).trim();
  if (!clean) return [];
  if (clean.startsWith('<')) {
    warn('Received XML/HTML-like response where JSON/CSV/TSV was expected; skipping parse for this endpoint.');
    return [];
  }

  try {
    const json = JSON.parse(clean);
    return toArray(json, ['data', 'feeds', 'feedList', 'products', 'items', 'productList', 'rows']);
  } catch {
    return parseDelimited(clean);
  }
}

function getBannerRegistry(raw) {
  const fallback = {
    _meta: { version: '1.0.0', description: 'Central banner registry for PupWiki affiliate/partner banners.' },
    globalDefaults: {
      noteText: 'Advertisement / affiliate partner',
      openInNewTab: true,
      rel: 'sponsored noopener',
      imageFit: 'cover',
    },
    banners: [],
  };

  if (Array.isArray(raw)) return { ...fallback, banners: raw };
  if (raw && typeof raw === 'object' && Array.isArray(raw.banners)) return raw;
  return fallback;
}

function getStaticPrograms() {
  const config = readJson(join(DATA, 'awin-program-config.json'), { programs: [] });
  const map = new Map();
  for (const program of config.programs || []) {
    const key = program.id || normalize(program.label || program.merchantId);
    if (!key) continue;
    map.set(key, program);
    if (program.merchantId) map.set(String(program.merchantId), program);
    if (program.label) map.set(normalize(program.label), program);
  }
  return { config, map };
}

const { config: staticConfig, map: staticProgramMap } = getStaticPrograms();

function inferTopicTags(program) {
  const text = [
    program.name,
    program.description,
    program.primarySector,
    program.programmeInfo?.name,
    program.programmeInfo?.description,
    program.programmeInfo?.primarySector,
  ].join(' ').toLowerCase();

  const tags = new Set(['partner']);
  if (/food|meal|nutrition|treat|raw|pawco|pupford|montana|broth/.test(text)) tags.add('food'), tags.add('nutrition');
  if (/insurance|vet|health|wuffes|odie|dutch/.test(text)) tags.add('health');
  if (/harness|leash|collar|training|crate|neewa|joyride|impact|fence/.test(text)) tags.add('training'), tags.add('gear');
  if (/bed|foggy|blanket|home|petmate/.test(text)) tags.add('beds');
  if (/gift|portrait|willow|crown|muse|bereave|license/.test(text)) tags.add('gift'), tags.add('lifestyle');
  return [...tags];
}

function getProgramIdentity(program) {
  const advertiserId = String(program.id ?? program.advertiserId ?? program.programmeInfo?.id ?? '');
  const name = program.name || program.programmeInfo?.name || `AWIN programme ${advertiserId}`;
  const staticMatch =
    staticProgramMap.get(advertiserId) ||
    staticProgramMap.get(normalize(name)) ||
    null;
  const key = staticMatch?.id || normalize(name || advertiserId);

  return {
    key,
    advertiserId,
    name,
    staticConfig: staticMatch,
  };
}

function isActiveStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['joined', 'active', 'approved'].includes(value);
}

async function apiFetch(path, description = path) {
  if (!TOKEN) return null;
  const separator = path.includes('?') ? '&' : '?';
  const url = `${AWIN_API}${path}${path.includes('accessToken=') ? '' : `${separator}accessToken=${encodeURIComponent(TOKEN)}`}`;
  return jsonFetch(url, description, {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
  });
}

async function jsonFetch(url, description = url, headers = {}) {
  const text = await rawFetch(url, description, headers);
  if (!text) return null;
  try { return JSON.parse(text); }
  catch {
    warn(`${description} returned a non-JSON response`);
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function responseToText(res) {
  const buffer = Buffer.from(await res.arrayBuffer());
  const isGzip =
    res.headers.get('content-encoding') === 'gzip' ||
    (buffer.length > 1 && buffer[0] === 0x1f && buffer[1] === 0x8b);
  try {
    const decoded = isGzip ? gunzipSync(buffer) : buffer;
    return decoded.toString('utf8');
  } catch (e) {
    warn(`responseToText: gzip decompression failed (${e.message}), attempting raw decode`);
    return buffer.toString('utf8');
  }
}

async function rawFetch(url, description = url, headers = {}, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 2000 * Math.pow(2, attempt);
        warn(`${description} -> HTTP 429 rate-limited (attempt ${attempt + 1}/${maxRetries + 1}); retrying in ${delay}ms`);
        if (attempt < maxRetries) { await sleep(delay); continue; }
        runtime.fetches.push({ description, ok: false, status: 429 });
        return null;
      }

      runtime.fetches.push({ description, ok: res.ok, status: res.status });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        warn(`${description} -> HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
        return null;
      }
      return await responseToText(res);
    } catch (err) {
      clearTimeout(timer);
      runtime.fetches.push({ description, ok: false, status: 'error' });
      warn(`${description} -> ${err.message || err}`);
      return null;
    }
  }
  return null;
}

async function fetchProgrammes() {
  log(`Fetching joined programmes (${COUNTRY_CODE})`);
  const joined = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=joined&countryCode=${COUNTRY_CODE}`,
    'programmes/joined'
  );

  log(`Fetching pending programmes (${COUNTRY_CODE})`);
  const pending = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=pending&countryCode=${COUNTRY_CODE}`,
    'programmes/pending'
  );

  const joinedList = toArray(joined, ['programmes', 'programs']);
  const pendingList = toArray(pending, ['programmes', 'programs']);
  ok(`Found ${joinedList.length} joined + ${pendingList.length} pending programme(s)`);
  if (pendingList.length) log(`Pending: ${pendingList.map((p) => p.name || p.id).join(', ')}`);
  return { joined: joinedList, pending: pendingList, all: [...joinedList, ...pendingList] };
}

async function fetchProgramDetails(advertiserId, relationship) {
  if (!advertiserId) return null;
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmedetails?advertiserId=${advertiserId}&relationship=${relationship || 'any'}`,
    `programmedetails/${advertiserId}`
  );
  return data || null;
}

function normalizeProgram(program, relationship, details = null) {
  const merged = { ...program, ...(details?.programmeInfo || {}), programmeDetails: details };
  const identity = getProgramIdentity(merged);
  const staticMatch = identity.staticConfig || {};
  const status = merged.membershipStatus || merged.status || merged.displayStatus || relationship;
  const topicTags = staticMatch.topicTags || inferTopicTags(merged);

  return {
    key: identity.key,
    advertiserId: identity.advertiserId,
    name: identity.name,
    relationship,
    status,
    isActive: relationship === 'joined' && isActiveStatus(status),
    displayUrl: merged.displayUrl || merged.programmeInfo?.displayUrl || '',
    clickThroughUrl: merged.clickThroughUrl || merged.programmeInfo?.clickThroughUrl || '',
    deeplinkEnabled: Boolean(merged.deeplinkEnabled ?? merged.programmeInfo?.deeplinkEnabled),
    logoUrl: merged.logoUrl || merged.programmeInfo?.logoUrl || '',
    primarySector: merged.primarySector || merged.programmeInfo?.primarySector || '',
    primaryRegion: merged.primaryRegion || merged.programmeInfo?.primaryRegion || null,
    currencyCode: merged.currencyCode || merged.programmeInfo?.currencyCode || '',
    validDomains: merged.validDomains || merged.programmeInfo?.validDomains || [],
    commissionRange: details?.commissionRange || merged.commissionRange || merged.defaultCommission || null,
    kpi: details?.kpi || merged.kpi || null,
    linkStatus: merged.linkStatus || '',
    staticProgramId: staticMatch.id || null,
    feedId: staticMatch.feedId || null,
    configuredDeeplink: staticMatch.deeplink || '',
    deeplink: staticMatch.deeplink || merged.clickThroughUrl || merged.programmeInfo?.clickThroughUrl || '',
    topicTags,
    pageTypes: staticMatch.pageTypes || ['guide', 'breed', 'category'],
    priority: staticMatch.priority || 50,
  };
}

function productFeedListUrls() {
  const urls = [];
  if (PRODUCT_FEED_LIST_URL) urls.push(PRODUCT_FEED_LIST_URL.replace('<publisherId>', PUBLISHER_ID).replace('<apiKey>', PRODUCT_FEED_KEY));
  if (PRODUCT_FEED_KEY) {
    urls.push(`https://productdata.awin.com/datafeed/list/apikey/${encodeURIComponent(PRODUCT_FEED_KEY)}`);
    urls.push(`https://ui.awin.com/productdata-darwin-download/publisher/${encodeURIComponent(PUBLISHER_ID)}/${encodeURIComponent(PRODUCT_FEED_KEY)}/1/feedList`);
  }
  return [...new Set(urls)];
}

async function fetchProductFeeds() {
  if (!PRODUCT_FEED_KEY) {
    warn('No AWIN_PRODUCT_FEED_API_KEY; skipping Product Feed List download');
    return [];
  }

  for (const url of productFeedListUrls()) {
    log(`Fetching Product Feed List via ${url.includes('darwin') ? 'Awin Darwin' : 'Awin productdata'} endpoint`);
    const text = await rawFetch(url, url.includes('darwin') ? 'product-feed-list/darwin' : 'product-feed-list/productdata');
    if (!text) continue;
    const list = parseMaybeJsonOrDelimited(text);
    if (list.length) {
      runtime.feedListEndpointUsed = url.includes('darwin') ? 'darwin' : 'productdata';
      ok(`Found ${list.length} product feed list row(s)`);
      return list;
    }
    warn('Product Feed List endpoint returned no parseable rows; trying next endpoint if available.');
  }

  warn('No product feed list rows found. Static configured feed IDs will still be attempted.');
  return [];
}

function valueFrom(raw, keys) {
  for (const key of keys) {
    const value = raw?.[key];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
}

// Normalize camelCase/PascalCase JSON field names into snake_case and all-lowercase
// variants so valueFrom() can find them regardless of how the AWIN API serialises them.
// e.g. { awProductId: "1", productName: "Dog Food" }
//   → { awProductId: "1", awproductid: "1", aw_product_id: "1", productName: "Dog Food", productname: "Dog Food", product_name: "Dog Food" }
function normalizeRawKeys(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v;
    out[k.toLowerCase()] = v;
    const snake = k
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
    if (snake !== k.toLowerCase()) out[snake] = v;
  }
  return out;
}

// Normalise any AWIN feed shape into an array of plain objects that normalizeProduct() can read.
// Handles: array-of-objects, array-of-arrays (zipped with PRODUCT_COLUMNS),
// { columns/headers/fields + rows/data/products }, and { values: [...] } per-row format.
function normalizeProductRows(input, feedId) {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0];
    if (first == null) return [];
    if (Array.isArray(first)) {
      // Array of arrays — zip with PRODUCT_COLUMNS
      return input.map((row) => Object.fromEntries(PRODUCT_COLUMNS.map((col, i) => [col, row[i] ?? ''])));
    }
    if (typeof first === 'object') {
      // { values: [...] } per-row wrapper
      if (Array.isArray(first.values)) {
        return input.map((row) => Object.fromEntries(PRODUCT_COLUMNS.map((col, i) => [col, row.values[i] ?? ''])));
      }
      // Plain array of objects — return as-is
      return input;
    }
    return [];
  }

  if (input && typeof input === 'object') {
    const columns = input.columns || input.headers || input.fields || null;
    const rows = input.rows || input.data || input.products || input.items || input.productList || null;

    if (columns && Array.isArray(columns) && rows && Array.isArray(rows)) {
      return rows.map((row) => {
        if (Array.isArray(row)) {
          return Object.fromEntries(columns.map((col, i) => [col, row[i] ?? '']));
        }
        if (row && typeof row === 'object' && Array.isArray(row.values)) {
          return Object.fromEntries(columns.map((col, i) => [col, row.values[i] ?? '']));
        }
        return row;
      });
    }

    // Wrapped array under a different key
    for (const key of ['products', 'items', 'productList', 'data', 'rows', 'feeds']) {
      if (Array.isArray(input[key]) && input[key].length > 0) {
        return normalizeProductRows(input[key], feedId);
      }
    }

    // Single product object
    if (input.aw_product_id || input.product_name || input.name || input.awProductId) {
      return [input];
    }

    warn(`feed/${feedId}: unrecognised product feed shape; keys: ${Object.keys(input).slice(0, 8).join(', ')}`);
  }

  return [];
}

function parseProductFeedText(text, feedId) {
  const clean = stripBom(text).trim();
  if (!clean) return [];
  if (clean.startsWith('<')) {
    warn(`feed/${feedId} returned XML/HTML where JSON/CSV was expected; skipping`);
    return [];
  }
  try {
    if (clean.startsWith('{') || clean.startsWith('[')) {
      return normalizeProductRows(JSON.parse(clean), feedId);
    }
    return normalizeProductRows(parseDelimited(clean), feedId);
  } catch (e) {
    warn(`feed/${feedId} parse error: ${e.message}`);
    return [];
  }
}

function feedAdvertiserId(feed) {
  return String(valueFrom(feed, [
    'advertiser_id', 'advertiserid', 'advertiser', 'advertiserId',
    'merchant_id', 'merchantid', 'merchant', 'merchantId',
    'programme_id', 'programmeid', 'programmeId', 'program_id', 'programid', 'programId',
    'mid', 'merchant_aw_id', 'aw_merchant_id',
  ]));
}

function feedIdValue(feed) {
  return String(valueFrom(feed, [
    'feed_id', 'feedid', 'feedId', 'fid', 'id', 'datafeed_id', 'data_feed_id',
    'product_feed_id', 'productfeedid', 'feed_reference',
  ]));
}

function feedDownloadUrl(feed) {
  return String(valueFrom(feed, [
    'download_url', 'downloadurl', 'downloadUrl', 'url', 'feed_url', 'feedurl', 'feedUrl',
    'product_feed_url', 'productfeedurl', 'location', 'href',
  ]));
}

function buildFeedMap(feeds) {
  const map = new Map();
  for (const feed of feeds) {
    const advertiserId = feedAdvertiserId(feed);
    if (!advertiserId) continue;
    if (!map.has(advertiserId)) map.set(advertiserId, []);
    map.get(advertiserId).push(feed);
  }

  for (const program of staticConfig.programs || []) {
    if (program.merchantId && program.feedId) {
      if (!map.has(String(program.merchantId))) map.set(String(program.merchantId), []);
      const existing = map.get(String(program.merchantId));
      const hasFeed = existing.some((feed) => feedIdValue(feed) === String(program.feedId));
      if (!hasFeed) {
        existing.push({
          id: program.feedId,
          feed_id: program.feedId,
          advertiser_id: program.merchantId,
          merchant_id: program.merchantId,
          name: program.label,
          source: 'static-config',
        });
      }
    }
  }

  return map;
}

function feedProductUrls(feedId, feed) {
  const urls = [];
  const directUrl = feedDownloadUrl(feed);
  if (directUrl) urls.push(directUrl);

  const columns = encodeURIComponent(PRODUCT_COLUMNS.join(','));
  if (PRODUCT_FEED_KEY && feedId) {
    urls.push([
      `https://productdata.awin.com/datafeed/download/apikey/${encodeURIComponent(PRODUCT_FEED_KEY)}`,
      `language/en/fid/${encodeURIComponent(feedId)}`,
      `columns/${columns}`,
      `format/json/limit/${PAGE_SIZE}`,
    ].join('/'));

    urls.push(`https://ui.awin.com/productdata-darwin-download/publisher/${encodeURIComponent(PUBLISHER_ID)}/${encodeURIComponent(PRODUCT_FEED_KEY)}/${encodeURIComponent(feedId)}/download?format=json&columns=${columns}&limit=${PAGE_SIZE}`);
    urls.push(`https://ui.awin.com/productdata-darwin-download/publisher/${encodeURIComponent(PUBLISHER_ID)}/${encodeURIComponent(PRODUCT_FEED_KEY)}/${encodeURIComponent(feedId)}/download`);
  }

  return [...new Set(urls)];
}

async function fetchFeedProducts(feed, label) {
  const feedId = feedIdValue(feed);
  if (!PRODUCT_FEED_KEY || !feedId) return [];

  log(`Fetching products from feed ${feedId} (${label})`);
  for (const url of feedProductUrls(feedId, feed)) {
    const text = await rawFetch(url, `feed/${feedId}`);
    if (!text) {
      runtime.feedProductFetchFailures++;
      continue;
    }
    const rows = parseProductFeedText(text, feedId);
    if (rows.length) {
      ok(`${rows.length} product row(s) from feed ${feedId}`);
      if (DEBUG_FEEDS && rows[0]) {
        log(`feed/${feedId} first row keys: ${Object.keys(rows[0]).join(', ')}`);
      }
      return rows;
    }
    const preview = text.slice(0, 300).replace(/\s+/g, ' ');
    warn(`feed/${feedId} returned no parseable products. Response preview: ${preview}`);
  }

  warn(`No product rows could be imported from feed ${feedId} (${label})`);
  return [];
}

async function fetchCreativesForProgram(program) {
  if (!FETCH_CREATIVES) return [];
  if (!program.advertiserId) return [];

  log(`Fetching experimental creatives for ${program.name} (${program.advertiserId})`);
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes/${program.advertiserId}/creatives`,
    `creatives/${program.advertiserId}`
  );
  const list = toArray(data, ['creatives', 'items']);
  return list.map((creative) => normalizeCreative(creative, program)).filter(Boolean);
}

function normalizeCreative(creative, program) {
  const imageSrc = creative.imageUrl || creative.bannerUrl || creative.src || creative.image || '';
  const href = creative.url || creative.creativeUrl || creative.clickUrl || program.deeplink || program.clickThroughUrl || '';
  if (!href && !imageSrc) return null;

  return {
    id: `${program.key}-${creative.id || creative.creativeId || normalize(creative.title || creative.name || 'creative')}`,
    programKey: program.key,
    advertiserId: program.advertiserId,
    advertiser: program.name,
    network: 'awin',
    enabled: true,
    priority: program.priority || 50,
    label: creative.title || creative.name || program.name,
    type: 'image_link',
    href,
    imageSrc,
    alt: creative.alt || creative.title || `${program.name} creative`,
    width: Number(creative.width || 0),
    height: Number(creative.height || 0),
    placements: ['mid-content', 'pre-footer'],
    pageTypes: program.pageTypes || ['guide', 'breed', 'category'],
    topicTags: program.topicTags || [],
    source: 'awin-api',
    syncedAt: new Date().toISOString(),
  };
}

function normalizeProduct(raw, program, drops = null) {
  const raw_ = normalizeRawKeys(raw);
  const rawId = valueFrom(raw_, [
    'aw_product_id', 'awproductid', 'id', 'product_id', 'productid', 'merchant_product_id', 'merchantproductid', 'sku', 'ean', 'gtin',
  ]);
  if (!rawId) { if (drops) drops.missingRawId++; return null; }
  const name = valueFrom(raw_, ['product_name', 'productname', 'name', 'title', 'product_title', 'producttitle']);
  if (!name) { if (drops) drops.missingName++; return null; }

  const price = Number.parseFloat(String(valueFrom(raw_, ['search_price', 'searchprice', 'price', 'current_price', 'currentprice', 'display_price'])).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  const merchant = valueFrom(raw_, ['merchant_name', 'merchantname', 'merchant', 'advertiser_name', 'advertisername']) || program.name || '';
  const category = valueFrom(raw_, ['category_name', 'categoryname', 'category', 'merchant_category', 'merchantcategory']) || program.primarySector || '';
  const image = valueFrom(raw_, ['merchant_image_url', 'merchantimageurl', 'aw_image_url', 'awimageurl', 'image', 'image_url', 'imageurl', 'product_image', 'productimage']);
  const url = valueFrom(raw_, ['aw_deep_link', 'awdeeplink', 'deep_link', 'deeplink', 'aw_link', 'awlink', 'url', 'product_url', 'producturl']) || program.deeplink || program.clickThroughUrl || '';

  return {
    id: `${program.key}-${String(rawId).replace(/\W+/g, '-').toLowerCase()}`,
    awProductId: String(valueFrom(raw_, ['aw_product_id', 'awproductid', 'id']) || ''),
    merchantProductId: String(valueFrom(raw_, ['merchant_product_id', 'merchantproductid', 'sku']) || ''),
    name: String(name).trim(),
    description: String(valueFrom(raw_, ['description', 'product_description', 'productdescription', 'short_description', 'shortdescription']) || '').trim().slice(0, 500),
    price,
    currency: valueFrom(raw_, ['currency', 'currency_code', 'currencycode']) || program.currencyCode || 'USD',
    url,
    image,
    merchant: String(merchant).trim(),
    category: String(category).trim(),
    advertiserId: program.advertiserId,
    programId: program.key,
    topicTags: program.topicTags || [],
    availability: valueFrom(raw_, ['in_stock', 'instock', 'availability', 'stock_status', 'stockstatus']) || '',
    source: 'awin-product-feed',
    syncedAt: new Date().toISOString(),
  };
}

function enrichFallbackProducts(products) {
  return products.map((product) => {
    const merchant = String(product.merchant || '');
    const staticMatch =
      [...new Set(staticConfig.programs || [])].find((program) => {
        const label = normalize(program.label);
        const compactLabel = compact(program.label);
        const productMerchant = normalize(merchant);
        const compactMerchant = compact(merchant);
        return label && (
          productMerchant.includes(label) ||
          label.includes(productMerchant) ||
          compactMerchant.includes(compactLabel) ||
          compactLabel.includes(compactMerchant)
        );
      }) || null;
    return {
      ...product,
      advertiserId: staticMatch?.merchantId || product.advertiserId,
      programId: staticMatch?.id || product.programId,
      topicTags: staticMatch?.topicTags || product.topicTags || [],
      source: product.source || 'manual-fallback',
    };
  });
}

function mergeProducts(apiProducts, fallbackProducts) {
  const programsWithApiProducts = new Set(apiProducts.map((product) => product.programId).filter(Boolean));
  const keptFallbacks = enrichFallbackProducts(fallbackProducts)
    .filter((product) => !product.programId || !programsWithApiProducts.has(product.programId));
  const merged = [...apiProducts, ...keptFallbacks];
  const seen = new Set();
  return merged.filter((product) => {
    const key = product.id || `${product.programId}:${product.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramOfferProducts(programs, apiProducts) {
  const programsWithApiProducts = new Set(apiProducts.map((product) => product.programId).filter(Boolean));
  return programs
    .filter((program) => program.relationship === 'joined')
    .filter((program) => !programsWithApiProducts.has(program.key))
    .filter((program) => program.deeplink || program.clickThroughUrl)
    .map((program) => ({
      id: `${program.key}-partner-offer`,
      name: `${program.name} partner offer`,
      description: program.primarySector
        ? `Visit ${program.name} for current ${program.primarySector.toLowerCase()} offers and availability.`
        : `Visit ${program.name} for current offers and availability.`,
      price: 0,
      currency: program.currencyCode || 'USD',
      url: program.deeplink || program.clickThroughUrl,
      image: program.logoUrl || '',
      merchant: program.name,
      category: program.primarySector || 'Partner offer',
      advertiserId: program.advertiserId,
      programId: program.key,
      topicTags: program.topicTags || [],
      availability: '',
      source: 'awin-program-fallback',
      syncedAt: new Date().toISOString(),
    }));
}

function buildLogoBanners(programs) {
  return programs
    .filter((program) => program.relationship === 'joined')
    .filter((program) => program.logoUrl && (program.deeplink || program.clickThroughUrl))
    .map((program) => ({
      id: `${program.key}-brand-logo`,
      programKey: program.key,
      advertiserId: program.advertiserId,
      advertiser: program.name,
      network: 'awin',
      enabled: false,
      priority: Math.max(20, (program.priority || 50) - 20),
      label: `${program.name} brand logo`,
      type: 'image_link',
      href: program.deeplink || program.clickThroughUrl,
      imageSrc: program.logoUrl,
      alt: `${program.name} logo`,
      noteText: 'Advertisement / affiliate partner',
      placements: ['brand-logo', 'pre-footer'],
      pageTypes: program.pageTypes || ['guide', 'breed', 'category'],
      topicTags: program.topicTags || [],
      source: 'awin-program-logo',
      syncedAt: new Date().toISOString(),
      imageFit: 'contain',
    }));
}

function scoreCreative(banner) {
  const preferred = [[300, 250], [728, 90], [160, 600], [468, 60], [320, 50]];
  const index = preferred.findIndex(([w, h]) => Number(banner.width) === w && Number(banner.height) === h);
  return index === -1 ? 0 : preferred.length - index;
}

function mergeBanners(registry, apiBanners, logoBanners) {
  const existing = Array.isArray(registry.banners) ? registry.banners : [];
  const generatedPrograms = new Set([...apiBanners, ...logoBanners].map((banner) => banner.programKey).filter(Boolean));
  const manual = existing.filter((banner) => {
    if (banner.source === 'awin-api' || banner.source === 'awin-program-logo') return false;
    return !banner.programKey || !generatedPrograms.has(banner.programKey);
  });
  const generated = [...apiBanners].sort((a, b) => scoreCreative(b) - scoreCreative(a));
  const all = [...generated, ...logoBanners, ...manual];
  const seen = new Set();
  return {
    ...registry,
    banners: all.filter((banner) => {
      if (!banner.id || seen.has(banner.id)) return false;
      seen.add(banner.id);
      return true;
    }),
  };
}

function writeFallbackData(fallbackProducts, bannerRegistry, note) {
  writeJson(join(DATA, 'awin-products.json'), enrichFallbackProducts(fallbackProducts));
  writeJson(join(DATA, 'awin-programs.json'), {
    publisherId: PUBLISHER_ID,
    countryCode: COUNTRY_CODE,
    syncedAt: new Date().toISOString(),
    note,
    programs: [],
    pendingPrograms: [],
    summary: [],
    stats: {
      joined: 0,
      pending: 0,
      products: fallbackProducts.length,
      apiProducts: 0,
      banners: bannerRegistry.banners.length,
      oauthTokenPresent: Boolean(TOKEN),
      productFeedKeyPresent: Boolean(PRODUCT_FEED_KEY),
      warnings: runtime.warnings,
      errors: runtime.errors,
    },
  });
  ok('Fallback data written');
}

async function main() {
  if (SYNC_DISABLED) {
    log('AWIN sync disabled via AWIN_SYNC_DISABLED=true; preserving existing data files.');
    return;
  }

  log('-------------------------------------');
  log('PupWiki x AWIN sync starting');
  log(`Publisher ID: ${PUBLISHER_ID}`);
  log(`OAuth token present: ${TOKEN ? 'yes' : 'NO - set AWIN_OAUTH2_TOKEN'}`);
  log(`Product feed key present: ${PRODUCT_FEED_KEY ? 'yes' : 'NO - set AWIN_PRODUCT_FEED_API_KEY for feeds'}`);
  log(`Mode: ${STRICT ? 'strict' : 'safe'}`);
  log('-------------------------------------');

  const fallbackProducts = readJson(join(DATA, 'affiliate-products.json'), []);
  const bannerRegistry = getBannerRegistry(readJson(join(DATA, 'affiliate-banners.json'), null));
  log(`Fallback products loaded: ${fallbackProducts.length}`);
  log(`Existing banners loaded: ${bannerRegistry.banners.length}`);

  if (!TOKEN) {
    const message = 'No AWIN_OAUTH2_TOKEN; cannot run live programme sync.';
    if (STRICT) failOrWarn(message);
    if (ALLOW_FALLBACK_WRITE) {
      warn(`${message} Writing fallback output because AWIN_ALLOW_FALLBACK_WRITE=true.`);
      writeFallbackData(fallbackProducts, bannerRegistry, 'No AWIN OAuth token - using fallback product data');
    } else {
      warn(`${message} Existing AWIN data files were preserved to avoid overwriting live data with fallback data.`);
    }
    return;
  }

  if (!PRODUCT_FEED_KEY && REQUIRE_PRODUCT_FEED_KEY) {
    failOrWarn('No AWIN_PRODUCT_FEED_API_KEY; strict product feed sync cannot continue.');
  }

  const { joined, pending } = await fetchProgrammes();
  const livePrograms = [];

  for (const program of joined) {
    const advertiserId = String(program.id || program.advertiserId || '');
    await sleep(200);
    const details = await fetchProgramDetails(advertiserId, 'joined');
    livePrograms.push(normalizeProgram(program, 'joined', details));
  }

  for (const program of pending) {
    const advertiserId = String(program.id || program.advertiserId || '');
    await sleep(200);
    const details = await fetchProgramDetails(advertiserId, 'pending');
    livePrograms.push(normalizeProgram(program, 'pending', details));
  }

  if (DEBUG_FEEDS) {
    const feeds = await fetchProductFeeds();
    const feedMap = buildFeedMap(feeds);
    log('\n=== DEBUG FEEDS REPORT ===');
    for (const program of livePrograms.filter((p) => p.relationship === 'joined')) {
      const feedsForProgram = feedMap.get(program.advertiserId) || [];
      const ids = feedsForProgram.map(feedIdValue).filter(Boolean);
      log(`[${program.key}] advertiserId=${program.advertiserId} feedIds=${ids.join(',') || 'none'} hasProductFeed=${feedsForProgram.length > 0}`);
      for (const feed of feedsForProgram.slice(0, 3)) {
        const feedId = feedIdValue(feed);
        const urls = feedProductUrls(feedId, feed);
        log(`  feed ${feedId}: ${urls[0] || 'no URL'}`);
        const text = await rawFetch(urls[0], `debug/feed/${feedId}`);
        const rows = text ? parseProductFeedText(text, feedId) : [];
        log(`  -> ${rows.length} product rows`);
      }
    }
    log('=== END DEBUG FEEDS REPORT ===\n');
    return;
  }

  const feeds = await fetchProductFeeds();
  const feedMap = buildFeedMap(feeds);
  const apiProducts = [];
  const apiBanners = [];
  const perProgramStats = {};

  for (const program of livePrograms) {
    const feedsForProgram = feedMap.get(program.advertiserId) || [];
    perProgramStats[program.key] = {
      advertiserId: program.advertiserId,
      products: 0,
      banners: 0,
      hasProductFeed: feedsForProgram.length > 0,
      feedIds: feedsForProgram.map(feedIdValue).filter(Boolean),
      hasCreatives: false,
      hasLogo: Boolean(program.logoUrl),
    };

    if (program.relationship === 'joined') {
      for (const feed of feedsForProgram.slice(0, 3)) {
        const rows = await fetchFeedProducts(feed, program.name);
        runtime.feedRowsFetched += rows.length;
        const drops = { missingRawId: 0, missingName: 0 };
        const beforeCount = apiProducts.length;
        for (const row of rows) {
          const normalized = normalizeProduct(row, program, drops);
          if (normalized) {
            apiProducts.push(normalized);
            perProgramStats[program.key].products++;
          }
        }
        const imported = apiProducts.length - beforeCount;
        runtime.feedRowsNormalized += imported;
        if (rows.length > 0) {
          const feedId = feedIdValue(feed);
          const droppedTotal = drops.missingRawId + drops.missingName;
          log(`feed/${feedId} raw rows: ${rows.length} | normalized: ${imported} | dropped: missingRawId=${drops.missingRawId} missingName=${drops.missingName}`);
          if (rows.length > 0 && imported === 0) {
            runtime.feedsWithRowsButZeroProducts.push(feedId);
            warn(`feed/${feedId} had ${rows.length} rows but 0 products normalized (dropped: ${droppedTotal})`);
          }
        }
      }

      const creatives = await fetchCreativesForProgram(program);
      if (creatives.length) {
        apiBanners.push(...creatives);
        perProgramStats[program.key].banners += creatives.length;
        perProgramStats[program.key].hasCreatives = true;
      }
    }
  }

  if (REQUIRE_FEED_PRODUCTS && PRODUCT_FEED_KEY && apiProducts.length === 0) {
    failOrWarn('AWIN product feed key is present, but no live product feed rows were imported.');
  }

  const programOfferProducts = buildProgramOfferProducts(livePrograms, apiProducts);
  const mergedProducts = mergeProducts([...apiProducts, ...programOfferProducts], fallbackProducts);
  const logoBanners = buildLogoBanners(livePrograms);
  const mergedBannerRegistry = mergeBanners(bannerRegistry, apiBanners, logoBanners);

  writeJson(join(DATA, 'awin-products.json'), mergedProducts);
  writeJson(join(DATA, 'affiliate-banners.json'), mergedBannerRegistry);

  const finalPrograms = livePrograms.map((program) => ({
    ...program,
    hasProductFeed: perProgramStats[program.key]?.hasProductFeed || false,
    feedIds: perProgramStats[program.key]?.feedIds || [],
    hasCreatives: perProgramStats[program.key]?.hasCreatives || false,
    hasLogo: perProgramStats[program.key]?.hasLogo || false,
    productCount: perProgramStats[program.key]?.products || 0,
    bannerCount: perProgramStats[program.key]?.banners || 0,
  }));

  const programData = {
    publisherId: PUBLISHER_ID,
    countryCode: COUNTRY_CODE,
    syncedAt: new Date().toISOString(),
    programs: finalPrograms.filter((program) => program.relationship === 'joined'),
    pendingPrograms: finalPrograms.filter((program) => program.relationship === 'pending'),
    summary: finalPrograms.map((program) => ({
      key: program.key,
      advertiserId: program.advertiserId,
      name: program.name,
      relationship: program.relationship,
      status: program.status,
      isActive: program.isActive,
      hasProductFeed: program.hasProductFeed,
      feedIds: program.feedIds,
      hasCreatives: program.hasCreatives,
      hasLogo: program.hasLogo,
      productCount: program.productCount,
      bannerCount: program.bannerCount,
      deeplinkEnabled: program.deeplinkEnabled,
      logoUrl: program.logoUrl,
      clickThroughUrl: program.clickThroughUrl,
      topicTags: program.topicTags,
    })),
    stats: {
      joined: joined.length,
      pending: pending.length,
      feeds: feeds.length,
      apiProducts: apiProducts.length,
      programOfferProducts: programOfferProducts.length,
      totalProducts: mergedProducts.length,
      apiBanners: apiBanners.length,
      logoBanners: logoBanners.length,
      totalBanners: mergedBannerRegistry.banners.length,
      oauthTokenPresent: Boolean(TOKEN),
      productFeedKeyPresent: Boolean(PRODUCT_FEED_KEY),
      feedListEndpointUsed: runtime.feedListEndpointUsed || null,
      feedProductFetchFailures: runtime.feedProductFetchFailures,
      feedRowsFetched: runtime.feedRowsFetched,
      feedRowsNormalized: runtime.feedRowsNormalized,
      feedsWithRowsButZeroProducts: runtime.feedsWithRowsButZeroProducts,
      experimentalCreativesEnabled: FETCH_CREATIVES,
      warnings: runtime.warnings,
      errors: runtime.errors,
    },
  };

  writeJson(join(DATA, 'awin-programs.json'), programData);

  ok(`awin-programs.json written: ${programData.programs.length} joined + ${programData.pendingPrograms.length} pending`);
  ok(`awin-products.json written: ${mergedProducts.length} total (${apiProducts.length} feed, ${programOfferProducts.length} program fallback, ${mergedProducts.length - apiProducts.length - programOfferProducts.length} manual)`);
  ok(`affiliate-banners.json written: ${mergedBannerRegistry.banners.length} total (${apiBanners.length} creative API, ${logoBanners.length} logo fallback)`);

  for (const program of programData.summary) {
    log(`${program.name}: relationship=${program.relationship}, products=${program.productCount}, feed=${program.hasProductFeed ? 'yes' : 'no'}, logo=${program.hasLogo ? 'yes' : 'no'}`);
  }

  if (runtime.warnings.length) {
    log(`Completed with ${runtime.warnings.length} warning(s). Run npm run awin:audit for a structured report.`);
  }
  log('-------------------------------------');
  log('Sync complete');
}

main().catch((err) => {
  console.error('[sync-awin] Fatal error:', err);
  process.exit(1);
});

// ─── AWIN PROMOTIONS PHASE ─────────────────────────────────────────────────

async function syncPromotions() {
  const { writeEmptyOffers, writePromotionsOutput } = await import('./awin/write-promotions-output.mjs');

  if (process.env.AWIN_FETCH_PROMOTIONS !== 'true') {
    log('[promotions] AWIN_FETCH_PROMOTIONS not set — skipping. Using existing offer files.');
    return;
  }

  if (!TOKEN) {
    warn('[promotions] AWIN_OAUTH2_TOKEN missing — cannot fetch promotions. Writing empty placeholders.');
    writeEmptyOffers();
    return;
  }

  try {
    const { fetchPromotions } = await import('./awin/fetch-promotions.mjs');
    const { normalizeAll } = await import('./awin/normalize-promotions.mjs');
    const { scoreAll } = await import('./awin/score-promotions.mjs');

    log('[promotions] Fetching AWIN promotions/offers...');

    const { rows, meta } = await fetchPromotions(PUBLISHER_ID, {
      token: TOKEN,
      membership: process.env.AWIN_PROMOTIONS_MEMBERSHIP ?? 'joined',
      regionCodes: (process.env.AWIN_PROMOTIONS_REGION_CODES ?? 'US').split(',').map((s) => s.trim()),
      pageSize: Number(process.env.AWIN_PROMOTIONS_PAGE_SIZE ?? '200'),
      maxPages: Number(process.env.AWIN_PROMOTIONS_MAX_PAGES ?? '25'),
      includeExpiring: process.env.AWIN_PROMOTIONS_INCLUDE_EXPIRING !== 'false',
      includeUpcoming: process.env.AWIN_PROMOTIONS_INCLUDE_UPCOMING !== 'false',
    });

    log(`[promotions] Fetched ${rows.length} raw promotion rows`);

    // Build lookup structures from already-written awin-programs.json
    const programsPath = join(DATA, 'awin-programs.json');
    let joinedAdvertiserIds = new Set();
    let programMap = new Map();

    if (existsSync(programsPath)) {
      const programData = JSON.parse(readFileSync(programsPath, 'utf8'));
      const allProgs = [...(programData.programs ?? []), ...(programData.pendingPrograms ?? [])];
      for (const p of allProgs) {
        if (p.relationship === 'joined' || p.isActive) {
          joinedAdvertiserIds.add(String(p.advertiserId));
        }
        programMap.set(String(p.advertiserId), p);
      }
    }

    log(`[promotions] ${joinedAdvertiserIds.size} joined advertiser IDs loaded`);

    const normalized = normalizeAll(rows, joinedAdvertiserIds, programMap);
    log(`[promotions] Normalized: ${normalized.length} offers`);

    const scored = scoreAll(normalized, programMap);
    const enabledCount = scored.filter((o) => o.enabled).length;
    log(`[promotions] Scored: ${scored.length} offers, ${enabledCount} enabled`);

    const stats = writePromotionsOutput(rows, scored, meta);

    ok(`[promotions] awin-offers.raw.json: ${rows.length} rows`);
    ok(`[promotions] awin-offers.normalized.json: ${scored.length} offers (${enabledCount} enabled)`);
    ok(`[promotions] awin-offers.stats.json: avgQuality=${stats.avgQualityScore}`);

    if (meta.errors.length > 0) {
      for (const e of meta.errors) warn(`[promotions] Fetch error: ${e}`);
    }

  } catch (err) {
    warn(`[promotions] Sync failed: ${err.message}. Writing empty placeholders.`);
    const { writeEmptyOffers: writeEmpty } = await import('./awin/write-promotions-output.mjs');
    writeEmpty();
    if (STRICT) {
      throw new Error(`[promotions] Strict mode: promotions sync failed — ${err.message}`);
    }
  }
}

syncPromotions().catch((err) => {
  console.error('[sync-awin] Promotions phase error:', err);
  if (STRICT) process.exit(1);
});
