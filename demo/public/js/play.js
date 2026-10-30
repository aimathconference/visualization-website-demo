// The Playground editor (DEMO_PLAN.md section 4): write code, preview it in the sandbox, post it to the
// Playground tab, or submit it for review on the practice registry.
import { $, esc, api, get, toast, copyText, openModal, storage } from './util.js';
import { state, needSetup } from './state.js';
import { mountRunner } from './runner.js';
import { STYLE_FONT, curStyle, fontsFor, vizPalette, paintPage } from './theme.js';

export const TEMPLATE = `// Your visualization. Define helpers above \`export default\` if you need them.
// The kit helpers hex, mix, rgba, label, clipBox and fsFor are available without importing.
// Imports and network access aren't allowed; the code runs in a sandbox.
//
// COLORS comes first and lists every color the piece uses, as six-digit hex. main and secondary are
// required, and the page around your piece takes them on while someone is looking at it. Any other
// colors can have whatever names you like.
const COLORS = {
  main: '#ff2e74',       // P.a1
  secondary: '#22e0e8',  // P.a2
  bg: '#050508',         // P.bg, the background
  fg: '#ecebf5',         // P.fg, text and thin lines
};

// draw() runs every frame:
//   ctx   canvas 2D context        w, h  size in CSS pixels        t  time in seconds
//   P     theme: P.bg, P.fg, P.a1, P.a2 (colors), P.font, P.lw (line width),
//         P.labels (show text?), P.param (the value of your slider)
//         Draw with P's colors rather than COLORS, so viewers' Customize color schemes still apply.
//   S     an object kept between frames (cache expensive work here)
//   B     the drawing box {x, y, w, h} inside the padding
//
// title, hook, tags and license below are how the piece is listed.
export default {
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  tags: ['Geometry', 'Polar coordinates'],
  license: 'MIT',
  param: { key: 'k', label: 'Petal number k', min: 1, max: 12, step: 1, value: 5 },

  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, w, h);
    const k = P.param, fs = fsFor(B);
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2 + (P.labels ? fs : 0);
    const R = Math.min(B.w, B.h - (P.labels ? fs * 2 : 0)) * 0.44;
    const span = k % 2 ? Math.PI : 2 * Math.PI;   // odd k closes after π
    const drawn = Math.min(1, (t % 9) / 6);        // trace for 6 s, hold for 3 s

    ctx.strokeStyle = rgba(P.fg, 0.2); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();

    ctx.strokeStyle = P.a1; ctx.lineWidth = P.lw * 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 720 * drawn; i++) {
      const th = span * i / 720, r = R * Math.cos(k * th);
      const x = cx + r * Math.cos(th), y = cy - r * Math.sin(th);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    label(ctx, P, \`r = cos(\${k}θ)\`, B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, \`\${k % 2 ? k : 2 * k} petals\`, B.x, B.y + fs * 2.3, { size: fs, alpha: 0.75, color: P.a2 });
  },
};
`;

const DRAFT_KEY = 'loci-playground-draft';
let runner = null, previewTimer = null, lastMeta = {}, lastError = null, previewSeq = 0;

