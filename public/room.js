// The bridge room: an opt-in, separate view of one synthesis ("Step into the bridge" under a bridge result).
// The main reading is untouched. In here, staying deepens it in three gentle stages, timed only while the room is
// open and the tab is visible (leaving resets it; a hidden tab pauses it and eases it back a little):
//   ~8s   the two sides' Forms drift toward each other; the drone gains its fifth and octave
//   ~18s  their colours start to share, the shapes turn into their duals; the drone gains the major third; the One's words appear
//   ~30s  one shared gold, a soft glow and a small shared Form where they meet; the full chord
// Sound only plays if the drone is already on (the room's own Soft drone button is the same toggle). Reduced motion: no
// movement, the colour and glow simply fade between stages. ?linger=10 speeds the clock up 10x (for testing).
(() => {
  const el = document.getElementById('room'); if (!el) return;
  const $ = id => document.getElementById(id);
  const C = $('room-forms'), X = C.getContext('2d');
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED = Math.max(1, Math.min(60, Number(new URLSearchParams(location.search).get('linger')) || 1));
  const STAGES = [8, 18, 30]; // seconds of lingering
  const ROSE = [232, 140, 160], GOLD = [226, 192, 120], ONE = [255, 232, 190];
  let open = false, raf = 0, last = 0, linger = 0, vis = 0, stage = 0, hiddenAt = 0, opener = null, W, H, dpr;
  const S = () => window.NousForms?.SOLIDS;
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',');
  const ease = x => x * x * (3 - 2 * x);
  const drone = () => window.PTA?.drone;

  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; C.width = W * dpr; C.height = H * dpr; X.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function solid(Sd, x, y, s, t, col, a) {
    if (a <= .005) return;
    const ca = Math.cos(t), sa = Math.sin(t), cb = Math.cos(t * .7), sb = Math.sin(t * .7);
    X.strokeStyle = `rgba(${col},${a})`; X.beginPath();
    const p = Sd.v.map(([vx, vy, vz]) => { const x1 = vx * ca - vz * sa, z1 = vx * sa + vz * ca, y1 = vy * cb - z1 * sb; return [x + x1 * s, y + y1 * s]; });
    for (const [i, j] of Sd.e) { X.moveTo(p[i][0], p[i][1]); X.lineTo(p[j][0], p[j][1]); }
    X.stroke();
  }
  function glow(x, y, r, c, a) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); }

  function draw(t) {
    const sol = S(); if (!sol) return;
    const still = reduceQ.matches, v = vis; // v: 0..1 smoothed depth
    const near = still ? 0 : ease(Math.min(1, v * 1.4)), blend = ease(Math.max(0, (v - .35) / .65)), bloom = ease(Math.max(0, (v - .7) / .3));
    if (still) t = 4;
    X.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * (W < 640 ? .3 : .33), R = Math.min(W * .5, H * .38);
    const gap = R * (.62 - .4 * near), s = R * (.28 + .06 * near);
    // faint guides: two circles (one per side) that slowly become one
    X.lineWidth = 1;
    for (const k of [-1, 1]) { X.strokeStyle = `rgba(${mix(k < 0 ? ROSE : GOLD, ONE, blend)},${.08 + .05 * blend})`; X.beginPath(); X.arc(cx + k * gap, cy, s * 1.5, 0, 7); X.stroke(); }
    X.globalCompositeOperation = 'lighter';
    const pulse = 1 + (still ? 0 : Math.sin(t * .7) * .05);
    glow(cx, cy, R * (.35 + .5 * bloom) * pulse, '255,232,190', .04 + .22 * bloom);
    const tc = mix(ROSE, ONE, blend * .85), ac = mix(GOLD, ONE, blend * .85), spin = 1 - .5 * near;
    X.lineWidth = 1.6;
    // thesis: tetrahedron turning into an icosahedron; antithesis: cube into its dodecahedron (the cube sits inside it)
    solid(sol[0], cx - gap, cy, s, t * .3 * spin, tc, .75 * (1 - blend));
    solid(sol[3], cx - gap, cy, s * .9, t * .3 * spin, tc, .75 * blend);
    solid(sol[2], cx + gap, cy, s * .75, -t * .26 * spin, ac, .75 * (1 - blend * .6));
    solid(sol[4], cx + gap, cy, s, -t * .26 * spin, ac, .7 * blend);
    // where they meet: a small shared Form that only appears at the last stage
    X.lineWidth = 1.2; solid(sol[4], cx, cy, s * .55 * pulse, t * .12, '255,240,210', .55 * bloom); solid(sol[3], cx, cy, s * .36, -t * .16, '255,226,160', .6 * bloom);
    X.globalCompositeOperation = 'source-over';
  }
  function tick(ms) {
    if (!open) return; raf = requestAnimationFrame(tick);
    if (!last) { last = ms; draw(ms / 1000); return; }
    const dt = Math.min(.25, (ms - last) / 1000);
    if (!reduceQ.matches && dt < .03) return; // ~30fps
    last = ms;
    linger += dt * SPEED;
    const target = Math.min(1, linger / STAGES[2]);
    vis += (target - vis) * Math.min(1, dt * (reduceQ.matches ? 3 : .8));
    const n = STAGES.filter(s => linger >= s).length;
    if (n !== stage) setStage(n);
    draw(ms / 1000);
  }
  function setStage(n) {
    stage = n; el.dataset.stage = n;
    drone()?.deepen(n);
  }
  function start() { cancelAnimationFrame(raf); last = 0; if (open && !document.hidden) raf = requestAnimationFrame(tick); }

  function show(d, from) {
    if (!d) return;
    opener = from || null;
    $('room-t').textContent = `“${d.thesis.idea}”`; $('room-a').textContent = `“${d.antithesis.idea}”`; $('room-s').textContent = `“${d.synthesis.text}”`;
    $('room-one').textContent = d.bridge?.one?.text || '';
    linger = 0; vis = 0; setStage(0); open = true;
    el.hidden = false; document.documentElement.classList.add('room-on');
    size(); start();
    if (history.state?.room !== 1) history.pushState({ room: 1 }, '');
    $('room-back').focus({ preventScroll: true });
  }
  function hide(fromPop) {
    if (!open) return; open = false; cancelAnimationFrame(raf);
    setStage(0); el.hidden = true; document.documentElement.classList.remove('room-on');
    if (!fromPop && history.state?.room === 1) history.back();
    opener?.focus({ preventScroll: true }); opener = null;
  }
  window.Room = { open: show, close: () => hide(false), get stage() { return stage; } };

  $('room-back').addEventListener('click', () => hide(false));
  addEventListener('popstate', () => { if (open) hide(true); });
  document.addEventListener('keydown', e => { if (open && e.key === 'Escape') hide(false); });
  addEventListener('resize', () => { if (open) { size(); draw(performance.now() / 1000); } });
  document.addEventListener('visibilitychange', () => {
    if (!open) return;
    if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(raf); return; }
    // ease back by the time spent away (it never jumps), then carry on from there
    linger = Math.max(0, linger - (performance.now() - hiddenAt) / 1000 * SPEED);
    const n = STAGES.filter(s => linger >= s).length; if (n !== stage) setStage(n);
    start();
  });
})();
