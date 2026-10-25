// Optional free-tier LLM pass (Gemini or Groq). It rewrites the deterministic Plotinian prose.
// With no key, or on any failure, the template text stands. Keys come only from env vars.
export function llmMode() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'template';
}

function buildPrompt(seeds, leaps, reading) {
  const brief = {
    loves: seeds.map(s => ({ name: s.name, domain: s.domain, tags: (s.tags || []).slice(0, 8) })),
    forms_detected: reading.nous.forms.map(f => f.name),
    the_one: reading.one.form,
    leaps: leaps.map(l => ({ domain: l.label, items: l.items.map(i => ({ id: i.id, name: i.name, tags: (i.tags || []).slice(0, 6) })) })),
  };
  return `You are the single-taste reader inside Aufhebung, the Dialectic Engine: an eerie, lucid guide who uses Plotinus as a philosophical lens on taste. Treat Plotinus strictly as philosophy, never as religion: no worship, prayer, salvation or preachy language. Recommendations come from Qloo's taste graph; you only interpret them.
Read the user's loves through Plotinus's three hypostases: Soul (sensory, emotional texture), Nous (the Forms/archetypes behind them) and the One (a single unifying thread). The recommendations deliberately leap across domains (philosophy, music, painting, film, places, literature). Show how each leap is the same Form in different matter. Cite Plotinus accurately when you cite him (e.g. Ennead I.6 on Beauty, III.8 on contemplation, VI.9 on the One). Be concrete, haunting, never purple. Plain English.
Return ONLY JSON: {"soul": "2-3 sentences", "nous": "2-3 sentences", "one": "2 sentences", "whys": {"<item id>": "1-2 artistic sentences tying this item to a specific love and a Form"}, "plains": {"<item id>": "one plain-English sentence on why it was picked, no jargon"}}
DATA: ${JSON.stringify(brief)}`;
}

async function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('LLM timeout')), ms))]); }

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, responseMimeType: 'application/json' } }),
  });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

async function callGroq(prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.8, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Groq HTTP ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

/** Mutates reading/leaps in place with LLM prose. Returns the mode actually used. */
export async function enrich(seeds, leaps, reading) {
  const mode = llmMode();
  if (mode === 'template') return 'template';
  try {
    const raw = await withTimeout((mode === 'gemini' ? callGemini : callGroq)(buildPrompt(seeds, leaps, reading)), 15000);
    const out = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim());
    const s = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 900) : null);
    if (s(out.soul)) reading.soul.text = s(out.soul);
    if (s(out.nous)) reading.nous.text = s(out.nous);
    if (s(out.one)) reading.one.text = s(out.one);
    for (const l of leaps) for (const i of l.items) { if (s(out.whys?.[i.id])) i.why = s(out.whys[i.id]); if (s(out.plains?.[i.id])) i.plain = s(out.plains[i.id]); }
    return mode;
  } catch (e) {
    console.warn('[llm] fallback to template:', e.message);
    return 'template (LLM failed)';
  }
}

// Dialectic mode: optional LLM rewrite of the side readings, the One, the two framing lines and (if blank) the synthesis.
function bridgePrompt(d, reading, wantSynthesis) {
  const it = x => ({ id: x.id, name: x.name, domain: x.domainLabel, thesis_affinity: x.t, antithesis_affinity: x.a, tags: (x.tags || []).slice(0, 5) });
  const brief = {
    thesis: { idea: d.thesis.idea, anchors: d.T.map(a => a.name), form: reading.thesis.nous.form.name, textures: reading.thesis.soul.textures, picks: d.tPicks.map(it) },
    antithesis: { idea: d.antithesis.idea, anchors: d.A.map(a => a.name), form: reading.antithesis.nous.form.name, textures: reading.antithesis.soul.textures, picks: d.aPicks.map(it) },
    bridge: d.bridge.map(it), shared_form: reading.one.form.name, synthesis: wantSynthesis ? null : reading.synthesis,
  };
  return `You interpret a "dialectic bridge" built from Qloo taste data: two opposing ideas, each anchored in works, and the picks both audiences love (the bridge).
Frame: philosophy, not religion. Hegel gives the movement (thesis, antithesis, a higher unity that keeps both). Plotinus gives the method: Soul = what a side feels, Intellect = the pattern behind it, the One = the shared thread the bridge reveals. If Nietzsche's will to power comes up, it means self-overcoming, never domination. No preaching, no worship language, no moralizing. Eerie and lucid, short, plain English. Never invent picks; only use the data.
Return ONLY JSON: {"thesis_soul": "1 sentence", "thesis_nous": "1-2 sentences", "antithesis_soul": "1 sentence", "antithesis_nous": "1-2 sentences", "one": "2 sentences on the shared thread", "understand": "1 sentence that starts 'Understand the other side:' and names bridge picks", "about_you": "1 sentence that starts 'What this says about you:'",${wantSynthesis ? ' "synthesis": "a short phrase that keeps both ideas and lifts them (like \'help yourself by helping others\')",' : ''} "plains": {"<id>": "one plain sentence on why it was picked, citing the affinities"}, "whys": {"<id>": "one short artistic sentence"}}
DATA: ${JSON.stringify(brief)}`;
}

export async function enrichBridge(d, reading, wantSynthesis) {
  const mode = llmMode();
  if (mode === 'template') return 'template';
  try {
    const raw = await withTimeout((mode === 'gemini' ? callGemini : callGroq)(bridgePrompt(d, reading, wantSynthesis)), 15000);
    const out = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim());
    const s = (v, n = 600) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
    if (s(out.thesis_soul)) reading.thesis.soul.text = s(out.thesis_soul);
    if (s(out.thesis_nous)) reading.thesis.nous.text = s(out.thesis_nous);
    if (s(out.antithesis_soul)) reading.antithesis.soul.text = s(out.antithesis_soul);
    if (s(out.antithesis_nous)) reading.antithesis.nous.text = s(out.antithesis_nous);
    if (s(out.one)) reading.one.text = s(out.one);
    if (s(out.understand)) reading.understand = s(out.understand);
    if (s(out.about_you)) reading.aboutYou = s(out.about_you);
    if (wantSynthesis && s(out.synthesis, 120)) reading.synthesis = s(out.synthesis, 120);
    for (const x of [...d.bridge, ...d.tPicks, ...d.aPicks]) { if (s(out.plains?.[x.id])) x.plain = s(out.plains[x.id]); if (s(out.whys?.[x.id])) x.why = s(out.whys[x.id]); }
    return mode;
  } catch (e) {
    console.warn('[llm] bridge fallback to template:', e.message);
    return 'template (LLM failed)';
  }
}
