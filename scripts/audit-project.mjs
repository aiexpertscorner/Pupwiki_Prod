/**
 * audit-project.mjs
 * Scans the mrdoggostyle Astro project and reports:
 *  - What files exist where
 *  - What's missing vs what's expected
 *  - Import path mismatches
 *  - Which pack files need to go where
 *
 * Usage (run from project root):
 *   node audit-project.mjs
 *   node audit-project.mjs --fix     ← also writes fix-instructions.txt
 */

import fs   from 'fs';
import path from 'path';

const ROOT  = process.cwd();
const FIX   = process.argv.includes('--fix');
const G     = s => `\x1b[32m${s}\x1b[0m`;
const R     = s => `\x1b[31m${s}\x1b[0m`;
const Y     = s => `\x1b[33m${s}\x1b[0m`;
const B     = s => `\x1b[34m${s}\x1b[0m`;
const DIM   = s => `\x1b[2m${s}\x1b[0m`;

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  catch { return null; }
}

function findFiles(dir, ext = null) {
  const found = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return found;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !['node_modules','.git','dist','.astro'].includes(entry.name)) {
        walk(full);
      } else if (entry.isFile()) {
        if (!ext || entry.name.endsWith(ext)) {
          found.push(path.relative(ROOT, full).replace(/\\/g, '/'));
        }
      }
    }
  }
  walk(abs);
  return found;
}

// ── EXPECTED FILE MAP ──────────────────────────────────────────
const EXPECTED = {
  // Layouts
  'src/layouts/BaseLayout.astro':  'Root layout — imports Header, Footer, main.css',
  'src/layouts/BlogLayout.astro':  'Blog post layout',

  // UI Components
  'src/components/ui/Header.astro':     'Site header (light theme)',
  'src/components/ui/Footer.astro':     'Site footer',
  'src/components/ui/Breadcrumb.astro': 'Breadcrumb navigation',

  // Content components
  'src/components/content/CategoryCard.astro': 'Category card with gradient',
  'src/components/content/BlogCard.astro':      'Blog post card',
  'src/components/content/ProductCard.astro':   'Product card (light theme)',
  'src/components/content/QuickCard.astro':     'Quick link card',

  // Name generator components
  'src/components/names/NameFilters.astro':   'Name generator filter panel',
  'src/components/names/NameGrid.astro':      'Name results grid',
  'src/components/names/NameShortlist.astro': 'Name shortlist panel',
  'src/components/names/NameBreedHero.astro': 'Breed name page hero',
  'src/components/names/TopNamesList.astro':  'Top names list',
  'src/components/names/NameCTA.astro':       'Name page CTA block',

  // Pages
  'src/pages/index.astro':                    'Homepage',
  'src/pages/guides/index.astro':             'Guides overview',
  'src/pages/guides/[slug].astro':            'Guide post',
  'src/pages/categories/[category].astro':    'Category hub',
  'src/pages/breeds/index.astro':             'Breed directory',
  'src/pages/breeds/[breed].astro':           'Breed detail',
  'src/pages/dog-names/index.astro':          'Name generator tool',
  'src/pages/dog-names/[breed].astro':        'Breed name page',

  // Styles
  'src/styles/tokens.css':              'Design tokens',
  'src/styles/base.css':               'Reset + typography',
  'src/styles/main.css':               'CSS entry point (imports all)',
  'src/styles/layouts/grid.css':       'Layout utilities',
  'src/styles/components/nav.css':     'Navigation styles',
  'src/styles/components/buttons.css': 'Button styles',
  'src/styles/components/hero.css':    'Hero section styles',
  'src/styles/components/cards.css':   'Card styles',
  'src/styles/components/misc.css':    'Misc component styles',
  'src/styles/names.css':             'Name generator styles',

  // Public CSS (served as static)
  'public/styles/main.css':              'Public CSS entry point',
  'public/styles/tokens.css':           'Public tokens',
  'public/styles/base.css':             'Public base',
  'public/styles/names.css':            'Public names CSS',
  'public/styles/layouts/grid.css':     'Public grid',
  'public/styles/components/nav.css':   'Public nav',
  'public/styles/components/buttons.css':'Public buttons',
  'public/styles/components/hero.css':  'Public hero',
  'public/styles/components/cards.css': 'Public cards',
  'public/styles/components/misc.css':  'Public misc',

  // Scripts
  'public/scripts/name-generator.mjs': 'Name generator ES module (public)',

  // Data
  'src/data/products.json':       'Product database (125 products)',
  'src/data/breeds.json':         'Breed database (277 breeds)',
  'src/data/dog-names.json':      'Dog names database (7267 names)',
  'src/data/breed-name-map.json': 'Breed to name style mapping',
  'src/data/fci_taxonomy.json':   'FCI taxonomy (364 breeds)',
};

