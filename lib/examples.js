// Saved readings for the suggested examples, so the demo pairs still answer when Qloo is slow, rate-limited or down.
// The readings are real Qloo results captured from the live app, trimmed to the fields the page shows. Per the
// hackathon rules they are kept in a private server-side cache (the EXAMPLE_CACHE env var on Vercel, gzip+base64
// JSON), never committed to this public repo. Without the env var there is simply no fallback.
import { gunzipSync } from 'node:zlib';

const norm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const names = list => (list || []).map(a => norm(typeof a === 'string' ? a : a?.name)).filter(Boolean).sort().join('|');
let saved = null;
function load() {
  if (saved) return saved;
  saved = [];
  try { if (process.env.EXAMPLE_CACHE) saved = JSON.parse(gunzipSync(Buffer.from(process.env.EXAMPLE_CACHE, 'base64')).toString('utf8')); }
  catch (e) { console.error('[examples] EXAMPLE_CACHE unreadable', e.message); }
  return saved;
}
export const resetExamples = () => { saved = null; };

// A request matches a saved example when both ideas match (case-insensitive), its anchors are empty or the same as
// the saved ones, and its synthesis is empty or the saved one.
export function findExample({ thesis, antithesis, synthesis }) {
  for (const ex of load()) {
    if (norm(thesis.idea) !== norm(ex.thesis) || norm(antithesis.idea) !== norm(ex.antithesis)) continue;
    const tA = names(thesis.anchors), aA = names(antithesis.anchors);
    if (tA && tA !== names(ex.tAnchors)) continue;
    if (aA && aA !== names(ex.aAnchors)) continue;
    if (norm(synthesis) && norm(synthesis) !== norm(ex.synthesis || ex.reading.synthesis?.text)) continue;
    return ex;
  }
  return null;
}

// The saved reading, marked as saved so the page can say so quietly (not as an error).
export function savedReading(ex, why) {
  const r = structuredClone(ex.reading);
  r.mode = { ...r.mode, saved: true };
  r.trace = [...(r.trace || []), `Saved reading of this example served (${why}); live results are used whenever Qloo answers in time.`];
  return r;
}

// A live reading counts as usable when it is real Qloo data and the bridge found something.
export const usable = out => !!(out && !out.mode?.standIn && out.bridge?.picks?.length);
