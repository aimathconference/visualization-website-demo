import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readdirSync, readFileSync } from 'node:fs';
import { guard, requireColors, GuardError } from '../server/guard.js';

// Runs guarded code the way the runner does and returns the exported object plus a frame clock.
function load(source) {
  const { code } = guard(source);
  const clock = { start: performance.now() };
  const ctx = { performance, __loci: { overtime: () => performance.now() - clock.start > 250, define(v) { ctx.viz = v; } } };
  vm.runInNewContext(code, ctx);
  return { viz: ctx.viz, frame: () => { clock.start = performance.now(); } };
}

test('infinite loops of every kind are stopped within the frame budget', () => {
  const loops = ['while (true) {}', 'for (;;) {}', 'do {} while (true)', 'for (;;) for (;;) ;', 'while (true) if (1) {}', 'for (const x of (function*(){ while(true) yield 1; })()) {}'];
  for (const body of loops) {
    const { viz, frame } = load(`export default { draw() { ${body} } };`);
    frame();
    const t0 = performance.now();
    assert.throws(() => viz.draw(), /over 250 ms/, body);
    assert.ok(performance.now() - t0 < 1000, `${body} took too long`);
  }
});

test('normal loops still run and return the right result', () => {
  const { viz, frame } = load('export default { draw() { let s = 0; for (let i = 0; i < 300000; i++) s += i; let j = 0; while (j < 10) j++; return s + j; } };');
  frame();
  assert.equal(viz.draw(), 299999 * 300000 / 2 + 10);
});

test('strings and comments that look like loops are left alone', () => {
  const src = 'export default { draw() { return "for(;;){}" + `while(true)`; /* do {} while(1) */ } };';
  const { viz } = load(src);
  assert.equal(viz.draw(), 'for(;;){}while(true)');
});

test('line numbers are preserved', () => {
  const src = 'const a = 1;\n\nexport default {\n  draw() {\n    for (;;) {}\n  }\n};\n';
  const { code } = guard(src);
  const lines = code.split('\n');
  assert.equal(lines.length, src.split('\n').length + 1);
  assert.match(lines[4], /for \(;;\) \{if\(\(\+\+__lg/);
});

test('imports, other exports and missing pieces are rejected with a line number', () => {
  const cases = [
    ['import x from "y";\nexport default { draw() {} };', /Imports aren't allowed/, 1],
    ['export default { async draw() { await import("x"); } };', /Imports aren't allowed/, 1],
    ['export const a = 1;\nexport default { draw() {} };', /Only one export/, 1],
    ['export default function draw() {}', /Export an object/, 1],
    ['export default {\n  title: "x"\n};', /needs a draw/, 1],
    ['const a = 1;', /Missing `export default/, null],
    ['export default {\n  draw() {\n    let = ;\n  }\n};', /Syntax error/, 3],
    ['', /empty/, null],
  ];
  for (const [src, re, line] of cases) {
    assert.throws(() => guard(src), e => e instanceof GuardError && re.test(e.message) && e.line === line, src);
  }
});

test('size limit', () => {
  assert.throws(() => guard(`export default { draw() {} }; // ${'x'.repeat(60_000)}`), /over 50 KB/);
});

test('metadata is read without running the code', () => {
  const { meta } = guard(`export default {
    title: 'Rose curves', hook: \`Petals\`, tags: ['Geometry', 'Polar'], license: 'MIT', t0: -1.5,
    param: { key: 'k', min: 1, max: 9, value: 3, options: ['a', 'b'] },
    color: someVariable,
    draw() {},
  };`);
  assert.deepEqual(meta, { title: 'Rose curves', hook: 'Petals', tags: ['Geometry', 'Polar'], license: 'MIT', t0: -1.5, param: { key: 'k', min: 1, max: 9, value: 3, options: ['a', 'b'] } });
});

test('colors are read from a COLORS block at the top of the file', () => {
  const src = `// comments may come first
const COLORS = { main: '#FF2E74', secondary: '#22e0e8', 'grid line': '#123456' };
function helper() { return COLORS.main; }
export default { title: 'T', draw() { return helper(); } };`;
  const { meta } = guard(src);
  assert.deepEqual(meta.colors, { main: '#ff2e74', secondary: '#22e0e8', 'grid line': '#123456' });
  assert.equal(load(src).viz.draw(), '#FF2E74', 'the code can use its own block');
  assert.equal(guard('export default { draw() {} };').meta.colors, undefined);
  assert.equal(guard('function f() { const COLORS = 1; }\nexport default { draw() {} };').meta.colors, undefined, 'only a top-level COLORS counts');
});

test('a bad COLORS block is rejected with a line number', () => {
  const end = '\nexport default { draw() {} };';
  const cases = [
    [`const a = 1;\nconst COLORS = { main: '#000000', secondary: '#ffffff' };${end}`, /first statement/, 2],
    [`let COLORS = { main: '#000000', secondary: '#ffffff' };${end}`, /const COLORS/, 1],
    [`const COLORS = make();${end}`, /const COLORS/, 1],
    [`const COLORS = { main: '#000000' };${end}`, /main and a secondary/, 1],
    [`const COLORS = {\n  main: 'red',\n  secondary: '#ffffff' };${end}`, /six-digit hex/, 2],
    [`const COLORS = {\n  main: '#fff',\n  secondary: '#ffffff' };${end}`, /six-digit hex/, 2],
    [`const COLORS = {\n  main: '#000000;}',\n  secondary: '#ffffff' };${end}`, /six-digit hex/, 2],
    [`const COLORS = { main: pick(), secondary: '#ffffff' };${end}`, /six-digit hex/, 1],
    [`const COLORS = { ...others, main: '#000000', secondary: '#ffffff' };${end}`, /six-digit hex/, 1],
  ];
  for (const [src, re, line] of cases) {
    assert.throws(() => guard(src), e => e instanceof GuardError && re.test(e.message) && e.line === line, src);
  }
  assert.throws(() => requireColors({}), /at the top of the file/);
});

test('the contributor template passes the guard', () => {
  const { meta } = guard(readFileSync(new URL('../github/registry-practice/template/visualization.js', import.meta.url), 'utf8'));
  assert.ok(meta.title && meta.hook.length <= 160 && meta.tags.length <= 4 && meta.license === 'MIT' && meta.param);
  assert.ok(meta.colors.main && meta.colors.secondary);
});

test('all seed visualizations pass the guard and have their own colors', () => {
  const dir = new URL('../server/seeds/', import.meta.url), pairs = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const { meta } = guard(readFileSync(new URL(f, dir), 'utf8'));
    assert.ok(meta.title && meta.tags.length && meta.param, f);
    assert.ok(meta.colors?.main && meta.colors.secondary && meta.colors.bg && meta.colors.fg, f);
    pairs.push(`${meta.colors.main} ${meta.colors.secondary}`);
  }
  assert.equal(new Set(pairs).size, pairs.length);
});
