// Wireframe Platonic solids (the Forms of the Nous) slowly turning and orbiting a glowing central solid,
// with faint concentric rings. One renderer, two uses:
//   - the subtle page background (#nous-forms): decorative, pointer-events none, sits under the UI;
//   - the bold first-visit intro (intro.js): bigger, brighter, more solids, a stronger central glow.
// ~30fps, paused while the tab is hidden, a single still frame under prefers-reduced-motion.
(() => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const SOLIDS = [
    [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],                                                    // tetrahedron
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],                                 // octahedron
    [[-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]],  // cube
    [[0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi], [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0], [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]], // icosahedron
    (() => { const v = [], q = 1 / phi; for (const a of [-1, 1]) for (const b of [-1, 1]) { for (const c of [-1, 1]) v.push([a, b, c]); v.push([0, a * q, b * phi], [a * q, b * phi, 0], [a * phi, 0, b * q]); } return v; })(), // dodecahedron
  ].map(v => { // normalise to the unit sphere, edges = closest vertex pairs
    const n = v.map(p => { const l = Math.hypot(...p); return p.map(c => c / l); }), d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    let m = 9; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) m = Math.min(m, d(n[i], n[j]));
    const e = []; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (d(n[i], n[j]) < m * 1.01) e.push([i, j]);
    return { v: n, e };
  });
  const COLORS = ['232,140,160', '226,192,120', '196,176,240']; // rose, gold, lavender
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');

  // opts: bold (intro look), cyFrac (vertical centre as a fraction of height)
  function create(C, { bold = false, cyFrac = .3 } = {}) {
    const X = C.getContext('2d');
    const k = bold ? { ring: .16, solidA: .55, solidAdd: .4, glow: .32, coreA: .85, size: 1.35, line: 1.5, rings: 6, R: .5 } :
                     { ring: .09, solidA: .22, solidAdd: .2, glow: .12, coreA: .42, size: 1, line: 1, rings: 4, R: .42 };
    if (!bold && innerWidth < 640) Object.assign(k, { solidA: .4, solidAdd: .35, ring: .12, coreA: .6, line: 1.2, size: 1.5 }); // phones: thin faint lines vanish on small, bright screens
    let W, H, cx, cy, R, Rx, vy, orbiters = [], raf = 0, last = 0, alive = true;

    let size = function () {
      const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      C.width = W * dpr; C.height = H * dpr; X.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H * cyFrac; R = bold ? Math.min(W * .66, H * .6) : Math.min(W, H * 1.2) * k.R; // intro: fill a phone's width too
      // Orbits must stay on screen: the outer ring (1.15) is held inside ~92% of the width, and on a tall portrait
      // phone the orbits open up vertically instead, so the Forms fill the screen rather than sliding off its sides.
      Rx = Math.min(R, W * .4); vy = Math.min(2, Math.max(1, (H / W) * .9));
      const small = W < 640, n = bold ? (small ? 10 : 16) : (small ? 6 : 11); // fewer solids on phones
      orbiters = Array.from({ length: n }, (_, i) => ({
        s: SOLIDS[i % 5], col: COLORS[i % 3], ring: .55 + (i % 3) * .3, a0: i / n * Math.PI * 2 + (i % 3), speed: (.05 + (i % 4) * .015) * (i % 2 ? 1 : -1) * (bold ? 1.6 : 1),
        spin: .25 + (i % 5) * .07, size: ((small ? .085 : .07) + (i % 4) * .012) * k.size, tilt: .35 + (i % 3) * .08,
      }));
    };

    function solid(S, x, y, s, t, col, a) {
      const ca = Math.cos(t), sa = Math.sin(t), cb = Math.cos(t * .7), sb = Math.sin(t * .7);
      X.strokeStyle = `rgba(${col},${a})`; X.beginPath();
      const p = S.v.map(([vx, vy, vz]) => { const x1 = vx * ca - vz * sa, z1 = vx * sa + vz * ca, y1 = vy * cb - z1 * sb; return [x + x1 * s, y + y1 * s]; });
      for (const [i, j] of S.e) { X.moveTo(p[i][0], p[i][1]); X.lineTo(p[j][0], p[j][1]); }
      X.stroke();
    }
    function glow(x, y, r, c, a) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); }

    let frame = function (t) {
      X.clearRect(0, 0, W, H); X.lineWidth = k.line;
      // faint concentric rings (tilted into ellipses, like orbits seen from slightly above)
      for (let i = 0; i < k.rings; i++) { X.strokeStyle = `rgba(226,192,120,${Math.max(.02, k.ring - i * .015)})`; X.beginPath(); X.ellipse(cx, cy, Rx * (.55 + i * .3), Rx * (.55 + i * .3) * .42 * vy, 0, 0, 7); X.stroke(); }
      X.strokeStyle = `rgba(196,176,240,${k.ring * .8})`; X.beginPath(); X.arc(cx, cy, R * .38, 0, 7); X.stroke();
      // the glowing centre: icosahedron inside its dual dodecahedron
      X.globalCompositeOperation = 'lighter';
      const pulse = 1 + Math.sin(t * .9) * .08;
      glow(cx, cy, R * .5 * pulse, '255,232,190', k.glow);
      if (bold) glow(cx, cy, R * .09 * pulse, '255,250,236', .9);
      solid(SOLIDS[4], cx, cy, R * .24, t * .2, '255,236,200', k.coreA);
      solid(SOLIDS[3], cx, cy, R * .15, -t * .27, '232,140,160', k.coreA * .9);
      // orbiting Forms, far side drawn first and dimmer
      const pos = orbiters.map(o => { const a = o.a0 + t * o.speed, r = Rx * o.ring; return { o, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * o.tilt * vy, z: Math.sin(a) }; }).sort((p, q) => p.z - q.z);
      for (const { o, x, y, z } of pos) { const d = .75 + .25 * z; solid(o.s, x, y, R * o.size * d, t * o.spin + o.a0, o.col, k.solidA + k.solidAdd * (z + 1) / 2); }
      X.globalCompositeOperation = 'source-over';
    };

    // ---- intro scene (bold): a radiant sun at the centre, the Forms nested and clustered around it ----
    // gold icosahedron with a white-gold starburst inside; small octa/tetra/cubes spiral out from it in rings;
    // larger rose/coral dodeca/icosahedra orbit farther out; faint circle guides behind; drifting motes for depth.
    let B = null;
    function sizeBold() {
      const small = W < 640;
      const Rb = small ? Math.min(W * .47, H * .3) : Math.min(W * .3, H * .36);
      const sy = small ? .78 : .46; // orbit ellipse flattening (portrait phones open up vertically)
      const inner = [];
      const rings = small ? [[.42, 5], [.62, 7]] : [[.4, 6], [.6, 8], [.78, 10]];
      rings.forEach(([r, n], ri) => { for (let i = 0; i < n; i++) inner.push({ s: SOLIDS[[1, 0, 2][(i + ri) % 3]], r, a0: i / n * Math.PI * 2 + ri * .55, sp: (.16 - ri * .035) * (ri % 2 ? -1 : 1), size: .06 - ri * .006 + (i % 2) * .008, spin: .5 + (i % 3) * .15, col: ['255,224,150', '255,240,205', '240,200,120'][i % 3] }); });
      const nOut = small ? 5 : 7, outer = Array.from({ length: nOut }, (_, i) => ({ s: SOLIDS[i % 2 ? 3 : 4], r: (small ? .9 : 1.02) + (i % 2) * .12, a0: i / nOut * Math.PI * 2 + .3, sp: .05 * (i % 2 ? 1 : -1) + .02, size: (small ? .13 : .12) + (i % 3) * .02, spin: .18 + (i % 3) * .05, col: ['242,150,140', '236,128,156', '250,176,150'][i % 3] }));
      const motes = Array.from({ length: small ? 40 : 80 }, (_, i) => ({ a: Math.random() * 7, r: .15 + Math.random() * 1.4, v: (.02 + Math.random() * .05) * (i % 2 ? 1 : -1), tw: Math.random() * 7 }));
      // the sun's halo and rays never change shape, so they are painted once into sprites (cheap per frame on phones)
      const sprite = (r, paint) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2); const g = c.getContext('2d'); g.translate(r, r); paint(g, r); return c; };
      const grad = (g, r, stops) => { const q = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, c] of stops) q.addColorStop(o, c); g.fillStyle = q; g.fillRect(-r, -r, 2 * r, 2 * r); };
      const haloR = Rb * 1.8, halo = sprite(haloR, (g, r) => {
        g.globalCompositeOperation = 'lighter';
        grad(g, r, [[0, 'rgba(255,200,120,.24)'], [1, 'rgba(255,200,120,0)']]);
        grad(g, r * .7 / 1.8, [[0, 'rgba(255,220,150,.5)'], [1, 'rgba(255,220,150,0)']]);
        grad(g, r * .24 / 1.8, [[0, 'rgba(255,244,214,.9)'], [1, 'rgba(255,244,214,0)']]);
        grad(g, r * .09 / 1.8, [[0, 'rgba(255,255,250,1)'], [1, 'rgba(255,255,250,0)']]);
      });
      const raysR = Rb * 1.25, rays = sprite(raysR, (g, r) => {
        const q = g.createRadialGradient(0, 0, Rb * .05, 0, 0, Rb * 1.15);
        q.addColorStop(0, 'rgba(255,246,220,.55)'); q.addColorStop(.35, 'rgba(255,220,150,.22)'); q.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = q; g.beginPath(); const nr = 36;
        for (let i = 0; i < nr; i++) { const a = i / nr * Math.PI * 2, L = Rb * (i % 2 ? .62 : 1.15) * (i % 3 === 0 ? 1 : .85), w = (i % 2 ? .018 : .03); g.moveTo(Math.cos(a - w) * Rb * .06, Math.sin(a - w) * Rb * .06); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + w) * Rb * .06, Math.sin(a + w) * Rb * .06); }
        g.fill();
      });
      B = { Rb, sy, inner, outer, motes, halo, haloR, rays, raysR };
      C.parentElement?.style.setProperty('--nous-y', `${Math.round(cy + Rb * (small ? .36 : .32))}px`);
    }
    function frameBold(t) {
      const { Rb, sy } = B; X.clearRect(0, 0, W, H);
      const pulse = 1 + Math.sin(t * .9) * .07, breathe = .5 + .5 * Math.sin(t * .6);
      // faint circle guides: concentric circles + a six-petal ring of circles (sacred geometry), slowly turning
      X.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { X.strokeStyle = `rgba(226,192,120,${.12 - i * .018})`; X.beginPath(); X.arc(cx, cy, Rb * (.28 + i * .26), 0, 7); X.stroke(); }
      X.strokeStyle = 'rgba(226,192,120,.07)'; X.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t * .02; X.moveTo(cx + Math.cos(a) * Rb * .5 + Rb * .5, cy + Math.sin(a) * Rb * .5); X.arc(cx + Math.cos(a) * Rb * .5, cy + Math.sin(a) * Rb * .5, Rb * .5, 0, 7); }
      X.stroke();
      X.globalCompositeOperation = 'lighter';
      // the sun: wide halo, warm body, hot white core (sprite, breathing), and slowly turning rays
      const hs = B.haloR * pulse; X.globalAlpha = .85 + .15 * breathe; X.drawImage(B.halo, cx - hs, cy - hs, hs * 2, hs * 2);
      X.globalAlpha = 1; X.save(); X.translate(cx, cy); X.rotate(t * .05); X.scale(pulse, pulse); X.drawImage(B.rays, -B.raysR, -B.raysR); X.restore();
      // orbiting Forms, far side first (dimmer, smaller): depth
      const place = (o, k) => { const a = o.a0 + t * o.sp, r = Rb * o.r, z = Math.sin(a); return { o, k, x: cx + Math.cos(a) * r, y: cy + z * r * sy, z: Math.cos(a + 1.2) }; };
      const all = [...B.outer.map(o => place(o, 'out')), ...B.inner.map(o => place(o, 'in'))].sort((p, q) => p.z - q.z);
      const drawSet = front => { for (const { o, k: kind, x, y, z } of all) { if ((z > 0) !== front) continue; const d = .78 + .22 * z, a = (kind === 'out' ? .5 : .62) + .3 * (z + 1) / 2; X.lineWidth = kind === 'out' ? 1.6 : 1.3; solid(o.s, x, y, Rb * o.size * 2 * d, t * o.spin + o.a0, o.col, a); } };
      drawSet(false);
      // the central Form: gold icosahedron in its faint dual dodecahedron, a white-gold starburst inside
      X.lineWidth = 1.2; solid(SOLIDS[4], cx, cy, Rb * .34, -t * .12, '255,226,160', .38);
      X.lineWidth = 2.2; solid(SOLIDS[3], cx, cy, Rb * .24, t * .18, '255,214,130', .95);
      X.lineWidth = 1; solid(SOLIDS[3], cx, cy, Rb * .24, t * .18, '255,250,235', .5);
      X.strokeStyle = `rgba(255,252,240,${.75 + .25 * breathe})`; X.lineWidth = 1.4; X.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - t * .15, L = Rb * (i % 2 ? .1 : .19) * pulse; X.moveTo(cx, cy); X.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); }
      X.stroke();
      drawSet(true);
      // motes of light drifting round the sun
      for (const m of B.motes) { const a = m.a + t * m.v, r = Rb * m.r, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * sy, tw = .35 + .65 * Math.abs(Math.sin(t * 1.3 + m.tw)); X.fillStyle = `rgba(255,236,190,${.55 * tw})`; X.fillRect(x - 1, y - 1, 2, 2); }
      X.globalCompositeOperation = 'source-over';
    }
    if (bold) { const s0 = size; size = () => { s0(); sizeBold(); }; frame = frameBold; }

    const loop = ms => { if (!alive) return; raf = requestAnimationFrame(loop); if (ms - last < 33) return; last = ms; frame(ms / 1000); }; // ~30fps is plenty for slow motion
    const start = () => { cancelAnimationFrame(raf); raf = 0; if (!alive) return; if (reduceQ.matches) frame(4); else if (!document.hidden) raf = requestAnimationFrame(loop); };
    const onResize = () => { size(); start(); };
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); };
    addEventListener('resize', onResize); document.addEventListener('visibilitychange', onVis); reduceQ.addEventListener?.('change', start);
    size(); start();
    return { stop() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); reduceQ.removeEventListener?.('change', start); } };
  }

  window.NousForms = { create };
  const bg = document.getElementById('nous-forms');
  if (bg && bg.getContext) create(bg);
})();
