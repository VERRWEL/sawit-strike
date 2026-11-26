// Urutan import penting: A-Frame dulu, lalu semua System & Component
// harus terdaftar SEBELUM <a-scene> dirender oleh React.
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

// Tanpa <StrictMode>: StrictMode me-mount komponen dua kali sehingga <a-scene> akan dibuat ganda.
createRoot(document.getElementById('root')).render(<App />);
