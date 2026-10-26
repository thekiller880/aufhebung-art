// Vercel serverless function: POST /api/oracle
//   Dialectic bridge (main): { thesis:{idea, anchors:[{name,domain}]}, antithesis:{...}, synthesis? }
//     anchors are optional: a side without them is resolved from its idea text via Qloo /search and /v2/tags.
//   Single taste (secondary): { loves: [{ name, domain? }] }
import { runAgent, cleanInput } from '../lib/agent.js';
import { runDialectic, cleanDialectic } from '../lib/dialectic.js';

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
      return res.status(200).json(await runDialectic(d));
    }
    const loves = cleanInput(body);
    if (!loves.length) return res.status(400).json({ error: 'Give at least one thing you love.' });
    return res.status(200).json(await runAgent(loves));
  } catch (e) {
    if (e.friendly) return res.status(e.status || 422).json({ error: e.message });
    console.error('[oracle]', e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
