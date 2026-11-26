// helper umum
const THREE = AFRAME.THREE;

// random ber-seed (mulberry32)
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// gabung beberapa BufferGeometry jadi satu (non-indexed)
export function mergeGeometries(geoms) {
  const parts = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let count = 0;
  parts.forEach((g) => (count += g.attributes.position.count));
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  parts.forEach((g) => {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (!g.attributes.normal) g.computeVertexNormals();
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
    else col.fill(1, o * 3, (o + n) * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += n;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

// warna vertex seragam
export function paint(geom, hex, jitter = 0, rng = Math.random) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rng() - 0.5) * jitter;
    for (let j = 0; j < 3 && i + j < n; j++) {
      arr[(i + j) * 3] = c.r * k;
      arr[(i + j) * 3 + 1] = c.g * k;
      arr[(i + j) * 3 + 2] = c.b * k;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export const UI_FONT = "'Trebuchet MS', 'Segoe UI', Roboto, Arial, sans-serif";

// panel teks dari canvas, pengganti <a-text>
export class CanvasPanel {
  constructor(widthM, heightM, pxPerM = 512, opts = {}) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.max(16, Math.round(widthM * pxPerM));
    this.canvas.height = Math.max(16, Math.round(heightM * pxPerM));
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: opts.depthTest !== undefined ? opts.depthTest : true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), this.material);
    if (opts.renderOrder) this.mesh.renderOrder = opts.renderOrder;
    this._last = null;
  }

  // redraw hanya kalau key berubah
  draw(key, fn) {
    if (key !== undefined && key === this._last) return;
    this._last = key;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fn(ctx, canvas.width, canvas.height);
    this.texture.needsUpdate = true;
  }
}

// rounded rect
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// true kalau object3D & semua parent visible
export function isShown(obj) {
  while (obj) {
    if (!obj.visible) return false;
    obj = obj.parent;
  }
  return true;
}
