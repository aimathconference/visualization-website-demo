// spec.js: the static reader and gate for the submission format (docs/submission-spec-slop.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const S = require('../../spec.js');
const ROOT = join(import.meta.dirname, '..', '..');

const EXAMPLE = `const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7', bg: '#050508', fg: '#ecebf5' };

export default {
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  alt: 'A flower-shaped curve traced in orange on a dark background, its petals opening and closing.',
  tags: ['Geometry', 'Teaching'],
  license: 'MIT',
  author: { name: 'Your name' },

  modes: { desktop: true, phone: true },
  time: { length: 24, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'k', type: 'range', label: 'Petal number k', min: 1, max: 12, step: 1, default: 5 },
    { key: 'trace', type: 'toggle', label: 'Show the traced path', default: true },
  ],
  presets: [
    { id: 'eight', label: 'k = 4, eight petals', params: { k: 4 }, t: 6 },
  ],

  interact: { hint: 'Drag a petal · use the panel' },

  setup(env, S) {},
  draw(ctx, t, params, env, S) {},
  onMode(env, S) {},
};
`;

const filler = n => Array.from({ length: n }, (_, i) => `word${i % 7}`).join(' ');
const MD = `## Rose curves

A rose curve is the polar graph of $r = \\cos(k\\theta)$. ${filler(60)}

### What you're seeing

The curve is traced as $\\theta$ runs from $0$ to $2\\pi$. See [eight petals](#preset:eight) and stop [at t = 6](#t:6). ${filler(50)}

$$r(\\theta) = \\cos(k\\theta)$$

### Try this

- Change k and count the petals. ${filler(40)}
- Read more on [Wikipedia](https://en.wikipedia.org/wiki/Rose_(mathematics)).

\`\`\`js
<div>code is fine</div>
\`\`\`

**Reference:** Grandi, *Flores geometrici*, 1728.
`;

const readMeta = src => { const r = S.read(src); return { r, errs: S.validateMeta(r.meta, r.colors) }; };
const replace = (a, b) => { assert.ok(EXAMPLE.includes(a), a); return EXAMPLE.replace(a, b); };
const msgs = list => list.map(e => e.message).join('\n');

test('the spec example passes read, validateMeta and explanationProblems', () => {
  const { r, errs } = readMeta(EXAMPLE);
  assert.deepEqual(r.errors, []);
  assert.ok(r.ok);
  assert.deepEqual(errs, []);
  assert.equal(r.colors.main, '#ff8a1f');
  assert.equal(r.meta.time.length, 24);
  assert.ok(r.functions.draw && r.functions.setup && r.functions.onMode);
  assert.deepEqual(r.imports, []);
  assert.deepEqual(r.forbidden, []);
  const [s, e] = r.ranges.fields.title;
  assert.equal(EXAMPLE.slice(s, e), "'Rose curves'");
  assert.match(EXAMPLE.slice(...r.ranges.colors), /^\{ main: '#ff8a1f'.*\}$/);
  assert.match(EXAMPLE.slice(...r.ranges.exportObject), /^\{[\s\S]*\}$/);
  const x = S.explanationProblems(MD, r.meta);
  assert.deepEqual(x.errors, [], msgs(x.errors));
  assert.ok(x.words >= 150 && x.words < 300, String(x.words));
});

test('defaults: context, libraries, params, presets, interact; a missing time is an error', () => {
  const src = `const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7' };
export default { title: 'T', hook: 'H', alt: 'A long enough description of a picture for the alt.', tags: ['Geometry'], license: 'MIT',
  author: { name: 'N' }, modes: { desktop: true }, draw() {} };`;
  const { r, errs } = readMeta(src);
  assert.ok(r.ok, msgs(r.errors));
  assert.equal(r.meta.context, '2d'); assert.deepEqual(r.meta.params, []); assert.equal(r.meta.interact, null);
  assert.ok(errs.some(e => e.field === 'time'), JSON.stringify(errs));
});

