/**
 * hud — antarmuka 3D yang menempel di kamera (tetap terlihat saat mode VR split-screen):
 * crosshair + indikator fuse, skor, gelombang, bar HP, amunisi, pengumuman tengah,
 * hitmarker, dan vinyet merah saat terkena serangan.
 * Posisi elemen menyesuaikan rasio layar (portrait / landscape / VR per-mata).
 */
import { CanvasPanel, UI_FONT, roundRect } from '../utils/helpers.js';
import { vignetteTexture } from '../utils/textures.js';
import { input } from '../utils/input.js';

const THREE = AFRAME.THREE;
const Z = -1; // jarak bidang HUD dari mata (meter)

function shadowText(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

AFRAME.registerComponent('hud', {
  init() {
    const scene = this.el.sceneEl;
    this.gm = scene.systems['game-manager'];
    this.root = new THREE.Group();
    this.el.object3D.add(this.root);
    const opts = (o) => ({ depthTest: false, renderOrder: o });

    this.cross = new CanvasPanel(0.1, 0.1, 1280, opts(60));
    this.cross.mesh.position.set(0, 0, Z);
    this.root.add(this.cross.mesh);

    this.scorePanel = new CanvasPanel(0.42, 0.1, 1024, opts(55));
    this.wavePanel = new CanvasPanel(0.42, 0.1, 1024, opts(55));
    this.hpPanel = new CanvasPanel(0.42, 0.09, 1024, opts(55));
    this.ammoPanel = new CanvasPanel(0.36, 0.09, 1024, opts(55));
    this.announce = new CanvasPanel(0.9, 0.26, 900, opts(56));
    this.hint = new CanvasPanel(0.7, 0.06, 1024, opts(55));
    [this.scorePanel, this.wavePanel, this.hpPanel, this.ammoPanel, this.announce, this.hint].forEach((p) => this.root.add(p.mesh));
    this.announce.mesh.visible = false;

    this.vignette = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: vignetteTexture(), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false })
    );
    this.vignette.renderOrder = 58;
    this.vignette.position.z = -0.45;
    this.root.add(this.vignette);

    this.stats = { score: 0, hp: 100, maxHp: 100, wave: 0, remaining: 0 };
    this.weapon = { ammo: 12, mag: 12, reloading: false };
    this.aimState = { onEnemy: false, onPickup: false, fuse: 0 };
    this.hitTimer = 0;
    this.hitKill = false;
    this.hurt = 0;
    this.announceTimer = 0;

    scene.addEventListener('game-update', (e) => {
      this.stats = e.detail;
      this.drawStats();
    });
    scene.addEventListener('weapon-update', (e) => {
      this.weapon = e.detail;
      this.drawAmmo();
    });
    scene.addEventListener('aim-update', (e) => (this.aimState = e.detail));
    scene.addEventListener('hitmarker', (e) => {
      this.hitTimer = 0.18;
      this.hitKill = e.detail.kill;
    });
    scene.addEventListener('player-hit', () => (this.hurt = 1));
    scene.addEventListener('announce', (e) => this.showAnnounce(e.detail));
    scene.addEventListener('game-state', (e) => {
      const playing = e.detail.state !== 'menu';
      [this.scorePanel, this.wavePanel, this.hpPanel, this.ammoPanel].forEach((p) => (p.mesh.visible = playing));
      if (e.detail.state !== 'playing' && e.detail.state !== 'intermission') this.announce.mesh.visible = false;
    });
    const relayout = () => setTimeout(() => this.layout(), 50);
    window.addEventListener('resize', relayout);
    scene.addEventListener('stereo-changed', relayout);
    scene.addEventListener('enter-vr', relayout);
    scene.addEventListener('exit-vr', relayout);
    this.layout();
    this.drawStats();
    this.drawAmmo();
  },

  /** Hitung area aman HUD berdasarkan FOV & rasio layar efektif. */
  layout() {
    const scene = this.el.sceneEl;
    const cam = scene.camera;
    const canvas = scene.canvas;
    if (!cam || !canvas) return;
    let aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const stereo = scene.systems['stereo-mode'] && scene.systems['stereo-mode'].enabled;
    if (stereo) aspect /= 2;
    const xr = scene.renderer && scene.renderer.xr && scene.renderer.xr.isPresenting;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * Math.abs(Z);
    let hy = Math.min(halfH * 0.82, 0.52);
    let hx = Math.min(halfH * aspect * 0.88, 0.75);
    if (xr || stereo) {
      hy = Math.min(hy, 0.38);
      hx = Math.min(hx, 0.42);
    }
    // skala elemen agar muat di layar sempit (HP portrait)
    const s = THREE.MathUtils.clamp(hx / 0.5, 0.55, 1.15);
    const put = (p, x, y, ax, ay) => {
      const w = p.mesh.geometry.parameters.width * s;
      const h = p.mesh.geometry.parameters.height * s;
      p.mesh.scale.setScalar(s);
      p.mesh.position.set(x + ax * w * 0.5, y + ay * h * 0.5, Z);
    };
    put(this.scorePanel, -hx, hy, 1, -1);
    put(this.wavePanel, hx, hy, -1, -1);
    put(this.hpPanel, -hx, -hy, 1, 1);
    put(this.ammoPanel, hx, -hy, -1, 1);
    put(this.hint, 0, -hy, 0, 1);
    this.hint.mesh.position.y += 0.15 * s;
    this.announce.mesh.scale.setScalar(Math.min(1, s * 1.1));
    this.announce.mesh.position.set(0, hy * 0.45, Z);
  },

  drawStats() {
    const { score, hp, maxHp, wave, remaining } = this.stats;
    this.scorePanel.draw('s' + score, (ctx, w, h) => {
      shadowText(ctx, 'SKOR', 8, h * 0.28, h * 0.32, '#f4a300');
      shadowText(ctx, String(score).padStart(6, '0'), 8, h * 0.7, h * 0.48, '#ffffff');
    });
    this.wavePanel.draw('w' + wave + '-' + remaining, (ctx, w, h) => {
      shadowText(ctx, `GELOMBANG ${wave}`, w - 8, h * 0.28, h * 0.32, '#f4a300', 'right');
      shadowText(ctx, `sisa hama: ${remaining}`, w - 8, h * 0.7, h * 0.38, '#ffffff', 'right');
    });
    const f = Math.max(0, hp / maxHp);
    this.hpPanel.draw('h' + hp, (ctx, w, h) => {
      shadowText(ctx, `HP ${Math.ceil(hp)}`, 8, h * 0.27, h * 0.32, f > 0.3 ? '#8ef08a' : '#ff6a4a');
      roundRect(ctx, 6, h * 0.5, w - 12, h * 0.4, h * 0.15);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
      if (f > 0) {
        roundRect(ctx, 12, h * 0.5 + 6, (w - 24) * f, h * 0.4 - 12, h * 0.1);
        ctx.fillStyle = f > 0.5 ? '#5cd65c' : f > 0.25 ? '#ffc93a' : '#ff4a3a';
        ctx.fill();
      }
    });
  },

  drawAmmo() {
    const { ammo, mag, reloading } = this.weapon;
    this.ammoPanel.draw(`${ammo}-${reloading}`, (ctx, w, h) => {
      shadowText(ctx, reloading ? 'MENGISI...' : 'PELURU', w - 8, h * 0.27, h * 0.32, reloading ? '#ffd54a' : '#f4a300', 'right');
      // ikon butir peluru
      const bw = Math.min(26, (w - 20) / mag);
      for (let i = 0; i < mag; i++) {
        const x = w - 10 - (i + 1) * bw;
        ctx.fillStyle = i < ammo ? '#ffd54a' : 'rgba(255,255,255,0.18)';
        roundRect(ctx, x + 3, h * 0.5, bw - 6, h * 0.42, 4);
        ctx.fill();
      }
    });
  },

  showAnnounce({ title, sub, color }) {
    this.announceTimer = 2.8;
    this.announce.mesh.visible = true;
    this.announce._last = null;
    this.announce.draw(undefined, (ctx, w, h) => {
      shadowText(ctx, title, w / 2, h * 0.38, h * 0.36, color || '#ffd54a', 'center');
      shadowText(ctx, sub || '', w / 2, h * 0.78, h * 0.15, '#ffffff', 'center', 'normal');
    });
  },

  drawCross() {
    const { onEnemy, onPickup, fuse } = this.aimState;
    const hit = this.hitTimer > 0;
    const fq = Math.round(fuse * 24);
    const key = `${onEnemy}${onPickup}${fq}${hit}${this.hitKill}`;
    this.cross.draw(key, (ctx, w, h) => {
      const c = w / 2;
      const col = onEnemy ? '#ff4a3a' : onPickup ? '#8ef08a' : '#ffffff';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(c, c, w * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (fq > 0) {
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#f4a300';
        ctx.beginPath();
        ctx.arc(c, c, w * 0.26, -Math.PI / 2, -Math.PI / 2 + (fq / 24) * Math.PI * 2);
        ctx.stroke();
      }
      if (hit) {
        ctx.strokeStyle = this.hitKill ? '#ff4a3a' : '#ffffff';
        ctx.lineWidth = 5;
        const a = w * 0.2;
        const b = w * 0.36;
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(c + sx * a, c + sy * a);
          ctx.lineTo(c + sx * b, c + sy * b);
          ctx.stroke();
        });
      }
    });
  },

  tick(t, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    if (this.hitTimer > 0) this.hitTimer -= dt;
    this.drawCross();

    if (this.hurt > 0) {
      this.hurt = Math.max(0, this.hurt - dt * 1.8);
    }
    const low = this.stats.hp / this.stats.maxHp < 0.3 && this.gm.isRunning();
    const pulse = low ? 0.25 + Math.sin(t / 180) * 0.12 : 0;
    this.vignette.material.opacity = Math.max(this.hurt * 0.9, pulse);

    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      this.announce.material.opacity = Math.min(1, this.announceTimer * 1.5);
      if (this.announceTimer <= 0) this.announce.mesh.visible = false;
    }

    // petunjuk kecil di bawah
    const st = this.gm.state;
    let hint = '';
    if (this.weapon.ammo === 0 && !this.weapon.reloading) hint = 'Tekan KOTAK / R untuk isi peluru';
    else if (st === 'menu') hint = input.gamepadConnected ? 'Gamepad terhubung • tekan X untuk mulai' : 'Tatap tombol MULAI, atau klik / tekan Enter';
    else if (st === 'intermission') hint = 'Bersiap untuk gelombang berikutnya...';
    this.hint.mesh.visible = !!hint;
    if (hint) {
      this.hint.draw(hint, (ctx, w, h) => shadowText(ctx, hint, w / 2, h / 2, h * 0.55, '#ffffff', 'center', 'normal'));
    }
  }
});
