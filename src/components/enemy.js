// enemy: perilaku hama (tikus, kumbang, babi hutan).
import { ENEMY_TYPES } from '../systems/game-manager.js';
import { CanvasPanel } from '../utils/helpers.js';
import { blobShadowTexture } from '../utils/textures.js';

const THREE = AFRAME.THREE;
const geo = {};
const G = (key, make) => geo[key] || (geo[key] = make());

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

// model

function buildRat(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('ratBody', () => new THREE.SphereGeometry(0.5, 10, 8)), mats.body);
  body.scale.set(0.42, 0.34, 0.75);
  body.position.y = 0.3;
  g.add(body);
  const head = new THREE.Mesh(G('ratHead', () => new THREE.ConeGeometry(0.17, 0.42, 8)), mats.body);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.36, 0.5);
  g.add(head);
  const pink = lambert('#e7a3a3');
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(G('ratEar', () => new THREE.CircleGeometry(0.09, 10)), pink);
    ear.position.set(s * 0.12, 0.52, 0.36);
    ear.material.side = THREE.DoubleSide;
    g.add(ear);
    const eye = new THREE.Mesh(G('eye', () => new THREE.SphereGeometry(0.035, 6, 5)), mats.eye);
    eye.position.set(s * 0.08, 0.42, 0.58);
    g.add(eye);
  });
  const tail = new THREE.Mesh(G('ratTail', () => new THREE.CylinderGeometry(0.02, 0.035, 0.8, 5)), pink);
  tail.rotation.x = Math.PI / 2 - 0.3;
  tail.position.set(0, 0.25, -0.7);
  g.add(tail);
  g.userData.tail = tail;
  g.scale.setScalar(1.25);
  return g;
}

function buildBeetle(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('btlBody', () => new THREE.SphereGeometry(0.5, 12, 8)), mats.body);
  body.scale.set(0.5, 0.36, 0.7);
  g.add(body);
  const head = new THREE.Mesh(G('btlHead', () => new THREE.SphereGeometry(0.2, 8, 6)), mats.body);
  head.position.set(0, 0.02, 0.38);
  g.add(head);
  const horn = new THREE.Mesh(G('btlHorn', () => new THREE.ConeGeometry(0.06, 0.38, 6)), mats.body);
  horn.position.set(0, 0.2, 0.5);
  horn.rotation.x = 0.5;
  g.add(horn);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(G('eye', () => new THREE.SphereGeometry(0.035, 6, 5)), mats.eye);
    eye.position.set(s * 0.12, 0.05, 0.52);
    g.add(eye);
  });
  const wingMat = new THREE.MeshBasicMaterial({ color: '#d8e4f0', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const wings = [];
  [-1, 1].forEach((s) => {
    const w = new THREE.Mesh(G('btlWing', () => {
      const pg = new THREE.PlaneGeometry(0.8, 0.32);
      pg.translate(0.4, 0, 0);
      return pg;
    }), wingMat);
    w.position.set(s * 0.12, 0.2, -0.05);
    w.scale.x = s;
    w.rotation.x = -Math.PI / 2;
    g.add(w);
    wings.push(w);
  });
  // kaki
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1;
    const leg = new THREE.Mesh(G('btlLeg', () => new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4)), mats.body);
    leg.position.set(s * 0.28, -0.18, -0.2 + (i % 3) * 0.2);
    leg.rotation.z = s * 0.9;
    g.add(leg);
  }
  g.userData.wings = wings;
  g.scale.setScalar(1.15);
  return g;
}

