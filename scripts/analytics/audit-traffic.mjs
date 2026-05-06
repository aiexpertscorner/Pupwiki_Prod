#!/usr/bin/env node
/**
 * PupWiki traffic analytics audit
 *
 * Runs locally from VS Code/VS Tools or inside GitHub Actions.
 * - Cloudflare: edge traffic, top paths, status codes, countries, devices, recent Pages deploys.
 * - GA4: top pages, landing pages, source/medium, countries and device categories via GA4 Data API.
 *
 * No npm dependencies required. Uses Node 20+ native fetch and crypto.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DEFAULT_HOSTNAME = 'pupwiki.com';
const DEFAULT_PAGES_PROJECT = 'pupwiki';
const DEFAULT_REPORT_DIR = path.join('reports', 'analytics');

function loadEnvFile(filePath) {
  const absolutePath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absolutePath)) return;

  const raw = fs.readFileSync(absolutePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed
      .slice(equalsIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function parseArgs(argv) {
  const args = {
    all: false,
    cloudflare: false,
    ga4: false,
    days: undefined,
    host: undefined,
    outDir: undefined,
    strict: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') args.all = true;
    else if (arg === '--cloudflare' || arg === '--cf') args.cloudflare = true;
    else if (arg === '--ga4') args.ga4 = true;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--days') args.days = Number(argv[++i]);
    else if (arg.startsWith('--days=')) args.days = Number(arg.split('=')[1]);
    else if (arg === '--host') args.host = argv[++i];
    else if (arg.startsWith('--host=')) args.host = arg.split('=')[1];
    else if (arg === '--out-dir') args.outDir = argv[++i];
    else if (arg.startsWith('--out-dir=')) args.outDir = arg.split('=')[1];
  }

  if (!args.cloudflare && !args.ga4) args.all = true;
  return args;
}

const cli = parseArgs(process.argv.slice(2));
const DAYS = Number(cli.days || process.env.ANALYTICS_DAYS || process.env.CF_DAYS || process.env.GA4_DAYS || 30);
const HOSTNAME = cli.host || process.env.CF_HOSTNAME || process.env.CLOUDFLARE_ZONE_NAME || DEFAULT_HOSTNAME;
const REPORT_DIR = cli.outDir || process.env.ANALYTICS_REPORT_DIR || DEFAULT_REPORT_DIR;
const generatedAt = new Date();
const startDate = new Date(generatedAt.getTime() - DAYS * 24 * 60 * 60 * 1000);
const isoDate = generatedAt.toISOString().slice(0, 10);
const stamp = generatedAt.toISOString().replace(/[:.]/g, '-');

function assertDays() {
  if (!Number.isFinite(DAYS) || DAYS < 1 || DAYS > 366) {
    throw new Error(`Invalid days value: ${DAYS}. Use --days 1..366.`);
  }
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function bytesToMb(bytes = 0) {
  return Math.round((Number(bytes || 0) / 1024 / 1024) * 100) / 100;
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function slugifyMetric(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizePathname(value) {
  if (!value) return '/';
  const clean = String(value).split('?')[0].split('#')[0] || '/';
  return clean.endsWith('/') && clean !== '/' ? clean.slice(0, -1) : clean;
}

function classifyPath(value) {
  const pathname = normalizePathname(value);
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/blog/')) return 'blog';
  if (pathname.startsWith('/breeds/')) return 'breed';
  if (pathname.startsWith('/categories/')) return 'category';
  if (pathname.startsWith('/dog-names')) return 'dog-names';
  if (pathname.includes('calculator')) return 'tool';
  if (pathname.startsWith('/partners/') || pathname.includes('partner-')) return 'partner';
  if (pathname.match(/\.(png|jpg|jpeg|webp|svg|css|js|ico|json|xml)$/i)) return 'asset';
  return 'page';
}

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function markdownTable(rows, headers) {
  if (!rows?.length) return '_No data returned._';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((header) => escapeMarkdownCell(row[header])).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

function writeCsv(filePath, rows) {
  if (!rows?.length) {
    fs.writeFileSync(filePath, '');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const raw = String(row[header] ?? '');
          return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
        })
        .join(','),
    ),
  ];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function base64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function safeRun(name, fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      name,
    };
  }
}

async function cfRestFetch(endpoint, token) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.cloudflare.com/client/v4${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    const message = json.errors?.map((error) => `${error.code || 'CF'} ${error.message}`).join('; ') || response.statusText;
    throw new Error(message);
  }
  return json.result;
}

async function cfGraphql(query, variables, token) {
  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errors) {
    const message = json.errors?.map((error) => error.message).join('; ') || response.statusText;
    throw new Error(message);
  }
  return json.data;
}

async function getCloudflareZoneId(token) {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID;
  const zoneName = process.env.CLOUDFLARE_ZONE_NAME || HOSTNAME;
  const zones = await cfRestFetch(`/zones?name=${encodeURIComponent(zoneName)}`, token);
  const zone = Array.isArray(zones) ? zones[0] : undefined;
  if (!zone?.id) {
    throw new Error(`Could not infer CLOUDFLARE_ZONE_ID for ${zoneName}. Add CLOUDFLARE_ZONE_ID to .env.local or GitHub Secrets.`);
  }
  return zone.id;
}

async function queryCloudflareGroup({ token, zoneId, dimension, limit = 50, orderBy = 'count_DESC' }) {
  const query = `
    query TrafficGroup($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          rows: httpRequestsAdaptiveGroups(limit: ${limit}, filter: $filter, orderBy: [${orderBy}]) {
            count
            sum { visits edgeResponseBytes }
            dimensions { value: ${dimension} }
          }
        }
      }
    }
  `;

  const filter = {
    datetime_geq: startDate.toISOString(),
    datetime_leq: generatedAt.toISOString(),
    requestSource: 'eyeball',
    clientRequestHTTPHost: HOSTNAME,
  };

  const data = await cfGraphql(query, { zoneTag: zoneId, filter }, token);
  return data?.viewer?.zones?.[0]?.rows || [];
}

async function queryCloudflareTraffic() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return {
      skipped: true,
      reason: 'Missing CLOUDFLARE_API_TOKEN.',
    };
  }

  const zoneId = await getCloudflareZoneId(token);

  const [byDayResult, topPathsResult, statusesResult, countriesResult, devicesResult, referersResult] = await Promise.all([
    safeRun('cloudflare_by_day', () => queryCloudflareGroup({ token, zoneId, dimension: 'datetimeDay', limit: 10000, orderBy: 'datetimeDay_ASC' })),
    safeRun('cloudflare_top_paths', () => queryCloudflareGroup({ token, zoneId, dimension: 'clientRequestPath', limit: 75 })),
    safeRun('cloudflare_statuses', () => queryCloudflareGroup({ token, zoneId, dimension: 'edgeResponseStatus', limit: 30 })),
    safeRun('cloudflare_countries', () => queryCloudflareGroup({ token, zoneId, dimension: 'clientCountryName', limit: 40 })),
    safeRun('cloudflare_devices', () => queryCloudflareGroup({ token, zoneId, dimension: 'clientDeviceType', limit: 20 })),
    safeRun('cloudflare_referers', () => queryCloudflareGroup({ token, zoneId, dimension: 'clientRefererHost', limit: 50 })),
  ]);

  let recentDeployments = [];
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || DEFAULT_PAGES_PROJECT;
  if (accountId && projectName) {
    const deployResult = await safeRun('cloudflare_pages_deployments', () =>
      cfRestFetch(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, token),
    );
    if (deployResult.ok) {
      recentDeployments = (Array.isArray(deployResult.data) ? deployResult.data : [])
        .slice(0, 10)
        .map((deployment) => ({
          created: deployment.created_on || '',
          branch: deployment.deployment_trigger?.metadata?.branch || deployment.source?.branch || '',
          status: deployment.latest_stage?.status || deployment.status || '',
          url: deployment.url || '',
        }));
    } else {
      recentDeployments = [{ error: deployResult.error }];
    }
  }

  const byDay = byDayResult.ok
    ? byDayResult.data.map((row) => ({
        date: row.dimensions?.value || '',
        requests: row.count || 0,
        visits: row.sum?.visits || 0,
        mb: bytesToMb(row.sum?.edgeResponseBytes || 0),
      }))
    : [];

  const topPaths = topPathsResult.ok
    ? topPathsResult.data.map((row) => ({
        path: row.dimensions?.value || '/',
        type: classifyPath(row.dimensions?.value || '/'),
        requests: row.count || 0,
        visits: row.sum?.visits || 0,
        mb: bytesToMb(row.sum?.edgeResponseBytes || 0),
      }))
    : [];

  const totals = byDay.reduce(
    (acc, row) => {
      acc.requests += row.requests || 0;
      acc.visits += row.visits || 0;
      acc.mb += row.mb || 0;
      return acc;
    },
    { requests: 0, visits: 0, mb: 0 },
  );

  return {
    skipped: false,
    zoneId,
    hostname: HOSTNAME,
    totals: {
      requests: totals.requests,
      visits: totals.visits,
      mb: Math.round(totals.mb * 100) / 100,
    },
    byDay,
    topPaths,
    statuses: statusesResult.ok
      ? statusesResult.data.map((row) => ({ status: row.dimensions?.value, requests: row.count || 0 }))
      : [],
    countries: countriesResult.ok
      ? countriesResult.data.map((row) => ({ country: row.dimensions?.value || 'unknown', requests: row.count || 0 }))
      : [],
    devices: devicesResult.ok
      ? devicesResult.data.map((row) => ({ device: row.dimensions?.value || 'unknown', requests: row.count || 0 }))
      : [],
    referers: referersResult.ok
      ? referersResult.data.map((row) => ({ referer: row.dimensions?.value || 'direct/unknown', requests: row.count || 0 }))
      : [],
    recentDeployments,
    diagnostics: [byDayResult, topPathsResult, statusesResult, countriesResult, devicesResult, referersResult]
      .filter((result) => !result.ok)
      .map((result) => ({ name: result.name, error: result.error })),
  };
}

function readServiceAccountFromEnv() {
  const jsonSource =
    process.env.GA4_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (jsonSource) {
    return JSON.parse(jsonSource);
  }

  const base64Source = process.env.GA4_SERVICE_ACCOUNT_JSON_B64 || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (base64Source) {
    return JSON.parse(Buffer.from(base64Source, 'base64').toString('utf8'));
  }

  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GA4_SERVICE_ACCOUNT_FILE;
  if (filePath && fs.existsSync(path.resolve(ROOT, filePath))) {
    return JSON.parse(fs.readFileSync(path.resolve(ROOT, filePath), 'utf8'));
  }

  return null;
}

async function getGoogleAccessToken(serviceAccount) {
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error('GA4 service account JSON must include client_email and private_key.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const privateKey = String(serviceAccount.private_key).replace(/\\n/g, '\n');
  const signature = crypto.createSign('RSA-SHA256').update(unsignedJwt).sign(privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || response.statusText);
  }

  return json.access_token;
}

async function ga4RunReport({ propertyId, accessToken, dimensions, metrics, limit = 100, orderMetric }) {
  const body = {
    dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
  };

  if (orderMetric) {
    body.orderBys = [{ metric: { metricName: orderMetric }, desc: true }];
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || response.statusText);
  }

  return (json.rows || []).map((row) => {
    const output = {};
    dimensions.forEach((dimension, index) => {
      output[dimension] = row.dimensionValues?.[index]?.value || '';
    });
    metrics.forEach((metric, index) => {
      output[metric] = numberValue(row.metricValues?.[index]?.value);
    });
    return output;
  });
}

async function queryGa4Traffic() {
  const propertyId = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  const measurementId = process.env.PUBLIC_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID;

  if (!propertyId) {
    return {
      skipped: true,
      reason: measurementId
        ? 'PUBLIC_GA_MEASUREMENT_ID is present, but GA4_PROPERTY_ID is required to read analytics reports. Measurement IDs inject tracking only; they cannot query GA4 data.'
        : 'Missing GA4_PROPERTY_ID.',
    };
  }

  const serviceAccount = readServiceAccountFromEnv();
  if (!serviceAccount) {
    return {
      skipped: true,
      reason: 'Missing GA4 service account credentials. Set GA4_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON, GA4_SERVICE_ACCOUNT_JSON_B64, or GOOGLE_APPLICATION_CREDENTIALS.',
    };
  }

  const accessToken = await getGoogleAccessToken(serviceAccount);

  const pageMetrics = ['screenPageViews', 'sessions', 'activeUsers', 'engagedSessions'];
  const [byDayResult, topPagesResult, landingPagesResult, sourceMediumResult, countriesResult, devicesResult] = await Promise.all([
    safeRun('ga4_by_day', () => ga4RunReport({ propertyId, accessToken, dimensions: ['date'], metrics: pageMetrics, limit: 400, orderMetric: 'sessions' })),
    safeRun('ga4_top_pages', () => ga4RunReport({ propertyId, accessToken, dimensions: ['pagePathPlusQueryString'], metrics: pageMetrics, limit: 100, orderMetric: 'screenPageViews' })),
    safeRun('ga4_landing_pages', () => ga4RunReport({ propertyId, accessToken, dimensions: ['landingPagePlusQueryString'], metrics: pageMetrics, limit: 100, orderMetric: 'sessions' })),
    safeRun('ga4_source_medium', () => ga4RunReport({ propertyId, accessToken, dimensions: ['sessionSourceMedium'], metrics: ['sessions', 'activeUsers', 'engagedSessions'], limit: 50, orderMetric: 'sessions' })),
    safeRun('ga4_countries', () => ga4RunReport({ propertyId, accessToken, dimensions: ['country'], metrics: ['sessions', 'activeUsers'], limit: 50, orderMetric: 'sessions' })),
    safeRun('ga4_devices', () => ga4RunReport({ propertyId, accessToken, dimensions: ['deviceCategory'], metrics: ['sessions', 'activeUsers'], limit: 20, orderMetric: 'sessions' })),
  ]);

  const byDay = byDayResult.ok
    ? byDayResult.data
        .map((row) => ({
          date: `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`,
          pageviews: row.screenPageViews || 0,
          sessions: row.sessions || 0,
          activeUsers: row.activeUsers || 0,
          engagedSessions: row.engagedSessions || 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const totals = byDay.reduce(
    (acc, row) => {
      acc.pageviews += row.pageviews || 0;
      acc.sessions += row.sessions || 0;
      acc.activeUsers += row.activeUsers || 0;
      acc.engagedSessions += row.engagedSessions || 0;
      return acc;
    },
    { pageviews: 0, sessions: 0, activeUsers: 0, engagedSessions: 0 },
  );

  function mapPageRow(row, dimensionName) {
    const pagePath = row[dimensionName] || '/';
    return {
      path: pagePath,
      normalizedPath: normalizePathname(pagePath),
      type: classifyPath(pagePath),
      pageviews: row.screenPageViews || 0,
      sessions: row.sessions || 0,
      activeUsers: row.activeUsers || 0,
      engagedSessions: row.engagedSessions || 0,
    };
  }

  return {
    skipped: false,
    propertyId,
    measurementId: measurementId ? `${measurementId.slice(0, 4)}…${measurementId.slice(-4)}` : null,
    totals,
    byDay,
    topPages: topPagesResult.ok ? topPagesResult.data.map((row) => mapPageRow(row, 'pagePathPlusQueryString')) : [],
    landingPages: landingPagesResult.ok ? landingPagesResult.data.map((row) => mapPageRow(row, 'landingPagePlusQueryString')) : [],
    sourceMedium: sourceMediumResult.ok
      ? sourceMediumResult.data.map((row) => ({
          sourceMedium: row.sessionSourceMedium || 'unknown',
          sessions: row.sessions || 0,
          activeUsers: row.activeUsers || 0,
          engagedSessions: row.engagedSessions || 0,
        }))
      : [],
    countries: countriesResult.ok
      ? countriesResult.data.map((row) => ({ country: row.country || 'unknown', sessions: row.sessions || 0, activeUsers: row.activeUsers || 0 }))
      : [],
    devices: devicesResult.ok
      ? devicesResult.data.map((row) => ({ device: row.deviceCategory || 'unknown', sessions: row.sessions || 0, activeUsers: row.activeUsers || 0 }))
      : [],
    diagnostics: [byDayResult, topPagesResult, landingPagesResult, sourceMediumResult, countriesResult, devicesResult]
      .filter((result) => !result.ok)
      .map((result) => ({ name: result.name, error: result.error })),
  };
}

function buildOpportunities(report) {
  const opportunities = [];
  const ga4Pages = report.ga4?.topPages || [];
  const cloudflarePaths = report.cloudflare?.topPaths || [];

  for (const page of ga4Pages.slice(0, 40)) {
    const type = page.type;
    if (['asset'].includes(type)) continue;
    const sessions = page.sessions || 0;
    const pageviews = page.pageviews || 0;
    if (pageviews < 10 && sessions < 5) continue;

    let action = 'Review content quality, internal links and monetization placement.';
    if (type === 'breed') action = 'Add strong breed-specific internal links to names, food, health, grooming, insurance/cost and category hubs.';
    if (type === 'category') action = 'Treat as money hub: tighten intro, add product/category CTAs, related guides and comparison links.';
    if (type === 'blog') action = 'Refresh title/H1, add article commerce suite, related breed/category links and stronger above-the-fold intent matching.';
    if (type === 'dog-names') action = 'Add breed links, share/export CTA and related care/category links without making it look commercial.';
    if (type === 'partner') action = 'Check whether this partner profile reads like a real brand/product page, not backend affiliate copy.';

    opportunities.push({
      source: 'GA4',
      path: page.path,
      type,
      pageviews,
      sessions,
      action,
    });
  }

  for (const pathRow of cloudflarePaths.slice(0, 40)) {
    if (pathRow.type === 'asset') continue;
    const existing = opportunities.find((item) => normalizePathname(item.path) === normalizePathname(pathRow.path));
    if (existing) continue;
    if ((pathRow.requests || 0) < 10) continue;
    opportunities.push({
      source: 'Cloudflare',
      path: pathRow.path,
      type: pathRow.type,
      requests: pathRow.requests,
      visits: pathRow.visits,
      action: 'High edge traffic path: compare with GA4, check cache/assets, add internal links or monetization if this is a content route.',
    });
  }

  return opportunities.slice(0, 50);
}

function prettifyRows(rows, keyMap) {
  return rows.map((row) => {
    const output = {};
    for (const [from, to] of Object.entries(keyMap)) output[to] = row[from];
    return output;
  });
}

function buildMarkdown(report) {
  const cf = report.cloudflare;
  const ga4 = report.ga4;
  const opportunities = report.opportunities || [];

  const cfSummary = cf?.skipped
    ? `Cloudflare skipped: ${cf.reason}`
    : `Requests: ${cf?.totals?.requests || 0} · Visits: ${cf?.totals?.visits || 0} · Transfer: ${cf?.totals?.mb || 0} MB`;

  const ga4Summary = ga4?.skipped
    ? `GA4 skipped: ${ga4.reason}`
    : `Pageviews: ${ga4?.totals?.pageviews || 0} · Sessions: ${ga4?.totals?.sessions || 0} · Active users: ${ga4?.totals?.activeUsers || 0} · Engaged sessions: ${ga4?.totals?.engagedSessions || 0}`;

  return `# PupWiki Traffic Audit

Generated: ${report.generatedAt}  
Host: ${report.hostname}  
Period: ${report.period.startDate} → ${report.period.endDate} (${report.period.days} days)

## Summary

- Cloudflare: ${cfSummary}
- GA4: ${ga4Summary}

## GA4 top pages

${ga4?.skipped ? `_${ga4.reason}_` : markdownTable(prettifyRows((ga4?.topPages || []).slice(0, 30), {
    path: 'Path',
    type: 'Type',
    pageviews: 'Pageviews',
    sessions: 'Sessions',
    activeUsers: 'Active users',
    engagedSessions: 'Engaged sessions',
  }), ['Path', 'Type', 'Pageviews', 'Sessions', 'Active users', 'Engaged sessions'])}

## GA4 landing pages

${ga4?.skipped ? `_${ga4.reason}_` : markdownTable(prettifyRows((ga4?.landingPages || []).slice(0, 30), {
    path: 'Path',
    type: 'Type',
    pageviews: 'Pageviews',
    sessions: 'Sessions',
    activeUsers: 'Active users',
    engagedSessions: 'Engaged sessions',
  }), ['Path', 'Type', 'Pageviews', 'Sessions', 'Active users', 'Engaged sessions'])}

## GA4 source / medium

${ga4?.skipped ? `_${ga4.reason}_` : markdownTable(prettifyRows((ga4?.sourceMedium || []).slice(0, 25), {
    sourceMedium: 'Source / medium',
    sessions: 'Sessions',
    activeUsers: 'Active users',
    engagedSessions: 'Engaged sessions',
  }), ['Source / medium', 'Sessions', 'Active users', 'Engaged sessions'])}

## GA4 countries

${ga4?.skipped ? `_${ga4.reason}_` : markdownTable(prettifyRows((ga4?.countries || []).slice(0, 25), {
    country: 'Country',
    sessions: 'Sessions',
    activeUsers: 'Active users',
  }), ['Country', 'Sessions', 'Active users'])}

## Cloudflare top paths

${cf?.skipped ? `_${cf.reason}_` : markdownTable(prettifyRows((cf?.topPaths || []).slice(0, 30), {
    path: 'Path',
    type: 'Type',
    requests: 'Requests',
    visits: 'Visits',
    mb: 'MB',
  }), ['Path', 'Type', 'Requests', 'Visits', 'MB'])}

## Cloudflare status codes

${cf?.skipped ? `_${cf.reason}_` : markdownTable(prettifyRows((cf?.statuses || []).slice(0, 20), {
    status: 'Status',
    requests: 'Requests',
  }), ['Status', 'Requests'])}

## Cloudflare countries

${cf?.skipped ? `_${cf.reason}_` : markdownTable(prettifyRows((cf?.countries || []).slice(0, 25), {
    country: 'Country',
    requests: 'Requests',
  }), ['Country', 'Requests'])}

## Cloudflare recent Pages deployments

${cf?.skipped ? `_${cf.reason}_` : markdownTable(prettifyRows((cf?.recentDeployments || []).slice(0, 10), {
    created: 'Created',
    branch: 'Branch',
    status: 'Status',
    url: 'URL',
    error: 'Error',
  }), ['Created', 'Branch', 'Status', 'URL', 'Error'])}

## Opportunity queue

${markdownTable(opportunities.map((item) => ({
    Source: item.source,
    Path: item.path,
    Type: item.type,
    Traffic: item.pageviews ? `${item.pageviews} pageviews / ${item.sessions} sessions` : `${item.requests} requests / ${item.visits} visits`,
    Action: item.action,
  })), ['Source', 'Path', 'Type', 'Traffic', 'Action'])}

## Diagnostics

${markdownTable([
    ...(cf?.diagnostics || []).map((item) => ({ Source: 'Cloudflare', Name: item.name, Error: item.error })),
    ...(ga4?.diagnostics || []).map((item) => ({ Source: 'GA4', Name: item.name, Error: item.error })),
  ], ['Source', 'Name', 'Error'])}

## Required secrets / env vars

### Cloudflare

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID, optional but needed for Pages deployments
- CLOUDFLARE_ZONE_ID, optional if token can list zones
- CLOUDFLARE_ZONE_NAME or CF_HOSTNAME, optional; defaults to ${DEFAULT_HOSTNAME}

### GA4

- GA4_PROPERTY_ID or GOOGLE_ANALYTICS_PROPERTY_ID
- GA4_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON, GA4_SERVICE_ACCOUNT_JSON_B64, or GOOGLE_APPLICATION_CREDENTIALS
- PUBLIC_GA_MEASUREMENT_ID is only used as a tracking ID and sanity check; it is not enough to read reports.
`;
}

async function main() {
  assertDays();
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const shouldRunCloudflare = cli.all || cli.cloudflare;
  const shouldRunGa4 = cli.all || cli.ga4;

  const [cloudflareResult, ga4Result] = await Promise.all([
    shouldRunCloudflare ? safeRun('cloudflare', queryCloudflareTraffic) : Promise.resolve({ ok: true, data: { skipped: true, reason: 'Not requested.' } }),
    shouldRunGa4 ? safeRun('ga4', queryGa4Traffic) : Promise.resolve({ ok: true, data: { skipped: true, reason: 'Not requested.' } }),
  ]);

  const report = {
    generatedAt: generatedAt.toISOString(),
    hostname: HOSTNAME,
    period: {
      days: DAYS,
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(generatedAt),
    },
    cloudflare: cloudflareResult.ok ? cloudflareResult.data : { skipped: true, reason: cloudflareResult.error },
    ga4: ga4Result.ok ? ga4Result.data : { skipped: true, reason: ga4Result.error },
  };

  report.opportunities = buildOpportunities(report);

  const jsonPath = path.join(REPORT_DIR, `traffic-audit-${isoDate}-${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `traffic-audit-${isoDate}-${stamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(report));

  if (!report.ga4?.skipped) {
    writeCsv(path.join(REPORT_DIR, `ga4-top-pages-${isoDate}.csv`), report.ga4.topPages || []);
    writeCsv(path.join(REPORT_DIR, `ga4-landing-pages-${isoDate}.csv`), report.ga4.landingPages || []);
  }

  if (!report.cloudflare?.skipped) {
    writeCsv(path.join(REPORT_DIR, `cloudflare-top-paths-${isoDate}.csv`), report.cloudflare.topPaths || []);
  }

  console.log('PupWiki traffic audit complete.');
  console.log(`Markdown: ${mdPath}`);
  console.log(`JSON: ${jsonPath}`);

  const skipped = [report.cloudflare, report.ga4].filter((item) => item?.skipped);
  if (cli.strict && skipped.length) {
    console.error('Strict mode failed because one or more analytics sources were skipped:');
    for (const item of skipped) console.error(`- ${item.reason}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