test('read: COLORS first, literal metadata, pinned imports, forbidden identifiers', () => {
  let r = S.read(`const x = 1;\n${EXAMPLE}`);
  assert.match(msgs(r.errors), /COLORS must be the first statement/);

  r = S.read(replace("title: 'Rose curves'", 'title: `Rose ${1}`'));
  assert.ok(!r.ok); assert.match(msgs(r.errors), /template literal/);
  assert.equal(r.errors[0].line, 4);
  assert.ok(r.unreadable.includes('title'));

  r = S.read(replace("license: 'MIT',", "license: 'MIT', ...extra,"));
  assert.match(msgs(r.errors), /spread/);

  r = S.read(replace("license: 'MIT',", "license: 'MIT', bogus: 1,"));
  assert.match(msgs(r.errors), /unknown field "bogus"/);

  r = S.read(replace("author: { name: 'Your name' }", "author: { name: 'Your name', github: 'me' }"));
  assert.match(msgs(r.errors), /author\.github/);

  r = S.read(replace("author: { name: 'Your name' }", "author: { name: 'Your name', email: 'me@uni.edu' }"));
  assert.ok(!/author/.test(msgs(r.errors)), msgs(r.errors));
  assert.equal(r.meta.author.email, 'me@uni.edu');

  r = S.read(replace("context: '2d',", 'context: CTX,'));
  assert.match(msgs(r.errors), /reference to the variable "CTX"/);

  r = S.read(EXAMPLE.replace('export default', "import x from 'd3';\nexport default"));
  assert.ok(!r.ok); assert.deepEqual(r.imports, ['d3']); assert.match(msgs(r.errors), /pinned libraries/);

  r = S.read(EXAMPLE.replace('export default', "import { mix } from '@eigenreel/kit';\nimport * as THREE from '@eigenreel/three';\nexport default"));
  assert.ok(r.ok, msgs(r.errors)); assert.deepEqual(r.imports, ['@eigenreel/kit', '@eigenreel/three']);

  r = S.read(EXAMPLE.replace('setup(env, S) {}', "async setup(env, S) { const m = await import('x'); }"));
  assert.match(msgs(r.errors), /dynamic import/); assert.ok(r.forbidden.some(f => f.name === 'import()'));

  r = S.read(EXAMPLE.replace('draw(ctx, t, params, env, S) {}',
    "draw(ctx, t, params, env, S) { fetch('/x'); fetch('/y'); env.fetch(); const o = { fetch: 1 }; createImageBitmap(); new Image(); }"));
  assert.ok(r.ok, msgs(r.errors));
  assert.deepEqual(r.forbidden.map(f => f.name), ['fetch', 'Image']);

  r = S.read('const COLORS = {;');
  assert.equal(r.errors.length, 1); assert.equal(r.errors[0].line, 1);

  r = S.read(EXAMPLE.replace('  draw(ctx, t, params, env, S) {},\n', ''));
  assert.match(msgs(r.errors), /draw\(ctx, t, params, env, S\) is required/);

  r = S.read(replace("main: '#ff8a1f'", "main: 'orange'"));
  assert.match(msgs(r.errors), /COLORS\.main must be a six-digit hex/);
  r = S.read(replace("secondary: '#2dd4a7', ", ''));
  assert.match(msgs(r.errors), /COLORS\.secondary is required/);
});

test('validateMeta: params', () => {
  let { errs } = readMeta(replace('step: 1, default: 5', 'step: 2, default: 4'));
  assert.ok(errs.some(e => /default 4 is not on the grid/.test(e.message)), JSON.stringify(errs));
  ({ errs } = readMeta(replace('min: 1, max: 12, step: 1, default: 5', 'min: 0, max: 1, step: 0.1, default: 0.3').replace('params: { k: 4 }', 'params: { k: 0.7 }')));
  assert.deepEqual(errs, []);
  ({ errs } = readMeta(replace("{ key: 'trace'", "{ key: 'mode', type: 'select', label: 'Mode', options: [['a', 'A'], ['b', 'B']], default: 'c' },\n    { key: 'trace'")));
  assert.ok(errs.some(e => /default must be one of the option values/.test(e.message)), JSON.stringify(errs));
  ({ errs } = readMeta(replace("key: 'trace'", "key: 'toString'")));
  assert.ok(errs.some(e => /Object\.prototype/.test(e.message)));
  ({ errs } = readMeta(replace("type: 'toggle'", "type: 'color'")));
  assert.ok(errs.some(e => /type must be one of/.test(e.message)));
});

