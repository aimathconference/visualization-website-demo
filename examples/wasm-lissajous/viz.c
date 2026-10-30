/* Lissajous figures: two harmonic oscillators at right angles.
 *
 *   x(u) = sin(a u + delta),   y(u) = sin(b u),   a = 3 fixed
 *
 * A Loci module for runtime "wasm", render "commands" (docs/module-api.md, section 3).
 * No libc: sin and cos are imported from the host's Math ("env"), everything else is here.
 * Build with ./build.sh. The host calls init, set_theme, set_param, then frame(t) once per frame;
 * frame returns a pointer to a float command list that the host replays on its canvas.
 */
typedef unsigned int u32;
double sin(double);
double cos(double);

#define PI 3.14159265358979323846
#define MAXCMD 160000
#define MAXTXT 2048

/* ---------- host state ---------- */
static double W = 300, H = 300, DPR = 1;
static double B = 2, DELTA = PI / 2;       /* params 0 and 1 */
static int SQUARE = 1;                      /* param 2 */
static u32 BG = 0x050508, FG = 0xecebf5, A1 = 0xff2e74, A2 = 0x22e0e8;
static double LW = 1.5;
static int LABELS = 1;

/* ---------- command list: cmd[0] is the number of floats that follow ---------- */
static float cmd[MAXCMD];
static int n;
static char txt[MAXTXT];
static int tn;

static void emit(double v) { if (n < MAXCMD - 2) cmd[1 + n++] = (float)v; }
static void color(u32 c, double a) { emit((c >> 16) & 255); emit((c >> 8) & 255); emit(c & 255); emit(a); }
static void fill(u32 c, double a) { emit(1); color(c, a); }
static void stroke(u32 c, double a, double lw) { emit(2); color(c, a); emit(lw); }
static void move_to(double x, double y) { emit(3); emit(x); emit(y); }
static void line_to(double x, double y) { emit(4); emit(x); emit(y); }
static void arc(double x, double y, double r, double a0, double a1) { emit(5); emit(x); emit(y); emit(r); emit(a0); emit(a1); }
static void close_path(void) { emit(6); }
static void begin(void) { emit(7); }
static void fill_path(void) { emit(8); }
static void stroke_path(void) { emit(9); }

/* ---------- labels: build UTF-8 text in txt, then emit opcode 10 pointing at it ---------- */
static int mark;
static void s_begin(void) { mark = tn; }
static void s_str(const char *s) { while (*s && tn < MAXTXT - 1) txt[tn++] = *s++; }
static void s_int(long v) {
  char d[24]; int k = 0;
  if (v < 0) { s_str("-"); v = -v; }
  do { d[k++] = (char)('0' + v % 10); v /= 10; } while (v && k < 24);
  while (k && tn < MAXTXT - 1) txt[tn++] = d[--k];
}
static void s_num(double v, int places) {
  long scale = 1; for (int i = 0; i < places; i++) scale *= 10;
  if (v < 0) { s_str("-"); v = -v; }
  long q = (long)(v * scale + 0.5);
  s_int(q / scale);
  if (places) {
    long f = q % scale; s_str(".");
    for (long p = scale / 10; p > 0; p /= 10) { if (tn < MAXTXT - 1) txt[tn++] = (char)('0' + (f / p) % 10); }
  }
}
/* align: 0 left, 1 center, 2 right; +4 for bold. Color is the current fill. */
static void s_label(double x, double y, double size, int align) {
  emit(10); emit((double)(u32)(txt + mark)); emit(tn - mark); emit(x); emit(y); emit(size); emit(align);
}

