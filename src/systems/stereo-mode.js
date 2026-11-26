// stereo-mode: split-screen Cardboard manual pakai THREE.StereoCamera.
// A-Frame >= 1.5 sudah tidak punya polyfill WebVR, jadi Cardboard di HP harus begini.
const THREE = AFRAME.THREE;

AFRAME.registerSystem('stereo-mode', {
  init() {
    this.enabled = false;
    this.stereo = new THREE.StereoCamera();
    this.stereo.eyeSep = 0.064;
    this.size = new THREE.Vector2();
    const scene = this.el;
    const hook = () => {
      const renderer = scene.renderer;
      if (!renderer || renderer.__stereoHooked) return;
      renderer.__stereoHooked = true;
      const original = renderer.render.bind(renderer);
      const self = this;
      renderer.render = function (sceneObj, camera) {
        if (!self.enabled || renderer.xr.isPresenting || !camera || !camera.isPerspectiveCamera) {
          return original(sceneObj, camera);
        }
        if (sceneObj.matrixWorldAutoUpdate !== false) sceneObj.updateMatrixWorld();
        if (camera.parent === null && camera.matrixWorldAutoUpdate !== false) camera.updateMatrixWorld();
        self.stereo.update(camera);
        renderer.getSize(self.size);
        const w = self.size.x / 2;
        const h = self.size.y;
        renderer.setScissorTest(true);
        renderer.setScissor(0, 0, w, h);
        renderer.setViewport(0, 0, w, h);
        original(sceneObj, self.stereo.cameraL);
        renderer.setScissor(w, 0, w, h);
        renderer.setViewport(w, 0, w, h);
        original(sceneObj, self.stereo.cameraR);
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, self.size.x, self.size.y);
      };
    };
    if (scene.renderer) hook();
    else scene.addEventListener('renderstart', hook);
  },

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    const doc = document.documentElement;
    try {
      const p = doc.requestFullscreen ? doc.requestFullscreen({ navigationUI: 'hide' }) : doc.webkitRequestFullscreen && doc.webkitRequestFullscreen();
      if (p && p.then) {
        p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      }
    } catch (e) {
      /* bisa ditolak tanpa gesture user */
    }
    document.body.classList.add('stereo');
    this.el.emit('stereo-changed', { enabled: true });
  },

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    document.body.classList.remove('stereo');
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch (e) {
      /* abaikan */
    }
    this.el.emit('stereo-changed', { enabled: false });
  },

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
  }
});
