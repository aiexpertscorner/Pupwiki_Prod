#!/usr/bin/env node
/**
 * Verify the canonical homepage hero component stays in sync.
 * HomeHeroClean.astro is the single source of truth — it owns its
 * own scoped <style> block (pw-hero-v3 namespace). No separate global
 * CSS file is required for these classes.
 *
 * Checks:
 * 1. index.astro imports HomeHeroClean.astro as the hero
 * 2. HomeHeroClean.astro contains all required pw-hero-v3 classes
 * 3. HomeHeroClean.astro does not contain any banned legacy rotator classes
 * 4. src/styles/components/hero.css has no old teal radial styling
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const files = {
  index: resolve(ROOT, 'src/pages/index.astro'),
  clean: resolve(ROOT, 'src/components/home/HomeHeroClean.astro'),
  genericHeroCss: resolve(ROOT, 'src/styles/components/hero.css'),
};

const missing = Object.entries(files).filter(([, file]) => !existsSync(file));
if (missing.length) {
  console.error('Hero audit failed: missing expected files.');
  console.error(JSON.stringify(missing.map(([name, file]) => ({ name, file })), null, 2));
  process.exit(1);
}

const index = readFileSync(files.index, 'utf8');
const clean = readFileSync(files.clean, 'utf8');
const genericHeroCss = readFileSync(files.genericHeroCss, 'utf8');

// pw-hero namespace — all defined in HomeHeroClean.astro's own <style> block
const requiredComponentClasses = [
  'pw-hero',
  'pw-hero__shell',
  'pw-hero__content',
  'pw-hero__title',
  'pw-hero__actions',
  'pw-hero__trust',
  'pw-hero__card',
];

const bannedLegacyClasses = [
  'pw-hero__layout',
  'pw-hero__copy',
  'pw-hero__showcase',
  'pw-hero__photo-card',
  'pw-hero__photo-overlay',
  'pw-hero__photo-topline',
  'pw-hero__rotator-controls',
  'pw-hero__rotator-dots',
  'data-pw-home-hero-rotator',
];

const failures = [];

if (!index.includes('HomeHeroClean.astro')) {
  failures.push('src/pages/index.astro should import HomeHeroClean.astro as the canonical homepage hero.');
}

for (const className of requiredComponentClasses) {
  if (!clean.includes(className)) {
    failures.push(`HomeHeroClean.astro is missing class: ${className}`);
  }
}

for (const className of bannedLegacyClasses) {
  if (clean.includes(className)) {
    failures.push(`HomeHeroClean.astro still contains legacy rotator class: ${className}`);
  }
}

if (genericHeroCss.includes('rgba(13,148,136') || genericHeroCss.includes('rgba(13, 148, 136')) {
  failures.push('src/styles/components/hero.css still contains old teal radial styling.');
}

if (failures.length) {
  console.error('Hero audit failed.');
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: Object.keys(files) }, null, 2));
