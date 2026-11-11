// The round trip as a three.js scene: sites stream events through the ingest
// ring, the queue swirls them, the worker packs them into batches, and the
// batches land on a bar chart. Scroll progress (0..1) drives the camera.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export type LabelKey =
  "sites" | "ingest" | "queue" | "worker" | "chart" | "now";
// Screen position of an object's centre and its on-screen radius in px.
export type LabelPos = { x: number; y: number; r: number; visible: boolean };

// The composer's render target gets the clear colour sRGB-encoded once
// before OutputPass encodes it again, so this is #161616 decoded twice.
const BG_LINEAR = new THREE.Color().setRGB(
  0.0006,
  0.0006,
  0.0006,
  THREE.LinearSRGBColorSpace
);
const HOT = new THREE.Color(0xf26a2e);
const HOT_SOFT = new THREE.Color(0xf7a26b);
const COOL = new THREE.Color(0xbcd0d4);
// Only objects pushed above 1.0 cross the bloom threshold; the particle field
// stays crisp instead of hazing the whole frame.
const GLOW = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

const GATE = new THREE.Vector3(-4, 0, 0);
const WORKER = new THREE.Vector3(3.4, 0, 0);
const CHART = { x0: 5.6, z0: -1.9, cols: 9, rows: 5, step: 0.62, floor: -2.2 };
const SOURCE_COUNT = 10;

// Camera keyframes: [progress, position, look-at].
const SHOTS: [number, THREE.Vector3, THREE.Vector3][] = [
  [0.0, new THREE.Vector3(-14.5, 1.6, 7.5), new THREE.Vector3(-8.5, 0, 0)],
  [0.2, new THREE.Vector3(-8.2, 1.1, 4.6), new THREE.Vector3(-4, 0, 0)],
  [0.42, new THREE.Vector3(-1.2, 1.4, 4.6), new THREE.Vector3(0.2, 0, 0)],
  [0.62, new THREE.Vector3(2.4, 1.8, 5.2), new THREE.Vector3(4.6, -0.5, 0)],
  [0.8, new THREE.Vector3(5.2, 4.2, 8.6), new THREE.Vector3(7.8, -1.4, 0)],
  [1.0, new THREE.Vector3(-0.5, 5.4, 15.5), new THREE.Vector3(0.4, -0.6, 0)],
];

// Object centres and world-space radii for the focus ring. "sites" and "now"
// are filled in once the sources and chart exist.
const ANCHORS: Record<LabelKey, { at: THREE.Vector3; r: number }> = {
  sites: { at: new THREE.Vector3(), r: 0.35 },
  ingest: { at: new THREE.Vector3(-4, 0, 0), r: 1.2 },
  queue: { at: new THREE.Vector3(-0.4, 0, 0), r: 1.0 },
  worker: { at: new THREE.Vector3(3.4, 0, 0), r: 0.75 },
  chart: { at: new THREE.Vector3(8.1, -1.4, 0), r: 2.4 },
  now: { at: new THREE.Vector3(), r: 0.4 },
};

