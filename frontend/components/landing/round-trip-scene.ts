// The round trip as a tabletop miniature. Event pills leave a laptop, pass
// the ingest gate (a blue 204 flies back), wait on a conveyor (the queue),
// get pressed into crates of 100 by the worker, drop into a glass silo (the
// database) and tick up the dashboard. Scroll progress (0..1) moves the
// camera from station to station.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type LabelKey =
  "sites" | "ingest" | "queue" | "worker" | "chart" | "now";
// Screen position of an object's centre and its on-screen radius in px.
export type LabelPos = { x: number; y: number; r: number; visible: boolean };

// The composer's render target gets the clear colour sRGB-encoded once, then
// OutputPass tone-maps (ACES) and encodes it again. This value comes out as
// the page's #161616 after all three.
const BG = new THREE.Color().setRGB(
  0.0016,
  0.0016,
  0.0016,
  THREE.LinearSRGBColorSpace
);
const HOT = new THREE.Color(0xf26a2e);
const SOFT = new THREE.Color(0xf7a26b);
const COOL = new THREE.Color(0xbcd0d4);
// Only colours pushed above 1.0 cross the bloom threshold.
const glow = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

const X = {
  laptop: -8.4,
  gate: -5.0,
  belt0: -3.5,
  belt1: 1.6,
  worker: 3.2,
  silo: 6.0,
  screen: 8.9,
};
const PILL_Y = 0.52;
const SPACING = 0.34;
const PER_CRATE = 4; // pills per crate; each pill stands for 25 events
const LEDS = 16;

type Pill = { x: number; y: number; passed: boolean };
type Shot = { x: number; y: number; zoom: number; az: number; el: number };

// Camera framings, each with the scroll progress where it is fully in view.
// Two entries with the same shot hold it still while the copy is read.
const WIDE: Shot = { x: -1.8, y: 2.9, zoom: 0.84, az: 0, el: 0.6 };
const SHOTS: [number, Shot][] = [
  [0, WIDE],
  [0.06, { x: -7.9, y: 1.0, zoom: 2.3, az: -0.16, el: 0.42 }],
  [0.1, { x: -7.9, y: 1.0, zoom: 2.3, az: -0.16, el: 0.42 }],
  [0.19, { x: -5.4, y: 1.1, zoom: 2.25, az: -0.06, el: 0.44 }],
  [0.27, { x: -5.4, y: 1.1, zoom: 2.25, az: -0.06, el: 0.44 }],
  [0.38, { x: -1.0, y: 0.5, zoom: 1.7, az: 0.04, el: 0.52 }],
  [0.48, { x: -1.0, y: 0.5, zoom: 1.7, az: 0.04, el: 0.52 }],
  [0.57, { x: 3.4, y: 1.0, zoom: 2.25, az: 0.12, el: 0.44 }],
  [0.64, { x: 3.4, y: 1.0, zoom: 2.25, az: 0.12, el: 0.44 }],
  [0.74, { x: 5.9, y: 1.3, zoom: 2.25, az: 0.16, el: 0.42 }],
  [0.8, { x: 5.9, y: 1.3, zoom: 2.25, az: 0.16, el: 0.42 }],
  [0.9, { x: 8.5, y: 1.5, zoom: 2.2, az: 0.22, el: 0.36 }],
  [0.95, { x: 8.5, y: 1.5, zoom: 2.2, az: 0.22, el: 0.36 }],
  [1, { x: -0.6, y: 1.7, zoom: 0.86, az: 0.06, el: 0.6 }],
];
// The queue step: traffic spikes as the camera arrives at the conveyor.
const SPIKE_AT = 0.33;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function shotAt(p: number): Shot {
  let i = 0;
  while (i < SHOTS.length - 2 && p >= SHOTS[i + 1][0]) i++;
  const [p0, a] = SHOTS[i];
  const [p1, b] = SHOTS[i + 1];
  const k = smooth(clamp01((p - p0) / (p1 - p0)));
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    zoom: a.zoom + (b.zoom - a.zoom) * k,
    az: a.az + (b.az - a.az) * k,
    el: a.el + (b.el - a.el) * k,
  };
}

