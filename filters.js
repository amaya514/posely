// Live camera filters (TikTok-style) rendered with WebGL: skin smoothing ("Beauty") plus colour looks.
// The same shader renders the preview and the saved photo, so what you see is what you get.

export const FILTERS = [
  { id: 'none', name: 'Original', swatch: 'linear-gradient(135deg,#d9d4ce,#f4efe9)' },
  { id: 'glow', name: 'Glow', exp: 0.12, con: 0.95, sat: 1.05, warm: 0.3, glow: 0.35, fade: 0.05, hi: [1, 0.85, 0.8], swatch: 'linear-gradient(135deg,#ffd9c7,#fff4ea)' },
  { id: 'soft', name: 'Soft', exp: 0.08, con: 0.85, sat: 0.85, fade: 0.35, warm: 0.1, hi: [1, 0.9, 0.95], swatch: 'linear-gradient(135deg,#eadfe6,#f8f3f1)' },
  { id: 'golden', name: 'Golden', exp: 0.05, con: 1.05, sat: 1.1, warm: 1.0, sh: [0.2, 0.05, -0.1], hi: [1, 0.7, 0.3], swatch: 'linear-gradient(135deg,#e3a35b,#ffe0a3)' },
  { id: 'peach', name: 'Peach', exp: 0.1, con: 0.95, sat: 1.0, warm: 0.5, tint: 0.4, hi: [1, 0.6, 0.6], swatch: 'linear-gradient(135deg,#f5a99a,#ffe1d5)' },
  { id: 'cool', name: 'Cool', con: 1.05, sat: 0.95, warm: -0.8, tint: -0.1, sh: [-0.1, 0, 0.2], swatch: 'linear-gradient(135deg,#8fb3d9,#e3eef7)' },
  { id: 'vintage', name: 'Vintage', con: 0.9, sat: 0.75, warm: 0.5, fade: 0.5, vig: 0.5, grain: 0.6, sh: [0.1, 0.05, 0.2], hi: [0.9, 0.8, 0.5], swatch: 'linear-gradient(135deg,#b59a7a,#e8d8b9)' },
  { id: 'film', name: 'Film', con: 1.1, sat: 0.9, warm: 0.2, fade: 0.25, grain: 0.8, vig: 0.3, sh: [0, 0.12, 0.15], hi: [1, 0.8, 0.5], swatch: 'linear-gradient(135deg,#5f8a86,#f0c98e)' },
  { id: 'vivid', name: 'Vivid', exp: 0.03, con: 1.15, sat: 1.35, swatch: 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcbff)' },
  { id: 'dreamy', name: 'Dreamy', exp: 0.15, con: 0.85, sat: 0.9, glow: 0.7, fade: 0.2, hi: [0.9, 0.85, 1], swatch: 'linear-gradient(135deg,#d7c6f2,#fbe9f4)' },
  { id: 'sunset', name: 'Sunset', warm: 0.8, tint: 0.3, sat: 1.15, sh: [0.2, 0, 0.3], hi: [1, 0.6, 0.2], vig: 0.25, swatch: 'linear-gradient(135deg,#a45c9e,#ff9a5a)' },
  { id: 'mono', name: 'B&W', mono: 1, con: 1.05, fade: 0.1, swatch: 'linear-gradient(135deg,#555,#eee)' },
  { id: 'noir', name: 'Noir', mono: 1, con: 1.45, vig: 0.6, grain: 0.4, swatch: 'linear-gradient(135deg,#111,#888)' }
];

