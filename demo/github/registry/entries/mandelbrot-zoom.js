const COLORS = {
  main: '#818cf8',
  secondary: '#fcd34d',
  bg: '#050508',
  fg: '#ecebf5',
};

import { hex, fsFor, label } from '@eigenreel/kit';

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Every pixel is one c; the loop iterates z -> z^2 + c with a literal cap (MAX_ITER) and stops early at the budget.
const FRAG = `#version 300 es
precision highp float;
#define MAX_ITER 1000
uniform vec4 u_vp;
uniform vec2 u_center;
uniform float u_width;
uniform int u_iter;
uniform vec3 u_bg, u_a1, u_a2;
out vec4 color;
void main() {
  float s = min(u_vp.z, u_vp.w);
  vec2 q = (gl_FragCoord.xy - u_vp.xy - 0.5 * u_vp.zw) / s;
  vec2 c = u_center + q * u_width;
  vec2 z = vec2(0.0);
  float n = -1.0;
  for (int i = 0; i < MAX_ITER; i++) {
    if (i >= u_iter) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 256.0) { n = float(i); break; }
  }
  if (n < 0.0) { color = vec4(u_bg, 1.0); return; }
  float mu = n + 1.0 - log2(0.5 * log(dot(z, z)));
  float w = 0.5 + 0.5 * cos(2.2 * log(mu + 1.0) * 3.14159);
  vec3 ink = mix(u_a1, u_a2, w);
  color = vec4(mix(u_bg, ink, 1.0 - exp(-0.15 * mu)), 1.0);
}`;

// three boundary points to zoom toward
const TARGETS = {
  seahorse: { re: -0.743643887037151, im: 0.131825904205330, name: 'Seahorse valley' },
  misiurewicz: { re: -0.77568377, im: 0.13646737, name: 'a Misiurewicz point' },
  branch: { re: -0.10109636384562, im: 0.95628651080914, name: 'a three-armed branch point' },
};
const START = { re: -0.6, im: 0.0 }, W0 = 3.2, DEPTH = 5, CYCLE = 30;

// The tour, a function of t: zoom depth k goes 0 -> DEPTH -> 0 over the 30-second loop, deepest at t = 15, and the
// centre slides from the overview onto the target as the view narrows.
function tour(t, T) {
  const ph = (((t % CYCLE) + CYCLE) % CYCLE) / CYCLE, k = DEPTH * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph));
  const s = Math.pow(10, -k), pull = Math.pow(s, 1.5);
  return { k, re: T.re + (START.re - T.re) * pull, im: T.im + (START.im - T.im) * pull, w: W0 * s };
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  return sh;
}

export default {
  title: 'A zoom into the Mandelbrot set, on the GPU',
  hook: 'A hundred thousand times closer to the edge of the Mandelbrot set, every pixel iterated on the GPU, until 32-bit floats run out of digits.',
  alt: 'The dark body of the Mandelbrot set glows at its edge in bands of violet and gold while the view dives toward a point on the boundary, where spirals and filaments open up, and pulls back out.',
  tags: ['Complex dynamics', 'Fractals', 'GPU'],
  license: 'MIT',
  author: { name: 'escape.time' },

  modes: { desktop: true, phone: false },
  time: { length: 30, loop: true },
  context: 'webgl2',
  libraries: [],

  params: [
    { key: 'iter', type: 'range', label: 'Iterations', min: 50, max: 1000, step: 10, default: 300 },
    {
      key: 'target', type: 'select', label: 'Zoom toward',
      options: [['seahorse', 'Seahorse valley'], ['misiurewicz', 'Misiurewicz point'], ['branch', 'Branch point']],
      default: 'seahorse',
    },
  ],
  presets: [
    { id: 'seahorse-1000', label: 'Seahorse valley at 1000 iterations', params: { iter: 1000, target: 'seahorse' }, t: 13 },
    { id: 'budget-50', label: '50 iterations, the budget shows', params: { iter: 50, target: 'seahorse' }, t: 12 },
    { id: 'misiurewicz', label: 'A Misiurewicz point', params: { iter: 300, target: 'misiurewicz' }, t: 14 },
    { id: 'branch', label: 'A three-armed branch point', params: { iter: 300, target: 'branch' }, t: 14 },
  ],

  // The GL context arrives in draw, not setup, so the program is built on the first frame and kept in S.
  draw(gl, t, params, env, S) {
    if (!S.gpu) {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle covers the viewport
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      const u = {};
      for (const k of ['u_vp', 'u_center', 'u_width', 'u_iter', 'u_bg', 'u_a1', 'u_a2']) u[k] = gl.getUniformLocation(prog, k);
      S.gpu = { prog, vao, u };
    }
    const { prog, vao, u } = S.gpu, C = env.colors, T = TARGETS[params.target] || TARGETS.seahorse;
    const cam = tour(t, T);
    const col = h => hex(h).map(x => x / 255);
    const vp = gl.getParameter(gl.VIEWPORT);   // the box in device px, bottom-left origin, as the page set it

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.useProgram(prog); gl.bindVertexArray(vao);
    gl.uniform4f(u.u_vp, vp[0], vp[1], vp[2], vp[3]);
    gl.uniform2f(u.u_center, cam.re, cam.im);
    gl.uniform1f(u.u_width, cam.w);
    gl.uniform1i(u.u_iter, params.iter);
    gl.uniform3f(u.u_bg, ...col(C.bg)); gl.uniform3f(u.u_a1, ...col(C.main)); gl.uniform3f(u.u_a2, ...col(C.secondary));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    // text on the 2D overlay: the same CSS px as a '2d' piece, (0, 0) at the box's top-left
    const o = env.overlay;
    if (!o) return;
    const { h } = env.box, fs = fsFor(env.box);
    label(o, env, `Mandelbrot set, toward ${T.name}`, 6, fs + 4, { size: fs + 1, weight: 700 });
    label(o, env, `${params.iter} iterations · zoom 10^${cam.k.toFixed(1)}`, 6, fs * 2.3 + 4, { size: fs, alpha: 0.8 });
    label(o, env, `width ${cam.w.toExponential(1)}`, 6, h - 8, { size: fs, weight: 700, color: cam.k > 4.2 ? C.main : C.fg });
  },
};
