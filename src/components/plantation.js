// plantation: kebun sawit prosedural. Pohon pakai InstancedMesh biar hemat draw call.
import { seededRandom, mergeGeometries, paint, CanvasPanel, UI_FONT } from '../utils/helpers.js';
import { leafletTexture, trunkTexture, groundTexture, skyTexture } from '../utils/textures.js';

const THREE = AFRAME.THREE;

// geometri pohon

// satu pelepah
function buildFrond(angle, elevation, length, droop, color, rng) {
  const seg = 7;
  const W = 0.95 * (length / 4.8);
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const h = length * t * Math.cos(elevation);
    const v = length * t * Math.sin(elevation) - droop * length * t * t;
    pts.push(new THREE.Vector3().addScaledVector(dir, h + 0.25).addScaledVector(up, v));
  }
  const pos = [];
  const uv = [];
  const col = [];
  const c = new THREE.Color(color);
  const tip = c.clone().multiplyScalar(0.85);
  for (let i = 0; i < seg; i++) {
    const rows = [i, i + 1].map((k) => {
      const t = k / seg;
      const w = W * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.7));
      const p = pts[k];
      const fold = 0.22 * w;
      return {
        l: p.clone().addScaledVector(side, -w).addScaledVector(up, -fold),
        m: p.clone().addScaledVector(up, 0.03),
        r: p.clone().addScaledVector(side, w).addScaledVector(up, -fold),
        t
      };
    });
    const [a, b] = rows;
    const quad = (p1, p2, p3, p4, v1, v2) => {
      // p1,p2 = baris a ; p3,p4 = baris b
      pos.push(...p1.toArray(), ...p3.toArray(), ...p2.toArray());
      pos.push(...p2.toArray(), ...p3.toArray(), ...p4.toArray());
      uv.push(a.t, v1, b.t, v1, a.t, v2, a.t, v2, b.t, v1, b.t, v2);
    };
    quad(a.l, a.m, b.l, b.m, 0, 0.5);
    quad(a.m, a.r, b.m, b.r, 0.5, 1);
    for (let k = 0; k < 12; k++) {
      const cc = c.clone().lerp(tip, (k % 3 === 1 ? b.t : a.t)).multiplyScalar(0.9 + rng() * 0.2);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function buildCrown(rng) {
  const fronds = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const greens = ['#3f7a2a', '#4d8a30', '#356b24', '#5a9436'];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = i * golden + rng() * 0.2;
    const layer = i / N; // 0 = pucuk (atas), 1 = bawah
    let elev = THREE.MathUtils.lerp(1.05, -0.15, layer) + (rng() - 0.5) * 0.15;
    let droop = THREE.MathUtils.lerp(0.25, 0.75, layer);
    let color = greens[i % greens.length];
    const len = 4.2 + rng() * 1.2;
    if (i >= N - 4) {
      // pelepah kering
      elev = -0.55 - rng() * 0.3;
      droop = 0.35;
      color = rng() < 0.5 ? '#8a6d34' : '#9b8a45';
    }
    fronds.push(buildFrond(a, elev, len, droop, color, rng));
  }
  return mergeGeometries(fronds);
}

// pangkal pelepah + tandan buah
function buildFruitAndHead(rng) {
  const parts = [];
  const head = new THREE.IcosahedronGeometry(0.62, 1);
  head.scale(1, 0.85, 1);
  parts.push(paint(head, '#4a5a25', 0.25, rng));
  // pangkal pelepah
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const g = new THREE.ConeGeometry(0.16, 0.7, 4);
    g.rotateZ(-1.1);
    g.rotateY(-a);
    g.translate(Math.cos(a) * 0.45, -0.35, Math.sin(a) * 0.45);
    parts.push(paint(g, '#5d4b2a', 0.3, rng));
  }
  // 3 tandan buah
  const ripe = ['#c63d12', '#d9541a', '#a32d10'];
  const raw = ['#2a1420', '#3a1a24'];
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2 + rng() * 0.6;
    const cx = Math.cos(a) * 0.55;
    const cz = Math.sin(a) * 0.55;
    const cy = -0.55;
    const isRipe = rng() < 0.7;
    for (let k = 0; k < 9; k++) {
      const g = new THREE.IcosahedronGeometry(0.1 + rng() * 0.04, 0);
      g.translate(cx + (rng() - 0.5) * 0.3, cy + (rng() - 0.5) * 0.35, cz + (rng() - 0.5) * 0.3);
      const pal = isRipe ? ripe : raw;
      parts.push(paint(g, pal[Math.floor(rng() * pal.length)], 0.2, rng));
    }
  }
  return mergeGeometries(parts);
}