function buildBoar(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('boarBody', () => new THREE.SphereGeometry(0.5, 12, 8)), mats.body);
  body.scale.set(1.0, 1.0, 1.75);
  body.position.y = 0.78;
  g.add(body);
  const mane = new THREE.Mesh(G('boarMane', () => new THREE.BoxGeometry(0.16, 0.22, 1.2)), mats.dark);
  mane.position.set(0, 1.25, 0);
  g.add(mane);
  const head = new THREE.Mesh(G('boarHead', () => new THREE.ConeGeometry(0.36, 0.8, 8)), mats.body);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.7, 1.15);
  g.add(head);
  const snout = new THREE.Mesh(G('boarSnout', () => new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10)), lambert('#5b3d33'));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.68, 1.56);
  g.add(snout);
  const ivory = lambert('#f3ead2');
  [-1, 1].forEach((s) => {
    const tusk = new THREE.Mesh(G('tusk', () => new THREE.ConeGeometry(0.035, 0.25, 5)), ivory);
    tusk.position.set(s * 0.14, 0.62, 1.42);
    tusk.rotation.set(-0.6, 0, s * -0.3);
    g.add(tusk);
    const eye = new THREE.Mesh(G('eye', () => new THREE.SphereGeometry(0.035, 6, 5)), mats.eye);
    eye.scale.setScalar(1.4);
    eye.position.set(s * 0.18, 0.86, 1.05);
    g.add(eye);
    const ear = new THREE.Mesh(G('boarEar', () => new THREE.ConeGeometry(0.09, 0.2, 4)), mats.dark);
    ear.position.set(s * 0.2, 1.05, 0.85);
    g.add(ear);
  });
  const legs = [];
  [[-0.3, 0.55], [0.3, 0.55], [-0.3, -0.55], [0.3, -0.55]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(G('boarLeg', () => {
      const c = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 6);
      c.translate(0, -0.25, 0);
      return c;
    }), mats.dark);
    leg.position.set(x, 0.5, z);
    g.add(leg);
    legs.push(leg);
  });
  g.userData.legs = legs;
  return g;
}

// komponen