test('validateMeta: presets, time, context, alt, colors, tags, license', () => {
  let { errs } = readMeta(replace('params: { k: 4 }', 'params: { k: 4, n: 2 }'));
  assert.ok(errs.some(e => /"n" is not a declared param/.test(e.message)), JSON.stringify(errs));
  ({ errs } = readMeta(replace('params: { k: 4 }', 'params: { k: 4.5 }')));
  assert.ok(errs.some(e => /not a valid value/.test(e.message)));
  ({ errs } = readMeta(replace('t: 6 }', 't: 25 }')));
  assert.ok(errs.some(e => e.field === 'presets[0].t' && /beyond time.length/.test(e.message)));
  ({ errs } = readMeta(replace("author: { name: 'Your name' }", "author: { name: 'Your name', email: 'me@uni.edu' }")));
  assert.ok(!errs.some(e => /^author/.test(e.field)), JSON.stringify(errs));
  ({ errs } = readMeta(replace("author: { name: 'Your name' }", "author: { name: 'Your name', email: 'not an address' }")));
  assert.ok(errs.some(e => e.field === 'author.email'));
  ({ errs } = readMeta(replace("context: '2d'", "context: 'webgl2'")));
  assert.ok(errs.some(e => /webgl2 piece is desktop only/.test(e.message)));
  ({ errs } = readMeta(replace("context: '2d'", "context: 'webgl2'").replace('phone: true', 'phone: false')));
  assert.deepEqual(errs, []);
  ({ errs } = readMeta(replace(/alt: '[^']*'/.exec(EXAMPLE)[0], "alt: 'A rose.'")));
  assert.ok(errs.some(e => e.field === 'alt' && /at least 40/.test(e.message)));
  ({ errs } = readMeta(replace(/alt: '[^']*'/.exec(EXAMPLE)[0], "alt: 'A rose curve on black. It turns slowly. Then it stops, e.g. at the end.'")));
  assert.ok(errs.some(e => e.field === 'alt' && /3 sentences/.test(e.message)), JSON.stringify(errs));
  ({ errs } = readMeta(replace("bg: '#050508', fg: '#ecebf5'", "bg: '#050508', fg: '#333333'")));
  assert.ok(errs.some(e => e.field === 'colors' && /contrast/.test(e.message)));
  ({ errs } = readMeta(replace("bg: '#050508', fg: '#ecebf5'", "bg: '#ffffff'")));
  assert.ok(errs.some(e => e.field === 'colors'), 'site fg on a white bg fails');
  ({ errs } = readMeta(replace("'Geometry', 'Teaching'", "'Geometry', 'Cooking'")));
  assert.ok(errs.some(e => /"Cooking" is not in the tag vocabulary/.test(e.message)));
  ({ errs } = readMeta(replace("license: 'MIT'", "license: 'WTFPL'")));
  assert.ok(errs.some(e => e.field === 'license'));
  ({ errs } = readMeta(replace('libraries: []', "libraries: [{ name: 'gpl-lib', version: '1.0.0', license: 'GPL-3.0' }]")));
  assert.ok(errs.some(e => /must be GPL-3.0 too/.test(e.message)));
  assert.ok(Math.abs(S.contrast('#ffffff', '#000000') - 21) < 1e-9);
});

test('explanationProblems: sections, HTML, images, links, TeX', () => {
  const { r } = readMeta(EXAMPLE), meta = r.meta;
  const errs = md => msgs(S.explanationProblems(md, meta).errors);
  assert.match(errs(MD.replace("### What you're seeing", '### What is this').replace('### Try this', '### Play')),
    /heading "What you're seeing"[\s\S]*heading "Try this"/);
  assert.equal(errs(MD.replace("What you're seeing", 'What you’re seeing')), '');
  assert.match(errs(MD.replace('**Reference:**', 'Source:')), /Reference line/);
  assert.match(errs(MD + '\n<div>hi</div>\n'), /raw HTML/);
  assert.match(errs(MD + '\n![rose](https://example.com/r.png)\n'), /images are not allowed/);
  assert.match(errs(MD + '\n[click](javascript:alert(1))\n'), /must be http\(s\)/);
  assert.match(errs(MD + '\n[short](https://bit.ly/abc)\n'), /shorteners/);
  assert.match(errs(MD + '\n[ref]: https://t.co/xyz\n'), /shorteners/);
  assert.match(errs(MD + '\n<ftp://example.com/x>\n'), /must be http\(s\)/);
  assert.equal(errs(MD + '\n<https://example.com/x>\n'), '');
  assert.match(errs(MD + '\n[late](#t:9999)\n'), /beyond time.length/);
  assert.match(errs(MD + '\n[nope](#preset:nope)\n'), /unknown preset "nope"/);
  assert.match(errs(MD + '\n[x](#param:k)\n'), /unknown link target/);
  assert.match(errs(MD + '\n$\\def\\x{1}\\x$\n'), /custom macros/);
  assert.equal(errs(MD + '\nInline `<div>` code and $a < b$ are fine.\n'), '');
  assert.match(errs('### What you\'re seeing\n\n### Try this\n\nReference: x\n'), /words \(150 to 1200/);
  assert.equal(S.wordCount('one $x + y = z$ two\n```\nthree four\n```\n[five](https://a.example/b)'), 3);
});

test('liveLink', () => {
  const { r } = readMeta(EXAMPLE);
  assert.equal(S.liveLink(r.meta, 'https://example.com'), null);
  assert.equal(S.liveLink(r.meta, '#preset:eight').preset.id, 'eight');
  assert.deepEqual(S.liveLink(r.meta, '#t:6'), { kind: 't', t: 6 });
  assert.equal(S.liveLink(r.meta, '#t:24.5').kind, 'error');
  assert.equal(S.liveLink(r.meta, '#t:-1').kind, 'error');
  assert.equal(S.liveLink(r.meta, '#foo:bar').kind, 'error');
});

test('validateValue, normalizeParams, nonDefault, paramControls', () => {
  const k = { key: 'k', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5 };
  assert.equal(S.validateValue(k, 0.34), 0.3);
  assert.equal(S.validateValue(k, 0.36), 0.4);
  assert.equal(S.validateValue(k, 7), 1);
  assert.equal(S.validateValue(k, -7), 0);
  assert.equal(S.validateValue(k, 'x'), 0.5);
  assert.equal(S.validateValue(k, NaN), 0.5);
  assert.equal(S.validateValue({ type: 'toggle', default: true }, 0), true);
  assert.equal(S.validateValue({ type: 'select', options: [['a', 'A'], ['b', 'B']], default: 'a' }, 'b'), 'b');
  assert.equal(S.validateValue({ type: 'select', options: [['a', 'A'], ['b', 'B']], default: 'a' }, 'c'), 'a');
  const { r } = readMeta(EXAMPLE);
  assert.deepEqual(S.normalizeParams(r.meta, { k: 3.6, bogus: 1 }), { k: 4, trace: true });
  assert.deepEqual(S.nonDefault(r.meta, { k: 5, trace: false }), { trace: false });
  assert.equal(S.isDefault(r.meta, { k: 5 }), true);
  const c = S.paramControls({ params: [{ key: 'a', type: 'range', label: 'A', min: 0, max: 90, step: 0.5, default: 0, format: '{}°' }] });
  assert.equal(c[0].format(45), '45.0°');
  assert.equal(S.presetById(r.meta, 'eight').label, 'k = 4, eight petals');
});

test('encodeShare / decodeShare round trip', () => {
  const { r } = readMeta(EXAMPLE);
  const h = S.encodeShare({ slug: 'rose', params: { k: 7, trace: true }, t: 99 }, r.meta);
  assert.match(h, /^#v=rose&p=[A-Za-z0-9_-]+&t=24$/);
  const d = S.decodeShare('https://eigenreel.example/' + h, { rose: r.meta });
  assert.deepEqual(d, { slug: 'rose', params: { k: 7, trace: true }, t: 24 });
  assert.equal(S.encodeShare({ slug: 'rose', params: { k: 5 }, t: NaN }, r.meta), '#v=rose');
  assert.deepEqual(S.decodeShare('#v=rose&p=!!!&t=x', { rose: r.meta }), { slug: 'rose', params: { k: 5, trace: true }, t: undefined });
  assert.equal(S.decodeShare('#v=other', { rose: r.meta }), null);
  const m = S.toManifest(r.meta, r.colors, 'rose');
  assert.equal(m.id, 'rose'); assert.equal(m.author, 'Your name'); assert.deepEqual(m.pointer, { mode: 'custom', hint: 'Drag a petal · use the panel' });
});

test('check: the whole gate', async () => {
  let res = await S.check({ slug: 'rose', source: EXAMPLE, md: MD });
  assert.deepEqual(res.errors, [], msgs(res.errors));
  assert.ok(res.ok); assert.match(res.sha256, /^[0-9a-f]{64}$/);

  res = await S.check({ slug: 'Rose!', source: EXAMPLE, md: null });
  assert.match(msgs(res.errors), /slug/); assert.match(msgs(res.errors), /explanation entries\/Rose!\.md is missing/);

  const sha = (await S.check({ slug: 'rose', source: EXAMPLE, md: MD })).sha256;
  res = await S.check({ slug: 'rose2', source: EXAMPLE, md: MD, others: [{ slug: 'rose', sha256: sha }] });
  assert.match(msgs(res.errors), /identical to entries\/rose\.js/);

  res = await S.check({ slug: 'rose', source: EXAMPLE, md: MD, wasm: new Uint8Array([1, 2, 3]), hasBuild: false });
  assert.match(msgs(res.errors), /not a valid WebAssembly module/);
  assert.match(msgs(res.errors), /sources\/rose\/BUILD is missing/);

  const empty = new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
  res = await S.check({ slug: 'rose', source: EXAMPLE, md: MD, wasm: empty.buffer, hasBuild: true });
  assert.ok(res.ok, msgs(res.errors));

  res = await S.check({ slug: 'rose', source: EXAMPLE.replace('setup(env, S) {}', 'async setup(env, S) { await env.wasm(); }'), md: MD });
  assert.match(msgs(res.errors), /env\.wasm\(\) but there is no entries\/rose\.wasm/);

  res = await S.check({ slug: 'rose', source: EXAMPLE.replace('draw(ctx, t, params, env, S) {}', "draw(ctx) { fetch('x'); }"), md: MD });
  assert.ok(res.ok, msgs(res.errors));
  assert.deepEqual(res.warnings.filter(w => w.file.endsWith('.js')).map(w => [w.file, w.line, w.message]), [['entries/rose.js', 27, 'the sandbox blocks fetch; this call will do nothing']]);

  res = await S.check({ slug: 'rose', source: replace("bg: '#050508', fg: '#ecebf5'", "fg: '#111111'"), md: MD });
  assert.deepEqual(res.errors.map(e => [e.file, e.line]), [['entries/rose.js', 1]]);

  res = await S.check({ slug: 'rose', source: replace('t: 6 }', 't: 30 }'), md: MD });
  assert.equal(res.errors[0].line, 21);
});

test('loads without acorn and fails only when read is called', () => {
  const ctx = { console };
  ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'spec.js'), 'utf8'), ctx);
  const r = ctx.EigenReelSpec.read(EXAMPLE);
  assert.equal(r.ok, false);
  assert.match(r.errors[0].message, /acorn/);
  assert.equal(ctx.EigenReelSpec.validateValue({ type: 'toggle', default: true }, false), false);
});
