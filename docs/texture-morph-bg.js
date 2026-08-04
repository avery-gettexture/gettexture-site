/*
 * <texture-morph-bg> — Avery Isaacs / Texture room background
 * Continuous psychedelic morph through the 10 planet gradient backgrounds.
 * From study 004b (visual design exploration). Tuned defaults baked in:
 *   pace 20.5 · flow 1.5 · scale 1.4 · depth 0.5 · warp 1.02 · drift 0.08
 *
 * Usage:
 *   <script src="texture-morph-bg.js"></script>
 *   <texture-morph-bg style="position:fixed; inset:0; z-index:-1;"></texture-morph-bg>
 *
 * The element fills its own box (position it however you like) and renders
 * behind whatever you layer on top. No dependencies. WebGL1.
 *
 * Optional attributes (all have the tuned defaults):
 *   pace   — seconds per planet along the cycle (default 20.5)
 *   flow   — churn speed of the noise field (default 1.5)
 *   scale  — size of the morph blobs, higher = smaller blobs (default 1.4)
 *   depth  — how far planets interpenetrate, 0 = plain crossfade .. 1 (default 0.5)
 *   warp   — how much the gradients themselves smear (default 1.02)
 *   drift  — slow whole-field rotation, radians/sec (default 0.08)
 *   src    — base path for the planet images (default "./planets/")
 *
 * Planet order is the classical astrological sequence, looping:
 * sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto.
 * Expects <src>/<name>.png for each.
 */
