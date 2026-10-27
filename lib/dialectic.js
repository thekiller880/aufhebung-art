// Dialectic bridge: two opposing ideas, each anchored in things Qloo can resolve.
// Hegel supplies the movement (thesis -> antithesis -> a higher unity); Plotinus supplies the method:
//   Soul      = what each side feels (Qloo tags)
//   Intellect = the pattern behind each side (Forms)
//   The One   = the shared thread the bridge reveals.
//
// How the bridge is computed with the real API (per domain):
//   1. /v2/insights signalled by the thesis anchors      -> what the thesis audience loves
//   2. /v2/insights signalled by the antithesis anchors  -> what the antithesis audience loves
//   3. /v2/insights signalled by BOTH sides' anchors     -> joint candidates
//   4. Re-rank the union of 1-3 against each side with filter.results.entities, so every
//      candidate has a thesis affinity AND an antithesis affinity.
//   Bridge = highest min(thesis, antithesis). The joint call alone leans to whichever side has the
//   stronger signal, so the min() is what makes it a real bridge.
import { searchEntity, searchTypes, searchTags, topByTag, insights, qlooMode } from './qloo.js';
import { BRIDGE_DOMAINS, ETHICS_CANON, CANON, INPUT_DOMAINS } from './leaps.js';
import { FORMS, formsOf, usable, listify, pick } from './plotinus.js';
import { mapLimit, goldenChain, findArtPlace } from './agent.js';
import { mockSearch, mockRank } from './mock.js';
import { enrichBridge } from './llm.js';

const CORE = /Plotinus|Plato|Spinoza|Kant|Hegel|Leibniz/;
const PHILO_POOL = [...ETHICS_CANON, ...CANON.filter(c => CORE.test(c.who))];
const clip = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

export function cleanDialectic(body) {
  const side = s => ({
    idea: clip(s?.idea, 80),
    anchors: (Array.isArray(s?.anchors) ? s.anchors : [])
      .map(a => (typeof a === 'string' ? { name: a } : a))
      .map(a => ({ name: clip(a?.name, 80), domain: INPUT_DOMAINS[a?.domain] ? a.domain : 'auto' }))
      .filter(a => a.name).slice(0, 4),
  });
  return { thesis: side(body?.thesis), antithesis: side(body?.antithesis), synthesis: clip(body?.synthesis, 120) };
}

// Template synthesis, used when the user leaves it blank and no LLM key is set. It keeps both sides and lifts them:
//   same leading verb  "help yourself" + "help others" -> "help yourself by helping others"
//   two things/states  "war" + "peace"                 -> "peace that has passed through war"
//   anything else      "stay home" + "travel the world" -> "stay home and travel the world, each kept and lifted"
const VERBS = new Set('accept act be become believe build buy care change choose compete conform cooperate create defend destroy do doubt dream earn eat fight follow forgive forget give go grow help hold keep lead learn leave let listen live look love make move obey own plan play protect question rebel remember resist rest risk save seek sell serve share speak spend stay take teach think travel trust wait win work'.split(' '));
const gerund = w => /ie$/.test(w) ? w.slice(0, -2) + 'ying' : /[^aeiou]e$/.test(w) && !/ee$/.test(w) ? w.slice(0, -1) + 'ing' : /ing$/.test(w) ? w : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + w.slice(-1) + 'ing' : w + 'ing';
export function proposeSynthesis(t, a) {
  t = (t || '').trim().replace(/\s+/g, ' '); a = (a || '').trim().replace(/\s+/g, ' ');
  if (!t || !a) return '';
  const tw = t.toLowerCase().split(' '), aw = a.toLowerCase().split(' ');
  const verbish = w => VERBS.has(w[0]) || w[0] === 'to';
  if (tw[0] === aw[0] && VERBS.has(tw[0]) && aw.length > 1) return `${t} by ${[gerund(aw[0]), ...a.split(' ').slice(1)].join(' ')}`;
  if (!verbish(tw) && !verbish(aw) && tw.length <= 3 && aw.length <= 3) return `${a} that has passed through ${t}`;
  return `${t} and ${a}, each kept and lifted`;
}

