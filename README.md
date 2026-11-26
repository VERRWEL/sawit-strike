# Sawit Strike — Penjaga Kebun

Game **VR berbasis web** (A-Frame 1.8 + React + Vite) bertema **FPS shooter di kebun kelapa sawit**.
Pemain berperan sebagai penjaga kebun Blok A-12 yang harus membasmi hama sawit
(tikus, kumbang tanduk, babi hutan) gelombang demi gelombang.

Tugas Kelompok II — Pemrograman VR/AR.

---

## Cara Menjalankan

```bash
npm install
npm run dev        # server lokal (http://localhost:5173), --host agar bisa diakses HP di jaringan yang sama
npm run build      # hasil produksi di folder dist/
npm run preview    # menjalankan hasil build
```

### Tes di HP (wajib HTTPS untuk gyroscope)
Chrome Android memblokir sensor gyroscope di `http://`. Pilih salah satu:
- **GitHub Pages / Netlify / Vercel**: upload isi folder `dist/` (path sudah relatif, `base: './'`).
- **Tunnel**: `npm run dev` lalu `npx cloudflared tunnel --url http://localhost:5173` atau `ngrok http 5173`, buka URL `https://...` di HP.

Lalu: pasang controller PS4/PS5 via Bluetooth ke HP → buka di **Chrome Android** → tekan **🥽 Mode VR** → masukkan HP ke Cardboard/VR Box.

---

## Kontrol

| Aksi | PS4 / PS5 (Bluetooth) | Keyboard & Mouse | HP tanpa controller |
|---|---|---|---|
| Bidik / lihat | Gyroscope HP, stik kanan | Mouse (pointer lock) | Gyroscope / geser layar |
| Gerak | Stik kiri | WASD / panah | – (hama datang sendiri) |
| Lari | L2 / L3 | Shift | – |
| Tembak | R2 / R1 (tahan = otomatis) | Klik / Spasi | Tap layar; di Mode VR tembak otomatis saat crosshair di hama |
| Isi peluru | Kotak | R | Otomatis saat peluru habis |
| Pilih menu | X | Enter | Tatap tombol 1,6 detik (fuse) |
| Jeda | Segitiga | P | – |
| Mode VR (layar terbelah) | Options | V | Tombol 🥽 Mode VR |
| Suara on/off | Share | M | Tombol 🔊 |
| Putar badan | D-pad kiri/kanan | Q / E | – |
| Hadapkan ulang menu | D-pad atas | C | – |

> Tombol **O (Circle) sengaja tidak dipakai**: di Android tombol ini = Back dan bisa mengeluarkan browser dari layar penuh/VR.

---

## Gameplay

- **Gelombang (wave)**: jumlah, kecepatan, dan jenis hama naik tiap gelombang. Setiap kelipatan 3 muncul 2 babi hutan tambahan.
- **Hama**
  | Hama | HP | Perilaku | Skor |
  |---|---|---|---|
  | Tikus | 1 | Cepat, berlari zig-zag, menggigit (5 dmg) | 100 |
  | Kumbang tanduk | 2 | Terbang naik-turun, melayang di depan wajah (7 dmg), dengung 3D | 150 |
  | Babi hutan | 6 | Lambat, ancang-ancang lalu menyeruduk (16 dmg + terpental) | 400 |
- **Tandan Buah Segar (TBS)** dijatuhkan hama → HP +20, skor +50. Ambil dengan berjalan ke sana **atau menembaknya**.
- Gelombang selesai → bonus skor + HP +15. Skor terbaik disimpan di `localStorage`.
- Suara hama memakai **spatial audio** (HRTF): dengarkan arah cicit tikus / dengung kumbang lalu menoleh.

---

## Struktur Folder

