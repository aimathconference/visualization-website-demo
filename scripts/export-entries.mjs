#!/usr/bin/env node
/* Writes the catalog's pieces as registry package folders: node scripts/export-entries.mjs <registry-checkout>/entries [id ...]
 * Each folder is what LociChecks.samplePackage builds (the Submit page's own samples): loci.json, the modules,
 * explanation.md and LICENSE. A WebAssembly piece's module, explanation, source and build script come from the
 * folder its catalog entry names. Slider labels written as a function (fmt) cannot travel in JSON, so they are listed at the end. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [dest, ...only] = process.argv.slice(2);
if (!dest) { console.error('usage: node scripts/export-entries.mjs <entries-folder> [id ...]'); process.exit(2); }

const ctx = vm.createContext({ console, TextEncoder, TextDecoder, crypto, performance, setTimeout, clearTimeout, URL, Promise });
ctx.globalThis = ctx;
for (const f of ['kit.js', 'manifest.js', 'tex.js', 'catalog.js', 'checks.js']) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
const { VIZ, LociChecks } = vm.runInContext('({ VIZ, LociChecks })', ctx);

const lossy = [];
for (const v of VIZ) {
  if (only.length && !only.includes(v.id)) continue;
  const o = v.entry ? { wasmBytes: new Uint8Array(readFileSync(join(ROOT, v.entry))), md: readFileSync(join(ROOT, v.mdUrl), 'utf8') } : {};
  const pkg = LociChecks.samplePackage(v, false, o);
  for (const [name, file] of pkg.files) {
    const path = join(dest, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.text ?? file.bytes);
  }
  if (v.sourceUrl) for (const f of [v.sourceUrl, join(dirname(v.entry), 'build.sh')]) copyFileSync(join(ROOT, f), join(dest, v.id, f.split('/').pop()));
  for (const p of v.manifest.params || []) if (typeof p.fmt === 'function' && !p.format) lossy.push(`${v.id}.${p.key}: ${p.fmt}`);
  console.log(`${v.id}: ${pkg.files.size} files`);
}
if (lossy.length) console.log(`\nSlider labels lost (fmt is a function, no format):\n  ${lossy.join('\n  ')}`);
