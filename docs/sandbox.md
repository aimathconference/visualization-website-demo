# Sandbox and check workflow (implementation)

How the site enforces the limits in the submission spec (`docs/submission-spec-slop.md`, sections 10 and 11).
Authors do not need this; the spec says what it means for a piece. The frame is `runner.html`, the worker `worker.js` and
the page side `runtime.js`; `demo/test/sandbox.test.js` and `scripts/check-sandbox.mjs` test it.

## The sandbox

| Layer | What it does |
|---|---|
| The frame | `runner.html` in `<iframe sandbox="allow-scripts">`: an opaque origin, no cookies, no storage, no popups, no forms, no top-level navigation, no access to the page. Its meta CSP is `default-src 'none'; script-src '<hash of the runner>' blob: 'wasm-unsafe-eval'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; img-src 'none'; media-src 'none'; base-uri 'none'; form-action 'none'`: no network, no frames, no form targets, and no eval except WebAssembly compilation. `blob:` is how the runner starts the worker and how the worker imports the piece and the pinned libraries. Workers inherit the policy, and the frame turns DNS prefetching off. On a separate domain (`RUNNER_URL`) the frame also gets its own process |
| The runner | The only script in the frame's document. It starts the worker, copies `env.ui` into the frame through the allowlist in the spec's section 6, forwards input, and cancels any navigation of the frame through the Navigation API. It also handles Esc first, so a piece cannot keep the viewer in |
| The worker | The piece's code runs here and nowhere else. It holds a `MessagePort` to the page (the host) and the worker's own channel to the runner, for `env.ui` and input, and nothing else. Its lockdown removes timers, `eval`, `importScripts`, `FontFace`, `RTCPeerConnection` and the network APIs, so it runs only when it is drawing a frame or handling an event it asked for |
| The page | Treats every message from the frame as untrusted. It validates `setParam` values and does nothing else on the frame's say-so. The watchdog terminates the worker when `setup` takes over 8 s, or a single `draw`, event handler or `onMode` call takes over 250 ms. A frame that loads a second time (it navigated after all) is removed and reported |
| People | The kill switch stops a piece for everyone. The crash journal skips one that crashed the tab on reload |

A piece that fails to reach the network fails silently: the CSP does not say what it blocked. The forbidden-API
warning (spec, section 10) exists so an honest author hears about it.

## The check workflow

A pull request from a fork gets no secrets and a read-only token, whatever the workflow
asks for. The check workflow runs on `pull_request` (never `pull_request_target`), with `contents: read` and
`pull-requests: read`, and the checker from the base branch. That is the case today
(`demo/github/registry/.github/workflows/check.yml`).

For a fork pull request, GitHub runs the workflow files as the pull request has them. A pull request that
edits `check.yml` can therefore make its own check pass. So:

- the registry requires a maintainer's approval before workflows run for outside contributors ("Require
  approval for all outside collaborators"), and the maintainer looks for changes under `.github/` before
  approving the run;
- reviewers never approve a pull request that touches anything outside the files the spec allows (section 11).

A ruleset-required workflow pinned to `main` would close this outright; see the open questions.

## Host API

`runtime.js` is the page's side: it mounts a piece in a frame, feeds it, and listens to it. The page never runs piece
code. The authoritative copy of this contract is the header of `runtime.js`.

```
EigenReelHost.mount(canvas, piece, opts) -> handle
  piece = { slug, source, meta, colors, wasm? }
    meta    the metadata as EigenReelSpec.read() returns it (params, presets, time, context, modes, interact, ...).
            Data: the worker trusts it, because the page validated it.
    colors  COLORS; bg and fg come from opts.site where missing. Only #rrggbb values are passed on.
    wasm    an ArrayBuffer or a same-origin URL of the .wasm, if the piece ships one.
  opts  = { params, t, playing, device: 'desktop'|'phone', mode: 'feed'|'interact', fullscreen, box: {x, y, w, h}, dpr,
            size: {w, h} (detached canvas), site: {bg, fg}, label: 'poster'|'checker'|undefined,
            onError(kind, message), onParam(key, value, params), onLeave(why), onStats(stats), onUIDropped(what), onEnded() }
  handle: id (the slug), state, playing, mode, play(), pause(), seek(t), getTime(), setParams(p), getParams(),
          setMode({mode, fullscreen, device}), resize(box, dpr), capture() -> Promise<Blob>, input(e), dispose(), block(reason)
EigenReelHost.poster(piece, {w, h, t, params, device, site, dpr?, box?}) -> Promise<Blob>
EigenReelHost.caps(), hasWebGL2(), supported, setBlocked, isBlocked, blockedReason, forgive, isCrashed, noteActive,
  setRunnerURL, validateValue(param, value), THREE, EVENT_TYPES, CALL_MS, SETUP_MS
```

