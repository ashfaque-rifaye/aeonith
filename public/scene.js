// The Aeonith Claw: a real-time three.js scene. A mechanical claw *holds* your card. That's the product:
// money held, not paid. Its grip follows the real job: open (no hold) → gripping (held) → sparks (sealed bids)
// → scan line (proof) → claw opens and the card drops to the pro (paid) or slides back out (released).
import * as THREE from "three";
import { RoomEnvironment } from "/vendor/three/examples/jsm/environments/RoomEnvironment.js";

export function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch { return false; }
}

const BRONZE = new THREE.Color("#3b1a10");
const EMBER = new THREE.Color("#ff6a2b");
const AMBER = new THREE.Color("#ffb067");
const ROSE = new THREE.Color("#ff3d4f");

/**
 * @param {HTMLElement} host
 * @param {{ state?: string, compact?: boolean, amount?: string, label?: string, agents?: number, winner?: number }} opts
 */
export function createVault(host, opts = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = !!opts.compact;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(compact ? 34 : 30, 1, 0.1, 100);
  const camZ = compact ? 8 : 12.2;
  camera.position.set(0, compact ? 0.2 : 0.6, camZ);

  // warm studio lighting (red/orange like the reference)
  scene.add(new THREE.HemisphereLight(0xffd2b0, 0x4a0a05, 0.6));
  const key = new THREE.DirectionalLight(0xffb27a, 3.2); key.position.set(-4, 6, 6); key.castShadow = !compact; scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3a1a, 4); rim.position.set(5, 2, -4); scene.add(rim);
  const top = new THREE.PointLight(0xffe2c8, 30, 14); top.position.set(0, 4.5, 3); scene.add(top);

  const metal = new THREE.MeshPhysicalMaterial({ color: BRONZE, metalness: 1, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const metalDark = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1c0c08"), metalness: 0.9, roughness: 0.4 });
  const steel = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#8a5a44"), metalness: 1, roughness: 0.22 });

  const rig = new THREE.Group();
  scene.add(rig);

  // --- column + hub ---
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 4.2, 48), metal);
  column.position.y = 4.4;
  rig.add(column);
  for (let i = 0; i < 4; i++) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.5 - i * 0.02, 0.5 - i * 0.02, 0.16, 48), metalDark);
    collar.position.y = 2.75 + i * 0.55;
    rig.add(collar);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.6, 0.55, 48), metal);
  hub.position.y = 2.3;
  rig.add(hub);
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.4, 32), steel);
  hubCap.position.y = 1.95;
  rig.add(hubCap);
  for (let i = 0; i < 8; i++) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), steel);
    const a = (i / 8) * Math.PI * 2;
    bolt.position.set(Math.cos(a) * 0.62, 2.55, Math.sin(a) * 0.62);
    rig.add(bolt);
  }

  // --- fingers: root (around hub) → upper pivot → knuckle → lower pivot → tip ---
  const fingers = [];
  const fingerDefs = [{ ry: 0 }, { ry: Math.PI }, { ry: -Math.PI / 2, short: true }];
  for (const d of fingerDefs) {
    const root = new THREE.Group();
    root.position.y = 2.2;
    root.rotation.y = d.ry;
    rig.add(root);
    const upper = new THREE.Group();
    upper.position.x = 0.6;
    root.add(upper);
    const len1 = d.short ? 0.9 : 1.35;
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, len1, 0.36), metal);
    seg1.position.y = -len1 / 2;
    upper.add(seg1);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len1 * 0.9, 12), steel);
    piston.position.set(0.22, -len1 / 2, 0);
    upper.add(piston);
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.44, 28), metalDark);
    knuckle.rotation.x = Math.PI / 2;
    knuckle.position.y = -len1;
    upper.add(knuckle);
    const lower = new THREE.Group();
    lower.position.y = -len1;
    upper.add(lower);
    const len2 = d.short ? 0.8 : 1.45;
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, len2, 0.32), metal);
    seg2.position.y = -len2 / 2;
    lower.add(seg2);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 16), metalDark);
    tip.position.y = -len2 - 0.15;
    tip.rotation.z = Math.PI;
    lower.add(tip);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x120604, roughness: 0.9 }));
    pad.position.set(-0.11, -len2 + 0.2, 0);
    lower.add(pad);
    [seg1, seg2, knuckle, tip].forEach((m) => { m.castShadow = true; });
    fingers.push({ upper, lower, short: !!d.short });
  }

  // --- the card (your money) ---
  const card = new THREE.Group();
  rig.add(card);
  const W = 2.6, H = 1.64, R = 0.13;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2 + R, -H / 2);
  shape.lineTo(W / 2 - R, -H / 2); shape.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
  shape.lineTo(W / 2, H / 2 - R); shape.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
  shape.lineTo(-W / 2 + R, H / 2); shape.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
  shape.lineTo(-W / 2, -H / 2 + R); shape.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
  const cardBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3 }),
    new THREE.MeshPhysicalMaterial({ color: 0x1a0a07, metalness: 0.4, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.18 }),
  );
  cardBody.position.z = -0.025;
  cardBody.castShadow = true;
  card.add(cardBody);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshPhysicalMaterial({ map: cardTexture(opts), transparent: true, roughness: 0.35, clearcoat: 1, metalness: 0.2 }));
  face.position.z = 0.047;
  card.add(face);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.02), new THREE.MeshPhysicalMaterial({ color: 0xe0904a, metalness: 1, roughness: 0.25 }));
  chip.position.set(-0.78, 0.12, 0.06);
  card.add(chip);
  card.position.set(0, -0.25, 0.05);

  // scan line (proof)
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, 0.03), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scan.position.z = 0.09;
  card.add(scan);

  // --- sealed-bid sparks orbiting (provider agents) ---
  const sparks = [];
  const N = Math.max(3, Math.min(opts.agents ?? 3, 6));
  for (let i = 0; i < N; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: i % 2 ? AMBER : EMBER, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    s.scale.setScalar(0.55);
    s.userData = { a: (i / N) * Math.PI * 2, r: 2.4 + (i % 2) * 0.4, y: -0.3 + (i % 3) * 0.35 };
    rig.add(s);
    sparks.push(s);
  }

  // ground glow + shadow catcher


  // --- state machine ---
  let state = opts.state || "held";
  let winner = opts.winner ?? 0;
  let open = targetOpen(state);
  let cardY = card.position.y, cardX = 0, cardO = 1;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    look.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  addEventListener("pointermove", onMove, { passive: true });

  function targetOpen(s) { return s === "idle" ? 0.5 : s === "settled" || s === "released" ? 0.55 : 0.05; }

  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the claw framed on tall/narrow hosts
    camera.position.z = camZ * Math.max(1, 0.9 / Math.min(1.2, camera.aspect));
    camera.lookAt(0, compact ? 0.35 : 0.55, 0);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true, raf = 0, last = performance.now();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = performance.now(); loop(); } }, { threshold: 0.01 });
  io.observe(host);

  function apply(dt, now) {
    const t = now / 1000;
    const k = Math.min(1, dt * 3);
    open += (targetOpen(state) - open) * k;
    fingers.forEach((f) => {
      if (f.short) { f.upper.rotation.z = open * 0.8 + 0.05; f.lower.rotation.z = -0.6 + open * 0.3; }
      else { f.upper.rotation.z = open + 0.5; f.lower.rotation.z = -0.5 + open * 0.3; }
    });

    // card motion per state
    const sway = state === "idle" ? 0 : Math.sin(t * 1.1) * 0.035;
    let ty = -0.25, tx = 0, to = 1;
    if (state === "idle") { ty = -0.6; to = 0.0; }
    if (state === "settled") { ty = -4.2; to = 0; }
    if (state === "released") { tx = -4.5; to = 0; }
    cardY += (ty - cardY) * Math.min(1, dt * (state === "settled" ? 1.4 : 2.5));
    cardX += (tx - cardX) * Math.min(1, dt * 1.6);
    cardO += (to - cardO) * Math.min(1, dt * 2);
    card.position.set(cardX, cardY, 0.05);
    card.rotation.z = sway;
    card.rotation.y = Math.sin(t * 0.6) * 0.06 + (state === "bidding" ? Math.sin(t * 2.2) * 0.05 : 0);
    card.visible = cardO > 0.02;
    card.traverse((o) => { if (o.material && "opacity" in o.material && o !== scan) { o.material.transparent = true; o.material.opacity = cardO; } });

    // bids: warm sparks orbit and dive toward the card
    sparks.forEach((s, i) => {
      const u = s.userData;
      const active = state === "bidding" || state === "awarded";
      const isWin = state === "awarded" && i === winner;
      u.a += dt * (0.7 + i * 0.07);
      const r = state === "bidding" ? u.r * (0.75 + 0.25 * Math.sin(t * 2 + i)) : u.r;
      s.position.set(Math.cos(u.a) * r, u.y + Math.sin(t * 1.5 + i) * 0.2, Math.sin(u.a) * r * 0.5 + 0.6);
      const target = active ? (state === "awarded" ? (isWin ? 1 : 0.15) : 0.9) : 0;
      s.material.opacity += (target - s.material.opacity) * Math.min(1, dt * 3);
      s.scale.setScalar(isWin ? 0.9 + Math.sin(t * 5) * 0.1 : 0.55);
    });

    // proof: amber scan line sweeps the card
    scan.material.opacity += ((state === "proving" ? 0.95 : 0) - scan.material.opacity) * Math.min(1, dt * 4);
    scan.position.y = Math.sin(t * 2) * (H / 2 - 0.05);

    // subtle hover/parallax
    look.x += (look.tx - look.x) * Math.min(1, dt * 2.5);
    look.y += (look.ty - look.y) * Math.min(1, dt * 2.5);
    rig.rotation.y = look.x * 0.32 + Math.sin(t * 0.35) * 0.06;
    rig.rotation.x = look.y * 0.08;
    rig.position.y = Math.sin(t * 0.9) * 0.05;
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
  if (reduce) { open = targetOpen(state); for (let i = 0; i < 60; i++) apply(0.05, performance.now()); }
  loop();

  return {
    setState(s, w) { state = s; if (w !== undefined) winner = w; },
    burst() {},
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map && m.map !== _glow) m.map.dispose(); m.dispose?.(); }); });
      renderer.dispose(); pmrem.dispose();
      renderer.domElement.remove();
    },
  };
}

