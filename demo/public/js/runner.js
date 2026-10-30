// Page side of the sandboxed runner (DEMO_PLAN.md section 6). Each runner is an <iframe sandbox="allow-scripts">
// with an opaque origin, so messages are matched by their source window, never by origin.
import { api, dpr, reduceMotion } from './util.js';
import { STYLE_PAL, themeFor, getSettings, runnerSettings, readPads, fontsFor, curStyle } from './theme.js';

const handlers = new Map();
window.addEventListener('message', e => {
  const h = handlers.get(e.source);
  if (h && e.data && e.data.loci === 1) h(e.data);
});

/** Creates the iframe inside `container`. onMessage receives every message from it. */
export function mountRunner(container, src, onMessage, title = 'Live visualization') {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.title = title;
  iframe.src = src;
  container.appendChild(iframe);
  const win = iframe.contentWindow;
  handlers.set(win, onMessage);
  return {
    iframe,
    post: msg => iframe.contentWindow?.postMessage(msg, '*'),
    destroy() { handlers.delete(win); iframe.remove(); },
  };
}

/** The init message for a visualization in the current style. */
export async function initMessage(v, { paused = false, full = false, t } = {}) {
  const theme = themeFor(v);
  return { type: 'init', theme, settings: runnerSettings(getSettings(v)), pads: readPads(full), dpr: dpr(), reducedMotion: reduceMotion, fonts: await fontsFor(theme.font), paused, t };
}

export const thumbURL = (v, style = curStyle) => {
  const ext = v.thumbs?.[style];
  if (ext) return `/thumbs/${v.id}/${style}.${ext}`;
  const any = Object.entries(v.thumbs || {})[0];
  return any ? `/thumbs/${v.id}/${any[0]}.${any[1]}` : null;
};

// Thumbnails: rendered one at a time in an off-screen runner, without labels, then uploaded.
let queue = Promise.resolve();
export function renderThumb(v, style = curStyle, { width = 480, height = 360 } = {}) {
  const job = queue.then(() => new Promise(resolve => {
    const box = document.createElement('div');
    box.style.cssText = `position:fixed; left:-10000px; top:0; width:${width}px; height:${height}px; overflow:hidden`;
    document.body.appendChild(box);
    const done = data => { clearTimeout(timer); r.destroy(); box.remove(); resolve(data); };
    const timer = setTimeout(() => done(null), 8000);
    const r = mountRunner(box, `/run/${v.runId}`, async m => {
      if (m.type === 'loaded') {
        const pal = STYLE_PAL[style], s = getSettings(v);
        const theme = s.palette === 'style' ? { ...pal } : themeFor(v, style);
        theme.font = themeFor(v, style).font;
        r.post({ type: 'init', theme, settings: { ...runnerSettings(s), labels: false }, pads: { t: 10, r: 10, b: 10, l: 10 }, dpr: 1, paused: true, t: undefined, fonts: [] });
      } else if (m.type === 'ready') {
        // Advance to an interesting moment like the mockup's thumbnails (t0 + 6 s) by running briefly.
        r.post({ type: 'resume' });
        setTimeout(() => r.post({ type: 'snapshot', id: 1 }), 900);
      } else if (m.type === 'snapshot') done(m.data);
      else if (m.type === 'error') done(null);
    }, 'Thumbnail renderer');
  }));
  queue = job.catch(() => null);
  return job;
}

export async function makeAndUploadThumb(v, style = curStyle) {
  const data = await renderThumb(v, style);
  if (!data || !/^data:image\/(webp|png)/.test(data)) return null;
  const { thumbs } = await api('PUT', `/api/viz/${v.id}/thumb/${style}`, { data });
  v.thumbs = thumbs;
  return thumbs;
}
