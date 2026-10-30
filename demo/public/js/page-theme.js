// TEMPORARY: moderators (and above) can recolor the whole site for themselves. Four picked colors are
// expanded into the CSS variables in styles.css, set on <html> so they override :root. Visualizations on
// their default palette draw in the same colors, and the page stops following each piece's main and secondary
// color; other Customize palettes still apply to the canvas, and thumbnails stay in each piece's own colors for
// everyone. To remove the feature, see the note in server/routes/page-theme.js.
import { $, $$, esc, api, get, toast, storage } from './util.js';
import { can } from './state.js';
import { setPageVizPalette, rgb, mixHex as mix, luminance, contrast } from './theme.js';

const CACHE = 'loci-page-theme';
const VARS = ['--bg', '--panel', '--fg', '--muted', '--accent', '--accent2', '--on-accent', '--line', '--chip', '--chip-on',
  '--chip-on-fg', '--shadow', '--scrim', '--topbar-bg', 'color-scheme'];

export const PAGE_PRESETS = [
  { id: 'night', name: 'Night (default)', bg: '#050508', fg: '#f4f4f8', accent: '#ff2e74', accent2: '#22e0e8' },
  { id: 'viridis', name: 'Viridis', bg: '#100c24', fg: '#f1f1e6', accent: '#fde725', accent2: '#22a884' },
  { id: 'solar-dark', name: 'Solarized dark', bg: '#002b36', fg: '#eee8d5', accent: '#cb4b16', accent2: '#2aa198' },
  { id: 'solar-light', name: 'Solarized light', bg: '#fdf6e3', fg: '#073642', accent: '#d33682', accent2: '#268bd2' },
  { id: 'paper', name: 'Ink on paper', bg: '#fbfaf5', fg: '#1b1b1b', accent: '#b3261e', accent2: '#33598f' },
  { id: 'contrast', name: 'High contrast', bg: '#000000', fg: '#ffffff', accent: '#ffd400', accent2: '#00b3ff' },
];
const DEFAULT = PAGE_PRESETS[0];
const FIELDS = [['bg', 'Background'], ['fg', 'Text'], ['accent', 'Accent'], ['accent2', 'Second accent']];

const rgba = (h, a) => `rgba(${rgb(h).join(',')},${a})`;

/** The CSS variables for four picked colors, derived the same way the Night defaults relate to each other. */
function cssVars({ bg, fg, accent, accent2 }) {
  const dark = luminance(bg) < 0.25;
  return {
    '--bg': bg, '--panel': mix(bg, fg, dark ? 0.06 : 0.04), '--fg': fg, '--muted': mix(fg, bg, 0.35),
    '--accent': accent, '--accent2': accent2, '--on-accent': contrast(accent, '#ffffff') >= contrast(accent, '#000000') ? '#ffffff' : '#000000',
    '--line': rgba(fg, 0.14), '--chip': rgba(fg, 0.12), '--chip-on': fg, '--chip-on-fg': bg,
    '--shadow': `0 1px 3px ${rgba(bg, 0.75)}`,
    '--scrim': `linear-gradient(to top, ${rgba(bg, 0.92)}, ${rgba(bg, 0.55)} 45%, ${rgba(bg, 0)})`,
    '--topbar-bg': `linear-gradient(to bottom, ${rgba(bg, 0.92)} 35%, ${rgba(bg, 0)})`,
    'color-scheme': dark ? 'dark' : 'light',
  };
}

/** Apply a theme to the whole page, or go back to the stylesheet's defaults with null. */
function apply(theme) {
  const s = document.documentElement.style;
  if (!theme) VARS.forEach(v => s.removeProperty(v));
  else Object.entries(cssVars(theme)).forEach(([k, v]) => s.setProperty(k, v));
  // Live visualizations are re-created whenever the feed is shown again, so they pick this up then.
  setPageVizPalette(theme && { bg: theme.bg, fg: theme.fg, a1: theme.accent, a2: theme.accent2 });
}