```text
sawit-strike/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                  # import A-Frame → registrasi system & component → render React
    ├── App.jsx                   # <a-scene>, camera rig, overlay tombol HTML (di luar VR)
    ├── styles.css
    ├── systems/
    │   ├── game-manager.js       # state global: skor, HP, wave, spawn, menu/playing/paused/gameover
    │   ├── audio-manager.js      # SFX & BGM sintesis Web Audio + spatial audio (PannerNode HRTF)
    │   ├── effects.js            # partikel, tracer peluru, teks skor melayang (object pooling)
    │   └── stereo-mode.js        # mode VR Cardboard (render 2x dengan THREE.StereoCamera)
    ├── components/
    │   ├── plantation.js         # kebun sawit prosedural (InstancedMesh), tanah, langit, pondok
    │   ├── gamepad-mover.js      # stik kiri/WASD → gerak rig relatif arah pandang kamera
    │   ├── action-handler.js     # tembak (raycast), reload, pilih menu, jeda, toggle VR
    │   ├── enemy.js              # model & AI hama (tikus, kumbang, babi hutan)
    │   ├── pickup.js             # TBS pemulih HP
    │   ├── hud.js                # HUD 3D di kamera: crosshair, skor, HP, peluru, pengumuman
    │   ├── ui-button.js          # tombol 3D (tembak / X / tatap)
    │   └── game-menus.js         # panel Menu Utama, Jeda, Game Over
    └── utils/
        ├── input.js              # Gamepad API + keyboard + mouse + tap (mapping tombol PS)
        ├── textures.js           # tekstur canvas prosedural (daun, batang, tanah, langit)
        └── helpers.js            # random ber-seed, merge geometry, panel teks canvas
```

## Arsitektur (untuk bagian *Assembly*)

1. **Entity-Component-System A-Frame.** Logika dipisah ke `AFRAME.registerSystem` (state global) dan `AFRAME.registerComponent` (perilaku per-entity). Komponen saling berkomunikasi lewat method system & event scene (`game-update`, `game-state`, `player-hit`, `announce`, `weapon-update`).
2. **Camera rig.** `#player-rig` digeser oleh `gamepad-mover`; kamera di dalamnya diputar `look-controls` (gyroscope/mouse). Vektor stik kiri diputar mengikuti *yaw* kamera sehingga "maju" = arah pandang.
3. **Polling 60 fps di `tick()`**, bukan di React state. React hanya merender scene sekali + overlay tombol.
4. **Hitscan raycast** dari tengah kamera (`THREE.Raycaster`) ke hitbox bola tak terlihat milik hama/TBS/tombol.
5. **UI 3D**: semua HUD & menu digambar di `<canvas>` lalu dijadikan tekstur plane (tidak bergantung font CDN; tetap terlihat di mode VR).
6. **Performa HP**: ±150 pohon sawit hanya 3 draw call (InstancedMesh), tanpa shadow map (pakai blob shadow), fog untuk menyembunyikan batas dunia, material Lambert.
7. **Mode VR Cardboard**: A-Frame ≥1.5 menghapus polyfill WebVR dan Chrome Android tidak menyediakan sesi `immersive-vr` untuk Cardboard, jadi `stereo-mode` membungkus `renderer.render()` untuk menggambar mata kiri & kanan. Untuk headset WebXR asli (mis. Quest) muncul tombol "VR Headset".

---

## Material Collecting

Semua aset **dibuat sendiri secara prosedural di kode** — tidak ada file model/gambar/audio yang diunduh.

| Aset | Jenis | Sumber |
|---|---|---|
| Pohon kelapa sawit (batang, pelepah, tandan buah) | Model 3D | Dibuat sendiri — geometri Three.js (`plantation.js`) |
| Tikus, kumbang tanduk, babi hutan | Model 3D | Dibuat sendiri — primitif Three.js (`enemy.js`) |
| Senapan angin, pondok, papan blok, tumpukan TBS | Model 3D | Dibuat sendiri (`action-handler.js`, `plantation.js`) |
| Tekstur daun, batang, tanah, langit, vinyet, kilatan | Tekstur | Dibuat sendiri — Canvas 2D (`textures.js`) |
| Semua SFX (tembakan, reload, cicit, dengung, dengusan, dll.) | Audio | Dibuat sendiri — sintesis Web Audio API (`audio-manager.js`) |
| BGM bernuansa gamelan | Audio | Dibuat sendiri — sequencer prosedural, tangga nada pentatonis |
| Font | Teks | Font sistem perangkat (Trebuchet MS / Segoe UI / Roboto) |

**Library**
- A-Frame 1.8.0 — https://aframe.io (MIT)
- React 19 — https://react.dev (MIT)
- Vite 8 — https://vite.dev (MIT)

**Referensi (dipelajari, tidak disalin)**
- A-Blast (pola wave shooter & HUD) — https://github.com/aframevr/a-blast
- aframe-extras (gamepad-controls & movement-controls) — https://github.com/c-frame/aframe-extras
- Dokumentasi A-Frame (ECS, look-controls, camera) — https://aframe.io/docs/
- MDN Gamepad API — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
- MDN Web Audio API (PannerNode, OscillatorNode) — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Three.js StereoCamera — https://threejs.org/docs/#api/en/cameras/StereoCamera