static int gcd(int a, int b) { while (b) { int r = a % b; a = b; b = r; } return a; }
static double clamp(double v, double lo, double hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ---------- exports ---------- */
int init(int w, int h, double dpr) { W = w; H = h; DPR = dpr; return 0; }
void resize(int w, int h) { W = w; H = h; }
void set_theme(u32 bg, u32 fg, u32 a1, u32 a2, double lw, int labels) { BG = bg; FG = fg; A1 = a1; A2 = a2; LW = lw; LABELS = labels; }
void set_param(int index, double value) {
  if (index == 0) B = value;
  else if (index == 1) DELTA = value * PI / 180;   /* the manifest's range is in degrees */
  else if (index == 2) SQUARE = value != 0;
}

int frame(double t) {
  n = 0; tn = 0;
  const double a = 3;
  const double fs = (double)(int)(clamp(W / 34, 12, 16) + 0.5);
  const double top = LABELS ? fs * 3.2 : 8, foot = LABELS ? fs * 2.2 : 8;
  const double avail = H - top - foot;
  const double side = (W < avail ? W : avail) * 0.9, R = side / 2;
  const double cx = W / 2, cy = top + avail / 2;
#define X(u) (cx + R * (u))
#define Y(v) (cy - R * (v))

  /* b moves on a grid of 1/20, so the curve closes after 2*pi*L with L = 20 / gcd(60, 20 b) */
  const int k = (int)(B * 20 + 0.5), g = gcd(60, k), L = 20 / g;
  const double period = 2 * PI * L;

  /* axes */
  stroke(FG, 0.16, 1); begin();
  move_to(X(-1.08), cy); line_to(X(1.08), cy); move_to(cx, Y(-1.08)); line_to(cx, Y(1.08));
  stroke_path();

  /* the square [-1, 1]^2 the curve is inscribed in, with the points where it touches each side */
  if (SQUARE) {
    stroke(FG, 0.45, 1); begin();
    move_to(X(-1), Y(-1)); line_to(X(1), Y(-1)); line_to(X(1), Y(1)); line_to(X(-1), Y(1)); close_path();
    stroke_path();
    fill(A2, 0.95); begin();
    const double dot = 2 + LW * 0.8;
    /* x = +-1 when a u + delta = pi/2 + m pi; y = +-1 when b u = pi/2 + m pi */
    for (int m = 0; m < 2 * (int)(a * L + 0.5) && m < 400; m++) {
      double u = (PI / 2 + m * PI - DELTA) / a; while (u < 0) u += period;
      double x = sin(a * u + DELTA), y = sin(B * u);
      move_to(X(x) + dot, Y(y)); arc(X(x), Y(y), dot, 0, 2 * PI);
    }
    for (int m = 0; m < 2 * (int)(B * L + 0.5) && m < 400; m++) {
      double u = (PI / 2 + m * PI) / B;
      double x = sin(a * u + DELTA), y = sin(B * u);
      move_to(X(x) + dot, Y(y)); arc(X(x), Y(y), dot, 0, 2 * PI);
    }
    fill_path();
  }

  /* the whole closed curve, faint */
  int pts = 720 * L; if (pts > 14400) pts = 14400;
  stroke(A2, 0.38, LW); begin();
  for (int i = 0; i <= pts; i++) {
    double u = period * i / pts, x = sin(a * u + DELTA), y = sin(B * u);
    if (i) line_to(X(x), Y(y)); else move_to(X(x), Y(y));
  }
  stroke_path();

  /* the tracer and its fading trail */
  const double ph = t * 0.9, tail = 4.8 / (B > a ? B : a); /* about three quarters of a turn of the faster oscillator */
  for (int c = 0; c < 4; c++) {
    stroke(A1, 0.25 + 0.25 * c, LW * 1.8); begin();
    for (int i = 0; i <= 40; i++) {
      double u = ph - tail + tail * (c * 40 + i) / 160.0, x = sin(a * u + DELTA), y = sin(B * u);
      if (i) line_to(X(x), Y(y)); else move_to(X(x), Y(y));
    }
    stroke_path();
  }
  const double px = sin(a * ph + DELTA), py = sin(B * ph);
  /* the two oscillators, projected onto the edges */
  stroke(FG, 0.3, 1); begin();
  move_to(X(px), Y(py)); line_to(X(px), Y(-1.08)); move_to(X(px), Y(py)); line_to(X(-1.08), Y(py));
  stroke_path();
  fill(FG, 0.9); begin();
  move_to(X(px) + 3.5, Y(-1.08)); arc(X(px), Y(-1.08), 3.5, 0, 2 * PI);
  move_to(X(-1.08) + 3.5, Y(py)); arc(X(-1.08), Y(py), 3.5, 0, 2 * PI);
  fill_path();
  fill(A1, 1); begin(); arc(X(px), Y(py), 3 + LW, 0, 2 * PI); fill_path();

  /* labels (the host also drops them when the theme says labels: false) */
  if (LABELS) {
    const int deg = (int)(DELTA * 180 / PI + 0.5);
    fill(FG, 1);
    s_begin(); s_str("x = sin(3t + \xce\xb4),  y = sin(b\xc2\xb7t)"); s_label(0, fs, fs + 1, 4);
    fill(FG, 0.75);
    s_begin(); s_str("a : b = 3 : "); s_num(B, 2); s_str("    \xce\xb4 = "); s_int(deg); s_str("\xc2\xb0"); s_label(0, fs * 2.3, fs, 0);
    fill(A2, 1);
    s_begin();
    if (k == 60) s_str(deg == 90 ? "b = a: one oscillator's phase portrait, a circle" : "b = a: one oscillator's phase portrait, an ellipse");
    else if (L == 1) s_str("closed curve, period 2\xcf\x80");
    else { s_str("closes after 2\xcf\x80 \xc3\x97 "); s_int(L); s_str(", ratio "); s_int(60 / g); s_str(" : "); s_int(k / g); }
    s_label(0, H - 6, fs, 4);
  }

  emit(0);
  cmd[0] = (float)n;
  return (int)(u32)cmd;
#undef X
#undef Y
}
