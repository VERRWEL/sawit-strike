// Input gamepad, keyboard, mouse, dan tap.
// Mapping standard: 0=X 1=O(tidak dipakai) 2=Kotak 3=Segitiga 4=L1 5=R1 6=L2 7=R2
// 8=Share 9=Options 10=L3 11=R3 12-15=D-pad; axes 0/1 stik kiri, 2/3 stik kanan
export const BTN = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, SHARE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const DEADZONE = 0.18;

function dz(v) {
  const a = Math.abs(v);
  if (a < DEADZONE) return 0;
  return Math.sign(v) * ((a - DEADZONE) / (1 - DEADZONE));
}

class InputManager {
  constructor() {
    this.keys = new Set();
    this.prevKeys = new Set();
    this.frameKeys = new Set();
    this.downQueue = new Set();
    this.framePressed = new Set();
    this.pad = null;
    this.padButtons = [];
    this.prevPadButtons = [];
    this.mouseHeld = false;
    this.tapQueued = false;
    this.tap = false;
    this.lastTime = -1;
    this.lastDevice = 'keyboard';
    this._bind();
  }

  _isUiTarget(e) {
    return e.target && e.target.closest && e.target.closest('#ui-overlay');
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.downQueue.add(e.code); // biar tekan singkat tetap kebaca
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseHeld = false;
    });
    window.addEventListener('mousedown', (e) => {
      if (this._isUiTarget(e) || e.button !== 0) return;
      // abaikan mouse event palsu setelah tap
      if (performance.now() - (this.lastTouch || -9999) < 900) return;
      this.mouseHeld = true;
      this.mouseQueued = true;
      this.lastDevice = 'mouse';
    });
    window.addEventListener('mouseup', () => (this.mouseHeld = false));
    // tap = tembak, geser = putar pandangan
    let start = null;
    window.addEventListener('touchstart', (e) => {
      this.lastTouch = performance.now();
      if (this._isUiTarget(e)) return;
      const t = e.changedTouches[0];
      start = { x: t.clientX, y: t.clientY, time: performance.now() };
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      this.lastTouch = performance.now();
      if (!start || this._isUiTarget(e)) return;
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - start.x, t.clientY - start.y);
      if (moved < 14 && performance.now() - start.time < 350) {
        this.tapQueued = true;
        this.lastDevice = 'touch';
      }
      start = null;
    }, { passive: true });
  }

  // gamepad pertama yang terhubung
  _readPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (p && p.connected) return p;
    }
    return null;
  }

  poll(time) {
    if (time === this.lastTime) return;
    this.lastTime = time;
    this.prevKeys = this.frameKeys;
    this.frameKeys = new Set([...this.keys, ...this.downQueue]);
    this.framePressed = this.downQueue;
    this.downQueue = new Set();
    this.tap = this.tapQueued;
    this.tapQueued = false;
    this.mouseClick = !!this.mouseQueued;
    this.mouseQueued = false;
    this.prevPadButtons = this.padButtons;
    this.pad = this._readPad();
    if (this.pad) {
      this.padButtons = this.pad.buttons.map((b) => (typeof b === 'object' ? b.pressed || b.value > 0.35 : b > 0.35));
      if (this.padButtons.some(Boolean) || this.pad.axes.some((a) => Math.abs(a) > 0.4)) this.lastDevice = 'gamepad';
    } else {
      this.padButtons = [];
    }
  }

  get gamepadConnected() {
    return !!this.pad;
  }

  key(code) {
    return this.frameKeys.has(code);
  }
  keyPressed(code) {
    return this.framePressed.has(code);
  }
  btn(i) {
    return !!this.padButtons[i];
  }
  btnPressed(i) {
    return !!this.padButtons[i] && !this.prevPadButtons[i];
  }

  // vektor gerak (x kanan, y maju)
  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.pad) {
      x += dz(this.pad.axes[0] || 0);
      y -= dz(this.pad.axes[1] || 0);
    }
    if (this.key('KeyW') || this.key('ArrowUp')) y += 1;
    if (this.key('KeyS') || this.key('ArrowDown')) y -= 1;
    if (this.key('KeyA') || this.key('ArrowLeft')) x -= 1;
    if (this.key('KeyD') || this.key('ArrowRight')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  // putar badan, positif = kanan
  turnAxis() {
    let t = 0;
    if (this.pad) t += dz(this.pad.axes[2] || 0);
    if (this.btn(BTN.LEFT) || this.key('KeyQ')) t -= 1;
    if (this.btn(BTN.RIGHT) || this.key('KeyE')) t += 1;
    return Math.max(-1, Math.min(1, t));
  }

  // dongak/tunduk (stik kanan Y)
  pitchAxis() {
    return this.pad ? dz(this.pad.axes[3] || 0) : 0;
  }

  sprint() {
    return this.btn(BTN.L2) || this.btn(BTN.L3) || this.key('ShiftLeft') || this.key('ShiftRight');
  }
  fireHeld() {
    return this.btn(BTN.R2) || this.btn(BTN.R1) || this.mouseHeld || this.key('Space');
  }
  firePressed() {
    return this.btnPressed(BTN.R2) || this.btnPressed(BTN.R1) || this.keyPressed('Space') || this.tap || this.mouseClick;
  }
  reloadPressed() {
    return this.btnPressed(BTN.SQUARE) || this.keyPressed('KeyR');
  }
  confirmPressed() {
    return this.btnPressed(BTN.CROSS) || this.keyPressed('Enter');
  }
  pausePressed() {
    return this.btnPressed(BTN.TRIANGLE) || this.keyPressed('KeyP');
  }
  stereoPressed() {
    return this.btnPressed(BTN.OPTIONS) || this.keyPressed('KeyV');
  }
  mutePressed() {
    return this.btnPressed(BTN.SHARE) || this.keyPressed('KeyM');
  }
  recenterPressed() {
    return this.btnPressed(BTN.UP) || this.keyPressed('KeyC');
  }
}

export const input = new InputManager();
