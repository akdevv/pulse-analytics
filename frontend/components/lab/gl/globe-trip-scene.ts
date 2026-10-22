// "Round trip around the world": a dotted globe. A pageview leaves São Paulo,
// arcs to your Pulse server, a 204 arcs back, the event is queued and written
// in a batch, then it shows up on a dashboard in Bangalore. Scroll moves the
// camera from step to step.
import * as THREE from "three";
import { LAND_DOTS } from "@/components/landing/land-dots";
import {
  COOL,
  HOT,
  SOFT,
  clamp01,
  damp,
  ease,
  glow,
  makeRenderer,
  project,
  shotAt,
  trackPointer,
  type Labels,
  type SceneHandle,
} from "./common";

const R = 5;
const RAD = Math.PI / 180;

const CITY = {
  visitor: [-23.55, -46.63], // São Paulo
  server: [50.11, 8.68], // Frankfurt
  owner: [12.97, 77.59], // Bangalore
} as const;

// Other cities for the faint background traffic.
const OTHERS: [number, number][] = [
  [40.71, -74.0],
  [51.5, -0.12],
  [35.68, 139.69],
  [-33.87, 151.21],
  [19.43, -99.13],
  [1.35, 103.82],
  [37.77, -122.42],
  [-26.2, 28.04],
  [55.75, 37.62],
  [6.52, 3.38],
  [-34.6, -58.38],
  [31.23, 121.47],
  [25.2, 55.27],
  [59.33, 18.07],
];

function toVec(lat: number, lon: number, r = R) {
  const phi = (90 - lat) * RAD;
  const theta = (lon + 180) * RAD;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// A great-circle arc lifted off the surface, highest in the middle.
function arcCurve(a: THREE.Vector3, b: THREE.Vector3, lift: number) {
  const pts: THREE.Vector3[] = [];
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const angle = an.angleTo(bn);
  const axis = new THREE.Vector3().crossVectors(an, bn).normalize();
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const p = an.clone().applyAxisAngle(axis, angle * t);
    pts.push(p.multiplyScalar(R + 0.02 + Math.sin(Math.PI * t) * lift));
  }
  return new THREE.CatmullRomCurve3(pts);
}

type Arc = {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  count: number;
  head: THREE.Mesh;
};

export type GlobeTripHandle = SceneHandle;

