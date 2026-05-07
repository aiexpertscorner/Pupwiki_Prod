/**
 * Scans src/content/blog/ for generated posts and syncs content-status.json flags.
 *
 * After PSEO generation, content-status.json must reflect what's actually been written.
 * This script closes the gap: reads breedSlug + family/cluster from each generated post's
 * frontmatter and sets the corresponding flag to true.
 *
 * Also ensures all breeds from master-breeds.json and master-crossbreeds.json have entries,
 * and that cost_calculator is always true (pages always exist for all breeds).
 *
 * Flags:
 *   --apply     Write changes to content-status.json (default: dry-run)
 *   --verbose   Log each change
 *   --report    Print full summary at end
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG_DIR   = path.join(ROOT, 'src/content/blog');
const STATUS_PATH = path.join(ROOT, 'src/data/content-status.json');
const BREEDS_PATH = path.join(ROOT, 'src/data/master-breeds.json');
const CROSS_PATH  = path.join(ROOT, 'src/data/master-crossbreeds.json');

const APPLY   = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const REPORT  = process.argv.includes('--report');

// Maps frontmatter family/cluster values to content-status keys
const FAMILY_TO_STATUS_KEY = {
  food:           'food_post',
  toys:           'toy_post',
  beds:           'bed_post',
  grooming:       'grooming_post',
  training:       'training_post',
  supplements:    'supplement_post',
  health:         'health_post',
  puppy:          'puppy_post',
  'senior-dogs':  'senior_post',
  insurance:      'insurance_post',
  lifestyle:      null, // no dedicated status key — lifestyle posts are cluster-level
  travel:         null,
  'home-cleanup': null,
};

function getYamlValue(content, key) {
  // Reads a simple scalar from YAML frontmatter (first 80 lines)
  const block = content.split('\n').slice(0, 80).join('\n');
  const m = new RegExp(`^${key}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, 'm').exec(block);
  return m ? m[1].trim() : null;
}

function isGenerated(content) {
  const block = content.split('\n').slice(0, 60).join('\n');
  return /^generated:\s*true\s*$/m.test(block);
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const status = loadJson(STATUS_PATH);
  const breeds = loadJson(BREEDS_PATH);
  const crossbreeds = loadJson(CROSS_PATH);

  const stats = { added: 0, updated: 0, skipped: 0, unknown_family: 0 };

  // Ensure all master-breeds have entries with cost_calculator=true
  const SKELETON = {
    hub: true, cost_calculator: true,
    names_page: false, food_post: false, toy_post: false,
    bed_post: false, grooming_post: false, training_post: false,
    supplement_post: false, health_post: false,
    puppy_post: false, senior_post: false, insurance_post: false,
  };

  for (const b of breeds) {
    if (!b.slug) continue;
    if (!status[b.slug]) {
      status[b.slug] = { ...SKELETON };
      stats.added++;
    } else {
      // Always ensure cost_calculator reflects reality
      if (!status[b.slug].cost_calculator) {
        status[b.slug].cost_calculator = true;
        stats.updated++;
      }
    }
  }

  // Ensure all crossbreeds have entries (hub + cost_calculator; no names page)
  const CROSS_SKELETON = { ...SKELETON, names_page: false };
  for (const b of crossbreeds) {
    if (!b.slug) continue;
    if (!status[b.slug]) {
      status[b.slug] = { ...CROSS_SKELETON };
      stats.added++;
    } else {
      if (!status[b.slug].cost_calculator) {
        status[b.slug].cost_calculator = true;
        stats.updated++;
      }
    }
  }

  // Scan blog posts for generated content
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    if (!isGenerated(content)) {
      stats.skipped++;
      continue;
    }

    const breedSlug = getYamlValue(content, 'breedSlug');
    if (!breedSlug) continue;

    // Try cluster first, fall back to family
    const cluster = getYamlValue(content, 'cluster') || getYamlValue(content, 'family');
    if (!cluster) continue;

    const statusKey = FAMILY_TO_STATUS_KEY[cluster];
    if (statusKey === undefined) {
      stats.unknown_family++;
      if (VERBOSE) console.log(`[sync] Unknown family/cluster "${cluster}" in ${file}`);
      continue;
    }
    if (statusKey === null) continue; // Known cluster but no status key (puppy etc.)

    if (!status[breedSlug]) {
      status[breedSlug] = { ...SKELETON };
      stats.added++;
    }

    if (!status[breedSlug][statusKey]) {
      status[breedSlug][statusKey] = true;
      stats.updated++;
      if (VERBOSE) console.log(`[sync] Set ${breedSlug}.${statusKey} = true (${file})`);
    }
  }

  // Also mark names_page=true for all master-breeds (dog-names/[breed] exists for them)
  for (const b of breeds) {
    if (!b.slug || !status[b.slug]) continue;
    if (!status[b.slug].names_page) {
      status[b.slug].names_page = true;
      stats.updated++;
    }
  }

  if (REPORT || VERBOSE) {
    const totalTrue = Object.values(status).reduce((acc, s) => {
      for (const k of Object.keys(s)) if (s[k] === true) acc++;
      return acc;
    }, 0);
    console.log(`[sync] Breeds tracked: ${Object.keys(status).length}`);
    console.log(`[sync] New entries added: ${stats.added}`);
    console.log(`[sync] Flags updated: ${stats.updated}`);
    console.log(`[sync] Non-generated files skipped: ${stats.skipped}`);
    console.log(`[sync] Unknown family/cluster: ${stats.unknown_family}`);
    console.log(`[sync] Total true flags: ${totalTrue}`);
  }

  if (APPLY) {
    fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + '\n', 'utf8');
    console.log(`[sync] Written to ${STATUS_PATH}`);
  } else {
    console.log('[sync] Dry-run mode — pass --apply to write changes');
  }
}

main();
