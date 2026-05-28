import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { CLAIM_RULES } from './claim-rules.mjs';

const CONTENT_DIR = new URL('../../src/content/guides/', import.meta.url).pathname;

function walkDir(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(full);
    }
  }
  return files;
}

const files = walkDir(CONTENT_DIR);
let totalFindings = 0;

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    for (const rule of CLAIM_RULES) {
      if (rule.pattern.test(lines[i])) {
        findings.push({
          line: i + 1,
          text: lines[i].trim().slice(0, 120),
          suggestion: rule.suggestion,
          risk: rule.risk,
        });
        rule.pattern.lastIndex = 0;
      }
    }
  }

  if (findings.length > 0) {
    const rel = filePath.replace(CONTENT_DIR, '');
    console.log(`\n📄 ${rel}`);
    for (const f of findings) {
      const icon = f.risk === 'high' ? '🔴' : '🟡';
      console.log(`  ${icon} Line ${f.line} [${f.risk}]: ${f.text}`);
      console.log(`     → Suggestion: ${f.suggestion}`);
    }
    totalFindings += findings.length;
  }
}

console.log(`\n✅ Audit complete — ${files.length} files scanned, ${totalFindings} findings.`);
console.log('This is a read-only audit. No files were modified.');
