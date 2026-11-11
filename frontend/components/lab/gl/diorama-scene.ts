// "Pulse in miniature": an isometric diorama of the pipeline. Event pills
// leave a laptop, pass the ingest gate (a cyan reply flies back), line up on
// a conveyor (the queue), get pressed into crates of 100 by the worker, drop
// into a silo (the database) and grow a bar on the dashboard.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  COOL,
  HOT,
  SOFT,
  damp,
  ease,
  makeRenderer,
  project,
  shotAt,
  trackPointer,
  type Labels,
  type SceneHandle,
} from "./common";

const X = {
  laptop: -8.6,
  gate: -5.2,
  belt0: -3.7,
  belt1: 1.5,
  worker: 3.1,
  silo: 5.9,
  screen: 8.8,
};
const PILL_Y = 0.5;
const SPACING = 0.34;
const PER_CRATE = 4; // pills per crate; each pill stands for 25 events

type Pill = {
  x: number;
  y: number;
  z: number;
  stage: "go" | "belt";
  t: number;
};
type Reply = { t: number };
type Crate = { t: number };

export type DioramaHandle = SceneHandle & {
  spike: () => void;
  stats: () => { queued: number; stored: number };
};

export function createDiorama(
  canvas: HTMLCanvasElement,
  onLabels: (l: Labels) => void
): DioramaHandle {
  const gl = makeRenderer(canvas, {
    shadows: true,
    bloom: { strength: 0.55, radius: 0.45, threshold: 0.92 },
  });
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(gl.renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 100);
  camera.position.set(13, 12.5, 17);
  camera.lookAt(0, 0.6, 0);
  gl.attach(scene, camera);

  // The scroll tour: where the camera looks and how close, one per step.
  const SHOTS = [
    { x: 0, zoom: 1, az: 0 },
    { x: -7.4, zoom: 2.1, az: -0.12 },
    { x: -5, zoom: 2.1, az: -0.06 },
    { x: -1.2, zoom: 1.65, az: 0 },
    { x: 3.2, zoom: 2.1, az: 0.06 },
    { x: 5.9, zoom: 2.1, az: 0.1 },
    { x: 8.2, zoom: 2.1, az: 0.14 },
    { x: 0, zoom: 1, az: 0 },
  ];
  const DIR = new THREE.Vector3(13, 12.5, 17).normalize();
  const view = { ...SHOTS[0] };
  let shot = 0;
  const pointer = trackPointer(canvas);
  const look = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Light.
  scene.add(new THREE.HemisphereLight(0xfff4ea, 0x1a1a1a, 0.7));
  const sun = new THREE.DirectionalLight(0xffeedd, 2.2);
  sun.position.set(6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -14;
  sc.right = 14;
  sc.top = 9;
  sc.bottom = -9;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fb8c0, 0.6);
  rim.position.set(-8, 6, -10);
  scene.add(rim);

  // Materials.
  const slab = new THREE.MeshStandardMaterial({
    color: 0x1f1f1f,
    roughness: 0.85,
  });
  const body = new THREE.MeshStandardMaterial({
    color: 0x3a3836,
    roughness: 0.55,
    metalness: 0.15,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x232221,
    roughness: 0.6,
    metalness: 0.2,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: SOFT,
    emissiveIntensity: 2.2,
  });
  const pillMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: HOT,
    emissiveIntensity: 2.4,
  });
  const replyMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: COOL,
    emissiveIntensity: 2.2,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a28,
    emissive: SOFT,
    emissiveIntensity: 1.3,
    roughness: 0.4,
  });

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z = 0
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const rbox = (w: number, h: number, d: number, r = 0.08) =>
    new RoundedBoxGeometry(w, h, d, 3, r);

  // Ground slab with a faint dot grid.
  const ground = add(rbox(22.5, 0.5, 7.4, 0.25), slab, 0, -0.25);
  ground.castShadow = false;
  const dots: number[] = [];
  for (let x = -10.5; x <= 10.5; x += 0.6)
    for (let z = -3.2; z <= 3.2; z += 0.6) dots.push(x, 0.005, z);
  scene.add(
    new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(dots, 3)
      ),
      new THREE.PointsMaterial({
        color: 0x4a4744,
        size: 0.04,
        sizeAttenuation: true,
      })
    )
  );

  // 1. Laptop.
  add(rbox(2.3, 0.12, 1.6, 0.05), body, X.laptop, 0.06, 0.2);
  const lid = new THREE.Group();
  lid.position.set(X.laptop, 0.12, -0.58);
  lid.rotation.x = -0.22;
  const lidShell = new THREE.Mesh(rbox(2.3, 1.5, 0.08, 0.05), body);
  lidShell.position.y = 0.75;
  lidShell.castShadow = true;
  lid.add(lidShell);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0c,
    emissive: 0x1d1d1d,
    emissiveIntensity: 1,
  });
  const lidScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 1.25),
    screenMat
  );
  lidScreen.position.set(0, 0.76, 0.045);
  lid.add(lidScreen);
  [
    [-0.55, 1.15, 0.8, 0.12, 0x6a6560],
    [0, 0.88, 1.8, 0.07, 0x3a3836],
    [0, 0.72, 1.8, 0.07, 0x3a3836],
    [-0.6, 0.42, 0.5, 0.3, 0x4a4643],
    [0, 0.42, 0.5, 0.3, 0x4a4643],
    [0.6, 0.42, 0.5, 0.3, 0x4a4643],
  ].forEach(([x, y, w, h, c]) => {
    const block = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: c })
    );
    block.position.set(x, y, 0.05);
    lid.add(block);
  });
  scene.add(lid);

  // 2. Ingest gate.
  add(rbox(0.32, 2.0, 0.32), body, X.gate, 1.0, 0.85);
  add(rbox(0.32, 2.0, 0.32), body, X.gate, 1.0, -0.85);
  add(rbox(0.42, 0.32, 2.1), body, X.gate, 2.1);
  const gateStrip = add(
    rbox(0.1, 0.06, 1.6, 0.02),
    accent.clone(),
    X.gate,
    1.92
  );
  const gateMat = gateStrip.material as THREE.MeshStandardMaterial;

  // 3. Conveyor: a dark bed, rollers, and moving slats.
  const beltLen = X.belt1 - X.belt0 + 0.6;
  const beltMid = (X.belt0 + X.belt1) / 2;
  add(rbox(beltLen, 0.3, 1.1, 0.1), dark, beltMid, 0.2);
  for (const x of [X.belt0 - 0.2, X.belt1 + 0.2]) {
    const r = add(
      new THREE.CylinderGeometry(0.17, 0.17, 1.15, 20),
      body,
      x,
      0.24
    );
    r.rotation.x = Math.PI / 2;
  }
  const SLATS = 30;
  const slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, 0.02, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.6 }),
    SLATS
  );
  slats.receiveShadow = true;
  scene.add(slats);
  let beltOffset = 0;

  // 4. Worker: a press with a piston and a status light.
  add(rbox(1.7, 1.7, 1.5, 0.12), body, X.worker, 0.85);
  add(rbox(1.0, 0.5, 1.52, 0.05), dark, X.worker, 0.42);
  const piston = add(rbox(0.6, 0.9, 0.6, 0.06), dark, X.worker, 2.2);
  const lamp = add(
    new THREE.SphereGeometry(0.09, 16, 12),
    accent.clone(),
    X.worker + 0.55,
    1.5,
    0.76
  );
  const lampMat = lamp.material as THREE.MeshStandardMaterial;

  // 5. Silo: a glass shell with a glowing fill level.
  add(new THREE.CylinderGeometry(1.0, 1.0, 0.18, 40), body, X.silo, 0.09);
  const fill = add(
    new THREE.CylinderGeometry(0.82, 0.82, 1, 40),
    new THREE.MeshStandardMaterial({
      color: 0x241208,
      emissive: HOT,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
    X.silo,
    0.6
  );
  const shell = add(
    new THREE.CylinderGeometry(0.92, 0.92, 2.6, 40, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      transmission: 0.9,
      thickness: 0.4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
    X.silo,
    1.48
  );
  shell.castShadow = false;
  for (const y of [0.6, 1.3, 2.0, 2.78])
    add(
      new THREE.TorusGeometry(0.93, 0.035, 8, 48),
      body,
      X.silo,
      y
    ).rotation.x = Math.PI / 2;
  let level = 0.25;

  // 6. Dashboard screen with bars.
  add(rbox(0.2, 1.0, 0.2), body, X.screen, 0.5, -0.4);
  add(rbox(1.2, 0.08, 0.8), body, X.screen, 0.04, -0.4);
  add(rbox(2.6, 1.8, 0.12, 0.08), body, X.screen, 1.85, -0.4);
  add(
    new THREE.PlaneGeometry(2.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0c, emissive: 0x161616 }),
    X.screen,
    1.85,
    -0.33
  ).castShadow = false;
  const bars: THREE.Mesh[] = [];
  const barBase = [0.35, 0.5, 0.42, 0.62, 0.55, 0.7, 0.3];
  barBase.forEach((h, i) => {
    const last = i === barBase.length - 1;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1, 0.04),
      last
        ? new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: SOFT,
            emissiveIntensity: 2.4,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0x5a5550,
            emissiveIntensity: 1,
          })
    );
    b.position.set(X.screen - 0.95 + i * 0.32, 1.15 + h / 2, -0.31);
    b.scale.y = h;
    scene.add(b);
    bars.push(b);
  });
  let liveBar = barBase[barBase.length - 1];

  // Moving things.
  const MAX_PILLS = 64;
  const pillMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.11, 0.18, 4, 10),
    pillMat,
    MAX_PILLS
  );
  pillMesh.castShadow = true;
  pillMesh.frustumCulled = false;
  scene.add(pillMesh);
  const replyMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.07, 0.1, 4, 8),
    replyMat,
    24
  );
  replyMesh.frustumCulled = false;
  scene.add(replyMesh);
  const crateMesh = new THREE.InstancedMesh(
    rbox(0.46, 0.46, 0.46, 0.06),
    crateMat,
    8
  );
  crateMesh.castShadow = true;
  crateMesh.frustumCulled = false;
  scene.add(crateMesh);

  const pills: Pill[] = [];
  const queue: Pill[] = [];
  const replies: Reply[] = [];
  const crates: Crate[] = [];
  let spawnAcc = 0;
  let spikeT = -99;
  let press = 0;
  let pressCooldown = 0;
  let stored = 1240;
  let gateFlash = 0;

  const dummy = new THREE.Object3D();
  const labelPoints = {
    laptop: new THREE.Vector3(X.laptop, -0.3, 1.6),
    gate: new THREE.Vector3(X.gate, -0.3, 1.6),
    queue: new THREE.Vector3(beltMid, -0.3, 1.6),
    worker: new THREE.Vector3(X.worker, -0.3, 1.6),
    silo: new THREE.Vector3(X.silo, -0.3, 1.6),
    screen: new THREE.Vector3(X.screen, -0.3, 1.6),
  };

  let w = 1;
  let h = 1;

  return {
    spike() {
      spikeT = performance.now() / 1000;
    },
    stats: () => ({ queued: queue.length * 25, stored }),
    setShot(v) {
      shot = v;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
      gl.setSize(w, h);
      const aspect = w / h;
      // Fit the whole slab horizontally, and keep enough height for the gate.
      const viewW = aspect < 1 ? 26 : 23.5;
      const viewH = Math.max(viewW / aspect, 9.5);
      const width = viewH * aspect;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = viewH / 2;
      camera.bottom = -viewH / 2;
      camera.updateProjectionMatrix();
    },
    frame(dt, t) {
      const want = shotAt(SHOTS, shot);
      for (const k of ["x", "zoom", "az"] as const)
        view[k] = damp(view[k], want[k], 4, dt || 1);
      look.set(view.x, 0.6, 0);
      dir.copy(DIR).applyAxisAngle(up, view.az + pointer.x * 0.08);
      camera.position.copy(look).addScaledVector(dir, 30);
      camera.position.y += pointer.y * -0.6;
      camera.lookAt(look);
      if (camera.zoom !== view.zoom) {
        camera.zoom = view.zoom;
        camera.updateProjectionMatrix();
      }
      const now = performance.now() / 1000;
      const k = now - spikeT;
      const spike =
        k >= 0 && k < 6 ? Math.sin((Math.min(k, 6) / 6) * Math.PI) : 0;
      const rate = 3.2 + spike * 9; // pills per second

      // Spawn at the laptop.
      spawnAcc += dt * rate;
      while (spawnAcc >= 1 && pills.length + queue.length < MAX_PILLS) {
        spawnAcc -= 1;
        pills.push({
          x: X.laptop + 0.9,
          y: PILL_Y + 0.1,
          z: 0,
          stage: "go",
          t: 0,
        });
      }

      // Pills travelling to the gate, then onto the belt.
      for (let i = pills.length - 1; i >= 0; i--) {
        const p = pills[i];
        p.x += dt * 3.4;
        if (p.x > X.gate - 0.05 && p.t === 0) {
          p.t = 1;
          gateFlash = 1;
          if (replies.length < 24) replies.push({ t: 0 });
        }
        p.y = PILL_Y + (p.x > X.gate ? 0.02 : 0.1);
        if (p.x >= X.belt0) {
          pills.splice(i, 1);
          p.stage = "belt";
          queue.push(p);
        }
      }

      // Belt: each pill slides toward its slot at the far end.
      beltOffset = (beltOffset + dt * 0.9) % 0.2;
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        const slot = X.belt1 - i * SPACING;
        p.x = Math.min(slot, p.x + dt * 1.8);
        p.y = PILL_Y;
      }

      // Worker presses a crate when it has pills, about once a second.
      pressCooldown -= dt;
      if (press > 0) press = Math.max(0, press - dt * 2.2);
      if (
        pressCooldown <= 0 &&
        queue.length > 0 &&
        queue[0].x >= X.belt1 - 0.05
      ) {
        const take = Math.min(PER_CRATE, queue.length);
        queue.splice(0, take);
        press = 1;
        pressCooldown = 1.1;
        crates.push({ t: 0 });
        lampMat.emissiveIntensity = 5;
      }
      lampMat.emissiveIntensity +=
        (2.2 - lampMat.emissiveIntensity) * Math.min(1, dt * 4);

      // Replies arc back to the laptop.
      for (let i = replies.length - 1; i >= 0; i--) {
        replies[i].t += dt * 1.6;
        if (replies[i].t >= 1) replies.splice(i, 1);
      }
      // Crates arc from the worker into the silo.
      for (let i = crates.length - 1; i >= 0; i--) {
        crates[i].t += dt * 1.1;
        if (crates[i].t >= 1) {
          crates.splice(i, 1);
          stored += 100;
          level = Math.min(2.3, level + 0.035);
          liveBar = Math.min(1.25, liveBar + 0.04);
          if (liveBar >= 1.25) liveBar = 0.3;
          if (level >= 2.3) level = 0.5;
        }
      }

      gateFlash = Math.max(0, gateFlash - dt * 3);
      gateMat.emissiveIntensity = 2 + gateFlash * 3;
      piston.position.y =
        2.2 - ease(press > 0.5 ? (1 - press) * 2 : press * 2) * 0.55;

      // Write instances.
      let n = 0;
      for (const p of [...pills, ...queue]) {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        pillMesh.setMatrixAt(n++, dummy.matrix);
      }
      for (; n < MAX_PILLS; n++) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        pillMesh.setMatrixAt(n, dummy.matrix);
      }
      pillMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < 24; i++) {
        const r = replies[i];
        if (r) {
          const e = r.t;
          dummy.position.set(
            X.gate + (X.laptop + 0.6 - X.gate) * e,
            PILL_Y + 0.9 + Math.sin(Math.PI * e) * 1.2,
            0.35
          );
          dummy.rotation.set(0, 0, Math.PI / 2);
          dummy.scale.setScalar(1);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        replyMesh.setMatrixAt(i, dummy.matrix);
      }
      replyMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < 8; i++) {
        const c = crates[i];
        if (c) {
          const e = ease(c.t);
          dummy.position.set(
            X.worker + 0.9 + (X.silo - X.worker - 0.9) * e,
            0.9 + Math.sin(Math.PI * e) * 2.2 + (1 - e) * 0 + e * 1.6,
            0
          );
          dummy.rotation.set(e * 2, e * 3, 0);
          dummy.scale.setScalar(1 - Math.max(0, e - 0.85) * 4);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        crateMesh.setMatrixAt(i, dummy.matrix);
      }
      crateMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < SLATS; i++) {
        let x =
          X.belt0 - 0.2 + ((i * (beltLen / SLATS) + beltOffset * 5) % beltLen);
        if (x > X.belt1 + 0.2) x -= beltLen;
        dummy.position.set(x, 0.36, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        slats.setMatrixAt(i, dummy.matrix);
      }
      slats.instanceMatrix.needsUpdate = true;

      fill.scale.y = level;
      fill.position.y = 0.18 + level / 2;
      const live = bars[bars.length - 1];
      live.scale.y = liveBar;
      live.position.y = 1.15 + liveBar / 2;
      screenMat.emissiveIntensity = 1 + Math.sin(t * 2) * 0.05;

      gl.render();
      onLabels(project(labelPoints, camera, w, h));
    },
    dispose() {
      pointer.dispose();
      pmrem.dispose();
      gl.dispose(scene);
    },
  };
}
