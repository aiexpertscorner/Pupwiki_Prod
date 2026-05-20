#!/usr/bin/env node
/**
 * test-awin-product-parser.mjs
 *
 * Standalone parser tests for the AWIN product feed normalisation logic.
 * No external API calls. No secrets required.
 * Exits 0 on pass, 1 on failure.
 *
 * Run via: npm run awin:parser:test
 */

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

// ── Inline copy of normalizeProductRows from sync-awin.mjs ──────────────────

function normalizeProductRows(input, feedId = 'test') {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0];
    if (first == null) return [];
    if (Array.isArray(first)) {
      return input.map((row) => Object.fromEntries(PRODUCT_COLUMNS.map((col, i) => [col, row[i] ?? ''])));
    }
    if (typeof first === 'object') {
      if (Array.isArray(first.values)) {
        return input.map((row) => Object.fromEntries(PRODUCT_COLUMNS.map((col, i) => [col, row.values[i] ?? ''])));
      }
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

    for (const key of ['products', 'items', 'productList', 'data', 'rows', 'feeds']) {
      if (Array.isArray(input[key]) && input[key].length > 0) {
        return normalizeProductRows(input[key], feedId);
      }
    }

    if (input.aw_product_id || input.product_name || input.name || input.awProductId) {
      return [input];
    }
  }

  return [];
}

// ── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function test(name, fn) {
  console.log(`\n[ ${name} ]`);
  try {
    fn();
  } catch (e) {
    console.error(`  ✗ threw: ${e.message}`);
    failed++;
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_OBJECT_ROW = {
  aw_product_id: '12345',
  product_name: 'Dog Training Harness',
  search_price: '29.99',
  currency: 'USD',
  aw_deep_link: 'https://tidd.ly/example',
  merchant_image_url: 'https://example.com/img.jpg',
  merchant_name: 'Test Merchant',
  category_name: 'Training',
};

const SAMPLE_ARRAY_ROW = [
  '12345',           // aw_product_id
  'MERCH-001',       // merchant_product_id
  'Dog Training Harness', // product_name
  'Comfortable harness',  // description
  '29.99',           // search_price
  'USD',             // currency
  'https://tidd.ly/example', // aw_deep_link
  'https://example.com/img.jpg', // merchant_image_url
  '',                // aw_image_url
  'Test Merchant',   // merchant_name
  'Training',        // category_name
  '55927',           // merchant_id
  '1',               // in_stock
  '2026-05-20',      // last_updated
];

// ── Tests ─────────────────────────────────────────────────────────────────────

test('Shape 1: array of plain objects', () => {
  const result = normalizeProductRows([SAMPLE_OBJECT_ROW]);
  assert(result.length === 1, 'returns 1 row');
  assert(result[0].aw_product_id === '12345', 'aw_product_id preserved');
  assert(result[0].product_name === 'Dog Training Harness', 'product_name preserved');
  assert(result[0].merchant_name === 'Test Merchant', 'merchant_name preserved');
});

test('Shape 2: array of arrays (CSV-style rows)', () => {
  const result = normalizeProductRows([SAMPLE_ARRAY_ROW]);
  assert(result.length === 1, 'returns 1 row');
  assert(result[0].aw_product_id === '12345', 'aw_product_id mapped from position 0');
  assert(result[0].product_name === 'Dog Training Harness', 'product_name mapped from position 2');
  assert(result[0].search_price === '29.99', 'search_price mapped from position 4');
  assert(result[0].merchant_name === 'Test Merchant', 'merchant_name mapped from position 9');
});

test('Shape 3: { columns, rows } object', () => {
  const input = {
    columns: ['aw_product_id', 'product_name', 'search_price', 'merchant_name'],
    rows: [['12345', 'Dog Harness', '29.99', 'Test Merchant']],
  };
  const result = normalizeProductRows(input);
  assert(result.length === 1, 'returns 1 row');
  assert(result[0].aw_product_id === '12345', 'aw_product_id from columns+rows');
  assert(result[0].product_name === 'Dog Harness', 'product_name from columns+rows');
  assert(result[0].search_price === '29.99', 'search_price from columns+rows');
});

test('Shape 4: { headers, data } object', () => {
  const input = {
    headers: ['aw_product_id', 'product_name', 'merchant_name'],
    data: [['99001', 'Dog Bed', 'BedMerchant']],
  };
  const result = normalizeProductRows(input);
  assert(result.length === 1, 'returns 1 row');
  assert(result[0].aw_product_id === '99001', 'aw_product_id from headers+data');
  assert(result[0].product_name === 'Dog Bed', 'product_name from headers+data');
});

test('Shape 5: { values: [...] } per-row format', () => {
  const input = [
    { values: ['12345', 'MERCH-001', 'Dog Shampoo', '', '14.99', 'USD', 'https://link', '', '', 'Groomer', 'Grooming', '1', '1', '2026-05-20'] },
  ];
  const result = normalizeProductRows(input);
  assert(result.length === 1, 'returns 1 row');
  assert(result[0].aw_product_id === '12345', 'aw_product_id from values[0]');
  assert(result[0].product_name === 'Dog Shampoo', 'product_name from values[2]');
});

test('Shape 6: nested products array wrapper', () => {
  const input = { products: [SAMPLE_OBJECT_ROW] };
  const result = normalizeProductRows(input);
  assert(result.length === 1, 'unwraps products array');
  assert(result[0].aw_product_id === '12345', 'aw_product_id preserved after unwrap');
});

test('Edge: empty array', () => {
  const result = normalizeProductRows([]);
  assert(result.length === 0, 'empty array returns empty');
});

test('Edge: null input', () => {
  const result = normalizeProductRows(null);
  assert(result.length === 0, 'null returns empty');
});

test('Edge: multiple rows', () => {
  const rows = [
    { aw_product_id: 'A1', product_name: 'Collar', aw_deep_link: 'https://a.com' },
    { aw_product_id: 'A2', product_name: 'Lead', aw_deep_link: 'https://b.com' },
    { aw_product_id: 'A3', product_name: 'Harness', aw_deep_link: 'https://c.com' },
  ];
  const result = normalizeProductRows(rows);
  assert(result.length === 3, 'all 3 rows returned');
  assert(result[2].product_name === 'Harness', 'third row name correct');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`);
console.log(`Tests: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`);
console.log(`─────────────────────────────────`);

if (failed > 0) {
  console.error(`\nParser test FAILED — fix normalizeProductRows in scripts/sync-awin.mjs`);
  process.exit(1);
}

console.log(`\nParser test PASSED — all product row shapes normalise correctly`);