const STREAM_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uDensity;
  uniform float uPixel;
  uniform vec3 uSources[${SOURCE_COUNT}];
  uniform vec3 uGate;
  uniform vec3 uWorker;
  attribute float aSource;
  attribute vec3 aSeed;
  varying float vAlpha;
  varying float vHeat;

  vec3 bezier(vec3 a, vec3 b, vec3 c, float t) {
    float s = 1.0 - t;
    return s * s * a + 2.0 * s * t * b + t * t * c;
  }

  void main() {
    float t = fract(aSeed.x + uTime * (0.045 + aSeed.y * 0.025));
    vec3 src = uSources[int(aSource)];
    float ang = aSeed.z * 6.2831853;
    float ringR = 0.85 * sqrt(aSeed.y);
    vec3 entry = uGate + vec3(0.0, cos(ang) * ringR, sin(ang) * ringR);
    vec3 pos;
    float heat = 0.0;

    if (t < 0.32) {
      // Source to the ingest ring along a soft curve.
      float u = t / 0.32;
      vec3 mid = mix(src, entry, 0.55) + vec3(0.0, (aSeed.z - 0.5) * 0.9, (aSeed.y - 0.5) * 0.9);
      pos = bezier(src, mid, entry, u);
      heat = smoothstep(0.75, 1.0, u);
      vAlpha = smoothstep(0.0, 0.12, u);
    } else if (t < 0.86) {
      // The queue: a tightening helix.
      float u = (t - 0.32) / 0.54;
      float turns = 4.0;
      float a = u * turns * 6.2831853 + ang;
      float r = mix(0.95, 0.32, u) * (0.85 + 0.15 * aSeed.y);
      pos = vec3(mix(uGate.x + 0.25, uWorker.x - 0.55, u), cos(a) * r, sin(a) * r);
      heat = (1.0 - smoothstep(0.0, 0.15, u)) * 0.8;
      vAlpha = 1.0;
    } else {
      // Pulled into the worker.
      float u = (t - 0.86) / 0.14;
      float a = 4.0 * 6.2831853 + ang;
      vec3 from = vec3(uWorker.x - 0.55, cos(a) * 0.32, sin(a) * 0.32);
      pos = mix(from, uWorker, u * u);
      heat = u;
      vAlpha = 1.0 - smoothstep(0.7, 1.0, u);
    }

    // Particles beyond the current traffic level stay hidden.
    vAlpha *= step(aSeed.y, uDensity);
    vHeat = heat;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uPixel * (0.75 + heat * 0.5) * (15.0 / -mv.z), uPixel * 4.0);
  }
`;

const RETURN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  uniform vec3 uSources[${SOURCE_COUNT}];
  uniform vec3 uGate;
  attribute float aSource;
  attribute vec3 aSeed;
  varying float vAlpha;
  varying float vHeat;

  void main() {
    // The 204: straight back from the ring to the site, quick.
    float t = fract(aSeed.x + uTime * (0.22 + aSeed.y * 0.08));
    vec3 src = uSources[int(aSource)];
    vec3 mid = mix(uGate, src, 0.5) + vec3(0.0, 0.6 + aSeed.z * 0.5, 0.0);
    float s = 1.0 - t;
    vec3 pos = s * s * uGate + 2.0 * s * t * mid + t * t * src;
    vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.85, 1.0, t)) * step(aSeed.z, 0.55);
    vHeat = 0.0;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uPixel * 0.9 * (12.0 / -mv.z), uPixel * 3.0);
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a;
    vec3 col = mix(uColor, uHot, vHeat);
    gl_FragColor = vec4(col * (1.0 + vHeat * 0.5), a * vAlpha);
  }
`;

