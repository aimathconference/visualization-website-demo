const COLORS = {
  main: '#f0abfc',
  secondary: '#4ade80',
  bg: '#050508',
  fg: '#ecebf5',
};

import * as THREE from '@eigenreel/three';
import { fsFor, label } from '@eigenreel/kit';

const SEG = 160, CYCLE = 40, PICK_STEP = 4, FOV = 35;

/* the slow turn of the whole group, a function of t: [about x, about y], once around per 40-second loop */
const spin = t => [0.25 * Math.sin((2 * Math.PI * t) / CYCLE), (2 * Math.PI * t) / CYCLE];

/* The fiber of the Hopf map over the point of S² at latitude lat and longitude lon, as points of R³:
   (z1, z2) = (cos(ψ/2) e^{iα}, sin(ψ/2) e^{i(α − lon)}) with ψ = π/2 − lat, then stereographic projection
   of S³ from (0, 0, 0, 1). Axes: x1 → X, x3 → Y (up), x2 → Z, so the fiber over the north pole is the
   horizontal unit circle and the fiber over the south pole is the vertical axis. */
function fiber(lat, lon) {
  const psi = Math.PI / 2 - lat, a = Math.cos(psi / 2), b = Math.sin(psi / 2), pts = [];
  for (let i = 0; i < SEG; i++) {
    const al = (2 * Math.PI * i) / SEG;
    const x1 = a * Math.cos(al), x2 = a * Math.sin(al), x3 = b * Math.cos(al - lon), x4 = b * Math.sin(al - lon);
    const k = 1 / (1 - x4);
    pts.push(new THREE.Vector3(x1 * k, x3 * k, x2 * k));
  }
  return pts;
}

/* distance in px from (x, y) to a closed polyline stored as [x0, y0, x1, y1, …] */
function polyDist(xy, x, y) {
  let best = Infinity;
  for (let i = 0, n = xy.length / 2; i < n; i++) {
    const ax = xy[2 * i], ay = xy[2 * i + 1], j = (i + 1) % n, bx = xy[2 * j], by = xy[2 * j + 1];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(x - ax - u * dx, y - ay - u * dy));
  }
  return best;
}

/* the second ring's latitude */
const second = lat => Math.min(85, lat + 35);

function rebuild(S, params, C) {
  for (const m of S.group.children) { m.geometry.dispose(); m.material.dispose(); }
  S.group.clear(); S.fibers = [];
  const rings = [{ lat: params.lat, c0: C.main, c1: C.secondary }];
  if (params.second) rings.push({ lat: second(params.lat), c0: C.fg, c1: C.secondary });
  let R = 0;
  for (const ring of rings) for (let j = 0; j < params.count; j++) {
    const lon = (2 * Math.PI * j) / params.count, pts = fiber((ring.lat * Math.PI) / 180, lon);
    for (const p of pts) R = Math.max(R, p.length());
    const col = new THREE.Color(ring.c0).lerp(new THREE.Color(ring.c1), 0.5 - 0.5 * Math.cos(lon));   // color by longitude
    S.fibers.push({ pts, col, lat: ring.lat, lon: (360 * j) / params.count, xy: new Float32Array((2 * SEG) / PICK_STEP) });
  }
  R = Math.min(R, 12);
  for (const f of S.fibers) {
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(f.pts, true), SEG, 0.022 * R, 8, true);
    S.group.add(new THREE.Mesh(tube, new THREE.MeshLambertMaterial({ color: f.col })));
  }
  S.R = R;
}

/* the highlighted fiber stands out with a glow; the others fade toward the background */
function restyle(S, sel, C) {
  const bg = new THREE.Color(C.bg);
  S.group.children.forEach((m, i) => {
    const f = S.fibers[i], on = sel === i;
    m.material.color.copy(f.col);
    if (sel != null && !on) m.material.color.lerp(bg, 0.7);
    m.material.emissive.copy(f.col).multiplyScalar(on ? 0.55 : 0);
  });
}

