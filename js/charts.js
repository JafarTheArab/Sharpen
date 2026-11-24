// Small SVG charts: one series each, thin marks, recessive grid, tap/drag to read a value.
import { h } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const fmt = (n) => n.toLocaleString();
function niceMax(v) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v)), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

const W = 320, H = 130, L = 40, R = 10, T = 10, B = 22;

function frame(svg, max) {
  for (const f of [0, 0.5, 1]) {
    const y = T + (H - T - B) * (1 - f);
    svg.append(s('line', { x1: L, x2: W - R, y1: y, y2: y, class: f === 0 ? 'axis' : 'grid' }));
    const t = s('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'tick' });
    t.textContent = fmt(Math.round(max * f));
    svg.append(t);
  }
}

// Wires a readout + a tap/drag handler that picks the nearest x.
function interactive(svg, xs, onPick) {
  const pick = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(xs[best] - x)) best = i; });
    onPick(best);
  };
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture?.(e.pointerId); pick(e); });
  svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'mouse') pick(e); });
}

// points: [{ label, value }] oldest first.
export function lineChart(points, color, unit = 'points') {
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  frame(svg, max);
  const xs = points.map((_, i) => L + ((W - L - R) * (points.length === 1 ? 0.5 : i / (points.length - 1))));
  const ys = points.map((p) => T + (H - T - B) * (1 - p.value / max));
  svg.append(s('polyline', { points: xs.map((x, i) => `${x},${ys[i]}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  for (const [i, lab] of [[0, points[0].label], [points.length - 1, points.at(-1).label]]) {
    const t = s('text', { x: xs[i], y: H - 6, 'text-anchor': i ? 'end' : 'start', class: 'tick' });
    t.textContent = lab; svg.append(t);
  }
  const cross = s('line', { y1: T, y2: H - B, class: 'cross' });
  const dot = s('circle', { r: 4.5, fill: color, class: 'dot' });
  svg.append(cross, dot);
  const readout = h('div', { class: 'readout' });
  const show = (i) => {
    cross.setAttribute('x1', xs[i]); cross.setAttribute('x2', xs[i]);
    dot.setAttribute('cx', xs[i]); dot.setAttribute('cy', ys[i]);
    readout.textContent = `${points[i].label}: ${fmt(points[i].value)} ${unit}`;
  };
  show(points.length - 1);
  interactive(svg, xs, show);
  svg.setAttribute('aria-label', `${points.length} rounds, latest ${fmt(points.at(-1).value)} ${unit}`);
  return h('div', { class: 'chart-wrap' }, readout, svg);
}

// bars: [{ label, sub, value }]
export function barChart(bars, color, unit = 'points') {
  const max = niceMax(Math.max(...bars.map((b) => b.value)));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  frame(svg, max);
  const slot = (W - L - R) / bars.length, bw = Math.min(26, slot * 0.6);
  const xs = bars.map((_, i) => L + slot * i + slot / 2);
  bars.forEach((b, i) => {
    const hgt = (H - T - B) * (b.value / max), x = xs[i] - bw / 2, y = H - B - hgt, r = Math.min(4, hgt);
    if (hgt > 0) svg.append(s('path', {
      d: `M${x},${H - B} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - B} Z`, fill: color, class: 'bar',
    }));
    const t = s('text', { x: xs[i], y: H - 6, 'text-anchor': 'middle', class: 'tick' + (i === bars.length - 1 ? ' strong' : '') });
    t.textContent = b.label; svg.append(t);
  });
  const readout = h('div', { class: 'readout' });
  const marker = s('rect', { y: T, height: H - T - B, width: slot, class: 'hl' });
  svg.prepend(marker);
  const show = (i) => { marker.setAttribute('x', xs[i] - slot / 2); readout.textContent = `${bars[i].sub}: ${fmt(bars[i].value)} ${unit}`; };
  show(bars.length - 1);
  interactive(svg, xs, show);
  svg.setAttribute('aria-label', bars.map((b) => `${b.sub} ${b.value}`).join(', '));
  return h('div', { class: 'chart-wrap' }, readout, svg);
}