function seeded(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function sourcePositions() {
  return Array.from({ length: SOURCE_COUNT }, (_, i) => {
    const a = (i / (SOURCE_COUNT - 1) - 0.5) * 2.2;
    return new THREE.Vector3(
      -10 - seeded(i) * 1.6,
      Math.sin(a) * 3.4,
      Math.cos(a * 1.7 + 0.6) * 2.6 - 0.4
    );
  });
}

// A weekday-shaped base for the chart, tallest midweek.
function baseHeight(col: number, row: number) {
  const day = [0.55, 0.7, 0.82, 0.9, 0.78, 0.48, 0.42, 0.6, 0.75][col];
  return 0.35 + day * 1.9 * (1 - row * 0.12) + seeded(col * 9 + row) * 0.25;
}

export function createRoundTripScene(
  canvas: HTMLCanvasElement,
  opts: {
    mobile: boolean;
    reduced: boolean;
    onLabels: (pos: Record<LabelKey, LabelPos>) => void;
  }
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  const dpr = Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(BG_LINEAR, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const sources = sourcePositions();
  ANCHORS.sites.at.copy(sources[5]);
  const uniformsBase = {
    uTime: { value: 0 },
    uPixel: { value: dpr * (opts.mobile ? 2.4 : 2.0) },
    uSources: { value: sources },
    uGate: { value: GATE },
    uWorker: { value: WORKER },
  };

  // Event stream.
  const N = opts.mobile ? 7000 : 18000;
  const streamGeo = new THREE.BufferGeometry();
  const aSource = new Float32Array(N);
  const aSeed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    aSource[i] = i % SOURCE_COUNT;
    aSeed[i * 3] = Math.random();
    aSeed[i * 3 + 1] = Math.random();
    aSeed[i * 3 + 2] = Math.random();
  }
  streamGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(N * 3), 3)
  );
  streamGeo.setAttribute("aSource", new THREE.BufferAttribute(aSource, 1));
  streamGeo.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 3));
  const streamMat = new THREE.ShaderMaterial({
    uniforms: {
      ...uniformsBase,
      uDensity: { value: 0.4 },
      uColor: { value: HOT.clone().multiplyScalar(0.85) },
      uHot: { value: HOT_SOFT },
    },
    vertexShader: STREAM_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stream = new THREE.Points(streamGeo, streamMat);
  stream.frustumCulled = false;
  scene.add(stream);

  // 204 replies flying back.
  const M = opts.mobile ? 500 : 1200;
  const retGeo = new THREE.BufferGeometry();
  const rSource = new Float32Array(M);
  const rSeed = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    rSource[i] = i % SOURCE_COUNT;
    rSeed[i * 3] = Math.random();
    rSeed[i * 3 + 1] = Math.random();
    rSeed[i * 3 + 2] = Math.random();
  }
  retGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(M * 3), 3)
  );
  retGeo.setAttribute("aSource", new THREE.BufferAttribute(rSource, 1));
  retGeo.setAttribute("aSeed", new THREE.BufferAttribute(rSeed, 3));
  const retMat = new THREE.ShaderMaterial({
    uniforms: {
      ...uniformsBase,
      uColor: { value: COOL },
      uHot: { value: COOL },
    },
    vertexShader: RETURN_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const replies = new THREE.Points(retGeo, retMat);
  replies.frustumCulled = false;
  scene.add(replies);

  // Sites.
  const siteGeo = new THREE.SphereGeometry(0.09, 16, 12);
  const siteMat = new THREE.MeshBasicMaterial({ color: GLOW(HOT_SOFT, 3) });
  for (const s of sources) {
    const m = new THREE.Mesh(siteGeo, siteMat);
    m.position.copy(s);
    scene.add(m);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.25, 32),
      new THREE.MeshBasicMaterial({
        color: HOT,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    halo.position.copy(s);
    halo.lookAt(s.clone().add(new THREE.Vector3(1, 0, 0)));
    scene.add(halo);
  }

  // Ingest ring.
  const gate = new THREE.Group();
  gate.position.copy(GATE);
  gate.rotation.y = Math.PI / 2;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.035, 12, 96),
    new THREE.MeshBasicMaterial({ color: GLOW(HOT_SOFT, 3) })
  );
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.008, 6, 96),
    new THREE.MeshBasicMaterial({
      color: GLOW(HOT, 1.6),
      transparent: true,
      opacity: 0.6,
    })
  );
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.02, 64),
    new THREE.MeshBasicMaterial({
      color: HOT,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  gate.add(ring, ring2, disc);
  scene.add(gate);

  // A faint guide along the queue's helix so the spiral reads as one.
  const helix: THREE.Vector3[] = [];
  for (let i = 0; i <= 600; i++) {
    const u = i / 600;
    const a = u * 4 * Math.PI * 2;
    const r = THREE.MathUtils.lerp(0.95, 0.32, u) * 0.92;
    helix.push(
      new THREE.Vector3(
        THREE.MathUtils.lerp(GATE.x + 0.25, WORKER.x - 0.55, u),
        Math.cos(a) * r,
        Math.sin(a) * r
      )
    );
  }
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(helix),
      new THREE.LineBasicMaterial({
        color: HOT,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );

  // Worker: a turning wire core.
  const worker = new THREE.Group();
  worker.position.copy(WORKER);
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)),
    new THREE.LineBasicMaterial({
      color: GLOW(HOT, 2.2),
      transparent: true,
      opacity: 0.85,
    })
  );
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14, 2),
    new THREE.MeshBasicMaterial({ color: GLOW(HOT_SOFT, 4) })
  );
  worker.add(shell, core);
  scene.add(worker);

  // Bar chart.
  scene.add(new THREE.HemisphereLight(0xfff1e6, 0x111111, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 8, 6);
  scene.add(key);
  const barCount = CHART.cols * CHART.rows;
  const bars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.44, 1, 0.44),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    barCount
  );
  const heights = new Float32Array(barCount);
  const grown = new Float32Array(barCount);
  const NOW = CHART.cols * CHART.rows - 1; // front-right, nearest the camera
  for (let c = 0; c < CHART.cols; c++)
    for (let r = 0; r < CHART.rows; r++) {
      const i = c * CHART.rows + r;
      heights[i] = baseHeight(c, r);
    }
  heights[NOW] = 0.7;
  scene.add(bars);

  const barColor = new THREE.Color();
  const dummy = new THREE.Object3D();
  const barTop = (i: number) => {
    const c = Math.floor(i / CHART.rows);
    const r = i % CHART.rows;
    return new THREE.Vector3(
      CHART.x0 + c * CHART.step,
      CHART.floor + heights[i] + grown[i],
      CHART.z0 + r * CHART.step * 0.95
    );
  };
  const nowBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 1, 0.44),
    new THREE.MeshBasicMaterial({ color: GLOW(HOT_SOFT, 1.7) })
  );
  scene.add(nowBar);
  const writeBars = (reveal: number) => {
    for (let i = 0; i < barCount; i++) {
      const c = Math.floor(i / CHART.rows);
      const r = i % CHART.rows;
      const h = Math.max(0.02, (heights[i] + grown[i]) * reveal);
      dummy.position.set(
        CHART.x0 + c * CHART.step,
        CHART.floor + h / 2,
        CHART.z0 + r * CHART.step * 0.95
      );
      if (i === NOW) {
        // Today's bar is drawn unlit so it glows; hide its instance.
        nowBar.position.copy(dummy.position);
        nowBar.scale.set(1, h, 1);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.scale.set(1, h, 1);
      }
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
      barColor.setRGB(0.14, 0.13, 0.12).lerp(HOT, 0.05 + (h / 3) * 0.25);
      bars.setColorAt(i, barColor);
    }
    bars.instanceMatrix.needsUpdate = true;
    if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
  };

  // Batches: cubes from the worker to the chart.
  const BATCHES = 24;
  const cubes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.26, 0.26, 0.26),
    new THREE.MeshBasicMaterial({ color: GLOW(HOT_SOFT, 3) }),
    BATCHES
  );
  cubes.frustumCulled = false;
  const flights: { t: number; target: number; spin: number }[] = [];
  scene.add(cubes);

  // A dotted floor under everything.
  const floorPts: number[] = [];
  for (let x = -14; x <= 14; x += 0.5)
    for (let z = -7; z <= 7; z += 0.5) floorPts.push(x, CHART.floor - 0.01, z);
  const floor = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(floorPts, 3)
    ),
    new THREE.PointsMaterial({
      color: 0x5a554f,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  );
  scene.add(floor);

  // Post: bloom carries most of the look.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.5, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Camera path.
  const posCurve = new THREE.CatmullRomCurve3(
    SHOTS.map((s) => s[1]),
    false,
    "centripetal"
  );
  const lookAt = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const lookFor = (p: number) => {
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
    const [p0, , l0] = SHOTS[i];
    const [p1, , l1] = SHOTS[i + 1];
    const k = THREE.MathUtils.smoothstep(p, p0, p1);
    return tmp.copy(l0).lerp(l1, k);
  };
  // Map scroll progress onto the curve so each shot lands at its progress.
  const curveT = (p: number) => {
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
    const k = THREE.MathUtils.smoothstep(p, SHOTS[i][0], SHOTS[i + 1][0]);
    return (i + k) / (SHOTS.length - 1);
  };

  let target = opts.reduced ? 1 : 0;
  let progress = target;
  let width = 1;
  let height = 1;
  let raf = 0;
  let running = false;
  let last = performance.now();
  let spawnT = 0;
  const project = new THREE.Vector3();
  const edge = new THREE.Vector3();

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
    camera.aspect = width / height;
    // Narrow screens need a wider lens to keep the scene in frame.
    camera.fov = width < height ? 60 : 42;
    // On portrait screens the copy covers the lower half, so render the
    // scene a little higher.
    if (width < height)
      camera.setViewOffset(width, height, 0, height * 0.09, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  // Step quality down on slow devices: first resolution, then bloom.
  let slowFrames = 0;
  let quality = 2;
  function adapt(frameMs: number) {
    if (quality === 0) return;
    slowFrames = frameMs > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 45) return;
    slowFrames = 0;
    quality -= 1;
    if (quality === 1) {
      renderer.setPixelRatio(1);
      resize();
    } else {
      bloom.enabled = false;
    }
  }

  function render(now: number) {
    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000);
    last = now;
    if (running) adapt(frameMs);
    progress += (target - progress) * (opts.reduced ? 1 : Math.min(1, dt * 4));
    const p = progress;

    const time = opts.reduced ? 12 : now / 1000;
    streamMat.uniforms.uTime.value = time;
    retMat.uniforms.uTime.value = time;
    // Traffic: normal, a launch spike in the queue shot, then settling.
    const spike = Math.exp(-(((p - 0.47) / 0.09) ** 2));
    streamMat.uniforms.uDensity.value =
      0.38 + spike * 0.62 + (p > 0.6 ? 0.12 : 0);

    // Camera.
    lookAt.copy(lookFor(p));
    camera.position.copy(posCurve.getPoint(curveT(p)));
    // Portrait screens see a narrow slice, so back the camera off.
    if (camera.aspect < 1) {
      const pull = 1 + (1 - camera.aspect) * (0.6 + p * 0.9);
      camera.position.sub(lookAt).multiplyScalar(pull).add(lookAt);
    }
    camera.lookAt(lookAt);

    ring.scale.setScalar(1 + Math.sin(time * 3) * 0.015 + spike * 0.06);
    ring2.rotation.z = time * 0.3;
    shell.rotation.set(time * 0.4, time * 0.6, 0);
    core.scale.setScalar(1 + Math.sin(time * 8) * 0.08);

    // Batches leave the worker on a steady beat once the camera gets there.
    const reveal = THREE.MathUtils.smoothstep(p, 0.5, 0.78);
    if (!opts.reduced) {
      spawnT += dt;
      const every = 0.55 - spike * 0.25;
      if (spawnT > every && flights.length < BATCHES) {
        spawnT = 0;
        const pick =
          Math.random() < 0.55 ? NOW : Math.floor(Math.random() * barCount);
        flights.push({ t: 0, target: pick, spin: Math.random() * Math.PI });
      }
    }
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt / 1.3;
      if (f.t >= 1) {
        grown[f.target] = Math.min(
          grown[f.target] + (f.target === NOW ? 0.05 : 0.012),
          1.6
        );
        if (grown[NOW] >= 1.6) grown[NOW] = 0;
        flights.splice(i, 1);
      }
    }
    for (let i = 0; i < BATCHES; i++) {
      const f = flights[i];
      if (!f) {
        dummy.scale.setScalar(0);
      } else {
        const end = barTop(f.target);
        const k = f.t;
        dummy.position.set(
          THREE.MathUtils.lerp(WORKER.x, end.x, k),
          THREE.MathUtils.lerp(WORKER.y, end.y, k) +
            Math.sin(k * Math.PI) * 1.6,
          THREE.MathUtils.lerp(WORKER.z, end.z, k)
        );
        dummy.rotation.set(f.spin + k * 4, f.spin + k * 3, 0);
        dummy.scale.setScalar(1 - k * 0.35);
      }
      dummy.updateMatrix();
      cubes.setMatrixAt(i, dummy.matrix);
    }
    cubes.instanceMatrix.needsUpdate = true;
    writeBars(opts.reduced ? 1 : 0.15 + reveal * 0.85);

    composer.render();

    // Screen positions for the HTML labels and focus ring.
    ANCHORS.now.at.copy(barTop(NOW));
    const out = {} as Record<LabelKey, LabelPos>;
    for (const k of Object.keys(ANCHORS) as LabelKey[]) {
      const { at, r } = ANCHORS[k];
      edge.copy(at).addScaledVector(camera.up, r).project(camera);
      project.copy(at).project(camera);
      const x = (project.x * 0.5 + 0.5) * width;
      const y = (-project.y * 0.5 + 0.5) * height;
      out[k] = {
        x,
        y,
        r: Math.abs((-edge.y * 0.5 + 0.5) * height - y),
        visible:
          project.z < 1 &&
          Math.abs(project.x) < 1.1 &&
          Math.abs(project.y) < 1.1,
      };
    }
    opts.onLabels(out);

    if (running) raf = requestAnimationFrame(render);
  }

  resize();
  writeBars(1);

  return {
    setProgress(p: number) {
      target = opts.reduced ? 1 : p;
    },
    resize,
    start() {
      if (running) return;
      running = !opts.reduced;
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      composer.dispose();
      renderer.dispose();
    },
  };
}
