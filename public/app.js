(() => {
  const $ = id => document.getElementById(id);
  const DOMAINS = [['auto', 'any realm'], ['philosophy', 'philosophy'], ['music', 'music'], ['art', 'art / museum'], ['film', 'film'], ['book', 'book'], ['tv', 'series'], ['place', 'place'], ['destination', 'city / land'], ['podcast', 'podcast']];
  const EXAMPLE = [['The Enneads', 'philosophy'], ['Radiohead', 'music'], ['Stalker', 'film'], ['Rothko Chapel', 'art']];
  const drone = new window.Drone();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const unent = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }; // Qloo names can carry &amp;

  function addLove(name = '', domain = 'auto') {
    if ($('loves').children.length >= 8) return;
    const row = document.createElement('div'); row.className = 'love';
    row.innerHTML = `<input aria-label="Something you love" placeholder="a book, band, film, painter, place…" maxlength="80" value="${esc(name)}">
      <select aria-label="Realm">${DOMAINS.map(([v, l]) => `<option value="${v}"${v === domain ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="x" aria-label="Remove">×</button>`;
    row.querySelector('.x').onclick = () => { if ($('loves').children.length > 1) row.remove(); };
    $('loves').appendChild(row);
  }
  EXAMPLE.forEach(([n, d]) => addLove(n, d));
  $('add').onclick = () => addLove();
  document.querySelectorAll('.drone-btn').forEach(b => { b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; document.querySelectorAll('.drone-btn').forEach(x => x.setAttribute('aria-pressed', on)); drone.set(on); }; });
  // Shared helpers for bridge.js (the main dialectic flow).
  // Ask the oracle without trusting the reply to be JSON: a platform timeout comes back as a plain-text page, which
  // Safari's r.json() reports as "The string did not match the expected pattern." Read text, parse, say something
  // human, and retry once by itself when the failure looks temporary (timeout, busy, network).
  const SLOW = 'The oracle took too long to answer. Try again in a moment.';
  async function askOracle(body, onRetry) {
    for (let attempt = 0; ; attempt++) {
      let r = null, data = null, transient = false;
      try {
        r = await fetch('/api/oracle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const text = await r.text();
        try { data = JSON.parse(text); } catch { data = null; }
        if (r.ok && data) return data;
        transient = !data || r.status >= 500 || r.status === 429 || !!data.retry;
      } catch { transient = true; }
      if (transient && attempt === 0) { onRetry?.(); continue; }
      throw new Error((data && data.error) || (r && r.status < 500 && r.status !== 429 ? 'No answer came back. Try again.' : SLOW));
    }
  }
  window.PTA = { $, esc, unent, DOMAINS, drone, askOracle, level: n => { drone.setLevel(n); window.Stage?.setLevel(n); } };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const level = n => { drone.setLevel(n); window.Stage?.setLevel(n); };
  const WAIT = ['Soul gathers the many…', 'Asking Qloo who else loves these…', 'Leaping into other matter…', 'Intellect turns back to look…'];

  $('altar').onsubmit = async e => {
    e.preventDefault();
    const loves = [...$('loves').children].map(r => ({ name: r.querySelector('input').value.trim(), domain: r.querySelector('select').value })).filter(l => l.name);
    if (!loves.length) { $('status').textContent = 'Name at least one thing you love.'; return; }
    $('go').disabled = true; $('reading').hidden = true; level(0);
    let w = 0; $('status').textContent = WAIT[0]; const tick = setInterval(() => { $('status').textContent = WAIT[++w % WAIT.length]; }, 1600);
    try {
      const data = await askOracle({ loves }, () => { w = 0; $('status').textContent = 'The oracle is slow tonight. Asking once more…'; });
      clearInterval(tick); $('status').textContent = '';
      await render(data);
    } catch (err) { clearInterval(tick); $('status').textContent = err.message; }
    finally { $('go').disabled = false; }
  };

  if (new URLSearchParams(location.search).has('still')) document.body.classList.add('still');
  // ?demo=taste auto-runs the single-taste example (?demo alone runs the bridge demo, see bridge.js).
  if (new URLSearchParams(location.search).get('demo') === 'taste') setTimeout(() => { window.PTA.showMode('taste'); $('altar').requestSubmit(); }, 300);

  async function render(d) {
    const standIn = d.mode.standIn;
    $('mode').className = 'mode' + (standIn ? ' standin' : '');
    $('mode').textContent = standIn ? 'Stand-in data · not from Qloo' : `Qloo taste graph · live${d.mode.llm.startsWith('template') ? '' : ` · words by ${d.mode.llm}`}`;
    $('soul').textContent = d.soul.text;
    $('textures').innerHTML = (d.soul.textures || []).map(t => `<span class="chip">${esc(unent(t))}</span>`).join('');
    $('nous').textContent = d.nous.text;
    $('forms').innerHTML = d.nous.forms.map(f => `<span class="chip"><b>${esc(f.name)}</b> · ${esc(f.greek)}</span>`).join('');
    $('one').textContent = d.one.text;
    $('leaps').innerHTML = d.leaps.map(l => `<article class="leap"><small>Leap into</small><h3>${esc(l.label)}</h3>${l.items.length ? l.items.map(item).join('') : '<p class="fine">Qloo returned nothing here.</p>'}</article>`).join('');
    $('trace').innerHTML = [...(d.notes || []), ...(d.trace || [])].map(t => `<li>${esc(t)}</li>`).join('');
    document.querySelectorAll('.tier,.leap').forEach(el => el.classList.remove('lit'));
    $('reading').hidden = false;
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    for (const [i, k] of ['soul', 'nous', 'one'].entries()) { document.querySelector(`.tier[data-tier=${k}]`).classList.add('lit'); level(i + 1); await sleep(900 * fast); }
    for (const el of document.querySelectorAll('.leap')) { el.classList.add('lit'); await sleep(220 * fast); }
    if (!new URLSearchParams(location.search).has('noscroll')) $('reading').scrollIntoView({ behavior: fast ? 'smooth' : 'auto', block: 'start' });
  }

  function item(i) {
    const meta = [i.who, i.year && i.year > 0 ? i.year : null, i.affinity ? `affinity ${Math.round(i.affinity * 100)}` : null].filter(Boolean).join(' · ');
    const img = i.image ? `<img class="img" src="${esc(i.image)}" alt="" loading="lazy">` : '<div class="img"></div>';
    return `<div class="item">${img}<div><div class="name">${esc(unent(i.name))}${i.mock ? ' <span class="mockflag">(stand-in)</span>' : ''}</div>
      ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}<p class="plain">${esc(i.plain)}</p><p class="why">${esc(i.why)}</p>
      ${i.tags?.length ? `<div class="tags">${esc(i.tags.slice(0, 5).map(unent).join(' · '))}</div>` : ''}</div></div>`;
  }
})();