/** Card face: brand mark, amount and status drawn on a canvas. */
function cardTexture(opts) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 646;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 1024, 646);
  grd.addColorStop(0, "#241009"); grd.addColorStop(1, "#140705");
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 646);
  // diagonal ember stripe (echoes the reference's red mark)
  g.save();
  g.beginPath(); g.moveTo(640, 646); g.lineTo(820, 646); g.lineTo(1024, 300); g.lineTo(1024, 120); g.closePath();
  const s = g.createLinearGradient(640, 646, 1024, 120); s.addColorStop(0, "#7a0f08"); s.addColorStop(1, "#d7301a");
  g.fillStyle = s; g.fill();
  g.beginPath(); g.moveTo(860, 646); g.lineTo(920, 646); g.lineTo(1024, 470); g.lineTo(1024, 370); g.closePath();
  g.fillStyle = "#a3170c"; g.fill();
  g.restore();
  g.fillStyle = "rgba(255,255,255,.92)";
  g.font = "600 44px 'Inter Tight', 'Geist', system-ui, sans-serif";
  g.fillText("AEONITH", 70, 110);
  g.fillStyle = "rgba(255,200,170,.75)";
  g.font = "500 26px 'Geist Mono', ui-monospace, monospace";
  g.fillText((opts.label || "HELD · NOT PAID").toUpperCase(), 70, 470);
  g.fillStyle = "#fff";
  g.font = "600 92px 'Inter Tight', 'Geist', system-ui, sans-serif";
  g.fillText(opts.amount || "$0.00", 66, 570);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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