const VERT = `attribute vec2 a; varying vec2 vUv; uniform float uMirror;
void main(){ vUv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); if (uMirror > 0.5) vUv.x = 1.0 - vUv.x; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex; uniform vec2 uTexel;
uniform float uBeauty, uAmt, uExp, uCon, uSat, uWarm, uTint, uFade, uVig, uGrain, uGlow, uMono, uTime;
uniform vec3 uSh, uHi;
const vec3 LUM = vec3(0.299, 0.587, 0.114);
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
void main(){
  vec3 orig = texture2D(uTex, vUv).rgb;
  vec3 c = orig;
  // Beauty: edge-preserving blur that smooths skin but keeps eyes, lips and outlines sharp
  if (uBeauty > 0.001) {
    vec3 sum = c; float wsum = 1.0;
    for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
      if (i == 0 && j == 0) continue;
      vec3 s = texture2D(uTex, vUv + vec2(float(i), float(j)) * uTexel * 2.5).rgb;
      float d = distance(s, orig);
      float w = exp(-d * d * 45.0) * exp(-float(i * i + j * j) / 8.0);
      sum += s * w; wsum += w;
    }
    c = mix(c, sum / wsum, uBeauty * 0.9) + uBeauty * 0.035;
  }
  vec3 base = c;
  // Glow / bloom: soft light from a wide blur
  if (uGlow > 0.001) {
    vec3 b = vec3(0.0);
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 0.7854;
      b += texture2D(uTex, vUv + vec2(cos(a), sin(a)) * uTexel * 14.0).rgb;
    }
    b /= 8.0;
    c = 1.0 - (1.0 - c) * (1.0 - b * uGlow * 0.55);
  }
  c *= exp2(uExp);
  c = (c - 0.5) * uCon + 0.5;
  float l = dot(c, LUM);
  c = mix(vec3(l), c, uSat);
  c += vec3(uWarm * 0.06, uTint * 0.03 - abs(uWarm) * 0.005, -uWarm * 0.06);
  l = clamp(dot(c, LUM), 0.0, 1.0);
  c += uSh * (1.0 - l) * 0.12 + (uHi - vec3(dot(uHi, LUM))) * l * 0.10;
  c = c * (1.0 - uFade * 0.15) + uFade * 0.07;
  c = mix(c, vec3(dot(c, LUM)), uMono);
  float dv = distance(vUv, vec2(0.5));
  c *= 1.0 - uVig * smoothstep(0.35, 0.85, dv);
  c += (hash(gl_FragCoord.xy) - 0.5) * uGrain * 0.07;
  gl_FragColor = vec4(clamp(mix(base, c, uAmt), 0.0, 1.0), 1.0);
}`;

export class FilterView {
  constructor(video, canvas) {
    this.video = video; this.canvas = canvas;
    this.filter = FILTERS[0]; this.amount = 1; this.beauty = 0; this.mirror = false;
    this.ok = false; this.raf = 0;
    try { this._init(); } catch (e) { console.warn('filters unavailable', e); this.ok = false; }
  }
  _init() {
    const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.u = {};
    for (const n of ['uTex', 'uTexel', 'uBeauty', 'uAmt', 'uExp', 'uCon', 'uSat', 'uWarm', 'uTint', 'uFade', 'uVig', 'uGrain', 'uGlow', 'uMono', 'uTime', 'uSh', 'uHi', 'uMirror'])
      this.u[n] = gl.getUniformLocation(p, n);
    gl.uniform1i(this.u.uTex, 0);
    this.gl = gl; this.ok = true;
  }
  get active() { return this.ok && (this.filter.id !== 'none' || this.beauty > 0.001); }
  // draws one frame from `source` (video or image) at the canvas's current size
  draw(source, sw, sh) {
    const { gl, u } = this, f = this.filter;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source); } catch (e) { return false; }
    gl.uniform2f(u.uTexel, 1 / sw, 1 / sh);
    gl.uniform1f(u.uBeauty, this.beauty); gl.uniform1f(u.uAmt, f.id === 'none' ? 0 : this.amount);
    gl.uniform1f(u.uExp, f.exp || 0); gl.uniform1f(u.uCon, f.con ?? 1); gl.uniform1f(u.uSat, f.sat ?? 1);
    gl.uniform1f(u.uWarm, f.warm || 0); gl.uniform1f(u.uTint, f.tint || 0); gl.uniform1f(u.uFade, f.fade || 0);
    gl.uniform1f(u.uVig, f.vig || 0); gl.uniform1f(u.uGrain, f.grain || 0); gl.uniform1f(u.uGlow, f.glow || 0);
    gl.uniform1f(u.uMono, f.mono || 0); gl.uniform1f(u.uTime, (performance.now() / 1000) % 100);
    gl.uniform3fv(u.uSh, f.sh || [0, 0, 0]); gl.uniform3fv(u.uHi, f.hi || [0, 0, 0]);
    gl.uniform1f(u.uMirror, this.mirror ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
  // live preview loop; canvas is sized to cover the stage at screen resolution
  start(stage) {
    if (!this.ok || this.raf) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const v = this.video;
      if (v.readyState < 2 || !v.videoWidth) return;
      const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const k = Math.min(1, Math.max(r.width * dpr / v.videoWidth, r.height * dpr / v.videoHeight));
      const w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.draw(v, v.videoWidth, v.videoHeight);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  // full-resolution filtered copy of a source (video frame or image), for saving
  renderFull(source, w, h) {
    const keep = [this.canvas.width, this.canvas.height];
    this.canvas.width = w; this.canvas.height = h;
    const ok = this.draw(source, w, h);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    if (ok) out.getContext('2d').drawImage(this.canvas, 0, 0);
    this.canvas.width = keep[0]; this.canvas.height = keep[1];
    return ok ? out : null;
  }
}
