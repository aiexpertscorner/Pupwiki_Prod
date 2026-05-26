/**
 * fetch-promotions.mjs
 * Fetches AWIN promotions/offers via POST /publisher/{id}/promotions
 * with full pagination and multi-status batch support.
 */

import { awinFetch } from './api-client.mjs';

/**
 * fetchPromotions(publisherId, options)
 * Returns { rows: NormalizedRawRow[], meta: { ... } }
 *
 * @param {string} publisherId
 * @param {object} options
 *   - token: string
 *   - membership: 'joined' | 'all'
 *   - regionCodes: string[]
 *   - pageSize: number
 *   - maxPages: number
 *   - includeExpiring: boolean
 *   - includeUpcoming: boolean
 */
export async function fetchPromotions(publisherId, options = {}) {
  const {
    token = process.env.AWIN_OAUTH2_TOKEN ?? '',
    membership = 'joined',
    regionCodes = ['US'],
    pageSize = 200,
    maxPages = 25,
    includeExpiring = true,
    includeUpcoming = true,
  } = options;

  const statuses = ['active'];
  if (includeExpiring) statuses.push('expiringSoon');
  if (includeUpcoming) statuses.push('upcoming');

  const allRows = [];
  const seenIds = new Set();
  const meta = {
    statusBatches: {},
    totalFetched: 0,
    totalPages: 0,
    errors: [],
  };

  for (const status of statuses) {
    let page = 1;
    let batchTotal = 0;
    meta.statusBatches[status] = { pages: 0, rows: 0 };

    while (page <= maxPages) {
      const body = {
        membership,
        regionCodes,
        type: 'all',
        status,
        pagination: { page, pageSize },
      };

      const result = await awinFetch(`/publisher/${publisherId}/promotions`, {
        method: 'POST',
        body,
        token,
        label: `promotions/${status}/page${page}`,
      });

      if (!result.ok) {
        const errMsg = `${status}/page${page}: ${result.error}`;
        console.warn(`[fetch-promotions] Failed to fetch ${errMsg}`);
        meta.errors.push(errMsg);
        break;
      }

      const rows = Array.isArray(result.data) ? result.data
        : Array.isArray(result.data?.promotions) ? result.data.promotions
        : Array.isArray(result.data?.data) ? result.data.data
        : [];

      // Deduplicate across status batches
      let newInPage = 0;
      for (const row of rows) {
        const id = String(row.promotionId ?? row.id ?? '');
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        allRows.push({ ...row, _fetchedStatus: status });
        newInPage++;
      }

      batchTotal += newInPage;
      meta.statusBatches[status].pages = page;
      meta.statusBatches[status].rows = batchTotal;

      console.log(`[fetch-promotions] ${status} page ${page}: ${rows.length} rows (${newInPage} new)`);

      if (rows.length < pageSize) break;
      page++;
    }
  }

  meta.totalFetched = allRows.length;
  meta.totalPages = Object.values(meta.statusBatches).reduce((s, b) => s + b.pages, 0);

  console.log(`[fetch-promotions] Total: ${allRows.length} promotions across ${statuses.join(', ')}`);
  return { rows: allRows, meta };
}