(function () {
  'use strict';

  var ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  var TEX_ASPECT = 1206 / 2622;

  var VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';

  var FS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex0;',
    'uniform sampler2D uTex1;',
    'uniform sampler2D uTex2;',
    'uniform sampler2D uTex3;',
    'uniform float uPhase;',
    'uniform float uTime;',
    'uniform float uFlow;',
    'uniform float uScale;',
    'uniform float uDepth;',
    'uniform float uWarp;',
    'uniform float uDrift;',
    'uniform float uCanvasAspect;',
    'uniform float uTexAspect;',
    'uniform float uCoverK;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0; float a = 0.5;',
    '  for (int k=0; k<4; k++){ v += a*vnoise(p); p = p*2.03 + vec2(17.3, 9.1); a *= 0.5; }',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 p = vUv - 0.5;',
    '  p.x *= uCanvasAspect;',
    '  float cs = cos(uTime*uDrift); float sn = sin(uTime*uDrift);',
    '  p = mat2(cs, -sn, sn, cs) * p;',
    '  float tt = uTime*uFlow;',
    '  vec2 q0 = p*uScale;',
    '  vec2 w1 = vec2(fbm(q0 + vec2(0.0, tt*0.11)), fbm(q0 + vec2(5.2,1.3) - vec2(tt*0.09, 0.0)));',
    '  vec2 q1 = q0 + (w1 - 0.5)*2.6;',
    '  float n = fbm(q1 + vec2(tt*0.07, -tt*0.05));',
    '  float n2 = (n - 0.5)*2.0;',
    '  vec2 pw = p + uWarp*0.35*(w1 - 0.5);',
    '  vec2 q = pw / uCoverK;',
    '  vec2 uv = vec2(q.x/uTexAspect + 0.5, q.y + 0.5);',
    '  vec4 c0 = texture2D(uTex0, uv);',
    '  vec4 c1 = texture2D(uTex1, uv);',
    '  vec4 c2 = texture2D(uTex2, uv);',
    '  vec4 c3 = texture2D(uTex3, uv);',
    '  float s = 1.0 + uPhase + uDepth*n2;',
    '  s = clamp(s, 0.0, 3.0);',
    '  vec4 col;',
    '  if (s < 1.0){ col = mix(c0, c1, smoothstep(0.0, 1.0, s)); }',
    '  else if (s < 2.0){ col = mix(c1, c2, smoothstep(0.0, 1.0, s - 1.0)); }',
    '  else { col = mix(c2, c3, smoothstep(0.0, 1.0, s - 2.0)); }',
    '  gl_FragColor = col;',
    '}'
  ].join('\n');

  var UNIFORMS = ['uTex0','uTex1','uTex2','uTex3','uPhase','uTime','uFlow','uScale','uDepth','uWarp','uDrift','uCanvasAspect','uTexAspect','uCoverK'];

  function TextureMorphBg() {
    return Reflect.construct(HTMLElement, [], TextureMorphBg);
  }
  TextureMorphBg.prototype = Object.create(HTMLElement.prototype);
  TextureMorphBg.prototype.constructor = TextureMorphBg;
  Object.setPrototypeOf(TextureMorphBg, HTMLElement);

  TextureMorphBg.observedAttributes = ['pace','flow','scale','depth','warp','drift'];

  TextureMorphBg.prototype.attributeChangedCallback = function () { this._readParams(); };

  TextureMorphBg.prototype._num = function (name, fallback) {
    var v = parseFloat(this.getAttribute(name));
    return isFinite(v) ? v : fallback;
  };

  TextureMorphBg.prototype._readParams = function () {
    this._pace  = this._num('pace', 20.5);
    this._flow  = this._num('flow', 1.5);
    this._scale = this._num('scale', 1.4);
    this._depth = this._num('depth', 0.5);
    this._warp  = this._num('warp', 1.02);
    this._drift = this._num('drift', 0.08);
  };

  TextureMorphBg.prototype.connectedCallback = function () {
    if (this._connected) return;
    this._connected = true;
    this._readParams();

    if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
    if (!this.style.display) this.style.display = 'block';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.appendChild(canvas);
    this._canvas = canvas;

    var gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    this._gl = gl;
    if (!gl) { this.style.background = '#0c0a09'; return; }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('texture-morph-bg shader:', gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn('texture-morph-bg link:', gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this._prog = prog;

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this._u = {};
    for (var i = 0; i < UNIFORMS.length; i++) this._u[UNIFORMS[i]] = gl.getUniformLocation(prog, UNIFORMS[i]);

    var base = this.getAttribute('src') || './planets/';
    if (base.charAt(base.length - 1) !== '/') base += '/';
    this._textures = ORDER.map(function (name) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12,10,9,255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      };
      img.src = base + name + '.png';
      return tex;
    });

    var self = this;
    this._resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = self.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(this);
    this._resize();

    this._start = null;
    this._frame = function (now) {
      if (self._start == null) self._start = now;
      var t = (now - self._start) / 1000;
      var gl = self._gl;
      gl.viewport(0, 0, canvas.width, canvas.height);
      var N = ORDER.length;
      var globalT = t / self._pace;
      var idx = Math.floor(globalT) % N;
      var f = globalT - Math.floor(globalT);
      var win = [(idx + N - 1) % N, idx, (idx + 1) % N, (idx + 2) % N];

      gl.useProgram(self._prog);
      for (var u = 0; u < 4; u++) {
        gl.activeTexture(gl.TEXTURE0 + u);
        gl.bindTexture(gl.TEXTURE_2D, self._textures[win[u]]);
        gl.uniform1i(self._u['uTex' + u], u);
      }
      gl.uniform1f(self._u.uPhase, f);
      gl.uniform1f(self._u.uTime, t);
      gl.uniform1f(self._u.uFlow, self._flow);
      gl.uniform1f(self._u.uScale, self._scale);
      gl.uniform1f(self._u.uDepth, self._depth);
      gl.uniform1f(self._u.uWarp, self._warp);
      gl.uniform1f(self._u.uDrift, self._drift);
      var ca = canvas.width / canvas.height;
      gl.uniform1f(self._u.uCanvasAspect, ca);
      gl.uniform1f(self._u.uTexAspect, TEX_ASPECT);
      gl.uniform1f(self._u.uCoverK, Math.max(ca / TEX_ASPECT, 1.0));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      self._raf = requestAnimationFrame(self._frame);
    };
    this._raf = requestAnimationFrame(this._frame);
  };

  TextureMorphBg.prototype.disconnectedCallback = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    this._connected = false;
    if (this._canvas && this._canvas.parentNode === this) this.removeChild(this._canvas);
  };

  if (!customElements.get('texture-morph-bg')) customElements.define('texture-morph-bg', TextureMorphBg);
})();