// Apply the last known choice right away so the page doesn't flash the default colors on load.
let saved = storage.get(CACHE);
apply(saved);
function setSaved(theme) {
  saved = theme;
  storage.set(CACHE, theme);
  apply(theme);
}
const isDefault = t => FIELDS.every(([k]) => DEFAULT[k] === t[k]);
// Leaving the settings page without saving drops the preview.
addEventListener('hashchange', () => apply(saved));
// The account menu's "Page colors" item opens Settings scrolled to this panel.
let jump = false;
document.addEventListener('click', e => { if (e.target.closest('[data-pt-jump]')) jump = true; }, true);

/** Called once the signed-in user is known. Anyone below moderator gets the default colors. */
export async function loadPageTheme() {
  if (!can('moderator')) return setSaved(null);
  try { setSaved((await get('/api/me/page-theme')).theme); } catch { /* keep the cached choice */ }
}

export function pageThemePanel() {
  const cur = saved || DEFAULT;
  return `<form class="panel form" id="page-theme-form" novalidate><h2>Page colors</h2>
    <p class="fine">For moderators: recolor the whole site, just for you. It's saved to your account, so it follows you to other devices. Visualizations use these colors too, unless you pick another scheme in Customize.</p>
    <div class="pt-presets" role="group" aria-label="Presets">${PAGE_PRESETS.map(p => `<button class="pt-preset" type="button" data-preset="${p.id}" style="background:${p.bg};color:${p.fg};border-color:${p.accent}"><span class="pt-dots"><i style="background:${p.accent}"></i><i style="background:${p.accent2}"></i></span>${esc(p.name)}</button>`).join('')}</div>
    <div class="pt-fields">${FIELDS.map(([k, label]) => `<label class="f">${label}<input class="pt-color" type="color" name="${k}" value="${cur[k]}"></label>`).join('')}</div>
    <p class="fine pt-warn" role="status"></p>
    <div class="btnrow"><button class="btn" type="submit">Save colors</button><button class="btn ghost" type="button" data-pt-reset>Back to Night (default)</button></div></form>`;
}

export function bindPageThemePanel(form) {
  const read = () => Object.fromEntries(FIELDS.map(([k]) => [k, form.elements[k].value.toLowerCase()]));
  const preview = () => {
    const t = read(), ratio = contrast(t.bg, t.fg);
    apply(isDefault(t) ? null : t); // the default comes straight from styles.css
    $('.pt-warn', form).textContent = ratio < 4.5 ? `The text and background are hard to tell apart (contrast ${ratio.toFixed(1)}:1; aim for at least 4.5).` : '';
    $$('.pt-preset', form).forEach(b => {
      const p = PAGE_PRESETS.find(x => x.id === b.dataset.preset);
      b.setAttribute('aria-pressed', String(FIELDS.every(([k]) => p[k] === t[k])));
    });
  };
  const fill = t => { FIELDS.forEach(([k]) => { form.elements[k].value = t[k]; }); preview(); };
  form.addEventListener('input', preview);
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (b) fill(PAGE_PRESETS.find(p => p.id === b.dataset.preset));
  });
  $('[data-pt-reset]', form).onclick = async () => {
    try { setSaved((await api('PUT', '/api/me/page-theme', { theme: null })).theme); fill(DEFAULT); toast('Back to the default colors'); }
    catch (ex) { toast(ex.message); }
  };
  form.onsubmit = async e => {
    e.preventDefault();
    const t = read();
    try { setSaved((await api('PUT', '/api/me/page-theme', { theme: isDefault(t) ? null : t })).theme); toast('Page colors saved'); }
    catch (ex) { toast(ex.message); }
  };
  preview();
  if (jump) {
    // Scroll only the page overlay; scrollIntoView would also shift the fixed app frame behind it.
    jump = false;
    const p = $('#page');
    p.scrollTop += form.getBoundingClientRect().top - p.getBoundingClientRect().top - parseFloat(getComputedStyle(p).paddingTop);
  }
}
