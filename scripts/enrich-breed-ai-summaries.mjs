/**
 * scripts/enrich-breed-ai-summaries.mjs
 *
 * One-shot AI enrichment: generates a unique 60-word breed-specific paragraph
 * for each breed using gpt-4o-mini, caches to src/data/ai-breed-summaries.json.
 *
 * Usage (via GitHub Actions — manual trigger only):
 *   OPENAI_API_KEY=<key> node scripts/enrich-breed-ai-summaries.mjs
 *   OPENAI_API_KEY=<key> FORCE_REGEN=true node scripts/enrich-breed-ai-summaries.mjs
 *
 * Cost estimate: ~$0.05 for all 277 breeds using gpt-4o-mini.
 * Builds NEVER call this script — they read the cached JSON only.
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const breeds = require('../src/data/master-breeds.json');

const CACHE_PATH = path.join(ROOT, 'src/data/ai-breed-summaries.json');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FORCE_REGEN = process.env.FORCE_REGEN === 'true';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 120;
const RATE_LIMIT_MS = 120; // ~8 breeds/sec, well under 10K TPM limit for gpt-4o-mini

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is required.');
  console.error('Set OPENAI_API_KEY from PUPWIKI_GPT_KEY secret when running in CI.');
  process.exit(1);
}

// Load existing cache
let cache = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    console.log(`Loaded ${Object.keys(cache).length} cached entries from ai-breed-summaries.json`);
  } catch {
    console.warn('Cache file exists but could not be parsed — starting fresh.');
  }
}

function buildPrompt(breed) {
  const wMin = breed.weight?.min_lbs;
  const wMax = breed.weight?.max_lbs;
  const weightStr = wMin && wMax ? `${wMin}–${wMax} lbs` : wMin ? `${wMin}+ lbs` : null;
  const energy = breed.energy_level || breed.traits?.energy_level || 'moderate';
  const ailments = breed.ranking_data?.genetic_ailment_names || '';
  const size = breed.size_category || 'medium';
  const origin = breed.origin_country ? ` originally from ${breed.origin_country}` : '';

  const facts = [
    weightStr && `Typical adult weight: ${weightStr}`,
    `Size: ${size}`,
    `Energy level: ${energy}`,
    ailments && `Known health conditions: ${ailments}`,
  ].filter(Boolean).join('. ');

  return `You are writing factual breed content for PupWiki, a dog ownership reference site.

Write exactly 2–3 sentences about the ${breed.name}${origin}. Use these facts: ${facts}.
Rules: specific and factual only, no marketing fluff, no "perfect companion" clichés, max 65 words total.
Output ONLY the sentences — no headers, no labels, no quotes.`;
}

async function callOpenAI(prompt, breedName) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`Empty response for ${breedName}`);
  return text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const toProcess = breeds.filter(b => FORCE_REGEN || !cache[b.slug]);
const skipped = breeds.length - toProcess.length;

console.log(`\nBreed AI Enrichment`);
console.log(`Model: ${MODEL}`);
console.log(`Total breeds: ${breeds.length}`);
console.log(`Already cached: ${skipped}`);
console.log(`To process: ${toProcess.length}`);
if (FORCE_REGEN && skipped > 0) console.log(`(FORCE_REGEN=true — overwriting ${skipped} cached entries)`);
console.log('');

if (toProcess.length === 0) {
  console.log('All breeds already cached. Run with FORCE_REGEN=true to overwrite.\n');
  process.exit(0);
}

let processed = 0;
let errors = 0;
const startTime = Date.now();

for (const breed of toProcess) {
  const prompt = buildPrompt(breed);

  try {
    const summary = await callOpenAI(prompt, breed.name);
    cache[breed.slug] = {
      slug: breed.slug,
      name: breed.name,
      summary,
      generatedAt: new Date().toISOString().split('T')[0],
      model: MODEL,
    };
    processed++;

    // Save after every 10 breeds (incremental — survives interruption)
    if (processed % 10 === 0) {
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const remaining = toProcess.length - processed;
      console.log(`  [${processed}/${toProcess.length}] ${breed.name} ✓  (${errors} errors, ${elapsed}s elapsed, ~${remaining} left)`);
    } else {
      process.stdout.write('.');
    }
  } catch (err) {
    errors++;
    console.error(`\n  [ERROR] ${breed.name}: ${err.message}`);

    // Rate limit or auth error — abort early
    if (err.message.includes('429') || err.message.includes('401') || err.message.includes('403')) {
      console.error('\nAPI rate limit or auth error — saving progress and stopping.');
      break;
    }
  }

  // Rate limiting
  await sleep(RATE_LIMIT_MS);
}

// Final save
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const total = Object.keys(cache).length;

console.log(`\n\nDone in ${elapsed}s`);
console.log(`Processed: ${processed} | Errors: ${errors} | Total cached: ${total}`);
console.log(`Cache written to: src/data/ai-breed-summaries.json`);

// Rough cost estimate
const inputTokens = processed * 200;
const outputTokens = processed * 70;
const costUsd = (inputTokens / 1_000_000 * 0.15) + (outputTokens / 1_000_000 * 0.60);
console.log(`Estimated API cost: $${costUsd.toFixed(4)} (gpt-4o-mini)\n`);
