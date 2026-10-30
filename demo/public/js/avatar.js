// Generated curve avatars (from the mockup), or a Tailscale profile picture.
import { esc } from './util.js';

export const AVATAR_KINDS = { rose: 'Rose', liss: 'Lissajous', spiral: 'Spiral', hypo: 'Hypotrochoid', chords: 'Chords' };

const CURVES = {
  rose: p => s => { const t = 2 * Math.PI * s, r = Math.cos(p.k * t); return [r * Math.cos(t), r * Math.sin(t)]; },
  liss: p => s => { const t = 2 * Math.PI * s; return [Math.sin(p.a * t + Math.PI / 2), Math.sin(p.b * t)]; },
  spiral: p => s => { const t = 2 * Math.PI * p.turns * s, r = 1 - s * 0.94; return [r * Math.cos(t), r * Math.sin(t)]; },
  hypo: p => s => {
    const t = 2 * Math.PI * p.r * s, q = (p.R - p.r) / p.r, n = p.R - p.r + p.d;
    return [((p.R - p.r) * Math.cos(t) + p.d * Math.cos(q * t)) / n, ((p.R - p.r) * Math.sin(t) - p.d * Math.sin(q * t)) / n];
  },
};

const cache = new Map();
export function avatarURL(a) {
  if (!a) a = { kind: 'rose', k: 3, bg: '#555555', fg: '#ffffff' };
  if (a.tailscale) return a.url;
  const key = JSON.stringify(a);
  if (cache.has(key)) return cache.get(key);
  const P = (x, y) => `${(50 + 34 * x).toFixed(1)},${(50 - 34 * y).toFixed(1)}`;
  let d = '';
  if (a.kind === 'chords') {
    const n = 48;
    for (let i = 0; i < n; i++) { const t1 = 2 * Math.PI * i / n, t2 = 2 * Math.PI * (a.k * i % n) / n; d += `M${P(Math.cos(t1), Math.sin(t1))}L${P(Math.cos(t2), Math.sin(t2))}`; }
  } else {
    const f = (CURVES[a.kind] || CURVES.rose)(a);
    for (let i = 0; i <= 720; i++) { const [x, y] = f(i / 720); d += (i ? 'L' : 'M') + P(x, y); }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${a.bg}"/><path d="${d}" fill="none" stroke="${a.fg}" stroke-width="${a.kind === 'chords' ? 1.2 : 2.4}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const url = 'data:image/svg+xml,' + encodeURIComponent(svg);
  cache.set(key, url);
  return url;
}

export const pfp = (avatar, cls = '') => `<img class="pfp ${cls}" src="${esc(avatarURL(avatar))}" alt="" width="28" height="28" referrerpolicy="no-referrer">`;

export function randomAvatar() {
  const pairs = [['#2b1d4f', '#ffd166'], ['#0f4c5c', '#e9f5f2'], ['#f2e8cf', '#bc4749'], ['#14213d', '#fca311'], ['#e63946', '#f1faee'], ['#2a9d8f', '#ffffff'], ['#1d3557', '#a8dadc']];
  const [bg, fg] = pairs[Math.floor(Math.random() * pairs.length)];
  const kinds = Object.keys(AVATAR_KINDS), kind = kinds[Math.floor(Math.random() * kinds.length)];
  return withDefaults({ kind, bg, fg });
}

export function withDefaults(a) {
  const d = { rose: { k: 5 }, chords: { k: 2 }, liss: { a: 3, b: 2 }, spiral: { turns: 4 }, hypo: { R: 5, r: 3, d: 5 } }[a.kind] || {};
  return { ...d, ...a };
}
