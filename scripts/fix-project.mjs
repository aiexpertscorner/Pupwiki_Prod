/**
 * fix-project.mjs
 * Fixes all issues found by the audit:
 *   1. Copies flat public/styles files → correct subdirectories
 *   2. Creates src/styles/ mirror of public/styles/
 *   3. Creates the 4 missing src/components/content/ components
 *   4. Fixes old import paths (Header.astro → ui/Header.astro etc.)
 *   5. Ensures public/scripts/name-generator.mjs exists
 *
 * Run from project root:
 *   node scripts/fix-project.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

function abs(...parts) { return path.join(ROOT, ...parts); }

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    console.log(`  ${G('✓ created')}  ${path.relative(ROOT, p)}`);
  }
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log(`  ${G('✓ copied')}  ${path.relative(ROOT, src)} → ${path.relative(ROOT, dst)}`);
}

function writeFile(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  ${G('✓ created')}  ${path.relative(ROOT, p)}`);
}

function fixImports(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (src.includes(from)) {
      src = src.replaceAll(from, to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`  ${G('✓ fixed')}  ${path.relative(ROOT, filePath)}`);
  }
  return changed;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  🔧  MrDoggoStyle Project Fixer');
console.log('══════════════════════════════════════════════════════\n');

// ── 1. CSS: public/styles flat → subdirectories ───────────────────────────
console.log(B('── Step 1: Fix public/styles subdirectory structure ──'));

const CSS_MAP = {
  'public/styles/grid.css':    'public/styles/layouts/grid.css',
  'public/styles/nav.css':     'public/styles/components/nav.css',
  'public/styles/buttons.css': 'public/styles/components/buttons.css',
  'public/styles/hero.css':    'public/styles/components/hero.css',
  'public/styles/cards.css':   'public/styles/components/cards.css',
  'public/styles/misc.css':    'public/styles/components/misc.css',
};

for (const [src, dst] of Object.entries(CSS_MAP)) {
  const srcPath = abs(src);
  const dstPath = abs(dst);
  if (fs.existsSync(srcPath)) {
    copyFile(srcPath, dstPath);
  } else {
    console.log(`  ${Y('⚠ skip')}  ${src} not found`);
  }
}

// names.css — check both locations for source
const namesCssSources = [
  'src/styles/names.css',
  'public/styles/names.css',
];
let namesCssContent = null;
for (const s of namesCssSources) {
  if (fs.existsSync(abs(s))) {
    namesCssContent = fs.readFileSync(abs(s), 'utf8');
    break;
  }
}
if (!namesCssContent) {
  console.log(`  ${R('✗ names.css not found anywhere — will be created minimal')}`);
}

// ── 2. CSS: sync public/styles → src/styles (mirror) ─────────────────────
console.log(B('\n── Step 2: Mirror public/styles → src/styles ──'));

const SRC_CSS = [
  ['public/styles/tokens.css',              'src/styles/tokens.css'],
  ['public/styles/base.css',                'src/styles/base.css'],
  ['public/styles/main.css',                'src/styles/main.css'],
  ['public/styles/layouts/grid.css',        'src/styles/layouts/grid.css'],
  ['public/styles/components/nav.css',      'src/styles/components/nav.css'],
  ['public/styles/components/buttons.css',  'src/styles/components/buttons.css'],
  ['public/styles/components/hero.css',     'src/styles/components/hero.css'],
  ['public/styles/components/cards.css',    'src/styles/components/cards.css'],
  ['public/styles/components/misc.css',     'src/styles/components/misc.css'],
];

for (const [pub, src] of SRC_CSS) {
  const pubPath = abs(pub);
  const srcPath = abs(src);
  if (fs.existsSync(pubPath)) {
    if (!fs.existsSync(srcPath)) {
      copyFile(pubPath, srcPath);
    } else {
      console.log(`  ${D('· exists')}  ${src}`);
    }
  } else {
    console.log(`  ${Y('⚠ source missing')}  ${pub}`);
  }
}

// names.css in both locations
if (namesCssContent) {
  if (!fs.existsSync(abs('src/styles/names.css')))
    writeFile(abs('src/styles/names.css'), namesCssContent);
  if (!fs.existsSync(abs('public/styles/names.css')))
    writeFile(abs('public/styles/names.css'), namesCssContent);
}

// ── 3. Create missing src/components/content/ components ─────────────────
console.log(B('\n── Step 3: Create missing content components ──'));

// ── CategoryCard.astro ───────────────────────────────────────────────────
writeFile(abs('src/components/content/CategoryCard.astro'), `---
export interface Props {
  slug:        string;
  theme:       'food' | 'toys' | 'health' | 'training' | 'grooming' | 'beds' | 'smart-tech' | 'lifestyle' | 'supplements' | 'travel';
  emoji:       string;
  title:       string;
  desc:        string;
  reviewCount?: number;
  href:        string;
  linkText?:   string;
}
const {
  theme, emoji, title, desc,
  reviewCount, href, linkText = 'Explore reviews',
} = Astro.props;
---
<a
  href={href}
  class={\`cat-card cat-card--\${theme}\`}
  data-emoji={emoji}
  aria-label={\`\${title} — \${desc}\`}
>
  <div class="cat-card__icon-wrap" aria-hidden="true">{emoji}</div>
  <div class="cat-card__body">
    {reviewCount && <span class="cat-card__count">{reviewCount}+ reviews</span>}
    <h3 class="cat-card__title">{title}</h3>
    <p class="cat-card__desc">{desc}</p>
  </div>
  <div class="cat-card__footer">
    <span class="cat-card__link">
      {linkText}
      <span class="cat-card__link-arrow" aria-hidden="true">→</span>
    </span>
  </div>
</a>
`);

// ── BlogCard.astro ────────────────────────────────────────────────────────
writeFile(abs('src/components/content/BlogCard.astro'), `---
export interface Props {
  title:     string;
  excerpt:   string;
  category:  string;
  href:      string;
  pubDate?:  string;
  readTime?: number;
  image?:    string;
  imageAlt?: string;
  featured?: boolean;
  emoji?:    string;
}
const {
  title, excerpt, category, href,
  pubDate, readTime, image,
  imageAlt = title, featured = false, emoji = '🐾',
} = Astro.props;

const displayDate = pubDate
  ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : null;

const categoryColors: Record<string, string> = {
  food:'food', toys:'toys', health:'health',
  training:'training', grooming:'grooming', gear:'training',
};
const badgeTheme = categoryColors[category.toLowerCase()] ?? 'primary';
---
<a
  href={href}
  class={\`blog-card \${featured ? 'blog-card--featured' : ''}\`}
  aria-label={title}
>
  <div class="blog-card__image-wrap">
    {image
      ? <img src={image} alt={imageAlt} class="blog-card__image" loading="lazy" decoding="async" width="600" height="340" />
      : <div class="blog-card__image-placeholder" aria-hidden="true">{emoji}</div>
    }
  </div>
  <div class="blog-card__body">
    <span class={\`badge badge--\${badgeTheme} blog-card__category\`}>{category}</span>
    <h3 class="blog-card__title">{title}</h3>
    <p class="blog-card__excerpt">{excerpt}</p>
    <div class="blog-card__meta">
      {displayDate && <time datetime={pubDate}>{displayDate}</time>}
      {displayDate && readTime && <span class="blog-card__meta-dot" aria-hidden="true"></span>}
      {readTime && <span>{readTime} min read</span>}
    </div>
  </div>
</a>
`);

// ── ProductCard.astro ─────────────────────────────────────────────────────
writeFile(abs('src/components/content/ProductCard.astro'), `---
export interface Props {
  name:          string;
  asin:          string;
  price?:        number;
  rating?:       number;
  reviewCount?:  number;
  image?:        string;
  category?:     string;
  features?:     string[];
  badge?:        string;
  badgeTheme?:   string;
  tag?:          string;
}
const {
  name, asin, price, rating = 4.5, reviewCount,
  image, category, features = [], badge, badgeTheme = 'accent',
  tag = 'aiexpertscorn-20',
} = Astro.props;

const url      = asin && asin !== 'SUBSCRIPTION'
  ? \`https://www.amazon.com/dp/\${asin}/?tag=\${tag}\`
  : '#';
const stars    = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
const hasImage = image?.includes('media-amazon.com');
const isSubscription = asin === 'SUBSCRIPTION';
---
<div class="product-card">
  <a href={url} rel={isSubscription ? '' : 'nofollow sponsored'} target={isSubscription ? '_self' : '_blank'} class="product-card__image-wrap" tabindex="-1" aria-hidden="true">
    {hasImage
      ? <img src={image} alt={name} class="product-card__image" loading="lazy" width="160" height="160" />
      : <span style="font-size:3rem">🐾</span>
    }
    {badge && (
      <div class="product-card__badge">
        <span class={\`badge badge--\${badgeTheme}\`}>{badge}</span>
      </div>
    )}
  </a>
  <div class="product-card__body">
    {category && <span class="product-card__category">{category}</span>}
    <a href={url} rel={isSubscription ? '' : 'nofollow sponsored'} target={isSubscription ? '_self' : '_blank'}>
      <h3 class="product-card__name">{name}</h3>
    </a>
    <div class="product-card__rating">
      <span class="product-card__stars" aria-label={\`Rating: \${rating} out of 5\`}>{stars}</span>
      <span class="product-card__rating-text">{rating.toFixed(1)}</span>
      {reviewCount && <span class="product-card__rating-text">({(reviewCount / 1000).toFixed(0)}K)</span>}
    </div>
    {features.length > 0 && (
      <ul class="product-card__features">
        {features.slice(0, 3).map((f: string) => (
          <li class="product-card__feature">{f}</li>
        ))}
      </ul>
    )}
  </div>
  <div class="product-card__footer">
    {price && !isSubscription && <span class="product-card__price">\${price.toFixed(2)}</span>}
    {isSubscription && <span class="product-card__price">Subscription</span>}
    <a href={url} rel={isSubscription ? '' : 'nofollow sponsored'} target={isSubscription ? '_self' : '_blank'} class="product-card__cta">
      {isSubscription ? 'View plan' : 'Check price'} →
    </a>
  </div>
</div>
`);

// ── QuickCard.astro ───────────────────────────────────────────────────────
writeFile(abs('src/components/content/QuickCard.astro'), `---
export interface Props {
  label: string;
  value: string;
  href:  string;
}
const { label, value, href } = Astro.props;
---
<a href={href} class="quick-card">
  <span class="quick-card__label">{label}</span>
  <span class="quick-card__value">{value}</span>
</a>
`);

// ── 4. Fix old import paths ────────────────────────────────────────────────
console.log(B('\n── Step 4: Fix old import paths ──'));

const OLD_IMPORT_FIXES = [
  ["from '../components/Header.astro'",    "from '../components/ui/Header.astro'"],
  ["from '../components/Footer.astro'",    "from '../components/ui/Footer.astro'"],
  ["from '../../components/Header.astro'", "from '../../components/ui/Header.astro'"],
  ["from '../../components/Footer.astro'", "from '../../components/ui/Footer.astro'"],
  // Also fix any remaining .js references to .mjs for name-generator
  ['src="/scripts/name-generator.js"',     'src="/scripts/name-generator.mjs"'],
];

const PAGES_TO_FIX = [
  'src/pages/about.astro',
  'src/pages/disclosure.astro',
  'src/pages/index.astro',
  'src/pages/guides/index.astro',
  'src/pages/guides/[slug].astro',
  'src/pages/breeds/index.astro',
  'src/pages/breeds/[breed].astro',
  'src/pages/categories/[category].astro',
  'src/pages/dog-names/index.astro',
  'src/pages/dog-names/[breed].astro',
];

let fixedCount = 0;
for (const page of PAGES_TO_FIX) {
  const p = abs(page);
  if (!fs.existsSync(p)) {
    console.log(`  ${D('· skip')}  ${page} (does not exist)`);
    continue;
  }
  const fixed = fixImports(p, OLD_IMPORT_FIXES);
  if (!fixed) console.log(`  ${D('· ok')}  ${page}`);
  else fixedCount++;
}

// ── 5. public/scripts/name-generator.mjs ─────────────────────────────────
console.log(B('\n── Step 5: Ensure public/scripts/name-generator.mjs ──'));

const mjsSrc = abs('src/scripts/name-generator.mjs');
const mjsDst = abs('public/scripts/name-generator.mjs');
if (!fs.existsSync(mjsDst)) {
  if (fs.existsSync(mjsSrc)) {
    copyFile(mjsSrc, mjsDst);
  } else {
    console.log(`  ${R('✗')}  src/scripts/name-generator.mjs not found`);
    console.log(`       Place it from mrdoggostyle-namegen-patch-mjs.zip → src/scripts/`);
  }
} else {
  console.log(`  ${D('· exists')}  public/scripts/name-generator.mjs`);
}

// ── 6. Verify main.css @imports match actual files ────────────────────────
console.log(B('\n── Step 6: Verify main.css @import chain ──'));

const mainCss = abs('public/styles/main.css');
if (fs.existsSync(mainCss)) {
  const content = fs.readFileSync(mainCss, 'utf8');
  const imports = [...content.matchAll(/@import\s+['"](.+?)['"]/g)].map(m => m[1]);
  let allGood = true;
  for (const imp of imports) {
    const resolved = path.join(path.dirname(mainCss), imp);
    if (fs.existsSync(resolved)) {
      console.log(`  ${G('✓')}  ${imp}`);
    } else {
      console.log(`  ${R('✗')}  ${imp} → FILE MISSING`);
      allGood = false;
    }
  }
  if (allGood) console.log(`\n  ${G('✓ All @imports resolve correctly')}`);
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  ✅  Fix complete');
console.log('──────────────────────────────────────────────────────');
console.log('  Run:  node scripts/audit-project.mjs  to verify');
console.log('  Then: npm run dev');
console.log('══════════════════════════════════════════════════════\n');
