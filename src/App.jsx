import { useEffect, useState } from 'react';

// Scene A-Frame dirender sekali, logika game ada di components/systems.
const scene = () => document.querySelector('a-scene');

export default function App() {
  const [pad, setPad] = useState(null);
  const [muted, setMuted] = useState(false);
  const [stereo, setStereo] = useState(false);
  const [xr, setXr] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPad = () => {
      const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected);
      setPad(p ? p.id : null);
    };
    window.addEventListener('gamepadconnected', onPad);
    window.addEventListener('gamepaddisconnected', onPad);
    const el = scene();
    const onStereo = (e) => setStereo(e.detail.enabled);
    const onMute = (e) => setMuted(e.detail.muted);
    el.addEventListener('stereo-changed', onStereo);
    el.addEventListener('mute-changed', onMute);
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-vr').then(setXr).catch(() => {});
    }
    return () => {
      window.removeEventListener('gamepadconnected', onPad);
      window.removeEventListener('gamepaddisconnected', onPad);
      el.removeEventListener('stereo-changed', onStereo);
      el.removeEventListener('mute-changed', onMute);
    };
  }, []);

  const sys = (name) => scene().systems[name];
  const unlockAudio = () => sys('audio-manager').unlock();
  const cardboard = () => {
    unlockAudio();
    sys('stereo-mode').toggle();
  };
  const headset = () => {
    unlockAudio();
    scene().enterVR();
  };
  const fullscreen = () => {
    unlockAudio();
    const d = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
  };
  const mute = () => {
    unlockAudio();
    sys('audio-manager').toggleMute();
  };

  return (
    <>
      <div id="ui-overlay">
        {!stereo && (
          <>
            <div className="topbar">
              <div className="brand">
                SAWIT STRIKE <span>Penjaga Kebun</span>
              </div>
              <div className="buttons">
                <button onClick={cardboard} title="Layar terbelah untuk Google Cardboard / VR Box (V / Options)">🥽 Mode VR</button>
                {xr && <button onClick={headset}>VR Headset</button>}
                <button onClick={fullscreen} title="Layar penuh">⛶</button>
                <button onClick={mute} title="Suara (M / Share)">{muted ? '🔇' : '🔊'}</button>
                <button onClick={() => setHelp(!help)} title="Kontrol">?</button>
              </div>
            </div>
            <div className={'pad ' + (pad ? 'on' : '')}>
              🎮 {pad ? 'Gamepad terhubung' : 'Gamepad belum terhubung, tekan tombol apa saja di controller'}
            </div>
            {!window.isSecureContext && (
              <div className="warn">⚠ Buka lewat HTTPS agar gyroscope HP bisa dipakai.</div>
            )}
            {help && (
              <div className="help" onClick={() => setHelp(false)}>
                <h3>Kontrol</h3>
                <table>
                  <tbody>
                    <tr><th></th><th>PS4 / PS5</th><th>Keyboard / HP</th></tr>
                    <tr><td>Bidik</td><td>Gyro HP / stik kanan</td><td>Mouse / geser layar</td></tr>
                    <tr><td>Gerak</td><td>Stik kiri (L2 = lari)</td><td>WASD (Shift = lari)</td></tr>
                    <tr><td>Tembak</td><td>R2 / R1</td><td>Klik / Spasi / tap</td></tr>
                    <tr><td>Isi peluru</td><td>Kotak</td><td>R</td></tr>
                    <tr><td>Pilih</td><td>X</td><td>Enter / tatap tombol</td></tr>
                    <tr><td>Jeda</td><td>Segitiga</td><td>P</td></tr>
                    <tr><td>Mode VR</td><td>Options</td><td>V</td></tr>
                    <tr><td>Suara</td><td>Share</td><td>M</td></tr>
                  </tbody>
                </table>
                <p>Tombol O sengaja tidak dipakai (di Android = Back, bisa keluar dari layar penuh).</p>
              </div>
            )}
          </>
        )}
        {stereo && (
          <button className="exit-stereo" onClick={cardboard}>✕ Keluar VR</button>
        )}
      </div>

      <a-scene
        renderer="antialias: auto; colorManagement: true; maxCanvasWidth: 1920; maxCanvasHeight: 1920"
        vr-mode-ui="enabled: false"
        fog="type: exponential; color: #d8d2a8; density: 0.024"
        background="color: #d8d2a8"
        loading-screen="dotsColor: #f4a300; backgroundColor: #16301a"
        device-orientation-permission-ui="enabled: true"
      >
        {/* aset dibuat prosedural, tidak ada file eksternal */}
        <a-assets></a-assets>

        <a-entity plantation=""></a-entity>

        <a-entity light="type: hemisphere; color: #e8f2ff; groundColor: #6b5434; intensity: 2.2"></a-entity>
        <a-entity light="type: directional; color: #ffe9c4; intensity: 2.4" position="-4 8 -5"></a-entity>

        {/* rig digerakkan stik kiri, kamera diputar gyro */}
        <a-entity id="player-rig" gamepad-mover="" position="0 0 0">
          <a-entity
            id="camera"
            camera="fov: 75"
            look-controls="pointerLockEnabled: true; magicWindowTrackingEnabled: true; touchEnabled: true"
            position="0 1.6 0"
            action-handler=""
            hud=""
          ></a-entity>
        </a-entity>

        <a-entity id="menus" game-menus=""></a-entity>
        <a-entity id="enemy-container"></a-entity>
      </a-scene>
    </>
  );
}
