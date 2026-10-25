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
import { searchEntity, insights, qlooMode } from './qloo.js';
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

// "help yourself" + "help others" -> "help yourself by helping others"
const gerund = w => /ie$/.test(w) ? w.slice(0, -2) + 'ying' : /[^aeiou]e$/.test(w) && !/ee$/.test(w) ? w.slice(0, -1) + 'ing' : /ing$/.test(w) ? w : w + 'ing';
export function proposeSynthesis(t, a) {
  if (!t || !a) return '';
  const [aw, ...rest] = a.trim().split(/\s+/);
  return `${t.trim()} by ${[gerund(aw.toLowerCase()), ...rest].join(' ')}`;
}

const pct = x => Math.round((x || 0) * 100);
const SELF = /nietzsche|zarathustra|power|yourself|self|ambition|rand|fountainhead|individual/i;

export async function runDialectic({ thesis, antithesis, synthesis }) {
  let mode = qlooMode();
  const notes = [], trace = [];
  const live = () => !mode.startsWith('mock');

  // 1. Resolve each side's taste anchors.
  const resolve = async side => (await mapLimit(side.anchors, 3, async l => {
    try {
      const e = live()
        ? (l.domain === 'art' ? await findArtPlace(l.name) : await searchEntity(l.name, INPUT_DOMAINS[l.domain]))
        : mockSearch(l.name, INPUT_DOMAINS[l.domain]);
      trace.push(`search "${l.name}" -> ${e ? `${e.name} (${e.domain})` : 'no match'}`);
      return e ? { ...e, asked: l.name } : null;
    } catch (err) { trace.push(`search "${l.name}" failed: ${err.message}`); return null; }
  })).filter(Boolean);
  let T = await resolve(thesis), A = await resolve(antithesis);
  if (live() && (!T.length || !A.length)) {
    notes.push('Qloo could not resolve an anchor on one side, so stand-in data is shown instead.');
    mode = 'mock (live search empty)';
    T = thesis.anchors.map(l => mockSearch(l.name, INPUT_DOMAINS[l.domain]));
    A = antithesis.anchors.map(l => mockSearch(l.name, INPUT_DOMAINS[l.domain]));
  }
  const tIds = [...new Set(T.map(x => x.id))], aIds = [...new Set(A.map(x => x.id))];
  const anchorIds = new Set([...tIds, ...aIds]);

  // 2. Per domain: both audiences, the joint signal, then re-rank everything against each side.
  // The philosophy pool resolves (once per warm instance) in parallel with the other domains.
  const philoP = live() ? goldenChain(trace, PHILO_POOL).then(l => l.filter(c => !anchorIds.has(c.id))) : Promise.resolve([]);
  let philo = [];
  const domains = await mapLimit(BRIDGE_DOMAINS, 3, async d => {
    try {
      let pool;
      if (!live()) {
        const rt = mockRank(d.key, tIds), ra = mockRank(d.key, aIds);
        const am = new Map(ra.map(x => [x.id, x.affinity]));
        pool = rt.map(x => ({ ...x, t: x.affinity, a: am.get(x.id) || 0 }));
      } else {
        let ids;
        if (d.canon) philo = await philoP;
        if (d.canon && philo.length >= 4) ids = philo.map(c => c.id);
        else {
          const [st, sa, sj] = await Promise.all([
            insights(d, tIds, { pool: 20, exclude: [...anchorIds] }),
            insights(d, aIds, { pool: 20, exclude: [...anchorIds] }),
            insights(d, [...tIds, ...aIds], { pool: 25, exclude: [...anchorIds] }),
          ]);
          // Joint candidates first; Qloo returns at most 50 per call, so cap the re-ranked pool.
          ids = [...new Set([...sj, ...st, ...sa].map(x => x.id))].filter(id => !anchorIds.has(id)).slice(0, 44);
        }
        const [rt, ra] = await Promise.all([insights(d, tIds, { pool: ids.length, onlyIds: ids }), insights(d, aIds, { pool: ids.length, onlyIds: ids })]);
        const am = new Map(ra.map(x => [x.id, x.affinity]));
        pool = rt.filter(x => !anchorIds.has(x.id)).map(x => ({ ...x, t: x.affinity || 0, a: am.get(x.id) || 0, who: d.canon ? philo.find(c => c.id === x.id)?.who : undefined }));
        trace.push(`${d.label}: insights(thesis) + insights(antithesis) + insights(both)${d.canon ? ' [canon pool]' : ''} -> ${ids.length} candidates re-ranked per side with filter.results.entities`);
      }
      return { ...d, pool };
    } catch (err) {
      trace.push(`${d.label} failed: ${err.message}; using stand-in`);
      notes.push(`${d.label}: live Qloo call failed, stand-in shown.`);
      const rt = mockRank(d.key, tIds), am = new Map(mockRank(d.key, aIds).map(x => [x.id, x.affinity]));
      return { ...d, pool: rt.map(x => ({ ...x, t: x.affinity, a: am.get(x.id) || 0 })) };
    }
  });

  // 3. Choose: bridge = max min(t, a); each side = most loved by that side and least by the other.
  const used = new Set(), whoSeen = new Set();
  const ok = x => x?.name && !used.has(x.id) && !used.has(x.name.toLowerCase()) && (!x.who || !whoSeen.has(x.who));
  const take = x => { used.add(x.id); used.add(x.name.toLowerCase()); if (x.who) whoSeen.add(x.who); return x; };
  const bridge = [], tPicks = [], aPicks = [];
  for (const d of domains) {
    const byMin = [...d.pool].sort((p, q) => Math.min(q.t, q.a) - Math.min(p.t, p.a) || (q.t + q.a) - (p.t + p.a));
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

  const strip = x => ({ id: x.id, name: x.name, domain: x.domain, domainLabel: x.domainLabel, year: x.year, image: x.image, tags: (x.tags || []).slice(0, 6), who: x.who,
    thesisAffinity: x.t, antithesisAffinity: x.a, plain: x.plain, why: x.why, mock: x.mock });
  const seed = ({ id, name, domain, year, image, asked, mock }) => ({ id, name, domain, year, image, asked, mock });
  const all = [...bridge, ...tPicks, ...aPicks];
  return {
    kind: 'dialectic',
    mode: { qloo: mode, llm, standIn: mode.startsWith('mock') || all.some(i => i.mock) },
    thesis: { idea: thesis.idea, anchors: T.map(seed), soul: reading.thesis.soul, nous: reading.thesis.nous, picks: tPicks.map(strip) },
    antithesis: { idea: antithesis.idea, anchors: A.map(seed), soul: reading.antithesis.soul, nous: reading.antithesis.nous, picks: aPicks.map(strip) },
    synthesis: { text: reading.synthesis, proposed: reading.proposed },
    bridge: { one: reading.one, picks: [...bridge].sort((p, q) => Math.min(q.t, q.a) - Math.min(p.t, p.a)).map(strip) },
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
  const names = [...bridge].sort((p, q) => Math.min(q.t, q.a) - Math.min(p.t, p.a)).slice(0, 3).map(b => b.name);
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