const pct = x => Math.round((x || 0) * 100);
const DOMAIN_WORD = { artist: 'music', movie: 'film', book: 'book', tv_show: 'TV' };
const norm = x => String(x || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Same name, or one is a clear prefix of the other ("Whiplash" / "Whiplash (2014)"), not a longer different title.
const looseMatch = (q, n) => { const a = norm(q), b = norm(n); if (a === b) return true; const [s, l] = a.length < b.length ? [a, b] : [b, a]; return s.length > 3 && l.startsWith(s) && s.length >= 0.7 * l.length; };
// Abstract tags (a genre, theme or keyword of films and books), in order of preference.
const ABSTRACT = ['urn:tag:genre:media:', 'urn:tag:theme:qloo:', 'urn:tag:keyword:qloo:', 'urn:tag:subgenre:qloo:'];
const ideaCache = new Map();
// Bridge score: the weaker side's affinity, minus a small penalty for the near-universal hits (Qloo
// popularity above ~0.995: Taylor Swift, Forrest Gump) that every audience "shares". At most 0.06,
// so a mega-hit still wins when both sides genuinely rate it far above the rest.
const bridgeScore = x => Math.min(x.t, x.a) - 0.06 * Math.min(1, Math.max(0, ((x.popularity || 0) - 0.98) / 0.0195));
const whyFailed = e => /HTTP 429/.test(e?.message || '') ? 'Qloo is rate-limiting requests right now'
  : /network|abort/i.test(e?.message || '') ? 'Qloo could not be reached'
  : /HTTP 5\d\d/.test(e?.message || '') ? 'Qloo had a server error' : 'Qloo returned an error';

/** Free text -> up to 3 Qloo entities to use as a side's anchors. [] when nothing sensible matches. */
export async function resolveIdea(idea, trace = []) {
  const q = norm(idea);
  if (!q) return [];
  if (ideaCache.has(q)) return ideaCache.get(q);
  // A failed lookup (busy, timed out) is noted in the trace and never cached, so a hiccup can't stick to an idea.
  let failed = false;
  const soft = p => p.catch(err => { failed = true; trace.push(`idea "${idea}" lookup failed: ${err.message}`); return []; });
  const [hits, tags] = await Promise.all([
    soft(searchTypes(idea, ['artist', 'movie', 'book', 'tv_show'], 8)),
    soft(searchTags(idea, 10)),
  ]);
  const words = q.split(' ').filter(w => w.length > 2);
  const exact = hits.filter(h => norm(h.name) === q);
  const fuzzy = hits.filter(h => { const n = norm(h.name); return words.length && words.every(w => n.includes(w)); });
  const tagRank = t => ABSTRACT.findIndex(p => t.id.startsWith(p));
  const absTags = tags.filter(t => norm(t.name) === q && tagRank(t) >= 0).sort((a, b) => tagRank(a) - tagRank(b));
  const musicTag = tags.find(t => norm(t.name) === q && t.id.startsWith('urn:tag:genre:music:'));
  let out = [];
  // A plain idea that Qloo knows as a genre/theme/keyword ("war", "love", "freedom"): its best-liked works.
  // A named thing ("Rancid", "Conway Twitty") has no such tag, so it resolves to the entity itself.
  if (absTags.length) {
    for (const t of absTags) {
      const [mv, bk, ar] = await Promise.all([
        soft(topByTag(t.id, 'movie', 2)),
        soft(topByTag(t.id, 'book', 1)),
        musicTag ? soft(topByTag(musicTag.id, 'artist', 1)) : [],
      ]);
      out = [...mv, ...bk, ...ar];
      if (out.length) { trace.push(`idea "${idea}" -> Qloo tag ${t.id} -> ${out.map(e => e.name).join(', ')}`); break; }
    }
  }
  if (!out.length) {
    const named = exact.length ? exact : fuzzy;
    // Keep the most popular match, plus a second of another kind when it is nearly as popular (a band and its film).
    const best = [...named].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    if (best[0]) out = [best[0], ...best.slice(1).filter(b => b.domain !== best[0].domain && (b.popularity || 0) >= 0.95 * (best[0].popularity || 0)).slice(0, 1)];
    if (out.length) trace.push(`idea "${idea}" -> /search -> ${out.map(e => `${e.name} (${e.domain})`).join(', ')}`);
  }
  if (!out.length) trace.push(`idea "${idea}" -> no Qloo entity or tag matched`);
  out = out.map(e => ({ ...e, asked: idea, fromIdea: true }));
  if (!failed || out.length) ideaCache.set(q, out);
  if (ideaCache.size > 300) ideaCache.delete(ideaCache.keys().next().value);
  return out;
}
const SELF = /nietzsche|zarathustra|power|yourself|self|ambition|rand|fountainhead|individual/i;

export async function runDialectic({ thesis, antithesis, synthesis }) {
  let mode = qlooMode();
  const notes = [], trace = [];
  const live = () => !mode.startsWith('mock');

  // 1. Resolve each side's taste anchors. A side with no anchors (or none Qloo can find) is read from
  //    its own idea text: a named thing ("Rancid") becomes that entity, an abstract word ("war") becomes
  //    the best-liked works carrying that Qloo tag. Nothing is ever silently swapped for preset anchors.
  const resolve = async side => (await mapLimit(side.anchors, 3, async l => {
    try {
      const e = live()
        ? (l.domain === 'art' ? await findArtPlace(l.name) : await searchEntity(l.name, INPUT_DOMAINS[l.domain]))
        : mockSearch(l.name, INPUT_DOMAINS[l.domain]);
      // A name typed under the wrong kind ("Rancid" left on Book) matches junk ("Rancid Aluminum"); retry any kind.
      if (live() && l.domain !== 'auto' && l.domain !== 'art' && (!e || !looseMatch(l.name, e.name))) {
        const any = await searchEntity(l.name, 'auto');
        if (any && looseMatch(l.name, any.name)) { trace.push(`search "${l.name}" as ${l.domain} -> ${e ? e.name : 'no match'}; any kind -> ${any.name} (${any.domain})`); return { ...any, asked: l.name }; }
      }
      trace.push(`search "${l.name}" -> ${e ? `${e.name} (${e.domain})` : 'no match'}`);
      return e ? { ...e, asked: l.name } : null;
    } catch (err) { trace.push(`search "${l.name}" failed: ${err.message}`); return null; }
  })).filter(Boolean);
  const fromIdea = async (side, label) => {
    if (!live()) return side.anchors.length ? [] : [mockSearch(side.idea, 'auto')].filter(Boolean);
    const found = await resolveIdea(side.idea, trace).catch(err => { trace.push(`idea "${side.idea}" lookup failed: ${err.message}`); return []; });
    if (found.length) notes.push(`${label} "${side.idea}" read from Qloo as ${listify(found.map(f => `${f.name} (${DOMAIN_WORD[f.domain] || f.domain})`))}.`);
    return found;
  };
  let [T, A] = await Promise.all([resolve(thesis), resolve(antithesis)]);
  if (!T.length) T = await fromIdea(thesis, 'Thesis');
  if (!A.length) A = await fromIdea(antithesis, 'Antithesis');
  if (live() && (!T.length || !A.length)) {
    // A lookup that failed (busy, timed out) is not the same as "nothing found": say so, so the client retries.
    if (trace.some(t => /failed: .*(timed out|out of time|network error|HTTP (429|5\d\d))/.test(t))) {
      const err = new Error('The taste graph is busy and did not answer in time. Nothing was made up; try again in a moment.');
      err.status = 503; err.friendly = true; err.retry = true; throw err;
    }
    const miss = [!T.length && thesis.idea, !A.length && antithesis.idea].filter(Boolean).map(x => `"${x}"`);
    const err = new Error(`Qloo couldn't find anything for ${miss.join(' or ')}. Try a band, film, book or show, or a plain word like "war" or "freedom", or add a taste anchor for that side.`);
    err.status = 422; err.friendly = true; throw err;
  }
  const tIds = [...new Set(T.map(x => x.id))], aIds = [...new Set(A.map(x => x.id))];
  const anchorIds = new Set([...tIds, ...aIds]);

  // 2. Per domain: both audiences, the joint signal, then re-rank everything against each side.
  // The philosophy pool resolves (once per warm instance) in parallel with the other domains.
  const philoP = live() ? goldenChain(trace, PHILO_POOL).then(l => l.filter(c => !anchorIds.has(c.id))) : Promise.resolve([]);
  let philo = [];
  // Qloo accepts an entity as a signal only for some output types (on the hackathon key "Thus Spoke
  // Zarathustra" signals books but not film or music; "Gravity and Grace" the reverse) and answers
  // HTTP 400 "signal.interests.entities were invalid" otherwise. So each side's signal is resolved
  // per type: its anchors when Qloo takes them, else the anchors plus that side's own top picks from
  // a type where they do work. Memoized, so the probe calls double as the per-side candidate pools.
  const invalid = e => /HTTP 400/.test(e?.message || '') && /invalid/i.test(e.message);
  const memo = new Map();
  const once = (k, f) => memo.has(k) ? memo.get(k) : (memo.set(k, f()), memo.get(k));
  const raw = (ids, type) => once(`raw|${type}|${ids}`, () => insights({ type }, ids, { pool: 20, exclude: [...anchorIds] }));
  const signal = (ids, type) => once(`sig|${type}|${ids}`, () => raw(ids, type).then(results => ({ ids, results }), async err => {
    if (!invalid(err)) throw err;
    const others = [...new Set(BRIDGE_DOMAINS.map(d => d.type))].filter(t => t !== type);
    const borrowed = (await Promise.any(others.map(t => raw(ids, t).then(r => r.length ? r : Promise.reject(new Error('empty'))))).catch(() => { throw err; })).slice(0, 3).map(x => x.id);
    const sIds = [...ids, ...borrowed];
    trace.push(`${type.split(':').pop()}: anchors not usable as a Qloo signal here, borrowed ${borrowed.length} of the side's own picks`);
    return { ids: sIds, results: await insights({ type }, sIds, { pool: 20, exclude: [...anchorIds, ...borrowed] }) };
  }));
  const failed = [];
  const domains = await mapLimit(BRIDGE_DOMAINS, 4, async d => {
    try {
      let pool;
      if (!live()) {
        const rt = mockRank(d.key, tIds), ra = mockRank(d.key, aIds);
        const am = new Map(ra.map(x => [x.id, x.affinity]));
        pool = rt.map(x => ({ ...x, t: x.affinity, a: am.get(x.id) || 0 }));
      } else {
        let ids;
        const tSigP = signal(tIds, d.type), aSigP = signal(aIds, d.type);
        // The joint call starts with the raw anchors (valid if either side's are) and only retries with the borrowed signals.
        const joint = d.canon ? null : insights(d, [...tIds, ...aIds], { pool: 25, exclude: [...anchorIds] }).catch(async err => {
          if (!invalid(err)) throw err;
          const [t, a] = await Promise.all([tSigP, aSigP]);
          return insights(d, [...new Set([...t.ids, ...a.ids])], { pool: 25, exclude: [...anchorIds] });
        });
        joint?.catch(() => {}); // awaited below; avoid an unhandled rejection while the side signals resolve
        if (d.canon) philo = await philoP;
        const [tSig, aSig] = await Promise.all([tSigP, aSigP]);
        if (d.canon && philo.length >= 4) ids = philo.map(c => c.id);
        else {
          const sj = await joint;
          // Joint candidates first; Qloo returns at most 50 per call, so cap the re-ranked pool.
          ids = [...new Set([...sj, ...tSig.results, ...aSig.results].map(x => x.id))].filter(id => !anchorIds.has(id)).slice(0, 44);
        }
        const [rt, ra] = await Promise.all([insights(d, tSig.ids, { pool: ids.length, onlyIds: ids }), insights(d, aSig.ids, { pool: ids.length, onlyIds: ids })]);
        const am = new Map(ra.map(x => [x.id, x.affinity]));
        pool = rt.filter(x => !anchorIds.has(x.id)).map(x => ({ ...x, t: x.affinity || 0, a: am.get(x.id) || 0, who: d.canon ? philo.find(c => c.id === x.id)?.who : undefined }));
        trace.push(`${d.label}: insights(thesis) + insights(antithesis) + insights(both)${d.canon ? ' [canon pool]' : ''} -> ${ids.length} candidates re-ranked per side with filter.results.entities`);
      }
      return { ...d, pool };
    } catch (err) {
      // A live domain that fails is left out (with the reason), never filled with stand-in picks.
      trace.push(`${d.label} failed: ${err.message}; left out`);
      failed.push({ label: d.label, why: whyFailed(err) });
      return { ...d, pool: [] };
    }
  });

  if (live() && failed.length) {
    if (failed.length === domains.length) {
      const err = new Error(`Qloo didn't answer just now (${failed[0].why}). Nothing was made up; wait a few seconds and try again.`);
      err.status = 503; err.friendly = true; throw err;
    }
    notes.push(`Left out ${listify(failed.map(f => f.label.toLowerCase()))}: ${failed[0].why}. Everything shown is live Qloo data.`);
  }

  // 3. Choose: bridge = max min(t, a); each side = most loved by that side and least by the other.
  const used = new Set(), whoSeen = new Set();
  const ok = x => x?.name && !used.has(x.id) && !used.has(x.name.toLowerCase()) && (!x.who || !whoSeen.has(x.who));
  const take = x => { used.add(x.id); used.add(x.name.toLowerCase()); if (x.who) whoSeen.add(x.who); return x; };
  const bridge = [], tPicks = [], aPicks = [];
  for (const d of domains) {
    const byMin = [...d.pool].sort((p, q) => bridgeScore(q) - bridgeScore(p) || (q.t + q.a) - (p.t + p.a));
    byMin.filter(ok).slice(0, d.canon ? 1 : 2).forEach(x => bridge.push(take({ ...x, domain: d.key, domainLabel: d.label, side: 'bridge' })));
  }
  for (const d of domains) {
    // Lean is relative rank within the domain, so a side whose anchors sit outside this domain still gets its own pick.
    const rank = k => new Map([...d.pool].sort((p, q) => q[k] - p[k]).map((x, i) => [x.id, i / Math.max(1, d.pool.length - 1)]));
    const rt = rank('t'), ra = rank('a');
    const lean = (x, me) => me === 't' ? ra.get(x.id) - rt.get(x.id) + x.t - x.a : rt.get(x.id) - ra.get(x.id) + x.a - x.t;
    const topT = [...d.pool].sort((p, q) => q.t - p.t).slice(0, 12).sort((p, q) => lean(q, 't') - lean(p, 't')).find(ok);
    if (topT) tPicks.push(take({ ...topT, domain: d.key, domainLabel: d.label, side: 'thesis' }));
    const topA = [...d.pool].sort((p, q) => q.a - p.a).slice(0, 12).sort((p, q) => lean(q, 'a') - lean(p, 'a')).find(ok);
    if (topA) aPicks.push(take({ ...topA, domain: d.key, domainLabel: d.label, side: 'antithesis' }));
  }

  // 4. The method: Soul and Intellect for each side, the One from the bridge.
  const syn = synthesis || proposeSynthesis(thesis.idea, antithesis.idea);
  const reading = readDialectic({ thesis, antithesis, synthesis: syn, proposed: !synthesis, T, A, tPicks, aPicks, bridge });
  const llm = await enrichBridge({ thesis, antithesis, T, A, tPicks, aPicks, bridge }, reading, !synthesis);

  const strip = x => ({ id: x.id, name: x.name, popularity: x.popularity, domain: x.domain, domainLabel: x.domainLabel, year: x.year, image: x.image, tags: (x.tags || []).slice(0, 6), who: x.who,
    thesisAffinity: x.t, antithesisAffinity: x.a, plain: x.plain, why: x.why, mock: x.mock });
  const seed = ({ id, name, domain, year, image, asked, mock }) => ({ id, name, domain, year, image, asked, mock });
  const all = [...bridge, ...tPicks, ...aPicks];
  return {
    kind: 'dialectic',
    mode: { qloo: mode, llm, standIn: mode.startsWith('mock') || all.some(i => i.mock), why: mode.startsWith('mock') ? (process.env.QLOO_API_KEY ? 'stand-in mode is switched on' : 'no Qloo key is configured') : undefined },
    thesis: { idea: thesis.idea, anchors: T.map(seed), soul: reading.thesis.soul, nous: reading.thesis.nous, picks: tPicks.map(strip) },
    antithesis: { idea: antithesis.idea, anchors: A.map(seed), soul: reading.antithesis.soul, nous: reading.antithesis.nous, picks: aPicks.map(strip) },
    synthesis: { text: reading.synthesis, proposed: reading.proposed },
    bridge: { one: reading.one, picks: [...bridge].sort((p, q) => bridgeScore(q) - bridgeScore(p)).map(strip) },
    understand: reading.understand,
    aboutYou: reading.aboutYou,
    notes, trace,
  };
}

function sideReading(label, anchors, picks) {
  const tags = [...anchors.flatMap(a => a.tags || []), ...picks.flatMap(p => p.tags || [])];
  const textures = [];
  const formy = t => FORMS.some(f => f.re.test(t)) ? 1 : 0;
  for (const t of tags.filter(usable).sort((p, q) => formy(q) - formy(p))) if (textures.length < 6 && !textures.some(x => x.toLowerCase() === t.toLowerCase())) textures.push(t);
  const forms = formsOf(tags);
  const f = forms[0] || FORMS[0];
  return {
    tags, forms,
    soul: { textures, text: textures.length ? `What this side feels: ${listify(textures.slice(0, 4).map(t => t.toLowerCase()))}.` : 'What this side feels arrives as images before any pattern.' },
    nous: { form: { key: f.key, name: f.name, greek: f.greek, gloss: f.gloss }, text: `The pattern underneath: ${f.name} (${f.greek}), ${f.gloss}.${SELF.test(label + anchors.map(a => a.name).join(' ')) ? ' Read with Nietzsche, the will to power here is self-overcoming, becoming more than you were, not power over anyone.' : ''}` },
  };
}

export function readDialectic({ thesis, antithesis, synthesis, proposed, T, A, tPicks, aPicks, bridge }) {
  const rt = sideReading(thesis.idea, T, tPicks), ra = sideReading(antithesis.idea, A, aPicks);
  // The shared Form: strong on both sides, confirmed by the bridge's own tags.
  const bf = formsOf(bridge.flatMap(b => b.tags || []));
  const score = k => Math.min(rt.forms.find(f => f.key === k)?.score || 0, ra.forms.find(f => f.key === k)?.score || 0) * 2 + (bf.find(f => f.key === k)?.score || 0);
  const shared = [...FORMS].sort((p, q) => score(q.key) - score(p.key))[0];
  const names = [...bridge].sort((p, q) => bridgeScore(q) - bridgeScore(p)).slice(0, 3).map(b => b.name);
  const tq = `"${thesis.idea || 'the thesis'}"`, aq = `"${antithesis.idea || 'the antithesis'}"`;

  for (const x of bridge) {
    const lo = Math.min(x.t, x.a) < 0.8;
    x.plain = `${x.mock ? 'Stand-in data. ' : ''}${lo ? `The closest common ground in ${(x.domainLabel || '').toLowerCase()}` : 'Both audiences rate it highly'}: the ${tq} side ${pct(x.t)}/100 and the ${aq} side ${pct(x.a)}/100${x.who ? ` (${x.who})` : ''}.`;
    x.why = pick([
      `Here the two sides stop arguing and simply share a taste. ${x.name} holds ${shared.name.toLowerCase()} for both.`,
      `Neither side owns ${x.name}. It sits above the quarrel, the way Hegel's synthesis keeps both moments and lifts them.`,
      `Soul on each side feels it differently. Intellect sees one Form in it: ${shared.name.toLowerCase()} (${shared.greek}).`,
    ], x.name);
  }
  for (const [list, me, other, mq, oq, r] of [[tPicks, 't', 'a', tq, aq, rt], [aPicks, 'a', 't', aq, tq, ra]]) for (const x of list) {
    x.plain = x[me] >= x[other]
      ? `${x.mock ? 'Stand-in data. ' : ''}Loved by the ${mq} audience (${pct(x[me])}/100); the ${oq} side rates it ${pct(x[other])}/100${x.who ? ` (${x.who})` : ''}.`
      : `${x.mock ? 'Stand-in data. ' : ''}In ${(x.domainLabel || '').toLowerCase()}, where the ${mq} side leans most: ${pct(x[me])}/100 for them, ${pct(x[other])}/100 for the ${oq} side, which scores this whole shelf higher${x.who ? ` (${x.who})` : ''}.`;
    x.why = pick([
      `A window into the ${mq} side: ${r.nous.form.name.toLowerCase()} in the matter of ${(x.domainLabel || '').toLowerCase()}.`,
      `This is how ${mq} sounds when it is not arguing: ${listify((x.tags || []).filter(usable).slice(0, 2).map(t => t.toLowerCase())) || 'a mood more than a claim'}.`,
    ], x.name + me);
  }

  const one = {
    form: { key: shared.key, name: shared.name, greek: shared.greek, gloss: shared.gloss },
    text: `The One, what the bridge reveals: both audiences already meet in ${listify(names) || 'the same few works'}. The shared thread is ${shared.name.toLowerCase()} (${shared.greek}), ${shared.gloss}. In Hegel's terms the synthesis, "${synthesis}", does not split the difference: it keeps both sides and lifts them (Aufhebung) into something each already loves.`,
  };
  const understand = bridge.length
    ? `Understand the other side: the ${aq} audience and the ${tq} audience both love ${listify(names)}. Start the conversation there.`
    : 'Understand the other side: Qloo found little common ground here. Try a different anchor.';
  const aboutYou = `What this says about you: if both sides move you, your taste runs toward ${shared.name.toLowerCase()}, ${shared.gloss}.`;
  return { thesis: rt, antithesis: ra, one, synthesis, proposed, understand, aboutYou };
}
