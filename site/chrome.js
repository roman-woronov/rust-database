// Liquid chrome for the hero: three ray-marched metaballs (T1, T2 and the
// store they merge into) plus one that follows the pointer. Falls back to the
// CSS blob when WebGL is missing, draws one still frame for reduced motion,
// and stops rendering while the hero is off screen.

(() => {
  const canvas = document.getElementById("chrome");
  if (!canvas) return;
  const stage = canvas.parentElement;

  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    stage.classList.add("no-webgl");
    return;
  }

  const vertexSource = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uPointer;

    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    float map(vec3 p) {
      float t = uTime;
      vec3 store = vec3(sin(t * 0.31) * 0.18, sin(t * 0.43) * 0.14, 0.0);
      vec3 t1 = vec3(sin(t * 0.63) * 0.72, cos(t * 0.81) * 0.42, sin(t * 0.47) * 0.35);
      vec3 t2 = vec3(cos(t * 0.57 + 1.7) * 0.72, sin(t * 0.73 + 2.1) * 0.46, cos(t * 0.61) * 0.35);
      float d = length(p - store) - 0.62;
      d = smin(d, length(p - t1) - 0.36, 0.5);
      d = smin(d, length(p - t2) - 0.36, 0.5);
      d = smin(d, length(p - vec3(uPointer * vec2(0.95, 0.8), 0.55)) - 0.2, 0.45);
      return d;
    }

    vec3 normalAt(vec3 p) {
      vec2 e = vec2(0.0015, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
    }

    // A studio around the blob: navy sky, a hard white horizon band,
    // magenta floor, cyan softbox and a key light.
    vec3 environment(vec3 r) {
      float y = r.y;
      vec3 col = mix(vec3(0.16, 0.27, 0.82), vec3(0.02, 0.03, 0.12), smoothstep(0.0, 0.9, y));
      col = mix(col, vec3(0.95, 0.3, 0.85), smoothstep(-0.02, -0.65, y) * 0.85);
      col += vec3(1.0) * smoothstep(0.07, 0.0, abs(y - 0.04)) * 1.4;
      col += vec3(0.56, 0.91, 1.0) * smoothstep(0.93, 1.0, dot(r, normalize(vec3(-0.6, 0.45, 0.65)))) * 1.6;
      col += vec3(1.0) * pow(max(dot(r, normalize(vec3(0.55, 0.75, 0.4))), 0.0), 48.0) * 2.0;
      col += vec3(0.85, 0.92, 1.0) * smoothstep(0.035, 0.0, abs(r.x - 0.5)) * smoothstep(-0.1, 0.5, y) * 0.7;
      return col;
    }

    vec3 shade(vec3 ro, vec3 rd, float t) {
      vec3 p = ro + rd * t;
      vec3 n = normalAt(p);
      vec3 r = reflect(rd, n);
      float fresnel = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 col = environment(r);
      vec3 film = 0.5 + 0.5 * cos(6.2831 * (fresnel * 1.3 + vec3(0.0, 0.33, 0.67)) + uTime * 0.25);
      col = mix(col, col * film * 1.7, 0.3 + 0.45 * fresnel);
      return pow(col, vec3(0.92));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec3 ro = vec3(0.0, 0.0, 4.0);
      vec3 rd = normalize(vec3(uv, -1.75));
      float t = 0.0;
      float dMin = 1e9;
      float tMin = 0.0;
      bool hit = false;
      for (int i = 0; i < 72; i++) {
        float d = map(ro + rd * t);
        if (d < dMin) { dMin = d; tMin = t; }
        if (d < 0.001) { hit = true; break; }
        t += d;
        if (t > 8.0) break;
      }
      float edge = 1.6 * tMin / (uRes.y * 1.75);
      if (hit) {
        gl_FragColor = vec4(shade(ro, rd, t), 1.0);
      } else if (dMin < edge) {
        float a = 1.0 - dMin / edge;
        gl_FragColor = vec4(shade(ro, rd, tMin) * a, a);
      } else {
        gl_FragColor = vec4(0.0);
      }
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (vs && fs) {
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
  }
  if (!vs || !fs || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    stage.classList.add("no-webgl");
    return;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uPointer = gl.getUniformLocation(program, "uPointer");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: 0.35, y: 0.3, tx: 0.35, ty: 0.3 };
  let visible = true;
  let frame = 0;
  let start = performance.now();
  let pausedAt = null;

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(seconds) {
    resize();
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, seconds);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    frame = 0;
    if (!visible || document.hidden || reduceMotion.matches) return;
    draw((now - start) / 1000 + 4);
    frame = requestAnimationFrame(loop);
  }

  function kick() {
    if (reduceMotion.matches) {
      draw(4);
      return;
    }
    if (!frame) frame = requestAnimationFrame(loop);
  }

  stage.addEventListener("pointermove", (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.tx = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointer.ty = -(((event.clientY - box.top) / box.height) * 2 - 1);
    if (reduceMotion.matches) draw(4);
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      if (pausedAt !== null) start += performance.now() - pausedAt;
      pausedAt = null;
      kick();
    } else {
      pausedAt = performance.now();
    }
  }).observe(canvas);

  document.addEventListener("visibilitychange", kick);
  reduceMotion.addEventListener("change", kick);
  window.addEventListener("resize", () => draw((performance.now() - start) / 1000 + 4));

  draw(4);
  kick();
})();
