import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const HOT = new THREE.Color(0xf26a2e);
export const SOFT = new THREE.Color(0xf7a26b);
export const COOL = new THREE.Color(0xbcd0d4);
export const glow = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

// The composer's render target gets the clear colour sRGB-encoded once,
// then OutputPass tone-maps (ACES) and encodes it again. This value comes
// out as the page's #161616 after all three.
export const BG = new THREE.Color().setRGB(
  0.0016,
  0.0016,
  0.0016,
  THREE.LinearSRGBColorSpace
);

export type Labels = Record<string, { x: number; y: number; on: boolean }>;

export type SceneHandle = {
  frame: (dt: number, t: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
  // Scroll position as a fractional index into the scene's shots.
  setShot?: (s: number) => void;
};

export function makeRenderer(
  canvas: HTMLCanvasElement,
  opts: {
    bloom?: { strength: number; radius: number; threshold: number };
    shadows?: boolean;
  } = {}
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (opts.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  let renderPass: RenderPass | null = null;

  return {
    renderer,
    attach(scene: THREE.Scene, camera: THREE.Camera) {
      composer = new EffectComposer(renderer);
      renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      if (opts.bloom) {
        bloom = new UnrealBloomPass(
          new THREE.Vector2(1, 1),
          opts.bloom.strength,
          opts.bloom.radius,
          opts.bloom.threshold
        );
        composer.addPass(bloom);
      }
      composer.addPass(new OutputPass());
    },
    setSize(w: number, h: number) {
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      bloom?.resolution.set(w, h);
    },
    render() {
      composer?.render();
    },
    dispose(scene: THREE.Scene) {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      composer?.dispose();
      renderer.dispose();
    },
  };
}

// Projects world points to CSS pixels for HTML labels.
export function project(
  points: Record<string, THREE.Vector3>,
  camera: THREE.Camera,
  w: number,
  h: number
): Labels {
  const v = new THREE.Vector3();
  const out: Labels = {};
  for (const [k, p] of Object.entries(points)) {
    v.copy(p).project(camera);
    out[k] = {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h,
      on: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05,
    };
  }
  return out;
}

export const ease = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type Shot = Record<string, number>;

// Blends between the two shots either side of a fractional shot index.
export function shotAt(shots: Shot[], s: number): Shot {
  const i = Math.max(0, Math.min(shots.length - 1, Math.floor(s)));
  const j = Math.min(shots.length - 1, i + 1);
  const k = ease(clamp01(s - i));
  const out: Shot = {};
  for (const key of Object.keys(shots[i]))
    out[key] = shots[i][key] + (shots[j][key] - shots[i][key]) * k;
  return out;
}

// Frame-rate independent approach towards a target.
export const damp = (a: number, b: number, rate: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));

// Pointer position over the canvas in -1..1, for a gentle parallax.
export function trackPointer(canvas: HTMLCanvasElement) {
  const p = { x: 0, y: 0, dispose: () => {} };
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    p.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    p.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener("pointermove", move, { passive: true });
  p.dispose = () => window.removeEventListener("pointermove", move);
  return p;
}
