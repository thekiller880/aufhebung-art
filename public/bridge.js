// Main flow: the dialectic bridge. Thesis + antithesis (each with taste anchors) -> /api/oracle -> three cards.
(() => {
  const { $, esc, unent, DOMAINS, level, askOracle } = window.PTA;
  const ANCHOR_DOMAINS = DOMAINS.filter(([v]) => v !== 'podcast');
  const DEMO = {
    thesis: { idea: 'help yourself', anchors: [['Thus Spoke Zarathustra', 'book'], ['The Fountainhead', 'book'], ['Whiplash', 'film']] },
    antithesis: { idea: 'help others', anchors: [['Gravity and Grace', 'book'], ["It's a Wonderful Life", 'film'], ['Les Misérables', 'film']] },
    synthesis: 'help yourself by helping others',
  };
  const params = new URLSearchParams(location.search);

  function addAnchor(box, name = '', domain = 'auto') {
    if (box.children.length >= 4) return;
    const row = document.createElement('div'); row.className = 'love';
    row.innerHTML = `<input aria-label="Taste anchor (optional)" placeholder="a book, album, film, artist…" maxlength="80" value="${esc(name)}">
      <select aria-label="Kind">${ANCHOR_DOMAINS.map(([v, l]) => `<option value="${v}"${v === domain ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="x" aria-label="Remove">×</button>`;
    row.querySelector('.x').onclick = () => { if (box.children.length > 1) row.remove(); };
    box.appendChild(row);
  }
  // Anchors follow the idea: the preset anchors belong to the preset idea. Once a side's idea text changes,
  // its anchors are cleared (unless the user edited them) and the server reads the typed idea itself in Qloo.
  const touched = { thesis: false, antithesis: false };
  for (const k of ['thesis', 'antithesis']) {
    const box = $(`${k}-anchors`), idea = $(`${k}-idea`);
    idea.value = DEMO[k].idea;
    DEMO[k].anchors.forEach(([n, d]) => addAnchor(box, n, d));
    box.addEventListener('input', () => { touched[k] = true; });
    box.addEventListener('change', () => { touched[k] = true; });
    box.addEventListener('click', e => { if (e.target.closest('.x')) touched[k] = true; });
    idea.addEventListener('input', () => {
      const v = idea.value.trim();
      if (!touched[k]) {
        box.innerHTML = '';
        if (v.toLowerCase() === DEMO[k].idea) DEMO[k].anchors.forEach(([n, d]) => addAnchor(box, n, d));
        else addAnchor(box);
      }
      const empty = [...box.querySelectorAll('input')].every(i => !i.value.trim());
      box.querySelectorAll('input').forEach(i => { i.placeholder = empty && v ? `optional: we'll look up “${v.slice(0, 30)}” in Qloo` : 'a book, album, film, artist…'; });
      // The preset synthesis belongs to the preset pair too.
      if ($('synthesis').value === DEMO.synthesis) $('synthesis').value = '';
    });
  }
  // The demo default keeps the synthesis; a blank synthesis is proposed by the agent.
  $('synthesis').value = params.has('blank') ? '' : DEMO.synthesis;
  document.querySelectorAll('[data-add]').forEach(b => { b.onclick = () => addAnchor($(b.dataset.add)); });

  function showMode(m) {
    const bridge = m !== 'taste';
    $('dialectic').hidden = !bridge; $('altar').hidden = bridge;
    $('bridge-reading').hidden = true; $('reading').hidden = true; $('status').textContent = '';
    $('tab-bridge').setAttribute('aria-pressed', bridge); $('tab-taste').setAttribute('aria-pressed', !bridge);
  }
  window.PTA.showMode = showMode;
  $('tab-bridge').onclick = () => showMode('bridge');
  $('tab-taste').onclick = () => showMode('taste');
  // Hero entry points: jump to a side's idea field (switching back to the bridge mode if needed).
  document.querySelectorAll('[data-entry]').forEach(a => { a.onclick = e => {
    e.preventDefault(); if ($('dialectic').hidden) showMode('bridge');
    const f = $(a.dataset.entry); f.closest('fieldset').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); f.focus({ preventScroll: true });
  }; });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WAIT = ['Resolving both sides in Qloo…', 'Asking who loves the thesis…', 'Asking who loves the antithesis…', 'Re-ranking every pick against both sides…', 'Looking for the bridge…'];
  const side = k => ({ idea: $(`${k}-idea`).value.trim(), anchors: [...$(`${k}-anchors`).children].map(r => ({ name: r.querySelector('input').value.trim(), domain: r.querySelector('select').value })).filter(a => a.name) });

  $('dialectic').onsubmit = async e => {
    e.preventDefault();
    const body = { thesis: side('thesis'), antithesis: side('antithesis'), synthesis: $('synthesis').value.trim() };
    if (!body.thesis.idea || !body.antithesis.idea) { $('status').textContent = 'Name both ideas: a thesis and its opposite.'; return; }
    window.Room?.close(); last = null;
    $('go-bridge').disabled = true; $('try-example').disabled = true; $('bridge-reading').hidden = true; level(0);
    let w = 0; $('status').textContent = WAIT[0]; const tick = setInterval(() => { $('status').textContent = WAIT[++w % WAIT.length]; }, 1500);
    try {
      const data = await askOracle(body, () => { w = 0; $('status').textContent = 'The oracle is slow tonight. Asking once more…'; });
      clearInterval(tick); $('status').textContent = '';
      await render(data);
    } catch (err) { clearInterval(tick); $('status').textContent = err.message; }
    finally { $('go-bridge').disabled = false; $('try-example').disabled = false; }
  };

  const pct = x => (x ? Math.round(x * 100) : 0);
  function pick(i, cls = '') {
    const img = i.image ? `<img class="img" src="${esc(i.image)}" alt="" loading="lazy">` : '<div class="img"></div>';
    const meta = [i.domainLabel, i.who, i.year && i.year > 0 ? i.year : null].filter(Boolean).join(' · ');
    const bars = `<div class="bars" aria-label="Thesis ${pct(i.thesisAffinity)}, antithesis ${pct(i.antithesisAffinity)}"><span class="bar t" style="--v:${pct(i.thesisAffinity)}%"></span><span class="bar a" style="--v:${pct(i.antithesisAffinity)}%"></span></div>`;
    return `<div class="item ${cls}">${img}<div><div class="name">${esc(unent(i.name))}${i.mock ? ' <span class="mockflag">(stand-in)</span>' : ''}</div>
      <div class="meta">${esc(meta)}</div>${bars}<p class="plain">${esc(i.plain)}</p><p class="why">${esc(i.why)}</p></div></div>`;
  }
  function sideCard(label, s) {
    return `<small>${label} · loved by this side</small><h3>“${esc(s.idea)}”</h3>
      <p class="anchors">Anchored in ${esc(s.anchors.map(a => unent(a.name)).join(', '))}</p>
      <p class="lvl"><b>Soul</b> ${esc(s.soul.text)}</p><p class="lvl"><b>Intellect</b> ${esc(s.nous.text)}</p>
      <div class="picks">${s.picks.map(i => pick(i)).join('') || '<p class="fine">Qloo returned nothing here.</p>'}</div>`;
  }

  // The bridge room (room.js): one quiet entry point under the result; it opens a separate view of this synthesis.
  let last = null;
  $('step-in').onclick = e => window.Room?.open(last, e.currentTarget);

  async function render(d) {
    last = d;
    const standIn = d.mode.standIn;
    $('bmode').className = 'mode' + (standIn ? ' standin' : '');
    $('bmode').textContent = standIn ? `Stand-in data · not from Qloo${d.mode.why ? ` · ${d.mode.why}` : ''}` : `Qloo taste graph · live${d.mode.llm.startsWith('template') ? '' : ` · words by ${d.mode.llm}`}`;
    $('movement').innerHTML = `<span class="t">“${esc(d.thesis.idea)}”</span> <i>meets</i> <span class="a">“${esc(d.antithesis.idea)}”</span> <i>and becomes</i> <span class="s">“${esc(d.synthesis.text)}”</span>${d.synthesis.proposed ? ' <small>(proposed by the agent)</small>' : ''}`;
    $('understand').textContent = d.understand;
    $('about').textContent = d.aboutYou;
    $('bone').textContent = d.bridge.one.text;
    $('bpicks').innerHTML = d.bridge.picks.map(i => pick(i, 'both')).join('') || '<p class="fine">No common ground found. Try another anchor.</p>';
    $('tcard').innerHTML = sideCard('Thesis', d.thesis);
    $('acard').innerHTML = sideCard('Antithesis', d.antithesis);
    $('btrace').innerHTML = [...(d.notes || []), ...(d.trace || [])].map(t => `<li>${esc(t)}</li>`).join('');
    const cards = [$('tcard'), $('acard'), document.querySelector('.card.bridge')];
    cards.forEach(c => c.classList.remove('lit'));
    $('bridge-reading').hidden = false;
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    // Soul and Intellect of each side light first, then the bridge (the One) blooms.
    for (const [n, c] of cards.entries()) { c.classList.add('lit'); level(n + 1); await sleep(800 * fast); }
    if (!params.has('noscroll')) $('bridge-reading').scrollIntoView({ behavior: fast ? 'smooth' : 'auto', block: 'start' });
  }

  // "Try an example": one tap fills a pair that gives good live results (no anchors: Qloo reads the words) and runs it.
  const EXAMPLES = [['Rancid', 'Conway Twitty'], ['war', 'peace'], ['Interstellar', 'Pride and Prejudice']];
  let ex = 0;
  $('try-example').onclick = () => {
    if ($('go-bridge').disabled) return;
    const [t, a] = EXAMPLES[ex++ % EXAMPLES.length];
    for (const [k, v] of [['thesis', t], ['antithesis', a]]) {
      touched[k] = false; const idea = $(`${k}-idea`); idea.value = v;
      idea.dispatchEvent(new Event('input', { bubbles: true })); // anchors clear, placeholders say we'll look it up
    }
    $('synthesis').value = '';
    $('try-hint').textContent = `${t} vs ${a} · tap again for another`;
    $('dialectic').requestSubmit();
  };

  if (params.has('demo') && params.get('demo') !== 'taste') setTimeout(() => $('dialectic').requestSubmit(), 300);
})();
