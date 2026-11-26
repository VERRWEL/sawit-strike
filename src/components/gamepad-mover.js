// gamepad-mover: gerakkan rig relatif arah pandang kamera (stik kiri / WASD).
import { input } from '../utils/input.js';

const THREE = AFRAME.THREE;

AFRAME.registerComponent('gamepad-mover', {
  schema: {
    speed: { default: 3.6 },
    sprintSpeed: { default: 6.2 },
    turnSpeed: { default: 2.4 } // rad/detik untuk stik kanan
  },

  init() {
    this.gm = this.el.sceneEl.systems['game-manager'];
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.el.sceneEl.addEventListener('player-knockback', (e) => {
      this.knock.addScaledVector(e.detail.dir, e.detail.force * 2.5);
    });
    this.camEl = this.el.querySelector('[camera]');
  },

  tick(time, dtMs) {
    input.poll(time);
    const state = this.gm.state;
    if (state === 'paused' || state === 'gameover') return;
    const dt = Math.min(dtMs / 1000, 0.05);
    const o = this.el.object3D;

    // putar badan (stik kanan / Q-E)
    const turn = input.turnAxis();
    if (turn) o.rotation.y -= turn * this.data.turnSpeed * dt;
    const pitch = input.pitchAxis();
    if (pitch && this.camEl) {
      const lc = this.camEl.components['look-controls'];
      if (lc && lc.pitchObject) {
        lc.pitchObject.rotation.x = THREE.MathUtils.clamp(lc.pitchObject.rotation.x - pitch * 1.8 * dt, -1.4, 1.4);
      }
    }

    // arah maju = arah kamera di bidang XZ
    const cam = this.el.sceneEl.camera;
    if (!cam) return;
    cam.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-4) {
      // fallback kalau lihat lurus ke atas/bawah
      this.forward.set(-Math.sin(o.rotation.y), 0, -Math.cos(o.rotation.y));
    }
    this.forward.normalize();
    this.right.set(-this.forward.z, 0, this.forward.x);

    // akselerasi biar tidak bikin pusing
    const axis = input.moveAxis();
    const spd = input.sprint() ? this.data.sprintSpeed : this.data.speed;
    const target = new THREE.Vector3()
      .addScaledVector(this.forward, axis.y * spd)
      .addScaledVector(this.right, axis.x * spd);
    this.velocity.lerp(target, Math.min(1, dt * 10));

    o.position.addScaledVector(this.velocity, dt);
    o.position.addScaledVector(this.knock, dt);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 5));

    // tabrakan batang & batas kebun
    if (this.gm.plantation) this.gm.plantation.resolveCollision(o.position, 0.4);
  }
});
