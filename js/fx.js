// Feel: little sounds (made on the fly with Web Audio, no files), phone buzz, floating points, pop-up words, confetti.
import { store } from './store.js';
import { h } from './util.js';

const settings = () => (store.data.settings ||= { sound: true, buzz: true });

// ---------- Sound ----------
let ac = null;
function audio() {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
  } catch { ac = null; }
  return ac;
}
function tone(freq, at, dur, type = 'sine', vol = 0.12) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
export function sound(kind, combo = 1) {
  if (!settings().sound) return;
  const up = Math.min(combo, 12) * 40;
  if (kind === 'right') { tone(660 + up, 0, 0.12, 'triangle'); tone(990 + up, 0.07, 0.16, 'triangle'); }
  else if (kind === 'wrong') { tone(180, 0, 0.22, 'sawtooth', 0.06); tone(140, 0.08, 0.25, 'sawtooth', 0.05); }
  else if (kind === 'level') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.1));
  else if (kind === 'badge') [784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.3, 'sine', 0.1));
  else if (kind === 'tick') tone(1200, 0, 0.04, 'square', 0.03);
}
// Unlock audio on the first tap anywhere (iPhone requires a tap before any sound).
document.addEventListener('pointerdown', () => { if (settings().sound) audio(); }, { once: true });

// ---------- Buzz ----------
// iPhones don't support navigator.vibrate; tapping a hidden iOS "switch" control gives a light haptic tick on iOS 18+.
let sw = null;
export function buzz() {
  if (!settings().buzz) return;
  if (navigator.vibrate) { navigator.vibrate(18); return; }
  if (!sw) {
    const input = h('input', { type: 'checkbox', switch: true });
    sw = h('label', { 'aria-hidden': 'true', style: { position: 'fixed', left: '-100px', top: '0', opacity: '0' } }, input);
    document.body.append(sw);
  }
  sw.click();
}

// ---------- Visuals ----------
export function floatText(text, near, cls = '') {
  const r = near?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const el = h('div', { class: 'float ' + cls, style: { left: r.left + r.width / 2 + 'px', top: r.top + 'px' } }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 900);
}

export function toast(text, cls = '') {
  const el = h('div', { class: 'toast ' + cls }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 1200);
}

export function confetti(n = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = h('canvas', { class: 'confetti-layer' });
  document.body.append(c);
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const colors = ['#7c5cff', '#f07a2a', '#12a594', '#2f7be5', '#ffd23f', '#ff5a8a'];
  const bits = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 11 - 4, r: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 5, c: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.35; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.fillStyle = b.c; x.fillRect(-b.w / 2, -b.w / 4, b.w, b.w / 2); x.restore();
    }
    if (t - t0 < 1800) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

export function toggles(onChange) {
  const s = settings();
  const t = (key, label) => h('button', {
    class: 'link', onclick: () => { s[key] = !s[key]; store.save(); if (key === 'buzz' && s.buzz) buzz(); if (key === 'sound' && s.sound) sound('right'); onChange(); },
  }, `${label}: ${s[key] ? 'On' : 'Off'}`);
  return [t('sound', 'Sound'), ' · ', t('buzz', 'Vibration')];
}
