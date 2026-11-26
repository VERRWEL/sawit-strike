/**
 * Tekstur prosedural (dibuat sendiri dengan Canvas 2D) — tidak ada file gambar
 * yang diunduh. Dicatat sebagai aset "buatan sendiri" di Material Collecting.
 */
import { seededRandom } from './helpers.js';

const THREE = AFRAME.THREE;
const cache = {};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

/** Daun pelepah sawit: tulang daun di tengah + anak daun diagonal (pakai alpha). */
export function leafletTexture() {
  if (cache.leaf) return cache.leaf;
  const rng = seededRandom(7);
  const c = canvas(512, 128);
  const g = c.getContext('2d');
  const mid = 64;
  g.lineCap = 'round';
  for (let x = 10; x < 505; x += 6) {
    const t = x / 512;
    const len = 58 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6) + 6;
    for (const side of [-1, 1]) {
      const shade = 200 + Math.floor(rng() * 55);
      g.strokeStyle = `rgb(${shade},${shade},${shade})`;
      g.lineWidth = 3.2 + rng() * 1.5;
      g.beginPath();
      g.moveTo(x, mid);
      g.quadraticCurveTo(x + len * 0.25, mid + side * len * 0.6, x + len * 0.55 + rng() * 6, mid + side * len);
      g.stroke();
    }
  }
  g.strokeStyle = 'rgb(170,170,120)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, mid);
  g.lineTo(512, mid);
  g.stroke();
  cache.leaf = toTexture(c);
  cache.leaf.wrapS = cache.leaf.wrapT = THREE.ClampToEdgeWrapping;
  return cache.leaf;
}

/** Batang sawit: pola bekas pangkal pelepah (berbentuk wajik). */
export function trunkTexture() {
  if (cache.trunk) return cache.trunk;
  const rng = seededRandom(11);
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#5a4630';
  g.fillRect(0, 0, 256, 256);
  const rows = 8;
  const cols = 6;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols + 1; k++) {
      const x = (k + (r % 2) * 0.5) * (256 / cols);
      const y = r * (256 / rows) + 16;
      const w = 256 / cols / 2 + 4;
      const h = 256 / rows / 2 + 6;
      const l = 70 + rng() * 45;
      g.fillStyle = `rgb(${l + 25},${l + 5},${l - 25})`;
      g.beginPath();
      g.moveTo(x, y - h);
      g.lineTo(x + w, y);
      g.lineTo(x, y + h * 0.6);
      g.lineTo(x - w, y);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(30,20,10,0.6)';
      g.lineWidth = 3;
      g.stroke();
      if (rng() < 0.3) {
        // lumut / pakis kecil yang menempel di batang
        g.fillStyle = `rgba(70,${110 + rng() * 50},40,0.8)`;
        g.beginPath();
        g.arc(x + (rng() - 0.5) * 10, y, 3 + rng() * 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  cache.trunk = toTexture(c, 1, 3);
  return cache.trunk;
}

/** Tanah kebun: tanah merah-cokelat + bercak rumput. */
export function groundTexture() {
  if (cache.ground) return cache.ground;
  const rng = seededRandom(23);
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  g.fillStyle = '#6b5434';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const r = 10 + rng() * 40;
    const green = rng() < 0.55;
    const a = 0.12 + rng() * 0.25;
    g.fillStyle = green ? `rgba(${70 + rng() * 30},${110 + rng() * 40},${40},${a})` : `rgba(${120 + rng() * 40},${80},${40},${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 5000; i++) {
    const l = rng();
    g.fillStyle = l < 0.5 ? 'rgba(40,30,15,0.35)' : 'rgba(150,170,80,0.3)';
    g.fillRect(rng() * 512, rng() * 512, 2, 2);
  }
  cache.ground = toTexture(c, 40, 40);
  return cache.ground;
}

/** Langit sore tropis (gradien vertikal). Warna horizon disamakan dengan fog. */
export const HORIZON_COLOR = '#d8d2a8';
export function skyTexture() {
  if (cache.sky) return cache.sky;
  const c = canvas(8, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2f6fc4');
  grad.addColorStop(0.32, '#7fb3de');
  grad.addColorStop(0.47, HORIZON_COLOR);
  grad.addColorStop(0.53, HORIZON_COLOR);
  grad.addColorStop(1.0, '#6f6a48');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 512);
  cache.sky = new THREE.CanvasTexture(c);
  cache.sky.colorSpace = THREE.SRGBColorSpace;
  return cache.sky;
}

/** Vinyet merah saat pemain terkena serangan. */
export function vignetteTexture() {
  if (cache.vig) return cache.vig;
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 40, 128, 128, 180);
  grad.addColorStop(0, 'rgba(200,0,0,0)');
  grad.addColorStop(0.6, 'rgba(200,0,0,0.35)');
  grad.addColorStop(1, 'rgba(160,0,0,0.9)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  cache.vig = new THREE.CanvasTexture(c);
  return cache.vig;
}

/** Kilatan moncong senapan (sprite bintang). */
export function flashTexture() {
  if (cache.flash) return cache.flash;
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.3, 'rgba(255,200,80,0.9)');
  grad.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = grad;
  g.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3);
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(60, 0);
    g.lineTo(0, 6);
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, 26, 0, Math.PI * 2);
  g.fill();
  cache.flash = new THREE.CanvasTexture(c);
  return cache.flash;
}

/** Bayangan bulat palsu di bawah musuh (lebih murah dari shadow map). */
export function blobShadowTexture() {
  if (cache.blob) return cache.blob;
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  cache.blob = new THREE.CanvasTexture(c);
  return cache.blob;
}