export default {
  title: 'The Hopf fibration: linked circles filling space',
  hook: 'Every point of the 2-sphere lifts to a circle in the 3-sphere, and every two of those circles are linked.',
  alt: 'A ring of colored tubes, each a closed circle, wraps around a doughnut shape so that every circle threads through all the others, and the arrangement turns slowly.',
  tags: ['Topology', 'Geometry', 'GPU'],
  license: 'MIT',
  author: { name: 'villarceau' },

  modes: { desktop: true, phone: false },
  time: { length: 40, loop: true },
  context: 'webgl2',
  libraries: [],

  params: [
    { key: 'lat', type: 'range', label: 'Latitude on S²', min: -40, max: 80, step: 1, default: 0, format: '{}°' },
    { key: 'count', type: 'range', label: 'Fibers', min: 8, max: 64, step: 1, default: 24 },
    { key: 'second', type: 'toggle', label: 'Second ring, 35° north', default: false },
    { key: 'elev', type: 'range', label: 'Camera elevation', min: -30, max: 88, step: 1, default: 24, format: '{}°' },
    { key: 'highlight', type: 'range', label: 'Highlighted fiber (0 = none)', min: 0, max: 128, step: 1, default: 0 },
  ],
  presets: [
    { id: 'one-torus', label: 'One latitude = one torus', params: { lat: 0, count: 64, second: false } },
    { id: 'two-latitudes', label: 'Two latitudes link', params: { lat: 10, count: 16, second: true } },
    { id: 'near-pole', label: 'Near the pole', params: { lat: 75, count: 24, second: false } },
    { id: 'down-the-axis', label: 'Look down the axis', params: { lat: 0, count: 24, second: false, elev: 86, highlight: 1 }, t: 0 },
    { id: 'turning', label: 'Back to the turning view', params: { elev: 24, highlight: 0 } },
  ],

  interact: { hint: 'Drag up or down to tilt · click a circle' },

  // The scene needs no GL context, so setup builds it; the renderer is made on the first frame, when draw has the context.
  setup(env, S) {
    S.scene = new THREE.Scene(); S.group = new THREE.Group(); S.scene.add(S.group);
    S.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 5, 4); S.scene.add(sun);
    S.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 400);
    S.key = ''; S.look = ''; S.fibers = [];
  },

  draw(gl, t, params, env, S) {
    const C = env.colors, { w, h } = env.box;
    if (!S.renderer) {
      // The page owns the canvas size: never setSize or setPixelRatio (the pixel ratio stays 1, so the viewport is in
      // device px). The page also clears the canvas, so three.js must not.
      S.renderer = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl, antialias: true });
      S.renderer.autoClear = false;
    }
    const key = [params.lat, params.count, params.second].join();
    if (key !== S.key) { rebuild(S, params, C); S.key = key; S.look = ''; }
    const sel = params.highlight > 0 && params.highlight <= S.fibers.length ? params.highlight - 1 : null;
    const look = String(sel);
    if (look !== S.look) { restyle(S, sel, C); S.look = look; }

    // the box in device px (bottom-left origin), as the page set it; read before resetState, which resets GL state
    const vp = gl.getParameter(gl.VIEWPORT), r = S.renderer, cam = S.camera;
    r.resetState();
    r.setViewport(vp[0], vp[1], vp[2], vp[3]); r.setScissor(vp[0], vp[1], vp[2], vp[3]); r.setScissorTest(true);

    // the camera, a function of params: on a sphere around the origin at elevation `elev`, far enough to fit the fibers
    const aspect = w / h, half = (FOV * Math.PI) / 360;
    const fit = (S.R / Math.tan(Math.min(half, Math.atan(Math.tan(half) * aspect)))) * 1.12;
    const el = (params.elev * Math.PI) / 180;
    cam.aspect = aspect; cam.near = fit * 0.02; cam.far = fit * 4;
    cam.position.set(0, fit * Math.sin(el), fit * Math.cos(el)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    const [rx, ry] = spin(t);
    S.group.rotation.set(rx, ry, 0);
    r.render(S.scene, cam);

    // where every fiber is on screen, in CSS px from the box's top-left: for the label and for picking in interact mode
    S.group.updateMatrixWorld(); cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    for (const f of S.fibers) for (let k = 0; k < SEG / PICK_STEP; k++) {
      v.copy(f.pts[k * PICK_STEP]).applyMatrix4(S.group.matrixWorld).project(cam);
      f.xy[2 * k] = ((v.x + 1) / 2) * w; f.xy[2 * k + 1] = ((1 - v.y) / 2) * h;
    }
    S.elev = params.elev;   // only for onMode's drag, which starts from the elevation the last frame drew

    const o = env.overlay;
    if (!o) return;
    const fs = fsFor(env.box), n = params.count * (params.second ? 2 : 1);
    label(o, env, 'Hopf fibration, stereographically projected', 6, fs + 4, { size: fs + 1, weight: 700 });
    label(o, env, `${n} fibers over latitude ${params.lat}°${params.second ? ` and ${second(params.lat)}°` : ''}`, 6, fs * 2.3 + 4, { size: fs, alpha: 0.8 });
    const f = sel != null && S.fibers[sel];
    if (f) {
      // the label sits above the top of the highlighted circle on screen
      let top = 0;
      for (let k = 1; k < f.xy.length / 2; k++) if (f.xy[2 * k + 1] < f.xy[2 * top + 1]) top = k;
      const la = (f.lat * Math.PI) / 180, lo = (f.lon * Math.PI) / 180;
      const P = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      const lx = Math.max(110, Math.min(w - 110, f.xy[2 * top])), ly = Math.min(h - fs * 2.5, Math.max(fs * 4.6, f.xy[2 * top + 1] - 10));
      label(o, env, `the fiber over (${f.lat}°, ${+f.lon.toFixed(1)}°)`, lx, ly - fs * 1.2, { size: fs, weight: 700, color: C.secondary, align: 'center' });
      label(o, env, `base point (${P.map(c => c.toFixed(2)).join(', ')}) on S²`, lx, ly, { size: fs, align: 'center' });
    }
    const foot = f ? 'it links every other circle exactly once'
      : env.mode === 'interact' ? 'click a circle to see the point of S² it lies over' : 'every two circles link exactly once';
    label(o, env, foot, 6, h - 8, { size: fs, weight: 700, color: C.main });
  },

  // Interact mode: a vertical drag tilts the camera (the `elev` param), a click on a circle highlights it (the
  // `highlight` param), a click on empty space clears it. Both go through env.setParam, so a share link keeps them.
  onMode(env, S) {
    if (env.mode !== 'interact' || !env.ui) return;
    let down = null;
    env.ui.addEventListener('pointerdown', e => { down = { x: e.x, y: e.y, elev: S.elev ?? 24, moved: false }; });
    env.ui.addEventListener('pointermove', e => {
      if (!down || !e.buttons) return;
      const dy = e.y - down.y;
      if (Math.abs(dy) > 3 || Math.abs(e.x - down.x) > 3) down.moved = true;
      if (down.moved) env.setParam('elev', Math.round(down.elev + dy * 0.4));
    });
    env.ui.addEventListener('pointerup', e => {
      const d = down; down = null;
      if (!d || d.moved || !S.fibers) return;
      let best = null, bestD = 9;
      S.fibers.forEach((f, i) => { const dist = polyDist(f.xy, e.x, e.y); if (dist < bestD) { bestD = dist; best = i; } });
      env.setParam('highlight', best == null ? 0 : best + 1);
    });
    env.ui.addEventListener('pointercancel', () => { down = null; });
  },
};
