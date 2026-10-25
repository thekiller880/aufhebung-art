// Soft drone in the voice of Michael's Plotinus chamber (55 Hz sines through a lowpass),
// layered by hypostasis: Soul (low, beating, tremulous), Nous (fifth + octave, filter opens), the One (high pure shimmer).
window.Drone = class {
  constructor() { this.level = 0; this.on = false; }
  init() {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    const c = this.c = new A();
    this.master = c.createGain(); this.master.gain.value = 0;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 220; this.lp.Q.value = 0.7;
    this.master.connect(this.lp); this.lp.connect(c.destination);
    const voice = (hz, v, type = 'sine') => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = hz; g.gain.value = v; o.connect(g); o.start(); return { o, g }; };
    const bus = v => { const g = c.createGain(); g.gain.value = v; g.connect(this.master); return g; };
    // Ground (Nature/matter), always on.
    this.ground = bus(1); for (const [hz, v] of [[55, .5], [55.35, .3]]) voice(hz, v).g.connect(this.ground);
    // Soul: a fourth and a slow tremolo, the many in motion.
    this.soul = bus(0); for (const [hz, v] of [[73.42, .22], [82.41, .14]]) voice(hz, v).g.connect(this.soul);
    const trem = c.createOscillator(), tg = c.createGain(); trem.frequency.value = .17; tg.gain.value = .5; trem.connect(tg); tg.connect(this.soul.gain); trem.start();
    // Nous: octave and fifth above, steady, the Forms at rest.
    this.nous = bus(0); for (const [hz, v] of [[110, .16], [164.81, .09], [220, .05]]) voice(hz, v).g.connect(this.nous);
    // The One: a high pure tone with a very slow vibrato, barely there.
    this.one = bus(0); const hi = voice(440, .025); hi.g.connect(this.one); voice(660.5, .012).g.connect(this.one);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = .07; vg.gain.value = 1.6; vib.connect(vg); vg.connect(hi.o.frequency); vib.start();
    return true;
  }
  set(on) {
    this.on = on;
    if (!on) { if (this.master) this.master.gain.setTargetAtTime(0, this.c.currentTime, .6); return; }
    if (!this.c && !this.init()) return;
    this.c.resume(); this.master.gain.setTargetAtTime(.09, this.c.currentTime, 1.2); this.setLevel(this.level);
  }
  /** 0 = matter only, 1 = Soul, 2 = Nous, 3 = the One */
  setLevel(n) {
    this.level = n; if (!this.c) return; const t = this.c.currentTime;
    this.soul.gain.setTargetAtTime(n >= 1 ? .9 : 0, t, 1.5);
    this.nous.gain.setTargetAtTime(n >= 2 ? 1 : 0, t, 2);
    this.one.gain.setTargetAtTime(n >= 3 ? 1 : 0, t, 3);
    this.lp.frequency.setTargetAtTime([220, 320, 650, 1400][n] || 220, t, 2);
  }
};