function buildTrunk() {
  const g = new THREE.CylinderGeometry(0.36, 0.5, 1, 9, 4, true);
  g.translate(0, 0.5, 0);
  return g;
}

// komponen

AFRAME.registerComponent('plantation', {
  schema: {
    seed: { default: 2026 },
    spacing: { default: 8.5 },
    extent: { default: 56 },
    clearing: { default: 8 }
  },

  init() {
    const rng = seededRandom(this.data.seed);
    this.colliders = []; // {x, z, r}
    const root = new THREE.Group();
    this.el.setObject3D('plantation', root);

    this.buildSky(root);
    this.buildGround(root, rng);
    this.buildPalms(root, rng);
    this.buildCamp(root, rng);
    // simpan ke game-manager
    this.el.sceneEl.systems['game-manager'].plantation = this;
  },

  buildSky(root) {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    sky.renderOrder = -10;
    root.add(sky);
    // matahari sore
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(7, 24),
      new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false, transparent: true, opacity: 0.9 })
    );
    sun.position.set(-90, 60, -110);
    sun.lookAt(0, 0, 0);
    root.add(sun);
  },

  buildGround(root, rng) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    // rumput (instanced)
    const tuft = new THREE.ConeGeometry(0.18, 0.45, 5);
    tuft.translate(0, 0.22, 0);
    const tuftMat = new THREE.MeshLambertMaterial({ color: '#5f8f34' });
    const COUNT = 450;
    const tufts = new THREE.InstancedMesh(tuft, tuftMat, COUNT);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const col = new THREE.Color();
    const E = this.data.extent;
    for (let i = 0; i < COUNT; i++) {
      p.set((rng() * 2 - 1) * E, 0, (rng() * 2 - 1) * E);
      if (Math.hypot(p.x, p.z) < 3) p.x += 4;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
      const k = 0.6 + rng() * 0.7;
      s.set(k, k * (0.7 + rng() * 0.6), k);
      m.compose(p, q, s);
      tufts.setMatrixAt(i, m);
      tufts.setColorAt(i, col.setHSL(0.24 + rng() * 0.06, 0.45, 0.28 + rng() * 0.12));
    }
    root.add(tufts);
  },

  buildPalms(root, rng) {
    const { spacing, extent, clearing } = this.data;
    const positions = [];
    const rowGap = spacing * 0.866; // pola segitiga sama sisi
    let row = 0;
    for (let z = -extent; z <= extent; z += rowGap, row++) {
      const offset = row % 2 ? spacing / 2 : 0;
      for (let x = -extent + offset; x <= extent; x += spacing) {
        const px = x + (rng() - 0.5) * 0.8;
        const pz = z + (rng() - 0.5) * 0.8;
        if (Math.hypot(px, pz) < clearing) continue;
        positions.push({ x: px, z: pz, row });
      }
    }
    this.rowGap = rowGap;

    const trunkGeo = buildTrunk();
    const crownGeo = buildCrown(rng);
    const fruitGeo = buildFruitAndHead(rng);
    const trunkMat = new THREE.MeshLambertMaterial({ map: trunkTexture() });
    const frondMat = new THREE.MeshLambertMaterial({
      map: leafletTexture(),
      vertexColors: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide
    });
    const fruitMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    const n = positions.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
    const crowns = new THREE.InstancedMesh(crownGeo, frondMat, n);
    const fruits = new THREE.InstancedMesh(fruitGeo, fruitMat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    const tint = new THREE.Color();
    positions.forEach((t, i) => {
      const h = 3.2 + rng() * 3.4; // tinggi 3-6.6 m
      const r = 0.9 + rng() * 0.25;
      const rot = rng() * Math.PI * 2;
      q.setFromAxisAngle(Y, rot);
      m.compose(p.set(t.x, 0, t.z), q, s.set(r, h, r));
      trunks.setMatrixAt(i, m);
      const cs = 0.9 + rng() * 0.25;
      m.compose(p.set(t.x, h, t.z), q, s.set(cs, cs, cs));
      crowns.setMatrixAt(i, m);
      fruits.setMatrixAt(i, m);
      crowns.setColorAt(i, tint.setHSL(0, 0, 0.85 + rng() * 0.3));
      this.colliders.push({ x: t.x, z: t.z, r: 0.75 });
    });
    [trunks, crowns, fruits].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      root.add(im);
    });

    // tumpukan pelepah antar baris
    const stackGeo = new THREE.BoxGeometry(1.1, 0.3, spacing * 0.7);
    stackGeo.translate(0, 0.15, 0);
    const stackMat = new THREE.MeshLambertMaterial({ color: '#7d6a3a' });
    const stacks = new THREE.InstancedMesh(stackGeo, stackMat, positions.length);
    let k = 0;
    positions.forEach((t) => {
      if (rng() < 0.45) return;
      const sx = t.x + spacing / 2;
      const sz = t.z + rowGap / 2;
      if (Math.hypot(sx, sz) < clearing + 1) return;
      q.setFromAxisAngle(Y, Math.PI / 2 + (rng() - 0.5) * 0.3);
      m.compose(p.set(sx, 0, sz), q, s.set(1, 0.6 + rng() * 0.8, 1));
      stacks.setMatrixAt(k++, m);
    });
    stacks.count = k;
    root.add(stacks);
  },

  // pondok, tumpukan TBS, papan nama
  buildCamp(root, rng) {
    const camp = new THREE.Group();
    camp.position.set(4.5, 0, 3.5);
    camp.rotation.y = -0.6;
    const wood = new THREE.MeshLambertMaterial({ color: '#7a5532' });
    const thatch = new THREE.MeshLambertMaterial({ color: '#a88a4a', flatShading: true });
    [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), wood);
      post.position.set(x, 1.2, z);
      camp.add(post);
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.4), wood);
    floor.position.y = 0.55;
    camp.add(floor);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.3, 4), thatch);
    roof.position.y = 3.0;
    roof.rotation.y = Math.PI / 4;
    camp.add(roof);
    root.add(camp);
    this.colliders.push({ x: 4.5, z: 3.5, r: 1.9 });

    // tumpukan TBS
    const pile = new THREE.Group();
    pile.position.set(-4.2, 0, 2.6);
    const fruitMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const parts = [];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.IcosahedronGeometry(0.28, 0);
      g.scale(1, 0.8, 1);
      const a = rng() * 6.28;
      const r = rng() * 0.9;
      g.translate(Math.cos(a) * r, 0.22 + (0.9 - r) * 0.45 + rng() * 0.15, Math.sin(a) * r);
      parts.push(paint(g, rng() < 0.75 ? '#c2410f' : '#3a1a24', 0.25, rng));
    }
    pile.add(new THREE.Mesh(mergeGeometries(parts), fruitMat));
    root.add(pile);
    this.colliders.push({ x: -4.2, z: 2.6, r: 1.1 });

    // papan nama
    const sign = new THREE.Group();
    sign.position.set(-2.8, 0, -6.2);
    sign.rotation.y = 0.35;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), wood);
    pole.position.y = 0.8;
    sign.add(pole);
    const board = new CanvasPanel(1.4, 0.7, 256);
    board.draw('sign', (ctx, w, h) => {
      ctx.fillStyle = '#e9e1c3';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2f5a1f';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.fillStyle = '#2f5a1f';
      ctx.textAlign = 'center';
      ctx.font = `bold 46px ${UI_FONT}`;
      ctx.fillText('BLOK A-12', w / 2, 70);
      ctx.font = `28px ${UI_FONT}`;
      ctx.fillText('Tahun Tanam 2014', w / 2, 115);
      ctx.fillText('Afdeling III', w / 2, 152);
    });
    board.material.fog = true;
    board.mesh.position.y = 1.75;
    sign.add(board.mesh);
    root.add(sign);
  },

  // dorong (x,z) keluar dari batang terdekat
  resolveCollision(pos, radius = 0.35) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const min = c.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    const E = this.data.extent - 2;
    pos.x = Math.max(-E, Math.min(E, pos.x));
    pos.z = Math.max(-E, Math.min(E, pos.z));
  }
});