// ── OLD DARK THEME FILES TO FLAG ──────────────────────────────
const DARK_THEME_INDICATORS = [
  '--midnight', '--cyber-lime', '--lime', '#CCFF00', '#0A0A0A',
  'ng-hero', 'ng-card', 'ng-filters', 'Anton',
];

// ── SCAN ──────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  🔍  MrDoggoStyle Project Audit');
console.log(`  📁  Root: ${ROOT}`);
console.log('══════════════════════════════════════════════════════\n');

// 1. Expected files
console.log(B('── EXPECTED FILES ──'));
const missing  = [];
const present  = [];
for (const [file, desc] of Object.entries(EXPECTED)) {
  if (exists(file)) {
    present.push(file);
    console.log(`  ${G('✓')}  ${file.padEnd(52)} ${DIM(desc)}`);
  } else {
    missing.push(file);
    console.log(`  ${R('✗')}  ${file.padEnd(52)} ${Y('MISSING — ' + desc)}`);
  }
}

// 2. Actual src/components tree
console.log(`\n${B('── ACTUAL src/components/ TREE ──')}`);
const compFiles = findFiles('src/components');
if (compFiles.length === 0) {
  console.log(R('  ← directory empty or does not exist'));
} else {
  compFiles.forEach(f => {
    const known = Object.keys(EXPECTED).includes(f);
    console.log(`  ${known ? G('✓') : Y('?')}  ${f}`);
  });
}

// 3. Actual src/styles tree
console.log(`\n${B('── ACTUAL src/styles/ TREE ──')}`);
const styleFiles = findFiles('src/styles');
if (styleFiles.length === 0) {
  console.log(R('  ← directory empty or does not exist'));
} else {
  styleFiles.forEach(f => console.log(`  ${G('·')}  ${f}`));
}

// 4. Actual public/styles tree
console.log(`\n${B('── ACTUAL public/styles/ TREE ──')}`);
const pubStyleFiles = findFiles('public/styles');
if (pubStyleFiles.length === 0) {
  console.log(R('  ← EMPTY — CSS won\'t load in browser!'));
} else {
  pubStyleFiles.forEach(f => console.log(`  ${G('·')}  ${f}`));
}

// 5. Actual public/scripts tree
console.log(`\n${B('── ACTUAL public/scripts/ TREE ──')}`);
const pubScripts = findFiles('public/scripts');
if (pubScripts.length === 0) {
  console.log(R('  ← EMPTY — name-generator.mjs not deployed!'));
} else {
  pubScripts.forEach(f => console.log(`  ${G('·')}  ${f}`));
}

// 6. Check BaseLayout imports
console.log(`\n${B('── IMPORT AUDIT ──')}`);
const layoutFiles = findFiles('src/layouts', '.astro');
const pageFiles   = findFiles('src/pages',   '.astro');
const allAstro    = [...layoutFiles, ...pageFiles];

