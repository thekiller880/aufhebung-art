// Background stage: a slow rose window, receding gothic arches, motes, and three nested halos
// (Soul rose, Nous gold, the One white) that wake as the reading descends... or rather, ascends.
(() => {
  const C = document.getElementById('stage'), X = C.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr; const lit = [0, 0, 0], want = [0, 0, 0];
  window.Stage = { setLevel(n) { for (let i = 0; i < 3; i++) want[i] = n > i ? 1 : 0; } };
  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; C.width = W * dpr; C.height = H * dpr; X.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', size); size();
  const motes = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .3, v: Math.random() * .00025 + .00005, p: Math.random() * 6 }));
  const glow = (x, y, r, c, a) => { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); };
  function rose(x, y, r, t) {
    X.save(); X.translate(x, y); X.rotate(t * .03); X.lineWidth = 1;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; X.strokeStyle = i % 2 ? 'rgba(198,161,91,.22)' : 'rgba(154,48,72,.26)';
      X.beginPath(); X.arc(0, 0, r * .78, a, a + Math.PI / 16); X.stroke(); X.beginPath(); X.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2); X.lineTo(Math.cos(a) * r, Math.sin(a) * r); X.stroke();
      X.beginPath(); X.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .17, 0, 7); X.stroke(); }
    X.strokeStyle = 'rgba(232,214,176,.2)'; X.beginPath(); X.arc(0, 0, r, 0, 7); X.stroke(); X.restore();
  }
  function arch(cx, base, w, h, a) {
    X.strokeStyle = `rgba(198,161,91,${a})`; X.lineWidth = 1; X.beginPath();
    X.moveTo(cx - w, base); X.lineTo(cx - w, base - h * .6); X.quadraticCurveTo(cx - w, base - h * .95, cx, base - h);
    X.quadraticCurveTo(cx + w, base - h * .95, cx + w, base - h * .6); X.lineTo(cx + w, base); X.stroke();
  }
  function frame(ms) {
    const t = ms / 1000, cx = W / 2, cy = H * .3;
    const bg = X.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .9);
    bg.addColorStop(0, '#1d0f16'); bg.addColorStop(.5, '#0c0509'); bg.addColorStop(1, '#070308'); X.fillStyle = bg; X.fillRect(0, 0, W, H);
    const R = Math.min(W, H) * .42;
    rose(cx, cy, R, reduce ? 0 : t);
    for (let i = 0; i < 7; i++) { const k = ((i + (reduce ? 0 : t * .04)) % 7) / 7, s = .25 + k * 1.4; arch(cx, H * (.55 + k * .5), R * s * .55, R * s * 1.2, .16 * Math.sin(Math.PI * k)); }
    for (let i = 0; i < 3; i++) lit[i] += (want[i] - lit[i]) * .02;
    X.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(t * 1.3) * .06;
    glow(cx, cy, R * 1.25 * pulse, '154,48,72', .05 + .16 * lit[0]);  // Soul
    glow(cx, cy, R * .8 * pulse, '198,161,91', .03 + .2 * lit[1]);    // Nous
    glow(cx, cy, R * .3 * pulse, '255,246,225', .12 + .7 * lit[2]);   // the One
    X.strokeStyle = `rgba(255,240,200,${.05 + .15 * lit[2]})`;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * .02, L = R * (.45 + .25 * Math.sin(t * .7 + i * 1.7)) * (.6 + lit[2] * .6);
      X.beginPath(); X.moveTo(cx + Math.cos(a) * R * .08, cy + Math.sin(a) * R * .08); X.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); X.stroke(); }
    for (const m of motes) { if (!reduce) m.y -= m.v; if (m.y < 0) m.y = 1; const a = .25 + .25 * Math.sin(t + m.p);
      X.fillStyle = `rgba(243,237,226,${a * .5})`; X.beginPath(); X.arc(m.x * W, m.y * H, m.r, 0, 7); X.fill(); }
    X.globalCompositeOperation = 'source-over';
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (reduce) setInterval(() => requestAnimationFrame(frame), 400);
})();
