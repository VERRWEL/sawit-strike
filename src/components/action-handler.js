/**
 * action-handler — dipasang di entity kamera.
 * Menangani semua aksi tombol (bukan gerakan):
 *   R2/R1, klik mouse, Spasi, tap layar  -> tembak (hitscan dari tengah layar/crosshair)
 *   Kotak / R                           -> isi ulang peluru
 *   X / Enter                           -> pilih tombol menu / mulai
 *   Segitiga / P                        -> jeda
 *   Options / V                         -> mode VR cardboard (layar terbelah)
 *   Share / M                           -> bisukan suara
 *   D-pad atas / C                      -> hadapkan ulang (recenter)
 * Tombol O (Circle) sengaja TIDAK dipakai: di Android itu = tombol Back.
 *
 * Bidikan memakai THREE.Raycaster dari posisi & arah kamera, sehingga di HP
 * pemain cukup menoleh (gyroscope) untuk membidik.
 */
import { input } from '../utils/input.js';
import { isShown } from '../utils/helpers.js';
import { flashTexture } from '../utils/textures.js';

const THREE = AFRAME.THREE;

function buildGun() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#8a5a2b' });
  const metal = new THREE.MeshLambertMaterial({ color: '#2e3236' });
  const green = new THREE.MeshLambertMaterial({ color: '#3d6b2a' });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.06, 0.09, 0.26), wood, 0, -0.02, 0.12); // popor
  add(new THREE.BoxGeometry(0.05, 0.1, 0.06), wood, 0, -0.08, 0.02, 0.35); // pegangan
  add(new THREE.BoxGeometry(0.065, 0.07, 0.22), metal, 0, 0.01, -0.1); // receiver
  add(new THREE.CylinderGeometry(0.014, 0.016, 0.42, 8), metal, 0, 0.02, -0.4, Math.PI / 2); // laras
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), metal, 0, 0.075, -0.08, Math.PI / 2); // teleskop
  add(new THREE.BoxGeometry(0.07, 0.03, 0.18), green, 0, -0.03, -0.26); // pelindung laras hijau (khas "penjaga kebun")
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), new THREE.MeshLambertMaterial({ color: '#c9a227' }), 0, -0.06, -0.17, Math.PI / 2); // tabung angin
  g.traverse((m) => {
    if (m.material) {
      m.material.depthTest = true;
      m.renderOrder = 1;
    }
  });
  return g;
}

