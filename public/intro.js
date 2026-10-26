// First-visit intro: the Nous Forms at full weight, one line, "Enter the engine".
// Shown once (localStorage flag, if storage works); ?intro forces it; ?demo (either mode) skips it so demo links run at once
// (with ?intro&demo the demo simply runs underneath and is ready when the intro fades).
// Auto-fades after ~6.5s (the reveal is staggered over ~3.5s); a tap, click or key press skips it. Reduced motion: a still frame and a quick fade.
// window.Intro.play() replays it in place (the footer's "replay intro" link): no reload, inputs and results untouched.
(() => {
  const el = document.getElementById('intro'); if (!el) return;
  const q = new URLSearchParams(location.search), KEY = 'aufhebung.introSeen';
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  let anim = null, playing = false, timer = 0, cleanup = 0, opener = null;

  function dismiss() {
    if (!playing) return; playing = false; clearTimeout(timer);
    document.removeEventListener('keydown', dismiss); el.removeEventListener('click', dismiss);
    el.classList.add('leaving'); document.documentElement.classList.remove('intro-on');
    cleanup = setTimeout(() => { anim?.stop(); anim = null; el.hidden = true; el.classList.remove('leaving'); opener?.focus({ preventScroll: true }); opener = null; }, reduceQ.matches ? 300 : 1000);
  }
  function play(from) {
    if (playing) return; playing = true; clearTimeout(cleanup); anim?.stop(); anim = null; opener = from || null;
    try { localStorage.setItem(KEY, '1'); } catch {} // Safari private mode etc. may throw: then it just shows again next visit
    el.classList.remove('leaving'); el.hidden = false; document.documentElement.classList.add('intro-on');
    const c = document.getElementById('intro-forms');
    if (window.NousForms && c?.getContext) anim = window.NousForms.create(c, { bold: true, cyFrac: .4 });
    // listeners are attached on the next tick so the click/keypress that opened a replay doesn't instantly close it
    setTimeout(() => { if (!playing) return; el.addEventListener('click', dismiss); document.addEventListener('keydown', dismiss); }, 0);
    timer = setTimeout(dismiss, reduceQ.matches ? 3000 : 6500);
    if (from && from.dataset.kbd === '1') document.getElementById('intro-enter')?.focus({ preventScroll: true }); // keyboard replays only: no stray focus ring for taps
  }
  window.Intro = { play };

  const wire = () => document.getElementById('replay-intro')?.addEventListener('click', e => { e.preventDefault(); e.currentTarget.dataset.kbd = e.detail === 0 ? '1' : ''; play(e.currentTarget); });
  let seen = false; try { seen = localStorage.getItem(KEY) === '1'; } catch {}
  const show = q.has('intro') || (!seen && !q.has('demo'));
  if (show) { el.hidden = false; document.documentElement.classList.add('intro-on'); } // cover the page before first paint
  const begin = () => { wire(); if (show) { playing = false; play(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
