const COLORS = {
  main: '#2dd4bf',
  secondary: '#e879f9',
  bg: '#050508',
  fg: '#ecebf5',
};

import { label, hex } from '@eigenreel/kit';

// The drawing is computed in C (sources/wasm-lissajous/viz.c, built into entries/wasm-lissajous.wasm). Each frame
// the module returns a list of float commands, which this half replays on the 2D context:
//   0 end · 1 fill color r g b a · 2 stroke color r g b a, width · 3 moveTo x y · 4 lineTo x y
//   5 arc x y r a0 a1 · 6 closePath · 7 beginPath · 8 fill · 9 stroke
//   10 label: pointer and length of UTF-8 text in the module's memory, x y size align (0 left, 1 center, 2 right; +4 bold)
// Coordinates are CSS px from the box's top-left corner, the same as the context's.

const MAX_MEM = 64 * 1024 * 1024;
const u32 = h => { const c = hex(h); return ((c[0] << 16) | (c[1] << 8) | c[2]) >>> 0; };
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${Math.max(0, Math.min(1, a))})`;

export default {
  title: 'Lissajous figures from two oscillators',
  hook: 'Two oscillators at right angles, one at frequency 3 and one at b. Count where the curve touches the square and you have read off their ratio.',
  alt: 'A looping curve of interlocking lobes inside a square, with a bright point running along it and two dots on the edges showing the two oscillations that combine into it.',
  tags: ['Dynamics', 'Mechanics', 'Teaching', 'WebAssembly'],
  license: 'MIT',
  author: { name: 'wasm.curious' },

  modes: { desktop: true, phone: true },
  time: { length: 120, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'b', type: 'range', label: 'Frequency b (a = 3)', min: 1, max: 6, step: 0.05, default: 2 },
    { key: 'delta', type: 'range', label: 'Phase δ', min: 0, max: 180, step: 1, default: 90, format: '{}°' },
    { key: 'square', type: 'toggle', label: 'Inscribed square', default: true },
  ],
  presets: [
    { id: 'classic', label: '3 : 2, the classic figure', params: { b: 2, delta: 90 } },
    { id: 'one-oscillator', label: 'b = a, one oscillator', params: { b: 3, delta: 90 } },
    { id: 'collapse', label: 'Collapse to a curve', params: { b: 1, delta: 0 } },
    { id: 'detuned', label: 'Nearly 3 : 3', params: { b: 3.05, delta: 90 } },
  ],

  async setup(env, S) {
    const { instance } = await WebAssembly.instantiate(await env.wasm(), { env: { sin: Math.sin, cos: Math.cos } });
    const ex = instance.exports;
    for (const k of ['memory', 'init', 'set_param', 'set_theme', 'resize', 'frame']) {
      if (!ex[k]) throw new Error(`the module does not export ${k}`);
    }
    S.ex = ex;
    S.dec = new TextDecoder();
    S.w = Math.round(env.box.w); S.h = Math.round(env.box.h);
    ex.init(S.w, S.h, env.dpr);
    const C = env.colors;
    ex.set_theme(u32(C.bg), u32(C.fg), u32(C.secondary), u32(C.main), 1.5, 1);
  },

  draw(ctx, t, params, env, S) {
    const ex = S.ex;
    const w = Math.round(env.box.w), h = Math.round(env.box.h);
    if (w !== S.w || h !== S.h) { S.w = w; S.h = h; ex.resize(w, h); }
    // the module keeps the params it was last given; send all three every frame, so the frame depends on params alone
    ex.set_param(0, params.b);
    ex.set_param(1, params.delta);
    ex.set_param(2, params.square ? 1 : 0);

    const ptr = ex.frame(t) >>> 0, buf = ex.memory.buffer;
    if (buf.byteLength > MAX_MEM) throw new Error('module memory grew past 64 MiB');
    if (ptr % 4 || ptr + 4 > buf.byteLength) throw new Error('command list pointer out of bounds');
    const len = new Float32Array(buf, ptr, 1)[0] >>> 0;
    if (len > (1 << 22) || ptr + 4 + len * 4 > buf.byteLength) throw new Error('command list length out of bounds');
    const a = new Float32Array(buf, ptr + 4, len), bytes = new Uint8Array(buf);

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = env.colors.fg; ctx.strokeStyle = env.colors.fg; ctx.lineWidth = 1.5;
    let i = 0;
    const need = k => { if (i + k > len) throw new Error(`command list truncated at ${i}`); };
    loop: while (i < len) {
      const op = a[i++];
      switch (op) {
        case 0: break loop;
        case 1: need(4); ctx.fillStyle = rgba(a[i], a[i + 1], a[i + 2], a[i + 3]); i += 4; break;
        case 2: need(5); ctx.strokeStyle = rgba(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.lineWidth = Math.max(0.1, a[i + 4]); i += 5; break;
        case 3: need(2); ctx.moveTo(a[i], a[i + 1]); i += 2; break;
        case 4: need(2); ctx.lineTo(a[i], a[i + 1]); i += 2; break;
        case 5: need(5); ctx.arc(a[i], a[i + 1], Math.max(0, a[i + 2]), a[i + 3], a[i + 4]); i += 5; break;
        case 6: ctx.closePath(); break;
        case 7: ctx.beginPath(); break;
        case 8: ctx.fill(); break;
        case 9: ctx.stroke(); break;
        case 10: {
          need(6);
          const p = a[i] >>> 0, n = a[i + 1] >>> 0, x = a[i + 2], y = a[i + 3], size = a[i + 4], al = a[i + 5] | 0;
          i += 6;
          if (p + n > bytes.length) throw new Error('label string out of bounds');
          label(ctx, env, S.dec.decode(bytes.subarray(p, p + n)), x, y, {
            size: Math.max(6, Math.min(96, size)), weight: al & 4 ? 700 : 400,
            align: ['left', 'center', 'right'][al & 3] || 'left', color: ctx.fillStyle,
          });
          break;
        }
        default: throw new Error(`unknown opcode ${op} at index ${i - 1}`);
      }
    }
  },
};
