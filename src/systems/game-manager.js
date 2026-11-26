/**
 * game-manager — state global permainan (pola ECS: System).
 * Menyimpan skor, HP, gelombang (wave), daftar hama & item, serta
 * mengatur perpindahan state: menu -> playing <-> intermission -> gameover.
 * Komponen lain cukup memanggil method di sini (decoupled), dan HUD/menu
 * mendengarkan event 'game-update' / 'game-state'.
 */
const THREE = AFRAME.THREE;

export const ENEMY_TYPES = {
  tikus: { name: 'Tikus', hp: 1, speed: 3.0, damage: 5, score: 100, radius: 0.55 },
  kumbang: { name: 'Kumbang Tanduk', hp: 2, speed: 3.6, damage: 7, score: 150, radius: 0.6 },
  babi: { name: 'Babi Hutan', hp: 6, speed: 1.8, damage: 16, score: 400, radius: 0.95 }
};

const MAX_HP = 100;
const STORAGE_KEY = 'sawit-strike-best';

AFRAME.registerSystem('game-manager', {
  init() {
    this.state = 'menu';
    this.enemies = new Set();
    this.pickups = new Set();
    this.buttons = new Set();
    this.plantation = null;
    this.best = 0;
    try {
      this.best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
    } catch (e) {
      /* storage tidak tersedia */
    }
    this.resetStats();
    this._tmp = new THREE.Vector3();
    this.el.addEventListener('loaded', () => {
      this.rig = document.getElementById('player-rig');
      this.container = document.getElementById('enemy-container');
      this.audio = this.el.systems['audio-manager'];
      this.fx = this.el.systems.effects;
      this.setState('menu');
    });
  },

  resetStats() {
    this.score = 0;
    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.wave = 0;
    this.kills = 0;
    this.queue = [];
    this.pending = 0;
    this.spawnTimer = 0;
    this.stateTimer = 0;
    this.shots = 0;
    this.hits = 0;
  },

  isRunning() {
    return this.state === 'playing' || this.state === 'intermission';
  },

  setState(s) {
    const prev = this.state;
    this.state = s;
    if (this.audio) {
      if (s === 'menu') this.audio.setMusic('menu');
      else if (s === 'playing' || s === 'intermission') this.audio.setMusic('game');
      else if (s === 'gameover') this.audio.setMusic('menu');
    }
    this.el.emit('game-state', { state: s, prev });
    this.emitUpdate();
  },

  emitUpdate() {
    this.el.emit('game-update', {
      score: this.score,
      hp: this.hp,
      maxHp: this.maxHp,
      wave: this.wave,
      kills: this.kills,
      alive: this.enemies.size,
      remaining: this.queue.length + this.enemies.size
    });
  },

  /* ---------- Alur permainan ---------- */

  startGame() {
    this.clearField();
    this.resetStats();
    if (this.rig) {
      this.rig.object3D.position.set(0, 0, 0);
    }
    this.el.emit('game-start');
    this.nextWave();
  },

  nextWave() {
    this.wave += 1;
    const w = this.wave;
    const count = Math.min(4 + w * 3, 42);
    const queue = [];
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let type = 'tikus';
      if (w >= 2 && r < 0.35) type = 'kumbang';
      if (w >= 3 && r > 1 - Math.min(0.12 + w * 0.025, 0.3)) type = 'babi';
      queue.push(type);
    }
    // pastikan ada "bos" babi hutan setiap kelipatan 3
    if (w % 3 === 0) queue.push('babi', 'babi');
    this.queue = queue;
    this.spawnInterval = Math.max(0.45, 1.8 - w * 0.13);
    this.maxAlive = Math.min(6 + w * 2, 16);
    this.speedMul = Math.min(1 + (w - 1) * 0.06, 1.6);
    this.spawnTimer = 1.5;
    this.setState('playing');
    const types = [...new Set(queue)].map((t) => ENEMY_TYPES[t].name).join(', ');
    this.el.emit('announce', { title: `GELOMBANG ${w}`, sub: `Hama: ${types}`, color: '#ffd54a' });
    if (this.audio) this.audio.play('wave');
  },

  togglePause() {
    if (this.state === 'playing' || this.state === 'intermission') {
      this._resumeState = this.state;
      this.setState('paused');
    } else if (this.state === 'paused') {
      this.setState(this._resumeState || 'playing');
    }
  },

  gameOver() {
    if (this.state === 'gameover') return;
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      try {
        localStorage.setItem(STORAGE_KEY, String(this.best));
      } catch (e) {
        /* abaikan */
      }
    }
    if (this.audio) {
      this.audio.play('gameover');
      this.audio.stopAllLoops();
    }
    this.setState('gameover');
  },

  backToMenu() {
    this.clearField();
    this.resetStats();
    this.setState('menu');
  },

  clearField() {
    [...this.enemies].forEach((e) => e.el.parentNode && e.el.parentNode.removeChild(e.el));
    [...this.pickups].forEach((p) => p.el.parentNode && p.el.parentNode.removeChild(p.el));
    this.enemies.clear();
    this.pickups.clear();
  },

  /* ---------- Registrasi entitas ---------- */

  registerEnemy(c) {
    this.pending = Math.max(0, (this.pending || 0) - 1);
    this.enemies.add(c);
  },
  unregisterEnemy(c) {
    this.enemies.delete(c);
  },
  registerPickup(c) {
    this.pickups.add(c);
  },
  unregisterPickup(c) {
    this.pickups.delete(c);
  },
  registerButton(c) {
    this.buttons.add(c);
  },
  unregisterButton(c) {
    this.buttons.delete(c);
  },

  /* ---------- Event gameplay ---------- */

  enemyKilled(enemy) {
    const info = ENEMY_TYPES[enemy.data.type];
    const pts = info.score * Math.max(1, Math.ceil(this.wave / 2));
    this.score += pts;
    this.kills += 1;
    const pos = enemy.el.object3D.position;
    this.fx.popup(this._tmp.copy(pos).setY(pos.y + 1.2), `+${pts}`);
    // peluang menjatuhkan Tandan Buah Segar (TBS) = pemulih HP
    const chance = enemy.data.type === 'babi' ? 1 : enemy.data.type === 'kumbang' ? 0.22 : 0.15;
    if (Math.random() < chance) this.spawnPickup(pos);
    this.emitUpdate();
  },

  damagePlayer(amount, sourcePos) {
    if (!this.isRunning()) return;
    this.hp = Math.max(0, this.hp - amount);
    this.el.emit('player-hit', { amount, sourcePos });
    if (this.audio) this.audio.play('hurt');
    this.emitUpdate();
    if (this.hp <= 0) this.gameOver();
  },

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.emitUpdate();
  },

  addScore(n) {
    this.score += n;
    this.emitUpdate();
  },

  spawnPickup(pos) {
    if (!this.container) return;
    const el = document.createElement('a-entity');
    el.setAttribute('pickup', '');
    el.setAttribute('position', `${pos.x} 0 ${pos.z}`);
    this.container.appendChild(el);
  },

  spawnEnemy(type) {
    if (!this.rig || !this.container) return;
    const p = this.rig.object3D.position;
    // muncul di antara barisan sawit, 20–30 m dari pemain, di luar pandangan langsung
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 10;
      x = THREE.MathUtils.clamp(p.x + Math.cos(a) * r, -50, 50);
      z = THREE.MathUtils.clamp(p.z + Math.sin(a) * r, -50, 50);
      if (Math.hypot(x - p.x, z - p.z) > 15) break;
    }
    const el = document.createElement('a-entity');
    this.pending = (this.pending || 0) + 1; // entity baru di-init pada frame berikutnya
    el.setAttribute('enemy', { type, speedMul: this.speedMul });
    el.setAttribute('position', `${x} 0 ${z}`);
    this.container.appendChild(el);
  },

  tick(t, dtMs) {
    if (!this.isRunning()) return;
    const dt = Math.min(dtMs / 1000, 0.05);

    if (this.state === 'playing') {
      this.spawnTimer -= dt;
      if (this.queue.length && this.spawnTimer <= 0 && this.enemies.size < this.maxAlive) {
        this.spawnEnemy(this.queue.shift());
        this.spawnTimer = this.spawnInterval * (0.6 + Math.random() * 0.8);
        this.emitUpdate();
      }
      if (!this.queue.length && this.enemies.size === 0 && !this.pending) {
        // gelombang selesai: bonus + jeda singkat
        const bonus = 250 * this.wave;
        this.score += bonus;
        this.heal(15);
        this.stateTimer = 4.5;
        this.setState('intermission');
        this.el.emit('announce', { title: 'KEBUN AMAN!', sub: `Bonus +${bonus} • HP +15`, color: '#8ef08a' });
        if (this.audio) this.audio.play('clear');
      }
    } else if (this.state === 'intermission') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.nextWave();
    }
  }
});
