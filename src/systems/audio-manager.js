// audio-manager: SFX & BGM disintesis pakai Web Audio API, tanpa file audio.
const THREE = AFRAME.THREE;

const SCALE = [0, 3, 5, 7, 10]; // pentatonis minor
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

AFRAME.registerSystem('audio-manager', {
  init() {
    this.ctx = null;
    this.muted = false;
    this.musicMode = 'off';
    this.loops = new Set();
    this._fwd = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    // AudioContext butuh interaksi user dulu
    const unlock = () => this.unlock();
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
  },

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.8;
      this.sfx.connect(this.master);
      this.music = ctx.createGain();
      this.music.gain.value = 0.22;
      this.music.connect(this.master);
      // buffer white noise 1 detik
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._startSequencer();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    this.el.emit('mute-changed', { muted: this.muted });
    return this.muted;
  },

  // listener ikut kamera
  tick() {
    if (!this.ctx || !this.el.camera) return;
    const cam = this.el.camera;
    cam.getWorldPosition(this._pos);
    cam.getWorldQuaternion(this._q);
    this._fwd.set(0, 0, -1).applyQuaternion(this._q);
    this._up.set(0, 1, 0).applyQuaternion(this._q);
    const L = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(this._pos.x, t, 0.02);
      L.positionY.setTargetAtTime(this._pos.y, t, 0.02);
      L.positionZ.setTargetAtTime(this._pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(this._fwd.x, t, 0.02);
      L.forwardY.setTargetAtTime(this._fwd.y, t, 0.02);
      L.forwardZ.setTargetAtTime(this._fwd.z, t, 0.02);
      L.upX.setTargetAtTime(this._up.x, t, 0.02);
      L.upY.setTargetAtTime(this._up.y, t, 0.02);
      L.upZ.setTargetAtTime(this._up.z, t, 0.02);
    } else if (L.setPosition) {
      L.setPosition(this._pos.x, this._pos.y, this._pos.z);
      L.setOrientation(this._fwd.x, this._fwd.y, this._fwd.z, this._up.x, this._up.y, this._up.z);
    }
  },

  // util node

  _panner(position) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2.5;
    p.maxDistance = 70;
    p.rolloffFactor = 1.1;
    this._setPannerPos(p, position);
    p.connect(this.sfx);
    return p;
  },
  _setPannerPos(p, v) {
    if (p.positionX) {
      p.positionX.value = v.x;
      p.positionY.value = v.y;
      p.positionZ.value = v.z;
    } else p.setPosition(v.x, v.y, v.z);
  },
  _env(gainNode, t, attack, peak, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },
  _osc(type, freq, t, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  },
  _noise(t, dur, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(dest);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    return s;
  },

  // opts.position -> suara 3D
  play(name, opts = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const out = opts.position ? this._panner(opts.position) : this.sfx;
    const v = opts.volume !== undefined ? opts.volume : 1;
    const g = ctx.createGain();
    g.connect(out);
    const fn = SFX[name];
    if (fn) fn.call(this, ctx, g, t, v, opts);
  },

  // suara loop (dengung kumbang)
  startLoop(name, position) {
    if (!this.ctx || this.ctx.state !== 'running') return null;
    const ctx = this.ctx;
    const panner = this._panner(position);
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.2);
    g.connect(panner);
    const nodes = [];
    if (name === 'buzz') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 150 + Math.random() * 40;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 28;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.5;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      lfo.connect(lfoGain).connect(am.gain);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 600;
      f.Q.value = 1.2;
      o.connect(am).connect(f).connect(g);
      o.start();
      lfo.start();
      nodes.push(o, lfo);
    }
    const handle = {
      setPosition: (v) => this._setPannerPos(panner, v),
      stop: () => {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0.0001, t, 0.05);
        nodes.forEach((n) => n.stop(t + 0.3));
        setTimeout(() => panner.disconnect(), 400);
        this.loops.delete(handle);
      }
    };
    this.loops.add(handle);
    return handle;
  },

  stopAllLoops() {
    [...this.loops].forEach((h) => h.stop());
  },

  // BGM

  setMusic(mode) {
    this.musicMode = mode;
  },

  _startSequencer() {
    const ctx = this.ctx;
    const bpm = 112;
    this.stepDur = 60 / bpm / 4; // 1/16 not
    this.nextStep = ctx.currentTime + 0.1;
    this.step = 0;
    this._newMelody();
    setInterval(() => {
      if (ctx.state !== 'running') return;
      while (this.nextStep < ctx.currentTime + 0.12) {
        this._scheduleStep(this.step, this.nextStep);
        this.nextStep += this.stepDur;
        this.step = (this.step + 1) % 64;
        if (this.step === 0) this._newMelody();
      }
    }, 30);
  },

  _newMelody() {
    // pola saron, ganti tiap 4 bar
    this.melody = [];
    let idx = 2;
    for (let i = 0; i < 16; i++) {
      if (Math.random() < 0.7) {
        idx = Math.max(0, Math.min(9, idx + Math.floor(Math.random() * 5) - 2));
        this.melody.push(idx);
      } else this.melody.push(-1);
    }
    this.bassRoot = [0, 0, 3, 4][Math.floor(Math.random() * 4)];
  },

  _note(idx, base) {
    const oct = Math.floor(idx / 5);
    return midi(base + SCALE[idx % 5] + 12 * oct);
  },

  _scheduleStep(step, t) {
    const mode = this.musicMode;
    if (mode === 'off') return;
    const s16 = step % 16;
    const ctx = this.ctx;
    const dest = this.music;

    // bonang/saron
    const mi = this.melody[step % 16];
    const playBell = mode === 'game' ? s16 % 2 === 0 : s16 % 4 === 0;
    if (mi >= 0 && playBell) {
      const f = this._note(mi, 62);
      const g = ctx.createGain();
      g.connect(dest);
      this._env(g, t, 0.005, mode === 'game' ? 0.18 : 0.22, mode === 'game' ? 0.5 : 1.4);
      this._osc('sine', f, t, 1.5, g);
      const g2 = ctx.createGain();
      g2.connect(dest);
      this._env(g2, t, 0.003, 0.06, 0.25);
      this._osc('sine', f * 2.76, t, 0.4, g2);
    }

    // gong tiap 4 bar
    if (step === 0) {
      const g = ctx.createGain();
      g.connect(dest);
      this._env(g, t, 0.02, 0.35, 3.5);
      const o = this._osc('sine', midi(38), t, 3.6, g);
      o.frequency.linearRampToValueAtTime(midi(38) * 0.98, t + 3.5);
      this._osc('sine', midi(38) * 1.5, t, 3.6, g);
    }

    if (mode !== 'game') return;

    // bass
    if ([0, 3, 6, 10, 12].includes(s16)) {
      const g = ctx.createGain();
      g.connect(dest);
      this._env(g, t, 0.01, 0.35, 0.22);
      const idx = this.bassRoot + (s16 === 6 ? 2 : s16 === 12 ? 1 : 0);
      this._osc('triangle', this._note(idx, 38), t, 0.3, g);
    }
    // kick
    if (s16 === 0 || s16 === 8 || s16 === 11) {
      const g = ctx.createGain();
      g.connect(dest);
      this._env(g, t, 0.002, 0.8, 0.18);
      const o = this._osc('sine', 140, t, 0.2, g);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    }
    // snare
    if (s16 === 4 || s16 === 12) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      const g = ctx.createGain();
      f.connect(g).connect(dest);
      this._env(g, t, 0.002, 0.35, 0.12);
      this._noise(t, 0.15, f);
    }
    // hi-hat
    if (s16 % 2 === 1) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = ctx.createGain();
      f.connect(g).connect(dest);
      this._env(g, t, 0.001, 0.08, 0.04);
      this._noise(t, 0.05, f);
    }
  }
});

