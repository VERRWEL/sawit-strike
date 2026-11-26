/**
 * pickup — Tandan Buah Segar (TBS) sawit yang dijatuhkan hama.
 * Ambil dengan berjalan mendekat ATAU menembaknya (untuk pemain tanpa gamepad).
 * Efek: HP +20 dan skor +50. Hilang setelah 15 detik (berkedip di 3 detik terakhir).
 */
import { mergeGeometries, paint, seededRandom } from '../utils/helpers.js';

const THREE = AFRAME.THREE;
let bunchGeo = null;

function getBunch() {
  if (bunchGeo) return bunchGeo;
  const rng = seededRandom(99);
  const parts = [];
  for (let i = 0; i < 26; i++) {
    const g = new THREE.IcosahedronGeometry(0.075 + rng() * 0.03, 0);
    const a = rng() * Math.PI * 2;
    const y = rng() * 0.5;
    const r = 0.2 * Math.sin(Math.PI * (y / 0.5)) + 0.06;
    g.translate(Math.cos(a) * r, y, Math.sin(a) * r);
    parts.push(paint(g, rng() < 0.8 ? '#d24a14' : '#3a1a24', 0.3, rng));
  }
  const stem = new THREE.CylinderGeometry(0.03, 0.05, 0.25, 5);
  stem.translate(0, 0.6, 0);
  parts.push(paint(stem, '#6b5a2a'));
  bunchGeo = mergeGeometries(parts);
  return bunchGeo;
}

AFRAME.registerComponent('pickup', {
  schema: { heal: { default: 20 }, score: { default: 50 }, life: { default: 15 } },

  init() {
    this.gm = this.el.sceneEl.systems['game-manager'];
    this.audio = this.el.sceneEl.systems['audio-manager'];
    this.fx = this.el.sceneEl.systems.effects;
    this.t = 0;
    const g = new THREE.Group();
    this.bunch = new THREE.Mesh(getBunch(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#3a1400' }));
    this.bunch.scale.setScalar(1.3);
    g.add(this.bunch);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 28),
      new THREE.MeshBasicMaterial({ color: '#8ef08a', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    g.add(this.ring);
    this.el.setObject3D('mesh', g);

    this.hitbox = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hitbox.position.y = 0.6;
    this.hitbox.userData.pickup = this;
    this.el.object3D.add(this.hitbox);
    this.gm.registerPickup(this);
    this.collected = false;
  },

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.gm.heal(this.data.heal);
    this.gm.addScore(this.data.score);
    const p = this.el.object3D.position.clone();
    p.y += 0.8;
    this.fx.burst(p, ['#d24a14', '#ffd54a', '#8ef08a'], 12, 3);
    this.fx.popup(p.setY(p.y + 0.5), `HP +${this.data.heal}`, '#8ef08a');
    if (this.audio) this.audio.play('pickup');
    this.el.parentNode && this.el.parentNode.removeChild(this.el);
  },

  remove() {
    this.gm.unregisterPickup(this);
  },

  tick(time, dtMs) {
    if (this.collected || this.gm.state === 'paused') return;
    const dt = Math.min(dtMs / 1000, 0.05);
    this.t += dt;
    this.bunch.position.y = 0.35 + Math.sin(this.t * 3) * 0.12;
    this.bunch.rotation.y += dt * 1.5;
    this.ring.scale.setScalar(1 + Math.sin(this.t * 5) * 0.1);
    const left = this.data.life - this.t;
    if (left < 3) this.el.object3D.visible = Math.floor(this.t * 8) % 2 === 0;
    if (left <= 0) {
      this.el.parentNode && this.el.parentNode.removeChild(this.el);
      return;
    }
    const rig = this.gm.rig && this.gm.rig.object3D.position;
    if (rig && Math.hypot(rig.x - this.el.object3D.position.x, rig.z - this.el.object3D.position.z) < 1.4) this.collect();
  }
});