AFRAME.registerComponent('action-handler', {
  schema: {
    mag: { default: 12 },
    fireRate: { default: 0.17 }, // detik antar tembakan
    reloadTime: { default: 1.3 },
    fuseTime: { default: 1.6 }
  },

  init() {
    const scene = this.el.sceneEl;
    this.gm = scene.systems['game-manager'];
    this.audio = scene.systems['audio-manager'];
    this.fx = scene.systems.effects;
    this.ammo = this.data.mag;
    this.cooldown = 0;
    this.reloading = 0;
    this.recoil = 0;
    this.hovered = null;
    this.fuse = 0;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 70;
    this._origin = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._muzzle = new THREE.Vector3();
    this._end = new THREE.Vector3();

    this.gun = buildGun();
    this.gunRest = new THREE.Vector3(0.17, -0.2, -0.4);
    this.gun.position.copy(this.gunRest);
    this.gun.scale.setScalar(0.62);
    this.el.object3D.add(this.gun);
    this.muzzleObj = new THREE.Object3D();
    this.muzzleObj.position.set(0, 0.02, -0.63);
    this.gun.add(this.muzzleObj);
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.16),
      new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.flash.visible = false;
    this.muzzleObj.add(this.flash);

    // jeda fuse sesaat setelah panel muncul agar tombol tidak terpilih tanpa sengaja
    scene.addEventListener('game-state', () => (this.fuse = -1));
    scene.addEventListener('game-start', () => {
      this.ammo = this.data.mag;
      this.reloading = 0;
      this.emitWeapon();
    });
    this.emitWeapon();
  },

  emitWeapon() {
    this.el.sceneEl.emit('weapon-update', { ammo: this.ammo, mag: this.data.mag, reloading: this.reloading > 0 });
  },

  startReload() {
    if (this.reloading > 0 || this.ammo === this.data.mag) return;
    this.reloading = this.data.reloadTime;
    if (this.audio) this.audio.play('reload');
    this.emitWeapon();
  },

  /** Kumpulkan semua objek yang bisa dibidik: hama, TBS, tombol menu. */
  collectTargets() {
    const list = [];
    this.gm.enemies.forEach((e) => !e.dead && list.push(e.hitbox));
    this.gm.pickups.forEach((p) => !p.collected && list.push(p.hitbox));
    this.gm.buttons.forEach((b) => isShown(b.mesh) && list.push(b.mesh));
    return list;
  },

  aim() {
    const cam = this.el.sceneEl.camera;
    cam.getWorldPosition(this._origin);
    cam.getWorldDirection(this._dir);
    this.raycaster.set(this._origin, this._dir);
    const hits = this.raycaster.intersectObjects(this.collectTargets(), false);
    return hits[0] || null;
  },

  fire(hit) {
    if (this.reloading > 0) return;
    if (this.ammo <= 0) {
      if (this.audio) this.audio.play('empty');
      this.startReload();
      return;
    }
    this.ammo -= 1;
    this.cooldown = this.data.fireRate;
    this.recoil = 1;
    this.flash.visible = true;
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flashTimer = 0.05;
    this.gm.shots += 1;
    if (this.audio) this.audio.play('shoot', { volume: 0.9 });

    this.muzzleObj.getWorldPosition(this._muzzle);
    if (hit) this._end.copy(hit.point);
    else this._end.copy(this._origin).addScaledVector(this._dir, 60);
    this.fx.tracer(this._muzzle, this._end);

    if (hit) {
      const ud = hit.object.userData;
      if (ud.enemy) {
        this.gm.hits += 1;
        ud.enemy.takeDamage(1, hit.point, this._dir);
        this.el.sceneEl.emit('hitmarker', { kill: ud.enemy.dead });
      } else if (ud.pickup) {
        ud.pickup.collect();
      }
    }
    if (this.ammo === 0) this.startReload();
    this.emitWeapon();
  },

  tick(time, dtMs) {
    input.poll(time);
    const dt = Math.min(dtMs / 1000, 0.05);
    const scene = this.el.sceneEl;
    const gm = this.gm;
    if (!scene.camera) return;

    // --- tombol sistem ---
    if (input.stereoPressed()) scene.systems['stereo-mode'].toggle();
    if (input.mutePressed() && this.audio) this.audio.toggleMute();
    if (input.pausePressed()) gm.togglePause();
    if (input.recenterPressed()) scene.emit('recenter');

    // --- bidik ---
    const hit = this.aim();
    const btn = hit && hit.object.userData.button ? hit.object.userData.button : null;
    if (btn !== this.hovered) {
      if (this.hovered) this.hovered.setHover(false);
      if (btn) {
        btn.setHover(true);
        if (this.audio) this.audio.play('hover');
      }
      this.hovered = btn;
      this.fuse = Math.min(this.fuse, 0);
    }
    // gaze/fuse: tatap tombol selama fuseTime -> otomatis diklik (untuk cardboard tanpa controller)
    if (btn) {
      this.fuse += dt;
      if (this.fuse >= this.data.fuseTime) {
        this.fuse = 0;
        btn.click();
      }
    }
    const onEnemy = !!(hit && hit.object.userData.enemy);
    scene.emit('aim-update', { onEnemy, onPickup: !!(hit && hit.object.userData.pickup), fuse: btn ? Math.max(0, this.fuse) / this.data.fuseTime : 0 });

    // --- konfirmasi (X / Enter) ---
    if (input.confirmPressed()) {
      if (btn) btn.click();
      else if (gm.state === 'menu' || gm.state === 'gameover') gm.startGame();
      else if (gm.state === 'paused') gm.togglePause();
    }

    // --- tembak ---
    this.cooldown -= dt;
    const canShoot = gm.state === 'playing' || gm.state === 'intermission' || gm.state === 'menu';
    if (btn && input.firePressed()) {
      btn.click();
    } else if (canShoot && !btn) {
      const stereo = scene.systems['stereo-mode'].enabled;
      // mode cardboard tanpa gamepad: tembak otomatis saat crosshair di atas hama
      const autoFire = stereo && !input.gamepadConnected && onEnemy && gm.isRunning();
      const wantFire = input.fireHeld() || input.firePressed() || autoFire;
      if (wantFire && this.cooldown <= 0) this.fire(hit);
      if (input.reloadPressed()) this.startReload();
    }

    // --- reload ---
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        this.ammo = this.data.mag;
        this.emitWeapon();
      }
    }

    // --- animasi senjata: recoil, ayunan reload, kilatan moncong ---
    this.recoil = Math.max(0, this.recoil - dt * 9);
    const r = this.reloading > 0 ? Math.sin((1 - this.reloading / this.data.reloadTime) * Math.PI) : 0;
    this.gun.position.set(this.gunRest.x, this.gunRest.y - r * 0.15, this.gunRest.z + this.recoil * 0.06);
    this.gun.rotation.set(this.recoil * 0.12 - r * 0.6, 0, r * 0.4);
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.visible = false;
    }
    this.gun.visible = gm.state !== 'gameover';
  }
});
