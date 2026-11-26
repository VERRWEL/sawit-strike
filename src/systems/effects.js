// effects: partikel, tracer, teks skor (pakai pooling).
import { CanvasPanel, UI_FONT } from '../utils/helpers.js';

const THREE = AFRAME.THREE;

AFRAME.registerSystem('effects', {
  init() {
    this.root = new THREE.Group();
    this.el.object3D.add(this.root);

    // partikel
    this.particleGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    this.matCache = {};
    this.particles = [];
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(this.particleGeo, this._mat('#ffffff'));
      m.visible = false;
      m.userData = { vel: new THREE.Vector3(), life: 0, max: 1 };
      this.root.add(m);
      this.particles.push(m);
    }
    this.pIndex = 0;

    // tracer peluru
    this.tracers = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0, fog: false });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.userData.life = 0;
      this.root.add(line);
      this.tracers.push(line);
    }
    this.tIndex = 0;

    // teks skor melayang
    this.popups = [];
    for (let i = 0; i < 8; i++) {
      const p = new CanvasPanel(0.9, 0.36, 256, { depthTest: false, renderOrder: 20 });
      p.mesh.visible = false;
      p.mesh.userData.life = 0;
      this.root.add(p.mesh);
      this.popups.push(p);
    }
    this.popIndex = 0;
    this._camPos = new THREE.Vector3();
  },

  _mat(color) {
    if (!this.matCache[color]) this.matCache[color] = new THREE.MeshBasicMaterial({ color });
    return this.matCache[color];
  },

  burst(position, colors, count = 14, speed = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.pIndex];
      this.pIndex = (this.pIndex + 1) % this.particles.length;
      p.material = this._mat(colors[i % colors.length]);
      p.position.copy(position);
      p.userData.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.2 + 0.4, (Math.random() - 0.5) * 2).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      p.userData.life = p.userData.max = 0.5 + Math.random() * 0.4;
      p.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      p.scale.setScalar(0.6 + Math.random());
      p.visible = true;
    }
  },

  tracer(from, to) {
    const l = this.tracers[this.tIndex];
    this.tIndex = (this.tIndex + 1) % this.tracers.length;
    const a = l.geometry.attributes.position.array;
    a[0] = from.x; a[1] = from.y; a[2] = from.z;
    a[3] = to.x; a[4] = to.y; a[5] = to.z;
    l.geometry.attributes.position.needsUpdate = true;
    l.userData.life = 0.07;
    l.material.opacity = 0.9;
  },

  popup(position, text, color = '#ffd54a') {
    const p = this.popups[this.popIndex];
    this.popIndex = (this.popIndex + 1) % this.popups.length;
    p._last = null;
    p.draw(text + color, (ctx, w, h) => {
      ctx.font = `bold ${Math.round(h * 0.78)}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(text, w / 2, h / 2);
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2);
    });
    p.mesh.position.copy(position);
    p.mesh.userData.life = 1;
    p.mesh.visible = true;
  },

  tick(t, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    for (const p of this.particles) {
      if (!p.visible) continue;
      const u = p.userData;
      u.life -= dt;
      if (u.life <= 0) {
        p.visible = false;
        continue;
      }
      u.vel.y -= 9 * dt;
      p.position.addScaledVector(u.vel, dt);
      if (p.position.y < 0.05) {
        p.position.y = 0.05;
        u.vel.multiplyScalar(0.4);
      }
      p.rotation.x += dt * 8;
      p.scale.setScalar(Math.max(0.05, u.life / u.max) * 1.2);
    }
    for (const l of this.tracers) {
      if (l.userData.life <= 0) continue;
      l.userData.life -= dt;
      l.material.opacity = Math.max(0, l.userData.life / 0.07) * 0.9;
    }
    const cam = this.el.camera;
    if (cam) cam.getWorldPosition(this._camPos);
    for (const p of this.popups) {
      const m = p.mesh;
      if (!m.visible) continue;
      m.userData.life -= dt;
      if (m.userData.life <= 0) {
        m.visible = false;
        continue;
      }
      m.position.y += dt * 1.2;
      m.lookAt(this._camPos);
      p.material.opacity = Math.min(1, m.userData.life * 2);
    }
  }
});
