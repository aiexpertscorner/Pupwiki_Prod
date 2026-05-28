#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  normalizeMonetizationIntent,
  normalizePostType,
  normalizeReviewMethod,
  sanitizePublicDogCopy,
  validatePublicDogCopy,
} from '../lib/public-content-contract.mjs';

const ROOT = process.cwd();
const GUIDES_DIR = resolve(ROOT, 'src/content/guides');
const APPLY = process.argv.includes('--apply');
const STRICT = process.argv.includes('--strict');

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;
  return {
    raw: text.slice(start, end),
    body: text.slice(end + 4).replace(/^\r?\n/, ''),
  };
}

function setYaml(raw, updates) {
  const lines = raw.split(/\r?\n/);
  const used = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!match) return line;
    const key = match[1];
    if (!(key in updates)) return line;
    used.add(key);
    return `${key}: ${updates[key]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!used.has(key)) output.push(`${key}: ${value}`);
  }
  return output.join('\n');
}

function getYamlScalar(raw, key) {
  const match = raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

function quote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const files = existsSync(GUIDES_DIR) ? readdirSync(GUIDES_DIR).filter((file) => file.endsWith('.md')) : [];
const report = {
  apply: APPLY,
  scanned: 0,
  changed: 0,
  invalidPublicCopy: [],
};

for (const filename of files) {
  const path = join(GUIDES_DIR, filename);
  const original = readFileSync(path, 'utf8');
  const parsed = parseFrontmatter(original);
  if (!parsed) continue;

  report.scanned++;

  const reviewMethod = normalizeReviewMethod(getYamlScalar(parsed.raw, 'reviewMethod'));
  const monetizationIntent = normalizeMonetizationIntent(getYamlScalar(parsed.raw, 'monetizationIntent'), 'none');
  const postType = normalizePostType(getYamlScalar(parsed.raw, 'postType'));
  const updatedYaml = setYaml(parsed.raw, {
    postType: quote(postType),
    reviewMethod: quote(reviewMethod),
    monetizationIntent: quote(monetizationIntent),
  });
  const body = sanitizePublicDogCopy(parsed.body);
  const next = `---\n${updatedYaml}\n---\n${body}`;

  const publicHits = validatePublicDogCopy(body);
  if (publicHits.length) {
    report.invalidPublicCopy.push({ file: filename, patterns: publicHits });
  }

  if (next !== original) {
    report.changed++;
    if (APPLY) writeFileSync(path, next, 'utf8');
  }
}

console.log(JSON.stringify(report, null, 2));
if (STRICT && report.invalidPublicCopy.length) process.exit(1);
