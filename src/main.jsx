// A-Frame & komponen harus ter-register sebelum <a-scene> dirender
import 'aframe';

import './systems/game-manager.js';
import './systems/audio-manager.js';
import './systems/effects.js';
import './systems/stereo-mode.js';

import './components/plantation.js';
import './components/gamepad-mover.js';
import './components/action-handler.js';
import './components/enemy.js';
import './components/pickup.js';
import './components/hud.js';
import './components/ui-button.js';
import './components/game-menus.js';

import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// tanpa StrictMode, biar <a-scene> tidak dibuat dua kali
createRoot(document.getElementById('root')).render(<App />);