AFRAME.registerComponent('enemy', {
  schema: {
    type: { default: 'tikus', oneOf: ['tikus', 'kumbang', 'babi'] },
    speedMul: { default: 1 }
  },

  init() {
    const type = this.data.type;
    this.info = ENEMY_TYPES[type];
    this.gm = this.el.sceneEl.systems['game-manager'];
    this.audio = this.el.sceneEl.systems['audio-manager'];
    this.fx = this.el.sceneEl.systems.effects;
    this.hp = this.info.hp;
    this.speed = this.info.speed * this.data.speedMul;
    this.attackCooldown = 0;
    this.flash = 0;
    this.age = 0;
    this.phase = Math.random() * 10;
    this.knock = new THREE.Vector3();
    this.soundTimer = 1 + Math.random() * 2;
    this.mode = 'approach'; // khusus babi: approach | windup | charge | recover
    this.modeTimer = 0;
    this.chargeDir = new THREE.Vector3();
    this.dead = false;

    const color = { tikus: '#6e6258', kumbang: '#2b1d15', babi: '#4b3a30' }[type];
    this.mats = {
      body: lambert(color, { emissive: '#000000' }),
      dark: lambert('#2a201b', { emissive: '#000000' }),
      eye: new THREE.MeshBasicMaterial({ color: type === 'babi' ? '#ff3b1f' : '#ff2a2a' })
    };
    const model = type === 'tikus' ? buildRat(this.mats) : type === 'kumbang' ? buildBeetle(this.mats) : buildBoar(this.mats);
    this.model = model;
    this.el.setObject3D('mesh', model);

    // hitbox raycast
    const r = this.info.radius;
    this.hitbox = new THREE.Mesh(G('hit' + r, () => new THREE.SphereGeometry(r, 8, 6)), new THREE.MeshBasicMaterial({ visible: false }));
    this.hitbox.position.y = type === 'babi' ? 0.8 : type === 'tikus' ? 0.4 : 0;
    this.hitbox.userData.enemy = this;
    this.el.object3D.add(this.hitbox);

    // bayangan palsu
    if (type !== 'kumbang') {
      const sh = new THREE.Mesh(G('blob', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.02;
      sh.scale.setScalar(type === 'babi' ? 2.2 : 1.2);
      this.el.object3D.add(sh);
    } else {
      this.el.object3D.position.y = 2.5 + Math.random() * 2;
    }

    // bar HP
    if (this.info.hp > 1) {
      this.hpBar = new CanvasPanel(0.8, 0.1, 128, { renderOrder: 5 });
      this.hpBar.mesh.position.y = type === 'babi' ? 1.75 : 0.65;
      this.el.object3D.add(this.hpBar.mesh);
      this.drawHp();
    }

    this.gm.registerEnemy(this);
    this.spawnScale = 0;
    this.el.object3D.scale.setScalar(0.01);

    this._player = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._camPos = new THREE.Vector3();

    if (type === 'kumbang' && this.audio) {
      this.loop = this.audio.startLoop('buzz', this.el.object3D.position);
    }
  },

  drawHp() {
    const f = this.hp / this.info.hp;
    this.hpBar.draw(f, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = f > 0.5 ? '#7be35a' : f > 0.25 ? '#ffc93a' : '#ff4a3a';
      ctx.fillRect(2, 2, (w - 4) * f, h - 4);
    });
  },

  // dipanggil action-handler saat kena tembak
  takeDamage(amount, point, dir) {
    if (this.dead) return;
    this.hp -= amount;
    this.flash = 0.12;
    this.knock.addScaledVector(this._dir.set(dir.x, 0, dir.z).normalize(), this.data.type === 'babi' ? 1.2 : 3.5);
    this.fx.burst(point, this.data.type === 'kumbang' ? ['#4a3a20', '#9bbf3a'] : ['#8a2a1a', '#b3402a'], 5, 2.5);
    if (this.hpBar) this.drawHp();
    if (this.hp <= 0) {
      this.die();
    } else if (this.audio) {
      this.audio.play('hit', { position: this.el.object3D.position, volume: 0.8 });
    }
  },

  die() {
    this.dead = true;
    const pos = this.el.object3D.position.clone();
    pos.y += this.data.type === 'babi' ? 0.8 : 0.35;
    this.fx.burst(pos, this.data.type === 'kumbang' ? ['#2b1d15', '#5a4630', '#c8d8e8'] : ['#6e6258', '#8a2a1a', '#3a2a20'], this.data.type === 'babi' ? 26 : 16, 4.5);
    if (this.audio) this.audio.play('kill', { position: pos });
    this.gm.enemyKilled(this);
    this.el.parentNode && this.el.parentNode.removeChild(this.el);
  },

  remove() {
    this.gm.unregisterEnemy(this);
    if (this.loop) this.loop.stop();
  },

  tick(t, dtMs) {
    if (this.dead || !this.gm.isRunning()) return;
    const dt = Math.min(dtMs / 1000, 0.05);
    this.age += dt;
    const o = this.el.object3D;
    const type = this.data.type;

    // animasi muncul
    if (this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + dt * 2.5);
      o.scale.setScalar(this.spawnScale);
    }

    // efek kedip putih saat kena tembak
    if (this.flash > 0) {
      this.flash -= dt;
      const e = this.flash > 0 ? 0.9 : 0;
      this.mats.body.emissive.setRGB(e, e, e);
      this.mats.dark.emissive.setRGB(e, e, e);
    }

    const rigPos = this.gm.rig.object3D.position;
    const camY = this.el.sceneEl.camera ? this.el.sceneEl.camera.getWorldPosition(this._camPos).y : 1.6;
    this._player.set(rigPos.x, 0, rigPos.z);
    const dx = this._player.x - o.position.x;
    const dz = this._player.z - o.position.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist;
    const nz = dz / dist;
    let vx = 0;
    let vz = 0;
    this.attackCooldown -= dt;

    if (type === 'tikus') {
      const wig = Math.sin(this.age * 6 + this.phase) * 0.6 * Math.min(1, dist / 6);
      vx = (nx - nz * wig) * this.speed;
      vz = (nz + nx * wig) * this.speed;
      if (dist < 1.1) {
        vx = vz = 0;
        if (this.attackCooldown <= 0) {
          this.gm.damagePlayer(this.info.damage, o.position);
          this.attackCooldown = 1.1;
        }
      }
      if (this.model.userData.tail) this.model.userData.tail.rotation.z = Math.sin(this.age * 14) * 0.4;
      this.model.position.y = Math.abs(Math.sin(this.age * 16)) * 0.06;
    } else if (type === 'kumbang') {
      const orbit = Math.sin(this.age * 2.2 + this.phase) * 0.8;
      vx = (nx - nz * orbit) * this.speed;
      vz = (nz + nx * orbit) * this.speed;
      const targetY = dist < 6 ? camY - 0.25 : 2.6 + Math.sin(this.age * 1.7 + this.phase) * 1.0;
      o.position.y += (targetY - o.position.y) * Math.min(1, dt * 2);
      if (dist < 2.0) {
        // melayang di depan wajah sambil mengitari
        const push = dist < 1.5 ? -2.5 : 0;
        vx = -nz * 1.5 + nx * push;
        vz = nx * 1.5 + nz * push;
        if (this.attackCooldown <= 0 && Math.abs(o.position.y - camY) < 0.9) {
          this.gm.damagePlayer(this.info.damage, o.position);
          this.attackCooldown = 1.3;
          this.knock.set(-nx * 5, 0, -nz * 5); // mundur setelah menyerang
        }
      }
      const flap = Math.sin(this.age * 60) * 0.6;
      this.model.userData.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * flap));
      if (this.loop) this.loop.setPosition(o.position);
    } else {
      // babi hutan
      this.modeTimer -= dt;
      if (this.mode === 'approach') {
        vx = nx * this.speed;
        vz = nz * this.speed;
        if (dist < 11 && dist > 3) {
          this.mode = 'windup';
          this.modeTimer = 0.9;
          if (this.audio) this.audio.play('grunt', { position: o.position });
        }
      } else if (this.mode === 'windup') {
        // ancang-ancang
        this.model.rotation.x = -0.12 + Math.sin(this.age * 30) * 0.05;
        if (this.modeTimer <= 0) {
          this.mode = 'charge';
          this.modeTimer = 1.6;
          this.chargeDir.set(nx, 0, nz);
          this.model.rotation.x = 0;
          if (this.audio) this.audio.play('charge', { position: o.position });
        }
      } else if (this.mode === 'charge') {
        const cs = 8.5 * this.data.speedMul;
        vx = this.chargeDir.x * cs;
        vz = this.chargeDir.z * cs;
        if (dist < 1.6 && this.attackCooldown <= 0) {
          this.gm.damagePlayer(this.info.damage, o.position);
          this.attackCooldown = 1.5;
          this.el.sceneEl.emit('player-knockback', { dir: this.chargeDir.clone(), force: 4 });
          this.mode = 'recover';
          this.modeTimer = 1.4;
        }
        if (this.modeTimer <= 0) {
          this.mode = 'recover';
          this.modeTimer = 1.0;
        }
      } else if (this.mode === 'recover') {
        vx = -nx * 1.2;
        vz = -nz * 1.2;
        if (this.modeTimer <= 0) this.mode = 'approach';
      }
      const legSpeed = this.mode === 'charge' ? 22 : 10;
      this.model.userData.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.age * legSpeed + (i % 2 ? 0 : Math.PI)) * 0.5));
    }

    // gerak + knockback
    o.position.x += (vx + this.knock.x) * dt;
    o.position.z += (vz + this.knock.z) * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    // hindari batang sawit
    if (type !== 'kumbang' && this.gm.plantation) this.gm.plantation.resolveCollision(o.position, type === 'babi' ? 0.6 : 0.3);

    // hadap arah gerak (model menghadap +Z)
    const mvx = vx + this.knock.x * 0.2;
    const mvz = vz + this.knock.z * 0.2;
    if (Math.abs(mvx) + Math.abs(mvz) > 0.05) {
      const target = Math.atan2(mvx, mvz);
      let diff = target - o.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      o.rotation.y += diff * Math.min(1, dt * 10);
    }
    if (type === 'kumbang' && dist < 6) {
      // kumbang menatap pemain
      o.rotation.y = Math.atan2(nx, nz);
    }

    if (this.hpBar) this.hpBar.mesh.lookAt(this._camPos);

    // suara spasial periodik
    this.soundTimer -= dt;
    if (this.soundTimer <= 0 && this.audio) {
      if (type === 'tikus') {
        this.audio.play('squeak', { position: o.position, volume: 0.9 });
        this.soundTimer = 1.5 + Math.random() * 2.5;
      } else if (type === 'babi' && this.mode === 'approach') {
        this.audio.play('grunt', { position: o.position, volume: 0.7 });
        this.soundTimer = 2.5 + Math.random() * 2;
      } else this.soundTimer = 1;
    }
  }
});
