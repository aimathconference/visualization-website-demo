// Palette, fonts and per-visualization settings (from the mockup's Night feed style, the only one the demo ships).
import { reduceMotion } from './util.js';
import { FONT_FILES } from './fontfiles.js';

// Keyed by style so thumbnails and the API keep a style dimension if more looks come back later.
export const STYLE_PAL = {
  night: { bg: '#050508', fg: '#ecebf5', a1: '#ff2e74', a2: '#22e0e8' },
};
export const STYLE_FONT = {
  night: '"Manrope", system-ui, sans-serif',
};
export const curStyle = 'night';
export const PALETTES = [
  { id: 'style', name: 'Night (default)' },
  { id: 'viridis', name: 'Viridis', bg: '#100c24', fg: '#f1f1e6', a1: '#fde725', a2: '#22a884' },
  { id: 'ink', name: 'Ink on paper', bg: '#fbfaf5', fg: '#1b1b1b', a1: '#b3261e', a2: '#33598f' },
  { id: 'solar', name: 'Solarized', bg: '#002b36', fg: '#eee8d5', a1: '#cb4b16', a2: '#2aa198' },
  { id: 'contrast', name: 'High contrast', bg: '#000000', fg: '#ffffff', a1: '#ffd400', a2: '#00b3ff' },
];
export const FONTS = [
  { id: 'style', name: 'Manrope (default)' },
  { id: 'stix', name: 'STIX Two Text (math serif)', css: '"STIX Two Text", "Times New Roman", serif' },
  { id: 'plex', name: 'IBM Plex Mono', css: '"IBM Plex Mono", ui-monospace, monospace' },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', css: '"Atkinson Hyperlegible", system-ui, sans-serif' },
  { id: 'unbounded', name: 'Unbounded', css: '"Unbounded", "Arial Black", sans-serif' },
];

// Customize settings live in memory per visualization; remixes start from their saved settings.
const settings = new Map();
export function getSettings(v) {
  if (!settings.has(v.id)) {
    const base = { palette: 'style', font: 'style', lw: 1.5, speed: reduceMotion ? 0.25 : 1, labels: true, param: null };
    settings.set(v.id, { ...base, ...(v.settings || {}) });
  }
  return settings.get(v.id);
}
export function resetSettings(v) { settings.delete(v.id); return getSettings(v); }
export function allSettings() { return settings; }

export const fontCss = s => (s.font === 'style' ? STYLE_FONT[curStyle] : FONTS.find(f => f.id === s.font)?.css || STYLE_FONT[curStyle]);
// page theme (temporary): a moderator's page colors replace the default palette in live visualizations.
// Thumbnails don't go through this (runner.js uses STYLE_PAL directly), so they stay the same for everyone.
let pageVizPalette = null;
export const setPageVizPalette = p => { pageVizPalette = p; };

export function themeFor(v, style = curStyle) {
  const s = getSettings(v);
  const pal = s.palette === 'style' ? pageVizPalette || STYLE_PAL[style] : PALETTES.find(p => p.id === s.palette) || STYLE_PAL[style];
  const font = s.font === 'style' ? STYLE_FONT[style] : fontCss(s);
  return { bg: pal.bg, fg: pal.fg, a1: pal.a1, a2: pal.a2, font };
}
export const runnerSettings = s => ({ lw: s.lw, speed: s.speed, labels: s.labels, param: s.param });

/** Display value for a parameter: options, scaled decimals, or the raw number. */
export function fmtParam(p, v) {
  if (!p) return String(v);
  if (Array.isArray(p.options)) return String(p.options[v] ?? v);
  if (p.scale) return (v / p.scale).toFixed(p.digits ?? 2);
  return String(v);
}

/** Canvas padding for the current style, from the CSS variables the mockup uses. */
export function readPads(full = false) {
  if (full) return { t: 28, r: 28, b: 28, l: 28 };
  const cs = getComputedStyle(document.documentElement), g = k => parseFloat(cs.getPropertyValue(k)) || 0;
  return { t: g('--pad-t'), r: g('--pad-r'), b: g('--pad-b'), l: g('--pad-l') };
}

// The runner can't load fonts (its CSP forbids it), so the page sends the font bytes for each family it needs.
const fontBytes = new Map();
export async function fontsFor(css) {
  const family = (css.match(/"([^"]+)"/) || [])[1];
  const files = FONT_FILES[family];
  if (!files) return [];
  const out = [];
  for (const [weight, url] of Object.entries(files)) {
    if (!fontBytes.has(url)) fontBytes.set(url, fetch(url).then(r => r.arrayBuffer()).catch(() => null));
    const buf = await fontBytes.get(url);
    if (buf) out.push({ family, weight: Number(weight), data: buf.slice(0) });
  }
  return out;
}
