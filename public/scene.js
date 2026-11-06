// The Aeonith Vault: a real-time three.js scene that visualises the market loop.
// An iridescent glass crystal holds your money (a glowing coin). Provider agents orbit it; sealed bids travel in as light
// pulses; proof is a scan ring; payment sends the coin to the winning agent. State is driven by the real job status.
import * as THREE from "three";
import { RoomEnvironment } from "/vendor/three/examples/jsm/environments/RoomEnvironment.js";

const LIME = new THREE.Color("#c8f560");
const MINT = new THREE.Color("#4ff0b4");
const VIOLET = new THREE.Color("#8b7bff");
const AMBER = new THREE.Color("#ffbf5a");
const CYAN = new THREE.Color("#52d6ff");
const RED = new THREE.Color("#ff6b6b");
const GREY = new THREE.Color("#5b6660");

export function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch { return false; }
}

/**
 * @param {HTMLElement} host element to fill
 * @param {{ state?: string, agents?: number, winner?: number, compact?: boolean }} opts
 */
export function createVault(host, opts = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = !!opts.compact;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(compact ? 38 : 34, 1, 0.1, 100);
  camera.position.set(0, 0.3, compact ? 8.6 : 10.8);

  const root = new THREE.Group();
  scene.add(root);

  // --- lights (for the coin + nodes) ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.PointLight(LIME, 30, 20); key.position.set(3, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(VIOLET, 40, 20); rim.position.set(-4, -1, -2); scene.add(rim);

  // --- the vault: iridescent glass crystal ---
  const crystalGeo = new THREE.IcosahedronGeometry(1.25, 0);
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2fff0, metalness: 0, roughness: 0.1, transmission: 1, thickness: 2.2, ior: 1.5,
    attenuationColor: new THREE.Color("#1f3d12"), attenuationDistance: 3.2, specularIntensity: 1,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [120, 520], clearcoat: 1, clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  root.add(crystal);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeo), new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.35 }));
  crystal.add(edges);

  // --- the money: a glowing coin inside ---
  const coinMat = new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.25 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.09, 64), coinMat);
  coin.rotation.x = Math.PI / 2;
  root.add(coin);
  const coinGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: LIME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
  coinGlow.scale.setScalar(1.7);
  root.add(coinGlow);

  // --- orbit rings ---
  const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.008, 8, 220), ringMat(LIME, 0.55));
  ring1.rotation.x = Math.PI / 2.25;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.006, 8, 220), ringMat(VIOLET, 0.45));
  ring2.rotation.x = Math.PI / 1.85; ring2.rotation.y = 0.5;
  root.add(ring1, ring2);

  // --- provider agent nodes on ring1 ---
  const N = Math.max(1, Math.min(opts.agents ?? 3, 6));
  const nodeColors = [AMBER, CYAN, VIOLET, MINT, AMBER, CYAN];
  const nodes = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), new THREE.MeshStandardMaterial({ color: nodeColors[i], emissive: nodeColors[i], emissiveIntensity: 2 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: nodeColors[i], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    halo.scale.setScalar(0.9);
    g.add(m, halo);
    g.userData = { phase: (i / N) * Math.PI * 2, color: nodeColors[i], mesh: m, halo };
    nodes.push(g);
    ring1.add(g);
  }

  // --- bid pulses (pooled) ---
  const pulses = [];
  const pulseMat = new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(pulseMat.clone());
    s.scale.setScalar(0.35);
    s.visible = false;
    s.userData = { t: 0, from: new THREE.Vector3(), ctrl: new THREE.Vector3(), to: new THREE.Vector3(), speed: 0.6 };
    root.add(s);
    pulses.push(s);
  }

  // --- scan ring (proof) ---
  const scan = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.012, 8, 160), ringMat(AMBER, 0.0));
  scan.rotation.x = Math.PI / 2;
  root.add(scan);

  // --- star dust ---
  const dustN = compact ? 500 : 1400;
  const pos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    const r = 4 + Math.random() * 14, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6, r * Math.sin(ph) * Math.sin(th) - 4], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.03, color: 0xcfe9d5, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  // --- state ---
  let state = opts.state || "held";
  let winner = opts.winner ?? 0;
  let tSettle = 0;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    look.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    look.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  addEventListener("pointermove", onMove, { passive: true });

  const fire = (fromNode) => {
    const p = pulses.find((x) => !x.visible);
    if (!p) return;
    const wp = new THREE.Vector3();
    fromNode.getWorldPosition(wp);
    root.worldToLocal(wp);
    p.userData.from.copy(wp);
    p.userData.to.set(0, 0, 0);
    p.userData.ctrl.copy(wp).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.2 * (Math.random() - 0.3), 0));
    p.userData.t = 0;
    p.userData.speed = 0.5 + Math.random() * 0.4;
    p.material.color.copy(fromNode.userData.color);
    p.visible = true;
  };

  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true, raf = 0, last = performance.now(), fireClock = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }, { threshold: 0.01 });
  io.observe(host);

  function apply(dt, time) {
    const t = time / 1000;
    // idle motion
    crystal.rotation.y += dt * 0.18;
    crystal.rotation.x = Math.sin(t * 0.4) * 0.12;
    coin.rotation.z += dt * (state === "bidding" ? 1.6 : 0.7);
    ring1.rotation.z += dt * 0.12;
    ring2.rotation.z -= dt * 0.07;
    dust.rotation.y += dt * 0.01;
    nodes.forEach((n, i) => {
      const a = n.userData.phase;
      n.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0);
      const isWin = state !== "bidding" && state !== "held" && state !== "idle" && i === winner;
      const s = isWin ? 1.6 + Math.sin(t * 4) * 0.15 : state === "bidding" ? 1 + Math.sin(t * 6 + i) * 0.2 : 0.85;
      n.scale.setScalar(s);
      n.userData.halo.material.opacity = isWin ? 1 : state === "bidding" ? 0.85 : 0.35;
    });

    // per-state targets
    const coinOn = state !== "released" && state !== "idle";
    const targetEm = state === "idle" ? 0.15 : state === "released" ? 0 : state === "settled" ? 2.2 : 1.4;
    coinMat.emissiveIntensity += (targetEm - coinMat.emissiveIntensity) * Math.min(1, dt * 3);
    coinMat.color.lerp(state === "released" ? RED : state === "idle" ? GREY : LIME, dt * 2);
    coinMat.emissive.lerp(state === "released" ? RED : state === "idle" ? GREY : LIME, dt * 2);
    coinGlow.material.opacity += ((coinOn ? (state === "settled" ? 0.8 : 0.55) : 0.06) - coinGlow.material.opacity) * Math.min(1, dt * 3);
    edges.material.color.lerp(state === "proving" ? AMBER : state === "released" ? RED : LIME, dt * 2);
    edges.material.opacity = 0.25 + (state === "bidding" ? Math.abs(Math.sin(t * 3)) * 0.4 : 0.15);

    // bidding: agents fire sealed-bid pulses into the vault
    if (state === "bidding" && !reduce) {
      fireClock += dt;
      if (fireClock > 0.28) { fireClock = 0; fire(nodes[(Math.random() * nodes.length) | 0]); }
    }
    pulses.forEach((p) => {
      if (!p.visible) return;
      const u = p.userData;
      u.t += dt * u.speed;
      const k = Math.min(1, u.t);
      const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      p.position.set(a * u.from.x + b * u.ctrl.x + c * u.to.x, a * u.from.y + b * u.ctrl.y + c * u.to.y, a * u.from.z + b * u.ctrl.z + c * u.to.z);
      p.material.opacity = Math.sin(k * Math.PI);
      if (k >= 1) p.visible = false;
    });

    // proving: an amber scan ring sweeps the vault
    scan.material.opacity += ((state === "proving" ? 0.9 : 0) - scan.material.opacity) * Math.min(1, dt * 4);
    scan.position.y = Math.sin(t * 1.6) * 1.2;
    scan.scale.setScalar(1 - Math.abs(scan.position.y) * 0.25);

    // settled: the coin travels to the winning agent; released: it fades upward
    if (state === "settled") {
      tSettle = Math.min(1, tSettle + dt * 0.45);
      const wn = nodes[winner] ?? nodes[0];
      const wp = new THREE.Vector3(); wn.getWorldPosition(wp); root.worldToLocal(wp);
      const e = 1 - Math.pow(1 - tSettle, 3);
      coin.position.lerpVectors(new THREE.Vector3(0, 0, 0), wp, e);
      coinGlow.position.copy(coin.position);
      coin.scale.setScalar(1 - e * 0.5);
    } else if (state === "released") {
      coin.position.y += (2.2 - coin.position.y) * dt;
      coin.position.x *= 0.95; coin.position.z *= 0.95;
      coinGlow.position.copy(coin.position);
    } else {
      coin.position.multiplyScalar(Math.max(0, 1 - dt * 4));
      coin.scale.setScalar(1);
      coinGlow.position.copy(coin.position);
    }

    // camera parallax
    look.x += (look.tx - look.x) * Math.min(1, dt * 2.5);
    look.y += (look.ty - look.y) * Math.min(1, dt * 2.5);
    root.rotation.y = look.x * 0.35;
    root.rotation.x = look.y * 0.18;
  }

  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    apply(dt, now);
    renderer.render(scene, camera);
    if (!reduce) raf = requestAnimationFrame(loop);
  }
  const onVis = () => { if (!document.hidden && !raf) { last = performance.now(); loop(); } };
  document.addEventListener("visibilitychange", onVis);
  loop();

  return {
    setState(s, w) { state = s; if (w !== undefined) winner = w; if (reduce) { apply(0.016, performance.now()); renderer.render(scene, camera); } },
    burst(n = 6) { for (let i = 0; i < n; i++) setTimeout(() => fire(nodes[i % nodes.length]), i * 90); },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose(); pmrem.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); }); });
      renderer.domElement.remove();
    },
  };
}

let _glow;
function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}