- `params` must already be normalized; `setParams` does not validate. Missing params take their defaults.
- `setMode` gives interact mode only to a piece whose `meta.interact` is set. In interact mode the frame takes pointer
  events and focus, and the runner shows `env.ui` over the box. The page sets `pointer-events: none` on its own canvas
  so events reach the frame. In feed mode the frame takes no events, so scroll gestures stay with the page.
- `onParam` fires when the piece calls `env.setParam`. The host validates the value again, with
  `EigenReelSpec.validateValue` if the page loaded it and its own copy of the rules if not.
- `onLeave(why)` comes from inside the frame: `'esc'`, or `'outside'` (a press in the frame outside the box). The page
  decides what to do and calls `setMode({mode: 'feed'})` to leave.
- `onEnded` fires when a `loop: false` piece reaches `time.length`. The piece holds its last frame, `playing` turns
  false, and `play()` starts it over.
- `capture()` draws a frame and returns a PNG with the webgl2 overlay composited in. `env.ui` is not part of the PNG.
- `input(e)` hands the env.ui root a plain event in the spec's shape. The checker uses it to drive a piece. The piece
  receives it only in interact mode.
- The error kinds are `stalled` (setup took over 8 s, a draw, event batch or `onMode` call took over 250 ms, or a playing
  piece stopped beating), `error` (the piece threw, and the message names setup, draw, onMode or event), `memory`
  (a WebAssembly memory went over 64 MiB), `unsupported`, `blocked`, `crashed` and `navigated` (the frame loaded a second time).

The site's font (the family in `--f-body`, with its files from the page's font stylesheet) is fetched before init,
waiting at most 3 s. The worker loads it before lockdown, and `env.font` is then `"Family", sans-serif`. If the font
did not arrive, `env.font` is `sans-serif`. The runner draws `env.ui` in the same font. `@eigenreel/three` is
`vendor/three-0.170.0.module.js` from the page's own origin, checked against its SRI hash.

### Messages

The worker talks to the host over a `MessagePort` and to the runner over the Worker's own channel. The piece can reach
neither. The runner relays nothing from the worker to the page.

| Host → worker (port) | |
|---|---|
| `init` | `source, meta, colors, params, t, playing, device, mode, fullscreen, box, dpr, w, h, kit, three, wasm, font` |
| `play`, `pause`, `seek {t}`, `params {params}` | playback and params; a paused piece redraws |
| `mode {mode, fullscreen, device}`, `resize {box, dpr, w, h}` | env changes; `onMode` runs, then a redraw |
| `capture {id}`, `input {ev}`, `step {n}`, `nudge`, `dispose` | |

| Worker → host (port) | |
|---|---|
| `ready {font}` | setup has finished; `onMode` and the first frame follow |
| `call {what}` | a `draw`, `event` or `onMode` call is starting; the watchdog times it |
| `beat {t, ms, drawn, gpu?, ended?}` | the call has finished, or a frame went by |
| `param {key, value}` | `env.setParam` |
| `ui-dropped {what}` | something `env.ui` does not allow, reported once per kind |
| `error {kind, where, message}` | `kind` is `error` or `memory` |
| `capture {id, blob}` | |

| Worker → runner | |
|---|---|
| `ui {ops}` | `['reset']`, `['create', id, tag, ns]`, `['append', parent, id, before]`, `['remove', id]`, `['clear', id]`, `['text', id, s]`, `['attr', id, name, value]`, `['style', id, [[prop, value], ...]]`, `['listen', id, type, on]`, `['focus', id]`, `['free', id]`; id 0 is the root |
| `measure {id, req}` | `el.measure()` |

| Runner → worker | |
|---|---|
| `connect {port, canvas, overlay}` | the first message: the port to the host and both canvases |
| `evs {list: [{id, ev}]}` | viewer input for the elements that listen; moves and wheel are coalesced per frame |
| `measured {req, rect}` | |

| Page ⇄ runner (`postMessage`) | |
|---|---|
| runner → page | `eigenreel:ready` (a second one means the frame navigated), `eigenreel:error`, `eigenreel:leave {why}` |
| page → runner | `eigenreel:start {worker, port, colors, font}`, `eigenreel:ui {on, box}`, `eigenreel:stop` |

The runner applies every op through the allowlist in the spec's section 6. Element ids and `for` values get a `p-`
prefix, buttons are always `type=button`, `position: fixed` is refused, and on the root itself only cursor, color and
font properties apply. Esc, Tab and Ctrl, Cmd or Alt combinations are handled before any listener in the frame.

## Open questions

- **A pinned check workflow** (spec, section 11): a ruleset that requires the check workflow from `main` would stop
  a fork from editing its own check. Rulesets with required workflows are an organization feature; check the
  registry's plan.
- **The Navigation API guard and DNS prefetching** (spec, section 10): test both in Chrome, Firefox and Safari,
  including iOS, before relying on them. The allowlist and the worker are what keep the piece from
  navigating; these are the backstop.
