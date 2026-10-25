// Live check against hackathon.api.qloo.com. Needs QLOO_API_KEY in env. Prints names, scores and the trace only; never the key.
if (!process.env.QLOO_API_KEY) { console.log('QLOO_API_KEY not set; skipping live check.'); process.exit(0); }
const { runDialectic, cleanDialectic } = await import('../lib/dialectic.js');
const { runAgent } = await import('../lib/agent.js');
const pct = x => Math.round((x || 0) * 100);

let t = Date.now();
const d = await runDialectic(cleanDialectic({
  thesis: { idea: 'help yourself', anchors: [{ name: 'Thus Spoke Zarathustra', domain: 'book' }, { name: 'The Fountainhead', domain: 'book' }, { name: 'Whiplash', domain: 'film' }] },
  antithesis: { idea: 'help others', anchors: [{ name: 'Gravity and Grace', domain: 'book' }, { name: "It's a Wonderful Life", domain: 'film' }, { name: 'Les Misérables', domain: 'film' }] },
}));
console.log('DIALECTIC mode', d.mode, `${Date.now() - t} ms`, '| synthesis:', d.synthesis);
for (const [label, picks] of [['BRIDGE', d.bridge.picks], ['THESIS', d.thesis.picks], ['ANTITHESIS', d.antithesis.picks]])
  console.log(label.padEnd(11), picks.map(i => `${i.name} (${pct(i.thesisAffinity)}/${pct(i.antithesisAffinity)})`).join(' | '));
console.log('one:', d.bridge.one.text);
console.log(d.trace.join('\n'));
if (d.mode.standIn) { console.log('WARNING: some picks are stand-ins'); process.exitCode = 1; }

t = Date.now();
const r = await runAgent([{ name: 'The Enneads', domain: 'philosophy' }, { name: 'Radiohead', domain: 'music' }, { name: 'Stalker', domain: 'film' }]);
console.log('\nSINGLE TASTE mode', r.mode, `${Date.now() - t} ms`);
for (const l of r.leaps) console.log(l.label.padEnd(32), l.items.map(i => i.name).join(' | '));
