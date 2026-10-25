// Smoke test: calls the Vercel handler directly with stand-in data (no network, no keys needed).
import assert from 'node:assert/strict';
process.env.MOCK_QLOO = '1';
delete process.env.GEMINI_API_KEY; delete process.env.GROQ_API_KEY;
const { default: handler } = await import('../api/oracle.js');

function call(method, body) {
  return new Promise(resolve => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ code: this.statusCode, body: o }); return this; } };
    handler({ method, body }, res);
  });
}

let r = await call('POST', { loves: [{ name: 'The Enneads', domain: 'philosophy' }, 'Radiohead', { name: 'Stalker', domain: 'film' }] });
assert.equal(r.code, 200);
assert.equal(r.body.mode.qloo, 'mock');
assert.equal(r.body.mode.standIn, true);
assert.ok(r.body.soul.text && r.body.nous.text && r.body.one.text, 'three hypostases present');
assert.equal(r.body.leaps.length, 6, 'six cross-domain leaps');
for (const l of r.body.leaps) for (const i of l.items) { assert.ok(i.why, `why for ${i.name}`); assert.ok(i.plain, `plain line for ${i.name}`); assert.ok(i.mock); }
r = await call('POST', { loves: [] }); assert.equal(r.code, 400);
r = await call('PUT', {}); assert.equal(r.code, 405);
r = await call('POST', JSON.stringify({ loves: ['x'.repeat(500)] })); assert.equal(r.code, 200); assert.ok(r.body.seeds[0].name.length <= 80);
console.log('smoke ok: single-taste mock flow,', r.body.leaps.reduce((n, l) => n + l.items.length, 0), 'picks');

// Dialectic bridge (main flow).
const T = { idea: 'help yourself', anchors: [{ name: 'Thus Spoke Zarathustra', domain: 'book' }, { name: 'Whiplash', domain: 'film' }] };
const A = { idea: 'help others', anchors: [{ name: 'Gravity and Grace', domain: 'book' }, { name: "It's a Wonderful Life", domain: 'film' }] };
r = await call('POST', { thesis: T, antithesis: A });
assert.equal(r.code, 200);
const d = r.body;
assert.equal(d.kind, 'dialectic');
assert.equal(d.mode.standIn, true);
assert.equal(d.synthesis.proposed, true, 'synthesis proposed when blank');
assert.equal(d.synthesis.text, 'help yourself by helping others');
assert.ok(d.thesis.picks.length && d.antithesis.picks.length && d.bridge.picks.length, 'three cards have picks');
assert.ok(d.thesis.soul.text && d.thesis.nous.text && d.antithesis.soul.text && d.antithesis.nous.text && d.bridge.one.text, 'Soul/Intellect per side and the One');
assert.ok(d.understand && d.aboutYou, 'understand + about-you lines');
const all = [...d.bridge.picks, ...d.thesis.picks, ...d.antithesis.picks];
assert.equal(new Set(all.map(i => i.id)).size, all.length, 'no pick repeats across cards');
for (const i of all) { assert.ok(i.plain && i.why, `plain + why for ${i.name}`); assert.ok(typeof i.thesisAffinity === 'number' && typeof i.antithesisAffinity === 'number'); }
const mins = d.bridge.picks.map(i => Math.min(i.thesisAffinity, i.antithesisAffinity));
assert.deepEqual(mins, [...mins].sort((p, q) => q - p), 'bridge sorted by shared affinity');
assert.ok(!/god|divine|holy|sin\b|pray/i.test(JSON.stringify([d.bridge.one, d.understand, d.aboutYou])), 'philosophy, not religion');
r = await call('POST', { thesis: T, antithesis: A, synthesis: 'my own synthesis' });
assert.equal(r.body.synthesis.text, 'my own synthesis'); assert.equal(r.body.synthesis.proposed, false);
r = await call('POST', { thesis: T, antithesis: { idea: 'help others', anchors: [] } }); assert.equal(r.code, 400, 'missing antithesis anchors');
r = await call('POST', { thesis: { idea: '', anchors: T.anchors }, antithesis: A }); assert.equal(r.code, 400, 'missing thesis idea');
console.log('smoke ok: dialectic mock flow,', d.bridge.picks.length, 'bridge /', d.thesis.picks.length, 'thesis /', d.antithesis.picks.length, 'antithesis picks');