export async function renderPlay(from) {
  const page = $('#page');
  let code = storage.get(DRAFT_KEY)?.code || TEMPLATE, explanation = storage.get(DRAFT_KEY)?.explanation || '';
  let note = '';
  if (from) {
    try {
      const v = await get(`/api/viz/${encodeURIComponent(from)}`);
      code = `// Copy of “${v.title}” by @${v.author.handle} (${v.license}). Keep the license and credit if you share it.\n${v.code}`;
      explanation = v.explanation;
      note = `Started from a copy of “${esc(v.title)}”. Your previous draft was replaced.`;
    } catch (e) { note = esc(e.message); }
  }
  page.innerHTML = `<div class="wrap">
    <div class="pagehead"><div class="kicker">Playground</div><h1>Write a visualization</h1>
      <p>Preview updates as you type. <b>Post to the Playground</b> shares it with the trial team right away, marked as not reviewed. <b>Submit for review</b> opens a pull request on the practice registry; once two moderators approve, it joins the main feed.</p>
      ${note ? `<p class="ok">${note}</p>` : ''}</div>
    <div class="playgrid">
      <div class="form">
        <label class="f">Code<textarea class="input editor" id="ed-code" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off">${esc(code)}</textarea></label>
        <div class="edstatus"><span id="ed-lines"></span><span id="ed-saved">Draft saved in this browser</span></div>
      </div>
      <div class="form">
        <div class="preview" id="ed-preview"></div>
        <p class="err" id="ed-err" hidden></p>
        <div class="panel" style="gap:8px"><div class="kicker">Listing (from your code)</div><div id="ed-meta" class="fine"></div></div>
        <label class="f">Explanation <small>optional Markdown: what's on screen, the mathematics, something to try</small><textarea class="input" id="ed-expl" rows="6" maxlength="10000">${esc(explanation)}</textarea></label>
        <div class="btnrow"><button class="btn" type="button" id="ed-post">Post to the Playground</button><button class="btn ghost" type="button" id="ed-submit">Submit for review</button><button class="btn ghost" type="button" id="ed-reset">Start over from the template</button></div>
      </div>
    </div></div>`;
  page.scrollTop = 0;
  const ta = $('#ed-code'), expl = $('#ed-expl');
  const save = () => { storage.set(DRAFT_KEY, { code: ta.value, explanation: expl.value }); $('#ed-lines').textContent = `${ta.value.split('\n').length} lines · ${(new Blob([ta.value]).size / 1000).toFixed(1)} KB of 50`; };
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const s = ta.selectionStart;
      ta.setRangeText('  ', s, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  });
  ta.addEventListener('input', () => { save(); clearTimeout(previewTimer); previewTimer = setTimeout(preview, 600); });
  expl.addEventListener('input', save);
  $('#ed-post').onclick = post;
  $('#ed-submit').onclick = submitForReview;
  $('#ed-reset').onclick = () => { if (confirm('Replace your code with the template?')) { ta.value = TEMPLATE; expl.value = ''; save(); preview(); } };
  save();
  preview();
}

export function leavePlay() { runner?.destroy(); runner = null; clearTimeout(previewTimer); }

async function preview() {
  const box = $('#ed-preview'), err = $('#ed-err'), code = $('#ed-code')?.value;
  if (!box) return;
  if (!state.me) {
    box.innerHTML = '<div class="stopped"><span>Set up your profile to preview your code.</span><button class="btn ghost sm" type="button" data-setup>Set up profile</button></div>';
    return;
  }
  const seq = ++previewSeq;
  let res;
  try { res = await api('POST', '/api/preview', { code }); }
  catch (e) {
    if (seq !== previewSeq) return;
    lastError = e.data?.line ? `Line ${e.data.line}: ${e.message}` : e.message;
    err.hidden = false; err.textContent = lastError;
    return;
  }
  if (seq !== previewSeq) return;
  lastMeta = res.meta || {};
  lastError = null; err.hidden = true;
  renderMeta();
  const pal = lastMeta.colors ? vizPalette({ colors: lastMeta.colors }) : null;
  if (state.view === 'play') paintPage(pal);
  runner?.destroy();
  runner = mountRunner(box, `/run/preview/${res.id}`, async m => {
    if (m.type === 'loaded') {
      const theme = { ...vizPalette({ colors: lastMeta.colors }), font: STYLE_FONT[curStyle] };
      runner.post({ type: 'init', theme, settings: { lw: 1.5, speed: 1, labels: true, param: null }, pads: { t: 16, r: 16, b: 16, l: 16 }, dpr: Math.min(2, devicePixelRatio || 1), fonts: await fontsFor(theme.font), paused: false });
    } else if (m.type === 'ready') runner.iframe.classList.add('ready');
    else if (m.type === 'error') { lastError = `${m.line ? `Line ${m.line}: ` : ''}${m.message}`; err.hidden = false; err.textContent = lastError; }
    else if (m.type === 'perf' && m.avgFrameMs > 50) { err.hidden = false; err.textContent = `Running slowly: about ${Math.round(m.avgFrameMs)} ms per frame on this device. Phones may struggle.`; }
  }, 'Preview');
  runner.iframe.style.opacity = 1;
}

