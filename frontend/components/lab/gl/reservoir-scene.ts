// "The queue is a reservoir": traffic pours through a glass pipe into a glass
// tank. A spike raises the level; a valve at the bottom lets out batches at a
// steady pace into the database tower, so the tower never sees the spike.
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

const TANK = { x: 0, r: 1.9, h: 4.2, base: 0.25 };
const PIPE_Y = TANK.base + TANK.h + 0.55;
const GATE_X = -6.2;
const VALVE_X = 3.4;
const TOWER_X = 7.4;
const CAPACITY = 2400; // events the tank shows full
const DRAIN = 400; // events per second the worker writes

type Drop = { x: number; y: number; vx: number; vy: number; inPipe: boolean };
type Batch = { t: number };

export type ReservoirHandle = SceneHandle & {
  spike: () => void;
  stats: () => { inflow: number; queued: number; outflow: number };
};

export function createReservoir(
  canvas: HTMLCanvasElement,
  onLabels: (l: Labels) => void
): ReservoirHandle {
  const gl = makeRenderer(canvas, {
    shadows: true,
    bloom: { strength: 0.6, radius: 0.5, threshold: 0.9 },
  });
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(gl.renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(1.5, 6.2, 21);
  gl.attach(scene, camera);

  // The scroll tour: camera target, distance and swing, one per step.
  const SHOTS = [
    { tx: -0.6, ty: 2.1, dist: 25, az: 0, el: 0.26 },
    { tx: -8, ty: PIPE_Y - 0.6, dist: 10, az: -0.35, el: 0.18 },
    { tx: GATE_X, ty: PIPE_Y - 0.4, dist: 9, az: -0.15, el: 0.15 },
    { tx: TANK.x, ty: 2.6, dist: 13, az: 0.05, el: 0.22 },
    { tx: VALVE_X + 0.6, ty: 1.3, dist: 9, az: 0.3, el: 0.25 },
    { tx: TOWER_X, ty: 2, dist: 11, az: 0.4, el: 0.24 },
    { tx: -0.6, ty: 2.1, dist: 25, az: 0, el: 0.26 },
  ];
  const view = { ...SHOTS[0] };
  let shot = 0;
  const pointer = trackPointer(canvas);
  let fit = 1; // narrow screens pull back

  scene.add(new THREE.HemisphereLight(0xfff4ea, 0x161616, 0.6));
  const sun = new THREE.DirectionalLight(0xffeedd, 2.0);
  sun.position.set(5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -12;
  sc.right = 12;
  sc.top = 10;
  sc.bottom = -6;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const back = new THREE.PointLight(0xf26a2e, 6, 14, 1.6);
  back.position.set(0, 2.4, -2.2);
  scene.add(back);

  const metal = new THREE.MeshStandardMaterial({
    color: 0x3c3a38,
    roughness: 0.4,
    metalness: 0.6,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x242322,
    roughness: 0.7,
  });
  // Plain clear glass: a faint tint plus environment reflections. (Real
  // transmission blows out to white under bloom at this size.)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd8e4e6,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.8,
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

  // Floor.
  const floor = add(
    new RoundedBoxGeometry(22, 0.4, 7, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.9 }),
    0.6,
    -0.2
  );
  floor.castShadow = false;

  // Inflow pipe across the top-left into the tank.
  const pipeLen = TANK.x - 0.6 - -10;
  const pipe = add(
    new THREE.CylinderGeometry(0.32, 0.32, pipeLen, 32, 1, true),
    glass,
    -10 + pipeLen / 2,
    PIPE_Y
  );
  pipe.rotation.z = Math.PI / 2;
  pipe.castShadow = false;
  for (const x of [-9.2, GATE_X - 1.6, -2.4]) {
    add(
      new RoundedBoxGeometry(0.22, PIPE_Y, 0.22, 2, 0.05),
      metal,
      x,
      PIPE_Y / 2
    );
  }
  // Elbow down into the tank.
  const elbow = add(
    new THREE.TorusGeometry(0.6, 0.32, 16, 32, Math.PI / 2),
    glass,
    TANK.x - 0.6,
    PIPE_Y - 0.6
  );
  elbow.rotation.z = Math.PI / 2;
  elbow.castShadow = false;

  // Ingest ring on the pipe.
  const ring = add(
    new THREE.TorusGeometry(0.5, 0.07, 16, 48),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: SOFT,
      emissiveIntensity: 2.6,
    }),
    GATE_X,
    PIPE_Y
  );
  ring.rotation.y = Math.PI / 2;

  // Tank.
  add(
    new THREE.CylinderGeometry(TANK.r + 0.15, TANK.r + 0.25, 0.25, 48),
    metal,
    TANK.x,
    0.12
  );
  add(
    new THREE.TorusGeometry(TANK.r + 0.02, 0.06, 12, 64),
    metal,
    TANK.x,
    TANK.base + TANK.h
  ).rotation.x = Math.PI / 2;
  const tank = add(
    new THREE.CylinderGeometry(TANK.r, TANK.r, TANK.h, 64, 1, true),
    glass,
    TANK.x,
    TANK.base + TANK.h / 2
  );
  tank.castShadow = false;
  for (let i = 1; i < 4; i++) {
    const tick = add(
      new THREE.TorusGeometry(TANK.r + 0.005, 0.012, 6, 64, Math.PI * 0.4),
      new THREE.MeshBasicMaterial({ color: 0x8a8580 }),
      TANK.x,
      TANK.base + (TANK.h * i) / 4
    );
    tick.rotation.set(Math.PI / 2, 0, Math.PI * 0.3);
    tick.castShadow = false;
  }
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0x2a1206,
    emissive: HOT,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  const liquid = add(
    new THREE.CylinderGeometry(TANK.r - 0.06, TANK.r - 0.06, 1, 64),
    liquidMat,
    TANK.x,
    TANK.base + 0.5
  );
  liquid.castShadow = false;
  const surface = add(
    new THREE.CircleGeometry(TANK.r - 0.06, 64),
    new THREE.MeshStandardMaterial({
      color: 0x3a1a0a,
      emissive: SOFT,
      emissiveIntensity: 0.45,
      roughness: 0.6,
    }),
    TANK.x,
    TANK.base + 1
  );
  surface.rotation.x = -Math.PI / 2;
  surface.castShadow = false;

  // Outflow: a valve and a short run of pipe to the tower.
  const outY = 0.7;
  const outPipe = add(
    new THREE.CylinderGeometry(0.26, 0.26, TOWER_X - TANK.x - TANK.r - 0.8, 24),
    metal,
    (TANK.x + TANK.r + TOWER_X - 0.8) / 2,
    outY
  );
  outPipe.rotation.z = Math.PI / 2;
  add(new RoundedBoxGeometry(0.7, 0.7, 0.7, 3, 0.08), dark, VALVE_X, outY);
  const wheel = add(
    new THREE.TorusGeometry(0.34, 0.05, 10, 32),
    metal,
    VALVE_X,
    outY + 0.7
  );
  wheel.rotation.x = Math.PI / 2;
  add(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
    metal,
    VALVE_X,
    outY + 0.45
  );
  const valveLamp = add(
    new THREE.SphereGeometry(0.08, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: SOFT,
      emissiveIntensity: 2.5,
    }),
    VALVE_X,
    outY,
    0.37
  );
  const valveLampMat = valveLamp.material as THREE.MeshStandardMaterial;

  // Database tower: stacked disks that light up as batches land.
  const DISKS = 7;
  const disks: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < DISKS; i++) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x2c2a28,
      emissive: HOT,
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.3,
    });
    add(
      new THREE.CylinderGeometry(1.0, 1.0, 0.42, 48),
      m,
      TOWER_X,
      0.3 + i * 0.5
    );
    disks.push(m);
  }
  add(
    new THREE.CylinderGeometry(1.05, 1.05, 0.08, 48),
    metal,
    TOWER_X,
    0.3 + DISKS * 0.5 - 0.2
  );

  // Particles: drops in the pipe and falling into the tank.
  const MAX_DROPS = 260;
  const dropMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.075, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: HOT,
      emissiveIntensity: 3,
    }),
    MAX_DROPS
  );
  dropMesh.frustumCulled = false;
  scene.add(dropMesh);
  const replyMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: COOL,
      emissiveIntensity: 2.6,
    }),
    40
  );
  replyMesh.frustumCulled = false;
  scene.add(replyMesh);
  const batchMesh = new THREE.InstancedMesh(
    new RoundedBoxGeometry(0.32, 0.32, 0.32, 2, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: SOFT,
      emissiveIntensity: 2.4,
    }),
    12
  );
  batchMesh.frustumCulled = false;
  scene.add(batchMesh);
  // Bubbles inside the liquid, for life.
  const BUBBLES = 70;
  const bubbleMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.04, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffd9b8,
      transparent: true,
      opacity: 0.5,
    }),
    BUBBLES
  );
  bubbleMesh.frustumCulled = false;
  scene.add(bubbleMesh);
  const bubbles = Array.from({ length: BUBBLES }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random() * (TANK.r - 0.3),
    y: Math.random(),
    s: 0.2 + Math.random() * 0.4,
  }));

  const drops: Drop[] = [];
  const replies: { x: number; life: number }[] = [];
  const batches: Batch[] = [];
  let queued = 900;
  let spawn = 0;
  let spikeT = -99;
  let flushT = 0;
  let inflow = 0;
  let outflow = 0;
  let level = 0.3;
  let towerLit = 0;
  const dummy = new THREE.Object3D();

  const labelPoints = {
    traffic: new THREE.Vector3(-8.6, PIPE_Y + 0.9, 0),
    ingest: new THREE.Vector3(GATE_X, PIPE_Y + 0.95, 0),
    queue: new THREE.Vector3(TANK.x, TANK.base + TANK.h + 1.4, 0),
    worker: new THREE.Vector3(VALVE_X, outY + 1.35, 0),
    db: new THREE.Vector3(TOWER_X, 0.3 + DISKS * 0.5 + 0.55, 0),
  };

  let w = 1;
  let h = 1;

  return {
    spike() {
      spikeT = performance.now() / 1000;
    },
    stats: () => ({ inflow, queued, outflow }),
    setShot(v) {
      shot = v;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
      gl.setSize(w, h);
      camera.aspect = w / h;
      // Pull back on narrow screens so the whole rig stays in frame.
      camera.fov = 30;
      fit = w / h < 1 ? 2.1 : w / h < 1.5 ? 1.35 : 1;
      camera.updateProjectionMatrix();
    },
    frame(dt, t) {
      const want = shotAt(SHOTS, shot);
      for (const k of ["tx", "ty", "dist", "az", "el"] as const)
        view[k] = damp(view[k], want[k], 3.5, dt || 1);
      const az = view.az + pointer.x * 0.08;
      const el = view.el - pointer.y * 0.04;
      const d = view.dist * fit;
      camera.position.set(
        view.tx + Math.sin(az) * Math.cos(el) * d,
        view.ty + Math.sin(el) * d,
        Math.cos(az) * Math.cos(el) * d
      );
      camera.lookAt(view.tx, view.ty, 0);
      const now = performance.now() / 1000;
      const k = now - spikeT;
      const spike = k >= 0 && k < 7 ? Math.sin((k / 7) * Math.PI) : 0;
      inflow = 220 * (1 + Math.sin(t * 0.9) * 0.15) + spike * 2600;
      queued += inflow * dt;

      // Visual drops scale with traffic.
      spawn += dt * (6 + inflow / 45);
      while (spawn >= 1 && drops.length < MAX_DROPS) {
        spawn -= 1;
        drops.push({
          x: -10 + Math.random() * 0.3,
          y: PIPE_Y + (Math.random() - 0.5) * 0.36,
          vx: 3.5 + Math.random() * 1.5,
          vy: 0,
          inPipe: true,
        });
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        if (d.inPipe) {
          const before = d.x;
          d.x += d.vx * dt * (1 + spike * 0.8);
          if (
            before < GATE_X &&
            d.x >= GATE_X &&
            Math.random() < 0.5 &&
            replies.length < 40
          ) {
            replies.push({ x: GATE_X, life: 0 });
          }
          if (d.x >= TANK.x - 0.6) {
            d.inPipe = false;
            d.x = TANK.x - 0.2 + (Math.random() - 0.5) * 0.4;
            d.y = PIPE_Y - 0.7;
            d.vy = -1;
            d.vx = (Math.random() - 0.5) * 0.4;
          }
        } else {
          d.vy -= 9.8 * dt;
          d.y += d.vy * dt;
          d.x += d.vx * dt;
          if (d.y <= TANK.base + level) drops.splice(i, 1);
        }
      }
      for (let i = replies.length - 1; i >= 0; i--) {
        replies[i].x -= dt * 7;
        replies[i].life += dt;
        if (replies[i].x < -10) replies.splice(i, 1);
      }

      // The worker drains at a fixed pace, in batches.
      flushT += dt;
      if (flushT >= 0.5) {
        flushT -= 0.5;
        const take = Math.min(queued, DRAIN / 2);
        queued -= take;
        outflow = take * 2;
        if (take > 0 && batches.length < 12) batches.push({ t: 0 });
        valveLampMat.emissiveIntensity = 5;
      }
      valveLampMat.emissiveIntensity +=
        (2.5 - valveLampMat.emissiveIntensity) * Math.min(1, dt * 5);
      wheel.rotation.z += dt * 0.8;
      for (let i = batches.length - 1; i >= 0; i--) {
        batches[i].t += dt * 0.7;
        if (batches[i].t >= 1) {
          batches.splice(i, 1);
          towerLit = 1;
        }
      }
      towerLit = Math.max(0, towerLit - dt * 1.5);

      // Liquid level follows the queue, eased.
      const target = Math.min(
        TANK.h - 0.3,
        0.25 + (queued / CAPACITY) * (TANK.h - 0.5)
      );
      level += (target - level) * Math.min(1, dt * 2);
      liquid.scale.y = level;
      liquid.position.y = TANK.base + level / 2;
      surface.position.y = TANK.base + level + Math.sin(t * 3) * 0.015;
      surface.rotation.y = t * 0.2;
      liquidMat.emissiveIntensity = 0.7 + spike * 0.4;
      back.intensity = 5 + spike * 6;

      disks.forEach((m, i) => {
        const lit =
          i === DISKS - 1 ? towerLit : 0.05 + 0.03 * Math.sin(t * 2 + i);
        m.emissiveIntensity = lit * 1.4;
      });

      // Instances.
      let n = 0;
      for (const d of drops) {
        dummy.position.set(
          d.x,
          d.y,
          d.inPipe ? 0 : (Math.random() - 0.5) * 0.02
        );
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        dropMesh.setMatrixAt(n++, dummy.matrix);
      }
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (; n < MAX_DROPS; n++) dropMesh.setMatrixAt(n, dummy.matrix);
      dropMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < 40; i++) {
        const r = replies[i];
        if (r) {
          dummy.position.set(
            r.x,
            PIPE_Y + 0.6 + Math.sin(r.life * 6) * 0.05,
            0.1
          );
          dummy.scale.setScalar(1);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        replyMesh.setMatrixAt(i, dummy.matrix);
      }
      replyMesh.instanceMatrix.needsUpdate = true;

      const runStart = TANK.x + TANK.r + 0.2;
      for (let i = 0; i < 12; i++) {
        const b = batches[i];
        if (b) {
          const e = b.t;
          const x = runStart + (TOWER_X - runStart) * Math.min(1, e / 0.75);
          const y =
            e < 0.75
              ? outY + 0.5
              : outY + 0.5 + ease((e - 0.75) / 0.25) * (3.4 - outY);
          dummy.position.set(x, y, 0);
          dummy.rotation.set(0, e * 4, 0);
          dummy.scale.setScalar(e > 0.95 ? (1 - e) * 20 : 1);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        batchMesh.setMatrixAt(i, dummy.matrix);
      }
      batchMesh.instanceMatrix.needsUpdate = true;
      dummy.rotation.set(0, 0, 0);

      bubbles.forEach((b, i) => {
        b.y = (b.y + dt * b.s * 0.25) % 1;
        const y = TANK.base + 0.1 + b.y * (level - 0.15);
        dummy.position.set(
          TANK.x + Math.cos(b.a + t * 0.2) * b.r,
          y,
          Math.sin(b.a + t * 0.2) * b.r
        );
        dummy.scale.setScalar(level > 0.4 ? 1 : 0);
        dummy.updateMatrix();
        bubbleMesh.setMatrixAt(i, dummy.matrix);
      });
      bubbleMesh.instanceMatrix.needsUpdate = true;

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
