// Vercel serverless function: POST /api/oracle
//   Dialectic bridge (main): { thesis:{idea, anchors:[{name,domain}]}, antithesis:{...}, synthesis? }
//     anchors are optional: a side without them is resolved from its idea text via Qloo /search and /v2/tags.
//   Single taste (secondary): { loves: [{ name, domain? }] }
import { runAgent, cleanInput } from '../lib/agent.js';
import { runDialectic, cleanDialectic } from '../lib/dialectic.js';
import { withBudget } from '../lib/qloo.js';
import { findExample, savedReading, usable } from '../lib/examples.js';

// vercel.json caps the function at 30 s; past that Vercel answers with a plain-text 504 that the browser cannot parse.
// So the whole reading gets a 21 s budget for outside calls, and a hard guard answers with JSON before the cap.
const BUDGET_MS = 21000, GUARD_MS = 26000;
// A suggested example with a saved reading waits only this long for live Qloo before the saved reading answers.
const EXAMPLE_WAIT_MS = 8000;
const TOO_SLOW = { error: 'The oracle took too long to answer (the taste graph is busy). Try again in a moment.', retry: true };
function guarded(work) {
  let t;
  const guard = new Promise(r => { t = setTimeout(() => r(null), GUARD_MS); });
  return Promise.race([withBudget(BUDGET_MS, work), guard]).finally(() => clearTimeout(t));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ok: true, usage: 'POST {"thesis":{"idea":"help yourself","anchors":[{"name":"Thus Spoke Zarathustra","domain":"book"}]},"antithesis":{"idea":"help others","anchors":[{"name":"Gravity and Grace","domain":"book"}]},"synthesis":""}  or  POST {"loves":[{"name":"The Enneads"}]}' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    if (body && (body.thesis || body.antithesis)) {
      const d = cleanDialectic(body);
      if (!d.thesis.idea || !d.antithesis.idea) return res.status(400).json({ error: 'Name both ideas: a thesis and its antithesis.' });
      const ex = findExample(d);
      if (!ex) {
        const out = await guarded(() => runDialectic(d));
        return out ? res.status(200).json(out) : res.status(503).json(TOO_SLOW);
      }
      // Saved example: live first; the saved reading answers if live fails, is empty, or takes over ~8 s.
      // ?fallback=1 on the page sends forceSaved, to check the saved path on demand.
      const send = (out, why) => { res.setHeader('X-Reading', why ? 'saved' : 'live'); return res.status(200).json(why ? savedReading(ex, why) : out); };
      if (body.forceSaved === true) return send(null, 'forced for testing');
      let t;
      const timer = new Promise(r => { t = setTimeout(() => r('slow'), EXAMPLE_WAIT_MS); });
      const live = withBudget(EXAMPLE_WAIT_MS - 600, () => runDialectic(d)).catch(e => { console.error('[oracle] example live failed', e.message); return 'failed'; });
      const out = await Promise.race([live, timer]).finally(() => clearTimeout(t));
      if (out === 'slow') return send(null, 'Qloo was slow');
      if (out === 'failed') return send(null, 'Qloo did not answer');
      return usable(out) ? send(out) : send(null, 'Qloo came back empty');
    }
    const loves = cleanInput(body);
    if (!loves.length) return res.status(400).json({ error: 'Give at least one thing you love.' });
    const out = await guarded(() => runAgent(loves));
    return out ? res.status(200).json(out) : res.status(503).json(TOO_SLOW);
  } catch (e) {
    if (e.friendly) return res.status(e.status || 422).json(e.retry ? { error: e.message, retry: true } : { error: e.message });
    console.error('[oracle]', e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