// resep SFX (this = sistem audio)
const SFX = {
  shoot(ctx, g, t, v) {
    // tembakan
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4000, t);
    f.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    const ng = ctx.createGain();
    f.connect(ng).connect(g);
    this._env(ng, t, 0.002, 0.7 * v, 0.12);
    this._noise(t, 0.15, f);
    const tg = ctx.createGain();
    tg.connect(g);
    this._env(tg, t, 0.002, 0.6 * v, 0.1);
    const o = this._osc('sine', 180, t, 0.12, tg);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    g.gain.value = 1;
  },
  empty(ctx, g, t, v) {
    this._env(g, t, 0.001, 0.4 * v, 0.03);
    this._osc('square', 1800, t, 0.04, g);
  },
  reload(ctx, g, t, v) {
    [0, 0.18, 0.75, 0.95].forEach((dt, i) => {
      const gg = ctx.createGain();
      gg.connect(g);
      this._env(gg, t + dt, 0.001, 0.35 * v, 0.05);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = i % 2 ? 2500 : 1200;
      f.connect(gg);
      this._noise(t + dt, 0.06, f);
    });
    g.gain.value = 1;
  },
  hit(ctx, g, t, v) {
    this._env(g, t, 0.001, 0.35 * v, 0.07);
    const o = this._osc('triangle', 900, t, 0.08, g);
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.06);
  },
  kill(ctx, g, t, v) {
    this._env(g, t, 0.002, 0.45 * v, 0.28);
    const o = this._osc('square', 700, t, 0.3, g);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.28);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    const ng = ctx.createGain();
    f.connect(ng).connect(g);
    this._env(ng, t, 0.002, 0.5 * v, 0.15);
    this._noise(t, 0.16, f);
  },
  squeak(ctx, g, t, v) {
    // cicit tikus
    this._env(g, t, 0.01, 0.35 * v, 0.16);
    const o = this._osc('sine', 2200, t, 0.2, g);
    o.frequency.linearRampToValueAtTime(3100, t + 0.06);
    o.frequency.linearRampToValueAtTime(2000, t + 0.16);
  },
  grunt(ctx, g, t, v) {
    // dengusan babi hutan
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    f.connect(g);
    this._env(g, t, 0.03, 0.7 * v, 0.4);
    const o = this._osc('sawtooth', 85, t, 0.5, f);
    o.frequency.linearRampToValueAtTime(65, t + 0.4);
    const n = ctx.createGain();
    n.gain.value = 0.4;
    n.connect(f);
    this._noise(t, 0.45, n);
  },
  charge(ctx, g, t, v) {
    // pekik babi saat menyeruduk
    this._env(g, t, 0.02, 0.6 * v, 0.5);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 2;
    f.connect(g);
    const o = this._osc('sawtooth', 300, t, 0.55, f);
    o.frequency.linearRampToValueAtTime(520, t + 0.2);
    o.frequency.linearRampToValueAtTime(260, t + 0.5);
  },
  hurt(ctx, g, t, v) {
    this._env(g, t, 0.003, 0.8 * v, 0.3);
    const o = this._osc('sine', 160, t, 0.32, g);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 800;
    f.connect(g);
    this._noise(t, 0.2, f);
  },
  pickup(ctx, g, t, v) {
    [0, 4, 7, 12].forEach((n, i) => {
      const gg = ctx.createGain();
      gg.connect(g);
      this._env(gg, t + i * 0.06, 0.005, 0.25 * v, 0.2);
      this._osc('triangle', midi(76 + n), t + i * 0.06, 0.25, gg);
    });
    g.gain.value = 1;
  },
  wave(ctx, g, t, v) {
    [[62, 0], [65, 0.15], [69, 0.3], [74, 0.45]].forEach(([n, dt]) => {
      const gg = ctx.createGain();
      gg.connect(g);
      this._env(gg, t + dt, 0.01, 0.3 * v, 0.5);
      this._osc('square', midi(n), t + dt, 0.55, gg);
    });
    g.gain.value = 0.6;
  },
  clear(ctx, g, t, v) {
    [[69, 0], [74, 0.12], [78, 0.24], [81, 0.36]].forEach(([n, dt]) => {
      const gg = ctx.createGain();
      gg.connect(g);
      this._env(gg, t + dt, 0.005, 0.3 * v, 0.35);
      this._osc('triangle', midi(n), t + dt, 0.4, gg);
    });
    g.gain.value = 1;
  },
  gameover(ctx, g, t, v) {
    [[62, 0], [58, 0.3], [55, 0.6], [50, 0.9]].forEach(([n, dt]) => {
      const gg = ctx.createGain();
      gg.connect(g);
      this._env(gg, t + dt, 0.01, 0.35 * v, 0.6);
      this._osc('sawtooth', midi(n), t + dt, 0.7, gg);
    });
    g.gain.value = 0.5;
  },
  hover(ctx, g, t, v) {
    this._env(g, t, 0.002, 0.15 * v, 0.05);
    this._osc('sine', 1200, t, 0.06, g);
  },
  click(ctx, g, t, v) {
    this._env(g, t, 0.002, 0.3 * v, 0.12);
    const o = this._osc('triangle', 600, t, 0.14, g);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
  }
};