function renderMeta() {
  const m = lastMeta;
  $('#ed-meta').innerHTML = m.title
    ? `<b>${esc(m.title)}</b>${m.hook ? ` · ${esc(m.hook)}` : ''}<br>${(m.tags || []).map(t => `#${esc(String(t).toLowerCase())}`).join(' ')} · ${esc(m.license || 'MIT')}${m.param ? ` · slider: ${esc(m.param.label || m.param.key || 'parameter')}` : ''}${m.colors ? '' : '<br><span class="err">Add your colors at the top of the file: <code>const COLORS = { main: \'#ff2e74\', secondary: \'#22e0e8\', bg: \'#050508\', fg: \'#ecebf5\' };</code></span>'}`
    : '<span class="err">Add a title to the exported object, e.g. <code>title: \'My visualization\'</code>.</span>';
}

async function post() {
  if (!state.me) return needSetup();
  if (lastError) return toast('Fix the error first.');
  try {
    const v = await api('POST', '/api/viz', { kind: 'code', code: $('#ed-code').value, explanation: $('#ed-expl').value });
    (state.items.playground ||= []).unshift(v);
    toast('Posted to the Playground');
    location.hash = `#/v/${v.slug}`;
  } catch (e) { toast(e.data?.line ? `Line ${e.data.line}: ${e.message}` : e.message); }
}

function submitForReview() {
  const { registryRepo, registryBranch } = state.config;
  if (lastError) return toast('Fix the error first.');
  if (!registryRepo) return openModal(`<div class="top"><div><div class="kicker">Submit for review</div><h2>Not set up yet</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Close"></button></div>
    <p>The server has no practice registry configured (REGISTRY_REPO). Ask an admin to set it up; see demo/github/README.md.</p>`);
  if (!lastMeta.title) return toast('Add a title to your code first.');
  if (!lastMeta.colors) return toast('Add a COLORS block to the top of your code first.');
  const slug = (lastMeta.title || 'visualization').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const code = $('#ed-code').value, expl = $('#ed-expl').value.trim();
  const base = `https://github.com/${registryRepo}/new/${encodeURIComponent(registryBranch)}`;
  // Long code in a URL can be rejected, so beyond ~6 KB the code goes on the clipboard instead.
  const inUrl = encodeURIComponent(code).length < 6000;
  const codeURL = `${base}?${new URLSearchParams({ filename: `entries/${slug}.js`, ...(inUrl ? { value: code } : {}) })}`;
  const mdURL = `${base}?${new URLSearchParams({ filename: `entries/${slug}.md`, value: expl })}`;
  const card = openModal(`<div class="top"><div><div class="kicker">Submit for review</div><h2>Open a pull request</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Close"></button></div>
    <ol class="md" style="padding-left:1.2em;margin:0">
      <li>${inUrl ? '' : '<b>Your code is long, so it’s been copied to your clipboard.</b> '}Open GitHub’s new-file page for <code>entries/${esc(slug)}.js</code>${inUrl ? ' (the code is already filled in)' : ' and paste it in'}. Choose <b>Propose new file</b>, then <b>Create pull request</b>.</li>
      ${expl ? `<li>Optional: add the explanation as <code>entries/${esc(slug)}.md</code> to the same pull request.</li>` : ''}
      <li>A bot checks the code. If it passes, two moderators are assigned at random. When both approve, it merges automatically and appears in the main feed within a minute or so.</li>
    </ol>
    <p class="fine">Make sure your GitHub username is in your profile settings so the approved piece is credited to you here.</p>
    <div class="btnrow"><a class="btn" href="${esc(codeURL)}" target="_blank" rel="noopener" id="sub-code">Open entries/${esc(slug)}.js on GitHub</a>${expl ? `<a class="btn ghost" href="${esc(mdURL)}" target="_blank" rel="noopener">Add the explanation</a>` : ''}</div>`);
  if (!inUrl) $('#sub-code', card).addEventListener('click', () => copyText(code, 'Code copied. Paste it into GitHub.'));
}
