// Qloo adapter. Live calls go to the hackathon host only; with no key it falls back to stand-in data.
// Docs: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
//   GET /search?query=&types=&take=                         -> { results: [entity] }
//   GET /v2/insights?filter.type=&signal.interests.entities=id,id[&filter.tags=urn][&take=]
//                                                            -> { success, results: { entities: [entity] } }
//   Auth: X-Api-Key header (never a query param, never Bearer). GET only, params in the query string.
import { mockSearch, mockInsights } from './mock.js';

const DEFAULT_BASE = 'https://hackathon.api.qloo.com';

export const TYPES = {
  artist: 'urn:entity:artist', book: 'urn:entity:book', movie: 'urn:entity:movie',
  tv_show: 'urn:entity:tv_show', podcast: 'urn:entity:podcast', place: 'urn:entity:place',
  destination: 'urn:entity:destination', person: 'urn:entity:person', video_game: 'urn:entity:video_game',
};

export function qlooMode() {
  if (process.env.MOCK_QLOO === '1') return 'mock';
  return process.env.QLOO_API_KEY ? 'live' : 'mock';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function qlooGet(path, params, { timeoutMs = 9000, retries = 4 } = {}) {
  const base = (process.env.QLOO_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const url = `${base}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let r;
    try {
      r = await fetch(url, { headers: { 'X-Api-Key': process.env.QLOO_API_KEY, Accept: 'application/json' }, signal: ctrl.signal });
    } catch (e) {
      if (attempt < retries) { await sleep(500 * (attempt + 1)); continue; }
      throw new Error(`Qloo ${path} network error`);
    } finally { clearTimeout(t); }
    if ((r.status === 429 || r.status >= 500) && attempt < retries) {
      // Rate limited: honor Retry-After when given, else back off with jitter.
      const ra = Number(r.headers.get('retry-after'));
      await sleep(ra > 0 ? Math.min(ra, 5) * 1000 : 600 * 2 ** attempt + Math.random() * 400); continue;
    }
    if (r.status === 404) return null; // /search answers 404 for "no results"
    if (!r.ok) throw new Error(`Qloo ${path} HTTP ${r.status}`);
    try { return await r.json(); } catch { if (attempt < retries) { await sleep(500); continue; } throw new Error(`Qloo ${path} bad JSON`); }
  }
}

const DOMAIN_OF = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v, k]));

function slim(e, domain) {
  if (!e) return null;
  const p = e.properties || {};
  const urn = (e.types && e.types[0]) || e.subtype;
  return {
    id: e.entity_id || e.id,
    name: e.name,
    domain: domain || DOMAIN_OF[urn] || (urn || '').split(':').pop() || 'entity',
    year: p.release_year || p.publication_year || undefined,
    description: (p.short_description || p.description || '').replace(/\s+/g, ' ').slice(0, 260) || undefined,
    image: p.image?.url || undefined,
    tags: [...new Set((e.tags || []).map(t => t.name).filter(Boolean))].slice(0, 14),
    affinity: e.query?.affinity,
  };
}

/** Resolve a user's free-text love into a Qloo entity. domain 'auto' searches every type. */
export async function searchEntity(name, domain = 'auto') {
  if (qlooMode() === 'mock') return mockSearch(name, domain);
  const params = { query: name, take: '3' };
  if (domain !== 'auto' && TYPES[domain]) params.types = TYPES[domain];
  const j = await qlooGet('/search', params);
  const hit = j?.results?.[0];
  return hit ? slim(hit, domain !== 'auto' ? domain : undefined) : null;
}

/** Raw search returning up to `take` slim entities (used for the Golden Chain canon). */
export async function searchMany(name, domain, take = 3) {
  const j = await qlooGet('/search', { query: name, types: TYPES[domain], take: String(take) });
  return (j?.results || []).map(e => slim(e, domain));
}

/** Recommendations of one entity type, signalled by the seed entity IDs. */
export async function insights(leap, seedIds, { pool = 10, exclude = [], onlyIds } = {}) {
  if (qlooMode() === 'mock') return mockInsights(leap.key, seedIds, { take: pool });
  const params = {
    'filter.type': TYPES[leap.type],
    'signal.interests.entities': seedIds.join(','),
    take: String(Math.min(pool + seedIds.length, 50)),
  };
  if (onlyIds?.length) params['filter.results.entities'] = onlyIds.join(','); // rank a fixed set by affinity
  else if (leap.tags) params['filter.tags'] = leap.tags;
  const j = await qlooGet('/v2/insights', params);
  const skip = new Set([...seedIds, ...exclude]);
  return (j?.results?.entities || []).filter(e => !skip.has(e.entity_id)).map(e => slim(e, leap.type));
}