export function createGlobeTrip(
  canvas: HTMLCanvasElement,
  onLabels: (l: Labels) => void
): GlobeTripHandle {
  const gl = makeRenderer(canvas, {
    bloom: { strength: 0.8, radius: 0.55, threshold: 0.85 },
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  gl.attach(scene, camera);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.4);
  scene.add(key);

  // Planet body, slightly lighter than the page so it reads as a sphere.
  const globe = new THREE.Group();
  scene.add(globe);
  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R, 96, 64),
      new THREE.MeshStandardMaterial({ color: 0x252321, roughness: 0.95 })
    )
  );

  // Land as round dots.
  const bin = atob(LAND_DOTS);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const nums = new Int16Array(bytes.buffer);
  const pos = new Float32Array((nums.length / 2) * 3);
  for (let i = 0, j = 0; i < nums.length; i += 2, j += 3) {
    const v = toVec(nums[i] / 10, nums[i + 1] / 10, R + 0.01);
    pos[j] = v.x;
    pos[j + 1] = v.y;
    pos[j + 2] = v.z;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSize: { value: 1 },
      uColor: { value: new THREE.Color(0xe5e3d2) },
    },
    vertexShader: /* glsl */ `
      uniform float uSize;
      varying float vFace;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFace = dot(n, normalize(-mv.xyz));
        gl_PointSize = uSize * (60.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFace;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.3, d) * smoothstep(0.0, 0.45, vFace);
        gl_FragColor = vec4(uColor * 0.42, a * 0.85);
      }`,
  });
  globe.add(new THREE.Points(dotGeo, dotMat));

  // Atmosphere: a back-face shell that glows at the rim.
  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.13, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: SOFT.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            // 0 at the shell's outer edge, ~0.46 at the planet's limb.
            float d = -dot(vN, vV);
            float f = pow(smoothstep(0.0, 0.46, d), 4.0);
            gl_FragColor = vec4(uColor * f * 0.3, f);
          }`,
      })
    )
  );

  const P = {
    visitor: toVec(CITY.visitor[0], CITY.visitor[1]),
    server: toVec(CITY.server[0], CITY.server[1]),
    owner: toVec(CITY.owner[0], CITY.owner[1]),
  };

  // Points on the surface: a dot and a pulsing ring per city.
  const up = new THREE.Vector3(0, 1, 0);
  const onSurface = (obj: THREE.Object3D, p: THREE.Vector3) => {
    obj.position.copy(p);
    obj.quaternion.setFromUnitVectors(up, p.clone().normalize());
    globe.add(obj);
    return obj;
  };
  const rings: THREE.Mesh[] = [];
  for (const [k, c] of [
    ["visitor", HOT],
    ["server", SOFT],
    ["owner", COOL],
  ] as const) {
    onSurface(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20),
        new THREE.MeshBasicMaterial({ color: glow(c, 2.4) })
      ),
      P[k]
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.16, 48),
      new THREE.MeshBasicMaterial({
        color: glow(c, 2),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    const holder = onSurface(new THREE.Group(), P[k]);
    holder.add(ring);
    rings.push(ring);
  }

  const makeArc = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    color: THREE.Color,
    radius: number,
    lift: number,
    headSize = 0.06
  ): Arc => {
    const curve = arcCurve(a, b, lift);
    const geo = new THREE.TubeGeometry(curve, 96, radius, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    globe.add(mesh);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(headSize, 14, 10),
      new THREE.MeshBasicMaterial({ color: glow(color, 1.6) })
    );
    globe.add(head);
    return { mesh, curve, count: geo.index!.count, head };
  };

  // Draws `from`..`to` of an arc (0..1) and puts its head at `to`.
  const draw = (arc: Arc, from: number, to: number, opacity: number) => {
    const seg = arc.count / 96;
    const a = Math.floor(clamp01(from) * 96) * seg;
    const b = Math.floor(clamp01(to) * 96) * seg;
    arc.mesh.geometry.setDrawRange(a, Math.max(0, b - a));
    (arc.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    arc.mesh.visible = b > a && opacity > 0.01;
    arc.head.visible = arc.mesh.visible && to > 0 && to < 1;
    if (arc.head.visible) arc.head.position.copy(arc.curve.getPoint(to));
  };

  const out = makeArc(P.visitor, P.server, glow(HOT, 2.2), 0.026, 1.6, 0.075);
  const back = makeArc(P.server, P.visitor, glow(COOL, 1.6), 0.016, 1.15);
  const share = makeArc(P.server, P.owner, glow(SOFT, 1.8), 0.02, 1.2);

  const bg: (Arc & { phase: number; speed: number })[] = [];
  for (let i = 0; i < OTHERS.length; i++) {
    const a = toVec(OTHERS[i][0], OTHERS[i][1]);
    const arc = makeArc(
      a,
      P.server,
      glow(HOT, 1.3),
      0.012,
      0.2 + a.distanceTo(P.server) * 0.05,
      0.04
    );
    bg.push({
      ...arc,
      phase: Math.random(),
      speed: 0.25 + Math.random() * 0.2,
    });
  }

  // At the server: queued events stack up, merge into a batch, sink into
  // the database disk.
  const serverRig = onSurface(new THREE.Group(), P.server);
  serverRig.scale.setScalar(1.8);
  const dbMat = new THREE.MeshStandardMaterial({
    color: 0x2a2826,
    emissive: SOFT,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const db = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.12, 32),
    dbMat
  );
  db.position.y = 0.08;
  db.scale.setScalar(0.6);
  serverRig.add(db);
  const cubes: THREE.Mesh[] = [];
  const cubeMat = new THREE.MeshBasicMaterial({ color: glow(HOT, 2) });
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), cubeMat);
    serverRig.add(c);
    cubes.push(c);
  }
  const batch = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: glow(SOFT, 2.4) })
  );
  serverRig.add(batch);

  // At the owner: a small bar chart standing on the globe.
  const ownerRig = onSurface(new THREE.Group(), P.owner);
  ownerRig.scale.setScalar(1.6);
  const bars: THREE.Mesh[] = [];
  [0.25, 0.4, 0.3, 0.5].forEach((hgt, i) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 1, 0.09),
      new THREE.MeshBasicMaterial({
        color: i === 3 ? glow(COOL, 1.05) : new THREE.Color(0x6b6a62),
      })
    );
    m.position.x = (i - 1.5) * 0.14;
    m.userData.h = hgt;
    ownerRig.add(m);
    bars.push(m);
  });

  // Camera shots: where on the globe to look from, and how far.
  const SHOTS = [
    { lat: 18, lon: -22, dist: 30 },
    { lat: -14, lon: -44, dist: 17 },
    { lat: -12, lon: -75, dist: 22 },
    { lat: 30, lon: 35, dist: 22 },
    { lat: 44, lon: 10, dist: 14 },
    { lat: 34, lon: 48, dist: 21 },
    { lat: 22, lon: 10, dist: 31 },
  ];
  const view = { ...SHOTS[0] };
  let shot = 0;
  let step = 0;
  let stepAt = 0;
  let fit = 1;
  const pointer = trackPointer(canvas);

  const labelPoints = {
    visitor: P.visitor.clone().multiplyScalar(1.04),
    server: P.server.clone().multiplyScalar(1.1),
    owner: P.owner.clone().multiplyScalar(1.12),
  };
  const camDir = new THREE.Vector3();

  let w = 1;
  let h = 1;

  return {
    setShot(v) {
      shot = v;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
      gl.setSize(w, h);
      camera.aspect = w / h;
      fit = w / h < 1 ? 1.9 : w / h < 1.4 ? 1.3 : 1;
      camera.updateProjectionMatrix();
      dotMat.uniforms.uSize.value =
        Math.min(window.devicePixelRatio || 1, 1.75) * (w < 700 ? 1.3 : 1);
    },
    frame(dt, t) {
      const s = Math.round(shot);
      if (s !== step) {
        step = s;
        stepAt = t;
      }
      const local = t - stepAt;

      const want = shotAt(SHOTS, shot);
      for (const k of ["lat", "lon", "dist"] as const)
        view[k] = damp(view[k], want[k], 3, dt || 1);
      const drift =
        step === 0 || step === SHOTS.length - 1 ? Math.sin(t * 0.12) * 10 : 0;
      const lat = view.lat - pointer.y * 4;
      const lon = view.lon + pointer.x * 6 + drift;
      camera.position.copy(toVec(lat, lon, view.dist * fit));
      camera.lookAt(0, 0, 0);
      key.position.copy(camera.position).add(new THREE.Vector3(6, 8, 0));

      // Rings pulse at the city that matters now.
      const focusRing = step <= 2 ? 0 : step <= 4 ? 1 : 2;
      rings.forEach((r, i) => {
        const on = i === focusRing && step > 0 && step < SHOTS.length - 1;
        const k = (t * 0.7 + i * 0.3) % 1;
        r.scale.setScalar(on ? 1 + k * (step === 4 ? 1.5 : 3.5) : 1);
        (r.material as THREE.MeshBasicMaterial).opacity = on
          ? (1 - k) * 0.9
          : 0.35;
      });

      // The story, keyed to the step and the time since it began.
      const grow = (from: number, dur: number) =>
        ease(clamp01((local - from) / dur));
      const final = step === SHOTS.length - 1;
      if (step < 2) draw(out, 0, 0, 0);
      else if (step === 2) draw(out, 0, grow(0.2, 1.6), 1);
      else draw(out, 0, 1, final ? 0.5 : 0.75);

      if (step < 3) draw(back, 0, 0, 0);
      else if (step === 3) draw(back, 0, grow(0.1, 1.1), 1);
      else draw(back, 0, 1, final ? 0.4 : 0.6);

      if (step < 5) draw(share, 0, 0, 0);
      else if (step === 5) draw(share, 0, grow(0.2, 1.5), 1);
      else draw(share, 0, 1, 0.6);

      // Queue → batch → database, looping while its step is on screen.
      const loop = step === 4 ? (local % 3) / 3 : step > 4 ? 1 : 0;
      cubes.forEach((c, i) => {
        const appear = clamp01((loop - i * 0.08) / 0.08);
        const merge = clamp01((loop - 0.5) / 0.15);
        c.visible = step === 4 && appear > 0 && merge < 1;
        c.position.set(0, 0.26 + i * 0.14 * (1 - merge), 0);
        c.scale.setScalar(appear * (1 - merge));
      });
      const sink = clamp01((loop - 0.65) / 0.25);
      batch.visible = step === 4 && loop > 0.6 && sink < 1;
      batch.position.y = 0.4 - sink * 0.32;
      batch.rotation.y = loop * 6;
      const flash = step === 4 ? Math.max(0, 1 - Math.abs(loop - 0.92) * 8) : 0;
      db.visible = step >= 4;
      dbMat.emissiveIntensity = 0.15 + flash * 2;

      // The live bar grows once the event reaches the dashboard.
      const barK = step < 5 ? 0 : step === 5 ? grow(1.6, 0.8) : 1;
      bars.forEach((b, i) => {
        const hgt =
          i === 3
            ? 0.18 + barK * (b.userData.h as number)
            : (b.userData.h as number);
        b.scale.y = hgt;
        b.position.y = hgt / 2;
        b.visible = step >= 5;
      });

      // Background traffic: faint dashes heading to the server.
      const bgOpacity = step === 0 ? 0.5 : final ? 0.85 : 0.12;
      for (const a of bg) {
        a.phase = (a.phase + dt * a.speed * (final ? 1.4 : 1)) % 1.4;
        const head = a.phase;
        draw(
          a,
          head - 0.35,
          Math.min(1, head),
          head > 1 ? bgOpacity * (1.4 - head) * 2.5 : bgOpacity
        );
        a.head.visible = a.head.visible && bgOpacity > 0.3;
      }

      gl.render();
      const l = project(labelPoints, camera, w, h);
      camDir.copy(camera.position).normalize();
      for (const k of Object.keys(
        labelPoints
      ) as (keyof typeof labelPoints)[]) {
        const facing = labelPoints[k].clone().normalize().dot(camDir) > 0.25;
        l[k].on = l[k].on && facing;
      }
      onLabels(l);
    },
    dispose() {
      pointer.dispose();
      gl.dispose(scene);
    },
  };
}
