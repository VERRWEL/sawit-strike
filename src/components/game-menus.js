// game-menus: panel menu utama, jeda, game over.
import { CanvasPanel, UI_FONT, roundRect } from '../utils/helpers.js';

const THREE = AFRAME.THREE;

function panelBg(ctx, w, h) {
  roundRect(ctx, 8, 8, w - 16, h - 16, 40);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(20,46,22,0.93)');
  grad.addColorStop(1, 'rgba(10,26,12,0.93)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#f4a300';
  ctx.stroke();
}

function text(ctx, str, x, y, size, color = '#fff', weight = 'bold', align = 'center') {
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

AFRAME.registerComponent('game-menus', {
  init() {
    this.gm = this.el.sceneEl.systems['game-manager'];
    this.panels = {};
    this._camPos = new THREE.Vector3();
    this._fwd = new THREE.Vector3();

    this.panels.menu = this.makePanel(2.0, 1.6, (ctx, w, h) => {
      panelBg(ctx, w, h);
      text(ctx, 'SAWIT STRIKE', w / 2, 105, 118, '#f4a300');
      text(ctx, 'PENJAGA KEBUN', w / 2, 195, 52, '#cfe8b0');
      text(ctx, 'Hama menyerbu Blok A-12! Lindungi kebun sawit dari', w / 2, 268, 34, '#ffffff', 'normal');
      text(ctx, 'tikus, kumbang tanduk & babi hutan. Ambil TBS untuk HP.', w / 2, 310, 34, '#ffffff', 'normal');
      const rows = [
        ['Bidik', 'Gerakkan HP (gyro) / mouse / stik kanan'],
        ['Gerak', 'Stik kiri  •  WASD'],
        ['Tembak', 'R2 / R1  •  klik  •  tap layar'],
        ['Isi peluru', 'Kotak  •  R'],
        ['Pilih / Jeda', 'X  •  Enter    |    Segitiga  •  P'],
        ['Mode VR', 'Options  •  V']
      ];
      rows.forEach(([k, v], i) => {
        text(ctx, k, 150, 385 + i * 44, 31, '#f4a300', 'bold', 'left');
        text(ctx, v, 380, 385 + i * 44, 31, '#e6f2d8', 'normal', 'left');
      });
      text(ctx, `Skor terbaik: ${this.gm.best}`, w / 2, 642, 30, '#ffd54a');
    }, [{ label: 'MULAI', y: -0.62, action: () => this.gm.startGame() }]);

    this.panels.paused = this.makePanel(1.4, 1.2, (ctx, w, h) => {
      panelBg(ctx, w, h);
      text(ctx, 'JEDA', w / 2, 95, 100, '#f4a300');
      text(ctx, `Gelombang ${this.gm.wave}  •  Skor ${this.gm.score}`, w / 2, 190, 38, '#e6f2d8', 'normal');
    }, [
      { label: 'LANJUTKAN', y: -0.22, action: () => this.gm.togglePause() },
      { label: 'MENU UTAMA', y: -0.46, action: () => this.gm.backToMenu(), color: '#cfe8b0' }
    ]);

    this.panels.gameover = this.makePanel(1.7, 1.6, (ctx, w, h) => {
      const gm = this.gm;
      panelBg(ctx, w, h);
      text(ctx, 'KEBUN JEBOL!', w / 2, 95, 96, '#ff6a4a');
      text(ctx, 'Hama berhasil menumbangkan penjaga kebun.', w / 2, 172, 34, '#e6f2d8', 'normal');
      const acc = gm.shots ? Math.round((gm.hits / gm.shots) * 100) : 0;
      const rows = [
        ['Skor', gm.score],
        ['Gelombang', gm.wave],
        ['Hama dibasmi', gm.kills],
        ['Akurasi', acc + '%'],
        ['Skor terbaik', gm.best + (gm.newBest ? '  (BARU!)' : '')]
      ];
      rows.forEach(([k, v], i) => {
        text(ctx, k, 170, 250 + i * 58, 40, '#f4a300', 'bold', 'left');
        text(ctx, String(v), w - 170, 250 + i * 58, 40, '#ffffff', 'bold', 'right');
      });
    }, [
      { label: 'MAIN LAGI', y: -0.4, action: () => this.gm.startGame() },
      { label: 'MENU UTAMA', y: -0.66, action: () => this.gm.backToMenu(), color: '#cfe8b0' }
    ]);

    this.el.sceneEl.addEventListener('game-state', (e) => this.show(e.detail.state));
    this.el.sceneEl.addEventListener('recenter', () => this.current && this.place(this.panels[this.current]));
    this.show(this.gm.state);
  },

  makePanel(w, h, drawFn, buttons) {
    const el = document.createElement('a-entity');
    const panel = new CanvasPanel(w, h, 512, { depthTest: false, renderOrder: 30 });
    el.object3D.add(panel.mesh);
    el.object3D.visible = false;
    buttons.forEach((b) => {
      const be = document.createElement('a-entity');
      be.setAttribute('ui-button', { label: b.label, color: b.color || '#f4a300' });
      be.setAttribute('position', `0 ${b.y} 0.02`);
      be.addEventListener('click', b.action);
      el.appendChild(be);
    });
    this.el.appendChild(el);
    return { el, panel, drawFn, h };
  },

  // taruh panel 2.6 m di depan pemain
  place(p) {
    const cam = this.el.sceneEl.camera;
    if (!cam) return;
    cam.getWorldPosition(this._camPos);
    cam.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-4) this._fwd.set(0, 0, -1);
    this._fwd.normalize();
    const o = p.el.object3D;
    o.position.copy(this._camPos).addScaledVector(this._fwd, 2.6);
    o.position.y = Math.max(1.3, this._camPos.y) + 0.05;
    o.lookAt(this._camPos.x, o.position.y, this._camPos.z);
  },

  show(state) {
    const key = state === 'menu' || state === 'paused' || state === 'gameover' ? state : null;
    Object.entries(this.panels).forEach(([k, p]) => {
      const vis = k === key;
      p.el.object3D.visible = vis;
      if (vis) {
        p.panel._last = null;
        p.panel.draw(undefined, p.drawFn);
        this.place(p);
      }
    });
    this.current = key;
  }
});