function canvasTexture(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { ctx: cv.getContext("2d")!, tex };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Canvas text can't read CSS variables, so the families are named here.
const SANS = '"DM Sans", ui-sans-serif, system-ui, sans-serif';
const DISPLAY = '"Bricolage Grotesque", "DM Sans", ui-sans-serif, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

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
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75)
  );
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  const camera = new THREE.OrthographicCamera(-12, 12, 6, -6, 0.1, 100);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Light: a warm key with soft shadows, a cool rim from behind, and a warm
  // bounce from the front so the faces toward the camera never go flat.
  scene.add(new THREE.HemisphereLight(0xfff1e4, 0x141414, 0.55));
  const sun = new THREE.DirectionalLight(0xffe6d0, 2.4);
  sun.position.set(5, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -14;
  sc.right = 14;
  sc.top = 9;
  sc.bottom = -9;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 5;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xa9c4cc, 1.1);
  rim.position.set(-6, 7, -12);
  scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xf26a2e, 0.35);
  bounce.position.set(2, 1, 12);
  scene.add(bounce);

  // Materials.
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x1d1c1b,
    roughness: 0.82,
  });
  const body = new THREE.MeshStandardMaterial({
    color: 0x3b3936,
    roughness: 0.5,
    metalness: 0.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x242322,
    roughness: 0.55,
    metalness: 0.25,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb8b4ae,
    roughness: 0.22,
    metalness: 1,
  });
  const ember = (k: number, c = SOFT) =>
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: c,
      emissiveIntensity: k,
    });

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z = 0,
    parent: THREE.Object3D = scene
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const rbox = (w: number, h: number, d: number, r = 0.08) =>
    new RoundedBoxGeometry(w, h, d, 3, r);

  // A warm pool of light under the table, so it floats instead of sitting
  // in a void.
  {
    const { ctx, tex } = canvasTexture(256, 256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(242,106,46,0.32)");
    g.addColorStop(0.5, "rgba(242,106,46,0.07)");
    g.addColorStop(1, "rgba(242,106,46,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 12),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -0.75;
    scene.add(pool);
  }

  // The table: a bevelled slab, a glowing front edge and a faint dot grid.
  const slab = add(rbox(23.4, 0.6, 7.6, 0.28), slabMat, 0.25, -0.3);
  slab.castShadow = false;
  add(
    new THREE.BoxGeometry(22.4, 0.025, 0.025),
    ember(1.7, HOT),
    0.25,
    -0.02,
    3.79
  ).castShadow = false;
  {
    const dots: number[] = [];
    for (let x = -10.8; x <= 11.2; x += 0.5)
      for (let z = -3.3; z <= 3.3; z += 0.5) dots.push(x, 0.006, z);
    scene.add(
      new THREE.Points(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(dots, 3)
        ),
        new THREE.PointsMaterial({ color: 0x45423f, size: 2 })
      )
    );
  }
  // The path every event takes, inlaid in the table.
  add(
    new THREE.PlaneGeometry(X.belt0 - X.laptop - 1, 0.05),
    ember(0.5, HOT),
    (X.laptop + 1 + X.belt0) / 2,
    0.008,
    0
  ).rotation.x = -Math.PI / 2;

  // 1. Laptop, with a real-looking page on its screen.
  const laptop = new THREE.Group();
  laptop.position.set(X.laptop, 0, 0.1);
  laptop.rotation.y = 0.18;
  scene.add(laptop);
  add(rbox(2.5, 0.12, 1.7, 0.05), body, 0, 0.06, 0.2, laptop);
  {
    const { ctx, tex } = canvasTexture(512, 340);
    ctx.fillStyle = "#2a2826";
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = "#1c1b1a";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 12; c++)
        roundRect(ctx, 22 + c * 39, 26 + r * 40, 33, 32, 5);
    roundRect(ctx, 180, 200, 152, 96, 10);
    const kb = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.5),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
    );
    kb.rotation.x = -Math.PI / 2;
    kb.position.set(0, 0.125, 0.22);
    laptop.add(kb);
  }
  const lid = new THREE.Group();
  lid.position.set(0, 0.12, -0.63);
  lid.rotation.x = -0.24;
  laptop.add(lid);
  add(rbox(2.5, 1.65, 0.08, 0.05), body, 0, 0.82, 0, lid);
  const page = canvasTexture(640, 400);
  const pageMat = new THREE.MeshBasicMaterial({ map: page.tex });
  const drawPage = (flash: number) => {
    const { ctx } = page;
    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, 640, 400);
    ctx.fillStyle = "#222120";
    ctx.fillRect(0, 0, 640, 34);
    ["#f26a2e", "#5b5852", "#5b5852"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(20 + i * 18, 17, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#2c2a28";
    roundRect(ctx, 90, 9, 300, 16, 8);
    ctx.fillStyle = "#e5e3d2";
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.fillText("Ship faster.", 40, 108);
    ctx.fillStyle = "rgba(229,227,210,0.45)";
    roundRect(ctx, 40, 132, 330, 12, 6);
    roundRect(ctx, 40, 154, 260, 12, 6);
    ctx.fillStyle = "#f26a2e";
    roundRect(ctx, 40, 186, 130, 40, 20);
    ctx.fillStyle = "#161616";
    ctx.font = `600 17px ${SANS}`;
    ctx.fillText("Get started", 58, 212);
    ctx.fillStyle = "#24221f";
    roundRect(ctx, 40, 252, 170, 120, 12);
    roundRect(ctx, 226, 252, 170, 120, 12);
    roundRect(ctx, 412, 252, 190, 120, 12);
    ctx.fillStyle = "#3a3632";
    roundRect(ctx, 420, 60, 182, 166, 14);
    // A small "event sent" toast that lights up as each pill leaves.
    ctx.globalAlpha = 0.35 + flash * 0.65;
    ctx.fillStyle = "#2a1a10";
    roundRect(ctx, 446, 344, 176, 40, 20);
    ctx.fillStyle = "#f7a26b";
    ctx.beginPath();
    ctx.arc(468, 364, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `500 15px ${MONO}`;
    ctx.fillText("pageview →", 484, 369);
    ctx.globalAlpha = 1;
    page.tex.needsUpdate = true;
  };
  drawPage(0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.44), pageMat);
  screen.position.set(0, 0.83, 0.045);
  lid.add(screen);

  // 2. Ingest gate: an arch with a glowing inner frame, a scanning sheet and
  // a "204" sign that blinks blue for each reply.
  add(rbox(0.36, 2.3, 0.36), body, X.gate, 1.15, 0.95);
  add(rbox(0.36, 2.3, 0.36), body, X.gate, 1.15, -0.95);
  add(rbox(0.5, 0.42, 2.36, 0.1), body, X.gate, 2.4);
  add(rbox(0.7, 0.1, 0.6), dark, X.gate, 0.05, 0.95);
  add(rbox(0.7, 0.1, 0.6), dark, X.gate, 0.05, -0.95);
  const frameMat = ember(2.2);
  for (const z of [0.76, -0.76])
    add(new THREE.BoxGeometry(0.06, 1.9, 0.04), frameMat, X.gate, 1.15, z);
  add(new THREE.BoxGeometry(0.06, 0.04, 1.56), frameMat, X.gate, 2.17);
  const scanMat = new THREE.MeshBasicMaterial({
    color: glow(COOL, 1.4),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.95), scanMat);
  scan.rotation.y = Math.PI / 2;
  scan.position.set(X.gate, 1.15, 0);
  scene.add(scan);
  const sign = canvasTexture(256, 96);
  {
    const { ctx } = sign;
    ctx.fillStyle = "#0f1112";
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = "#bcd0d4";
    ctx.font = `700 64px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("204", 128, 70);
  }
  const signMat = new THREE.MeshBasicMaterial({ map: sign.tex });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), signMat);
  signMesh.position.set(X.gate + 0.26, 2.4, 0);
  signMesh.rotation.y = Math.PI / 2;
  scene.add(signMesh);

  // 3. Conveyor: a bed, chrome rollers, moving slats, and a row of LEDs on
  // the rail that fills as the queue grows.
  const beltLen = X.belt1 - X.belt0 + 0.6;
  const beltMid = (X.belt0 + X.belt1) / 2;
  add(rbox(beltLen + 0.3, 0.32, 1.25, 0.1), dark, beltMid, 0.2);
  for (const z of [0.66, -0.66])
    add(rbox(beltLen + 0.3, 0.14, 0.08, 0.03), body, beltMid, 0.42, z);
  for (const x of [X.belt0 - 0.2, X.belt1 + 0.2]) {
    const r = add(
      new THREE.CylinderGeometry(0.17, 0.17, 1.2, 24),
      chrome,
      x,
      0.24
    );
    r.rotation.x = Math.PI / 2;
  }
  for (const x of [X.belt0 + 0.3, X.belt1 - 0.3])
    for (const z of [0.45, -0.45])
      add(rbox(0.16, 0.12, 0.16, 0.03), body, x, 0.0, z);
  const SLATS = 32;
  const slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.08, 0.022, 1.06),
    new THREE.MeshStandardMaterial({
      color: 0x4c4945,
      roughness: 0.45,
      metalness: 0.3,
    }),
    SLATS
  );
  slats.receiveShadow = true;
  scene.add(slats);
  const ledOn = new THREE.Color(glow(HOT, 2.2));
  const ledOff = new THREE.Color(0x2a2826);
  const leds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    LEDS
  );
  for (let i = 0; i < LEDS; i++) {
    const d = new THREE.Object3D();
    d.position.set(
      X.belt0 + (i / (LEDS - 1)) * (X.belt1 - X.belt0),
      0.42,
      0.71
    );
    d.updateMatrix();
    leds.setMatrixAt(i, d.matrix);
    leds.setColorAt(i, ledOff);
  }
  scene.add(leds);
  let beltOffset = 0;

  // 4. Worker: a press with a chrome piston, a glowing window and a lamp.
  add(rbox(1.8, 1.8, 1.6, 0.14), body, X.worker, 0.9);
  add(rbox(1.1, 0.56, 1.62, 0.05), dark, X.worker, 0.44);
  const windowMat = ember(0.6, HOT);
  add(new THREE.BoxGeometry(1.0, 0.1, 0.02), windowMat, X.worker, 1.3, 0.81);
  add(rbox(0.9, 0.22, 0.9, 0.06), body, X.worker, 1.9);
  const piston = add(
    new THREE.CylinderGeometry(0.22, 0.22, 1.0, 28),
    chrome,
    X.worker,
    2.4
  );
  add(rbox(0.7, 0.14, 0.7, 0.05), dark, X.worker, 2.95).castShadow = true;
  const lampMat = ember(2.2);
  add(
    new THREE.SphereGeometry(0.09, 16, 12),
    lampMat,
    X.worker + 0.62,
    1.55,
    0.81
  );

  // 5. Silo: clear glass, a glowing fill with a bright surface, metal bands.
  add(new THREE.CylinderGeometry(1.08, 1.12, 0.2, 48), body, X.silo, 0.1);
  const fillMat = new THREE.MeshStandardMaterial({
    color: 0x3a1606,
    emissive: HOT,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  const fill = add(
    new THREE.CylinderGeometry(0.84, 0.84, 1, 48),
    fillMat,
    X.silo,
    0.6
  );
  fill.castShadow = false;
  const surface = add(
    new THREE.CircleGeometry(0.84, 48),
    ember(1.1, HOT),
    X.silo,
    1
  );
  surface.rotation.x = -Math.PI / 2;
  surface.castShadow = false;
  const shell = add(
    new THREE.CylinderGeometry(0.95, 0.95, 2.7, 48, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xdfe8ea,
      roughness: 0.06,
      clearcoat: 1,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    X.silo,
    1.55
  );
  shell.castShadow = false;
  for (const y of [0.62, 1.55, 2.48])
    add(
      new THREE.TorusGeometry(0.96, 0.035, 10, 64),
      body,
      X.silo,
      y
    ).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(1.0, 0.98, 0.14, 48), body, X.silo, 2.95);
  add(
    new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    body,
    X.silo,
    3.0
  );
  let level = 0.9;

  // 6. Dashboard: a monitor showing a live count and today's bars.
  add(rbox(0.22, 1.1, 0.22), body, X.screen, 0.55, -0.4);
  add(rbox(1.3, 0.08, 0.86, 0.04), body, X.screen, 0.04, -0.4);
  add(rbox(3.0, 2.0, 0.14, 0.1), body, X.screen, 2.0, -0.4);
  const dash = canvasTexture(768, 480);
  const BAR_BASE = [
    0.42, 0.55, 0.48, 0.7, 0.62, 0.78, 0.66, 0.84, 0.74, 0.9, 0.8,
  ];
  const drawDash = (stored: number, live: number) => {
    const { ctx } = dash;
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, 768, 480);
    ctx.fillStyle = "rgba(229,227,210,0.5)";
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText("Pageviews today", 44, 66);
    ctx.fillStyle = "#e5e3d2";
    ctx.font = `700 76px ${DISPLAY}`;
    ctx.fillText(Math.round(stored).toLocaleString("en-US"), 44, 146);
    ctx.fillStyle = "#f7a26b";
    ctx.font = `500 22px ${MONO}`;
    ctx.textAlign = "right";
    ctx.fillText("● live", 724, 66);
    ctx.textAlign = "left";
    const n = BAR_BASE.length + 1;
    const bw = (680 - (n - 1) * 12) / n;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const h = (last ? live : BAR_BASE[i]) * 230;
      ctx.fillStyle = last ? "#f26a2e" : "rgba(229,227,210,0.16)";
      roundRect(ctx, 44 + i * (bw + 12), 432 - h, bw, h, 6);
    }
    ctx.fillStyle = "rgba(229,227,210,0.08)";
    ctx.fillRect(44, 434, 680, 2);
    dash.tex.needsUpdate = true;
  };
  const dashMesh = add(
    new THREE.PlaneGeometry(2.8, 1.75),
    new THREE.MeshBasicMaterial({ map: dash.tex }),
    X.screen,
    2.0,
    -0.325
  );
  dashMesh.castShadow = false;
  dashMesh.receiveShadow = false;

  // Moving things. Pills in flight trail two fading ghosts.
  const MAX_PILLS = 72;
  const pillMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.11, 0.18, 4, 12),
    ember(2.6, HOT),
    MAX_PILLS * 3
  );
  pillMesh.castShadow = true;
  pillMesh.frustumCulled = false;
  scene.add(pillMesh);
  const replyMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.07, 0.12, 4, 8),
    ember(2.4, COOL),
    24 * 3
  );
  replyMesh.frustumCulled = false;
  scene.add(replyMesh);
  const crateTex = canvasTexture(128, 128);
  {
    const { ctx } = crateTex;
    ctx.fillStyle = "#f7a26b";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#7a3a18";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 108, 108);
    ctx.fillStyle = "#5a2810";
    ctx.font = `700 44px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("100", 64, 80);
  }
  const crateMesh = new THREE.InstancedMesh(
    rbox(0.5, 0.5, 0.5, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x8a5030,
      emissive: 0xffffff,
      emissiveMap: crateTex.tex,
      emissiveIntensity: 0.9,
      roughness: 0.5,
    }),
    8
  );
  crateMesh.castShadow = true;
  crateMesh.frustumCulled = false;
  scene.add(crateMesh);

  // Dust in the air, for depth.
  const DUST = opts.mobile ? 60 : 140;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = Array.from({ length: DUST }, () => Math.random());
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 24;
    dustPos[i * 3 + 1] = Math.random() * 5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  scene.add(
    new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xf7c9a6,
        size: 2,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    )
  );

  // Simulation state.
  const pills: Pill[] = [];
  const queue: Pill[] = [];
  const replies: { t: number }[] = [];
  const crates: { t: number }[] = [];
  let spawnAcc = 0;
  let spikeT = -99;
  let simTime = 0;
  let press = 0;
  let pressCooldown = 0;
  let stored = 12480;
  let gateFlash = 0;
  let pageFlash = 0;
  let pageLevel = -1;
  let liveBar = 0.35;
  let dashDirty = true;

  function sim(dt: number) {
    simTime += dt;
    const k = simTime - spikeT;
    const spike = k >= 0 && k < 6 ? Math.sin((k / 6) * Math.PI) : 0;
    spawnAcc += dt * (2.6 + spike * 9);
    while (spawnAcc >= 1 && pills.length + queue.length < MAX_PILLS) {
      spawnAcc -= 1;
      pills.push({ x: X.laptop + 1.1, y: PILL_Y, passed: false });
      pageFlash = 1;
    }
    for (let i = pills.length - 1; i >= 0; i--) {
      const p = pills[i];
      p.x += dt * 3.4;
      // A little hop off the laptop, then a glide at table height.
      const hop = clamp01((p.x - X.laptop - 1.1) / 1.2);
      p.y = PILL_Y + Math.sin(hop * Math.PI) * 0.35;
      if (!p.passed && p.x > X.gate) {
        p.passed = true;
        gateFlash = 1;
        if (replies.length < 24) replies.push({ t: 0 });
      }
      if (p.x >= X.belt0) {
        pills.splice(i, 1);
        queue.push(p);
      }
    }
    beltOffset = (beltOffset + dt * 0.18) % 1;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      p.x = Math.min(X.belt1 - i * SPACING, p.x + dt * 1.8);
      p.y = PILL_Y;
    }
    pressCooldown -= dt;
    press = Math.max(0, press - dt * 2.2);
    if (
      pressCooldown <= 0 &&
      queue.length > 0 &&
      queue[0].x >= X.belt1 - 0.05
    ) {
      queue.splice(0, Math.min(PER_CRATE, queue.length));
      press = 1;
      pressCooldown = 1.1;
      crates.push({ t: 0 });
    }
    for (let i = replies.length - 1; i >= 0; i--) {
      replies[i].t += dt * 1.5;
      if (replies[i].t >= 1) replies.splice(i, 1);
    }
    for (let i = crates.length - 1; i >= 0; i--) {
      crates[i].t += dt * 1.05;
      if (crates[i].t >= 1) {
        crates.splice(i, 1);
        stored += 100;
        level = level >= 2.3 ? 0.7 : level + 0.04;
        liveBar = liveBar >= 0.98 ? 0.3 : liveBar + 0.03;
        dashDirty = true;
      }
    }
    gateFlash = Math.max(0, gateFlash - dt * 3);
    pageFlash = Math.max(0, pageFlash - dt * 2.5);
    return spike;
  }
  // Start mid-flow, so the first frame already has traffic on the table.
  for (let i = 0; i < 360; i++) sim(1 / 60);

  // Label anchors: the centre of each station and a radius around it.
  const ANCHORS: Record<LabelKey, { at: THREE.Vector3; r: number }> = {
    sites: { at: new THREE.Vector3(X.laptop, 0.9, 0), r: 1.4 },
    ingest: { at: new THREE.Vector3(X.gate, 1.2, 0), r: 1.35 },
    queue: { at: new THREE.Vector3(beltMid, 0.45, 0), r: 1.9 },
    worker: { at: new THREE.Vector3(X.worker, 1.3, 0), r: 1.4 },
    chart: { at: new THREE.Vector3(X.silo, 1.6, 0), r: 1.5 },
    now: { at: new THREE.Vector3(X.screen, 2.0, -0.4), r: 1.6 },
  };

  const dummy = new THREE.Object3D();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const view = { ...WIDE };
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const pointer = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const BASE_AZ = Math.atan2(13, 17);

  let width = 1;
  let height = 1;
  let target = opts.reduced ? 1 : 0;
  let progress = target;
  let lastP = progress;
  let running = false;
  let raf = 0;
  let last = performance.now();

  function resize() {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
    const aspect = width / height;
    const viewW = aspect < 1 ? 25 : 24.5;
    const viewH = Math.max(viewW / aspect, 10.5);
    const w = viewH * aspect;
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    // The headline sits top left and the copy bottom left, so on wide
    // screens the table moves right; everywhere it lifts a little.
    const shiftX = aspect > 1.2 ? -width * 0.15 : 0;
    camera.setViewOffset(width, height, shiftX, height * 0.05, width, height);
    camera.updateProjectionMatrix();
  }

  // Step quality down on slow devices: resolution, then bloom, then shadows.
  let slowFrames = 0;
  let quality = 3;
  function adapt(frameMs: number) {
    if (quality === 0) return;
    slowFrames = frameMs > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 45) return;
    slowFrames = 0;
    quality -= 1;
    if (quality === 2) {
      renderer.setPixelRatio(1);
      resize();
    } else if (quality === 1) bloom.enabled = false;
    else renderer.shadowMap.autoUpdate = false;
  }

  function render(now: number) {
    const frameMs = now - last;
    const dt = opts.reduced ? 0 : Math.min(0.05, frameMs / 1000);
    last = now;
    if (running) adapt(frameMs);
    progress += (target - progress) * (opts.reduced ? 1 : Math.min(1, dt * 5));
    if (lastP < SPIKE_AT && progress >= SPIKE_AT) spikeT = simTime;
    lastP = progress;
    const spike = sim(dt);
    const t = simTime;

    // Camera.
    const want = shotAt(progress);
    const ease = opts.reduced ? 1 : 1 - Math.exp(-6 * dt);
    view.x += (want.x - view.x) * ease;
    view.y += (want.y - view.y) * ease;
    view.zoom += (want.zoom - view.zoom) * ease;
    view.az += (want.az - view.az) * ease;
    view.el += (want.el - view.el) * ease;
    const az = BASE_AZ + view.az + pointer.x * 0.05 + Math.sin(t * 0.2) * 0.012;
    const el = view.el - pointer.y * 0.025;
    look.set(view.x, view.y, 0);
    camera.position.set(
      look.x + Math.sin(az) * Math.cos(el) * 30,
      look.y + Math.sin(el) * 30,
      Math.cos(az) * Math.cos(el) * 30
    );
    camera.lookAt(look);
    // Close-ups on portrait screens would crop the station, so zoom less.
    const zoom = width < height ? 1 + (view.zoom - 1) * 0.85 : view.zoom;
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }

    // Stations.
    frameMat.emissiveIntensity = 2 + gateFlash * 2.5;
    scanMat.opacity = gateFlash * 0.22;
    signMat.color.setScalar(1 + gateFlash * 1.2);
    // Redrawing the page re-uploads its texture, so only do it when the
    // toast's brightness visibly changes.
    const toast = Math.round(pageFlash * 4);
    if (toast !== pageLevel) {
      pageLevel = toast;
      drawPage(toast / 4);
    }
    piston.position.y =
      2.4 - smooth(press > 0.5 ? (1 - press) * 2 : press * 2) * 0.62;
    lampMat.emissiveIntensity = 2.2 + press * 3;
    windowMat.emissiveIntensity = 0.6 + press * 2.2 + spike * 0.4;
    fill.scale.y = level;
    fill.position.y = 0.2 + level / 2;
    surface.position.y = 0.2 + level + 0.002;
    if (dashDirty) {
      drawDash(stored, liveBar);
      dashDirty = false;
    }
    const lit = Math.round(clamp01(queue.length / 18) * LEDS);
    for (let i = 0; i < LEDS; i++) leds.setColorAt(i, i < lit ? ledOn : ledOff);
    leds.instanceColor!.needsUpdate = true;

    // Pills, with trails while in flight.
    let n = 0;
    const put = (mesh: THREE.InstancedMesh, i: number) => {
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    };
    for (const p of pills) {
      for (let g = 0; g < 3; g++) {
        dummy.position.set(p.x - g * 0.16, p.y - g * 0.02, 0);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.setScalar(1 - g * 0.3);
        put(pillMesh, n++);
      }
    }
    for (const p of queue) {
      dummy.position.set(p.x, p.y, 0);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.scale.setScalar(1);
      put(pillMesh, n++);
    }
    for (; n < MAX_PILLS * 3; n++) pillMesh.setMatrixAt(n, zero);
    pillMesh.instanceMatrix.needsUpdate = true;

    n = 0;
    for (const r of replies) {
      for (let g = 0; g < 3; g++) {
        const e = Math.max(0, r.t - g * 0.04);
        dummy.position.set(
          X.gate + (X.laptop + 0.7 - X.gate) * e,
          PILL_Y + 1.3 + Math.sin(Math.PI * e) * 1.1,
          0.2
        );
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.setScalar(1 - g * 0.3);
        put(replyMesh, n++);
      }
    }
    for (; n < 24 * 3; n++) replyMesh.setMatrixAt(n, zero);
    replyMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < 8; i++) {
      const c = crates[i];
      if (!c) {
        crateMesh.setMatrixAt(i, zero);
        continue;
      }
      const e = smooth(c.t);
      const fromX = X.worker + 0.95;
      dummy.position.set(
        fromX + (X.silo - fromX) * e,
        0.7 + Math.sin(Math.PI * e) * 2.3 + e * 2.0,
        0
      );
      dummy.rotation.set(e * 2.2, e * 3, 0);
      dummy.scale.setScalar(
        Math.min(1, c.t * 6) * (1 - Math.max(0, e - 0.85) * 5)
      );
      put(crateMesh, i);
    }
    crateMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SLATS; i++) {
      const f = (i / SLATS + beltOffset) % 1;
      dummy.position.set(X.belt0 - 0.2 + f * beltLen, 0.37, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      put(slats, i);
    }
    slats.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < DUST; i++) {
      const s = dustSeed[i];
      dustPos[i * 3 + 1] = (dustPos[i * 3 + 1] + dt * (0.05 + s * 0.08)) % 5;
      dustPos[i * 3] += Math.sin(t * 0.3 + s * 20) * dt * 0.05;
    }
    dustGeo.attributes.position.needsUpdate = true;

    composer.render();

    // Screen positions for the HTML labels and focus ring.
    screenUp.setFromMatrixColumn(camera.matrixWorld, 1);
    const out = {} as Record<LabelKey, LabelPos>;
    for (const k of Object.keys(ANCHORS) as LabelKey[]) {
      const { at, r } = ANCHORS[k];
      tmp.copy(at).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      const visible =
        tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      tmp.copy(at).addScaledVector(screenUp, r).project(camera);
      out[k] = {
        x,
        y,
        r: Math.abs((-tmp.y * 0.5 + 0.5) * height - y),
        visible,
      };
    }
    opts.onLabels(out);

    if (running) raf = requestAnimationFrame(render);
  }

  resize();
  // Fonts may still be loading; redraw the screens once they are in.
  document.fonts?.ready.then(() => {
    drawPage(pageFlash);
    dashDirty = true;
    if (!running) render(performance.now());
  });

  return {
    setProgress(p: number) {
      target = opts.reduced ? 1 : p;
      if (!running) render(performance.now());
    },
    resize() {
      resize();
      if (!running) render(performance.now());
    },
    spike() {
      spikeT = simTime;
    },
    stats: () => ({ queued: queue.length * 25, stored }),
    start() {
      if (running) return;
      if (opts.reduced) {
        render(performance.now());
        return;
      }
      running = true;
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
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      [page.tex, dash.tex, sign.tex, crateTex.tex].forEach((x) => x.dispose());
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
