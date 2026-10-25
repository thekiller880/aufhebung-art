// The agent loop: resolve loves -> leap across domains with Qloo -> read through Soul / Nous / One -> (optional) LLM prose.
import { searchEntity, searchMany, insights, qlooMode } from './qloo.js';
import { LEAPS, INPUT_DOMAINS, CANON } from './leaps.js';
import { readTaste } from './plotinus.js';
import { enrich } from './llm.js';
import { mockSearch, mockInsights } from './mock.js';

export async function mapLimit(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

const canonCache = new Map(); // list -> [{id, who}] resolved once per warm instance
export async function goldenChain(trace, list = CANON) {
  if (canonCache.has(list)) return canonCache.get(list);
  const found = await mapLimit(list, 4, async c => {
    try {
      const hits = await searchMany(c.q, 'book', 3);
      const e = hits.find(h => c.must.test(`${h.name} ${h.description || ''}`));
      return e ? { id: e.id, who: c.who } : null;
    } catch { return null; }
  });
  const out = found.filter(Boolean);
  trace.push(`canon: resolved ${out.length}/${list.length} philosophy works via /search`);
  if (out.length >= 4) canonCache.set(list, out);
  return out;
}

// Qloo has no painter/artwork entity, so a visual-art love is resolved to a museum or chapel that holds it.
const ARTY = /museum|gallery|art|chapel|cathedral|church|basilica|collection|fondazione|pinacoteca/i;
export async function findArtPlace(name) {
  for (const q of [name, `${name} museum`, `${name} gallery`]) {
    const hits = await searchMany(q, 'place', 5);
    const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const e = hits.find(h => ARTY.test(`${h.name} ${(h.tags || []).join(' ')}`) && words.every(w => h.name.toLowerCase().includes(w)));
    if (e) return e;
  }
  return searchEntity(name, 'auto');
}

export function cleanInput(body) {
  const loves = Array.isArray(body?.loves) ? body.loves : [];
  return loves
    .map(l => (typeof l === 'string' ? { name: l } : l))
    .map(l => ({ name: String(l?.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80), domain: INPUT_DOMAINS[l?.domain] ? l.domain : 'auto' }))
    .filter(l => l.name)
    .slice(0, 8);
}

export async function runAgent(loves, { perLeap = 3 } = {}) {
  let mode = qlooMode();
  const notes = [];
  const trace = [];

  // 1. Soul's raw material: resolve each love to a Qloo entity.
  let seeds = (await mapLimit(loves, 3, async l => {
    try {
      const e = l.domain === 'art' && !mode.startsWith('mock') ? await findArtPlace(l.name) : await searchEntity(l.name, INPUT_DOMAINS[l.domain]);
      trace.push(`search "${l.name}"${l.domain !== 'auto' ? ` as ${l.domain}` : ''} -> ${e ? `${e.name} (${e.domain})` : 'no match'}`);
      return e ? { ...e, asked: l.name } : null;
    } catch (err) { trace.push(`search "${l.name}" failed: ${err.message}`); return null; }
  })).filter(Boolean);

  if (mode === 'live' && !seeds.length) {
    notes.push('Qloo could not resolve any of these names live, so the stand-in data is shown instead.');
    mode = 'mock (live search empty)';
    seeds = loves.map(l => mockSearch(l.name, l.domain));
  }
  const seedIds = [...new Set(seeds.map(s => s.id))];

  // 2. Nous's leaps: one Insights call per domain, deliberately crossing out of the user's own domains.
  const canon = mode.startsWith('mock') ? [] : await goldenChain(trace);
  const used = new Set(seedIds);
  const leaps = [];
  for (const leap of LEAPS) {
    let items = [];
    try {
      const onlyIds = leap.canon && canon.length >= 4 ? canon.map(c => c.id).filter(id => !used.has(id)) : null;
      items = mode.startsWith('mock') ? mockInsights(leap.key, seedIds, { take: 10 }) : await insights(leap, seedIds, { pool: 12, exclude: [...used], onlyIds });
      if (onlyIds) for (const i of items) { const c = canon.find(x => x.id === i.id); if (c) i.who = c.who; }
      trace.push(`insights ${leap.label}: filter.type=urn:entity:${leap.type}${onlyIds ? ` filter.results.entities=[${onlyIds.length} canon works]` : leap.tags ? ` filter.tags=${leap.tags}` : ''} -> ${items.length}`);
    } catch (err) {
      trace.push(`insights ${leap.label} failed: ${err.message}; using stand-in`);
      items = mockInsights(leap.key, seedIds, { take: 10 });
      notes.push(`${leap.label}: live Qloo call failed, stand-in shown.`);
    }
    const whoSeen = new Set();
    items = items.filter(i => i?.name && !used.has(i.id) && (!i.who || (!whoSeen.has(i.who) && whoSeen.add(i.who)))).slice(0, perLeap);
    items.forEach(i => used.add(i.id));
    leaps.push({ key: leap.key, label: leap.label, type: leap.type, items });
  }

  // 3. Soul / Nous / One reading (deterministic), then optional LLM prose.
  const reading = readTaste(seeds, leaps);
  const llm = await enrich(seeds, leaps, reading);

  return {
    mode: { qloo: mode, llm, standIn: mode.startsWith('mock') || leaps.some(l => l.items.some(i => i.mock)) },
    seeds: seeds.map(({ id, name, domain, year, tags, image, asked, mock }) => ({ id, name, domain, year, tags: (tags || []).slice(0, 8), image, asked, mock })),
    ...reading,
    leaps,
    notes,
    trace,
  };
}
