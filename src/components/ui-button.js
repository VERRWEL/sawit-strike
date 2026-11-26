// ui-button: tombol 3D di dalam VR, emit 'click'.
import { CanvasPanel, UI_FONT, roundRect } from '../utils/helpers.js';

AFRAME.registerComponent('ui-button', {
  schema: {
    label: { default: 'OK' },
    width: { default: 1.1 },
    height: { default: 0.26 },
    color: { default: '#f4a300' }
  },

  init() {
    this.gm = this.el.sceneEl.systems['game-manager'];
    this.audio = this.el.sceneEl.systems['audio-manager'];
    this.panel = new CanvasPanel(this.data.width, this.data.height, 400, { depthTest: false, renderOrder: 31 });
    this.mesh = this.panel.mesh;
    this.mesh.position.z = 0.01;
    this.mesh.userData.button = this;
    this.el.setObject3D('mesh', this.mesh);
    this.hover = false;
    this.redraw();
    this.gm.registerButton(this);
  },

  update() {
    this.redraw();
  },

  redraw() {
    const { label, color } = this.data;
    const hover = this.hover;
    this.panel.draw(label + hover, (ctx, w, h) => {
      roundRect(ctx, 6, 6, w - 12, h - 12, h * 0.3);
      ctx.fillStyle = hover ? '#ffffff' : color;
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = hover ? color : 'rgba(0,0,0,0.35)';
      ctx.stroke();
      ctx.fillStyle = hover ? '#2a3a12' : '#1d2a0e';
      ctx.font = `bold ${Math.round(h * 0.48)}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2 + 2);
    });
    this.mesh.scale.setScalar(hover ? 1.06 : 1);
  },

  setHover(v) {
    this.hover = v;
    this.redraw();
  },

  click() {
    if (this.audio) this.audio.play('click');
    this.el.emit('click');
  },

  remove() {
    this.gm.unregisterButton(this);
  }
});