for (const file of allAstro) {
  const content = readFile(file);
  if (!content) continue;

  const imports = [...content.matchAll(/import\s+\w+\s+from\s+['"]([^'"]+)['"]/g)]
    .map(m => m[1]);

  const badImports = [];
  for (const imp of imports) {
    if (!imp.startsWith('.') && !imp.startsWith('astro')) continue;
    // Resolve relative to file location
    const fileDir = path.dirname(path.join(ROOT, file));
    const resolved = path.resolve(fileDir, imp).replace(/\\/g, '/');
    const rel = path.relative(ROOT, resolved).replace(/\\/g, '/');
    // Check if it needs extension
    const candidates = [rel, rel + '.astro', rel + '.ts', rel + '.mjs', rel + '.js'];
    const resolves = candidates.some(c => exists(c));
    if (!resolves) {
      badImports.push({ imp, rel });
    }
  }

  if (badImports.length > 0) {
    console.log(`\n  ${R('✗')}  ${file}`);
    badImports.forEach(({ imp, rel }) => {
      console.log(`       ${R('→')} Cannot resolve: ${Y(imp)}`);
      console.log(`         ${DIM('Expected at: ' + rel)}`);
    });
  } else {
    console.log(`  ${G('✓')}  ${file}`);
  }
}

// 7. Dark theme remnants check
console.log(`\n${B('── DARK THEME REMNANT CHECK ──')}`);
const cssFiles = [...findFiles('src/styles', '.css'), ...findFiles('public/styles', '.css')];
let darkCount = 0;
for (const file of cssFiles) {
  const content = readFile(file) || '';
  const found = DARK_THEME_INDICATORS.filter(kw => content.includes(kw));
  if (found.length > 0) {
    darkCount++;
    console.log(`  ${Y('⚠')}  ${file} — contains dark theme tokens: ${found.slice(0,3).join(', ')}`);
  }
}
if (darkCount === 0) console.log(`  ${G('✓')}  No dark theme remnants found in CSS files`);

// 8. Summary and fix instructions
console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  📊  SUMMARY`);
console.log(`──────────────────────────────────────────────────────`);
console.log(`  Present:  ${G(present.length)}/${Object.keys(EXPECTED).length}`);
console.log(`  Missing:  ${missing.length > 0 ? R(missing.length) : G(0)}`);

if (missing.length > 0) {
  console.log(`\n  ${Y('FILES YOU NEED TO PLACE:')}`);

  const groups = {
    'From mrdoggostyle-light-theme-pack.zip': missing.filter(f =>
      f.includes('styles/') || f.includes('components/ui') ||
      f.includes('components/content') || f.includes('layouts/') ||
      (f.includes('pages/') && !f.includes('dog-names') && !f.includes('breeds/index'))
    ),
    'From mrdoggostyle-namegen-patch-mjs.zip': missing.filter(f =>
      f.includes('dog-names') || f.includes('names.css') || f === 'public/scripts/name-generator.mjs'
    ),
    'From mrdoggostyle-namegen-pack.zip → src/data/': missing.filter(f =>
      f.includes('dog-names.json') || f.includes('breed-name-map.json')
    ),
    'Standalone downloads': missing.filter(f =>
      f.includes('products.json') || f.includes('fci_taxonomy.json')
    ),
    'From mrdoggostyle-namegen-pack.zip → components/names/': missing.filter(f =>
      f.includes('components/names/')
    ),
  };

  for (const [source, files] of Object.entries(groups)) {
    if (files.length === 0) continue;
    console.log(`\n  ${B(source)}:`);
    files.forEach(f => console.log(`    → ${f}`));
  }
}

// Fix instructions file
if (FIX) {
  const lines = [
    '# MrDoggoStyle — Fix Instructions',
    `# Generated: ${new Date().toISOString()}`,
    '# Run these commands from your project root (E:\\2026_Github\\Mr-Doggo-Style)',
    '',
    '# Step 1: Create missing directories',
    'mkdir -p src/components/ui',
    'mkdir -p src/components/content',
    'mkdir -p src/components/names',
    'mkdir -p src/styles/layouts',
    'mkdir -p src/styles/components',
    'mkdir -p public/styles/layouts',
    'mkdir -p public/styles/components',
    'mkdir -p public/scripts',
    '',
    '# Step 2: Files still missing (place from the correct zip):',
    ...missing.map(f => `# MISSING: ${f}`),
  ];
  fs.writeFileSync(path.join(ROOT, 'fix-instructions.txt'), lines.join('\n'));
  console.log(`\n  📄  Fix instructions written to: fix-instructions.txt`);
}

console.log('══════════════════════════════════════════════════════\n');
