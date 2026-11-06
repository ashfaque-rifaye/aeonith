// Motion layer: GSAP + ScrollTrigger reveals, split-text headlines, cursor spotlight, 3D tilt, magnetic buttons, Lenis smooth scroll.
import { gsap } from "/vendor/gsap/index.js";
import { ScrollTrigger } from "/vendor/gsap/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
let lenis = null;

export async function initSmoothScroll() {
  if (reduce || !fine || lenis) return;
  try {
    const { default: Lenis } = await import("/vendor/lenis/lenis.mjs");
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch { /* smooth scroll is optional */ }
}
export function scrollTop() { lenis ? lenis.scrollTo(0, { immediate: true }) : scrollTo({ top: 0 }); }

/** Split [data-split] text into word/char spans (keeps nested markup like .grad spans). */
function split(el) {
  if (el.dataset.splitDone) return [];
  el.dataset.splitDone = "1";
  const chars = [];
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((word) => {
          if (/^\s+$/.test(word)) { frag.append(word); return; }
          const w = document.createElement("span");
          w.className = "sw";
          [...word].forEach((ch) => { const c = document.createElement("span"); c.className = "sc"; c.textContent = ch; w.append(c); chars.push(c); });
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
  };
  walk(el);
  return chars;
}

export function animateView(root) {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  if (reduce) return;

  const intro = [];
  const small = innerWidth < 720;
  root.querySelectorAll("[data-split]").forEach((el) => {
    if (small) { intro.push(gsap.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" })); return; }
    const chars = split(el);
    intro.push(gsap.fromTo(chars, { yPercent: 110, opacity: 0, rotateX: -60 }, { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: "expo.out", stagger: 0.018, delay: 0.05 }));
  });

  root.querySelectorAll("[data-fade]").forEach((el, i) =>
    intro.push(gsap.fromTo(el, { y: 18, opacity: 0, filter: "blur(6px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out", delay: 0.25 + i * 0.08 })));
  // Safety net: if the browser throttles animation frames (background tab, low-power mode), never leave text invisible.
  setTimeout(() => intro.forEach((t) => t.progress(1)), 2600);

  const reveals = root.querySelectorAll("[data-reveal]");
  reveals.forEach((el) => {
    gsap.fromTo(el, { y: 36, opacity: 0, scale: 0.985 }, {
      y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });

  root.querySelectorAll("[data-stagger]").forEach((wrap) => {
    gsap.fromTo(wrap.children, { y: 24, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.06,
      scrollTrigger: { trigger: wrap, start: "top 92%", once: true },
    });
  });

  root.querySelectorAll("[data-float]").forEach((el, i) =>
    gsap.to(el, { y: i % 2 ? 10 : -10, duration: 3 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));

  root.querySelectorAll("[data-parallax]").forEach((el) =>
    gsap.to(el, { yPercent: Number(el.dataset.parallax) || -20, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }));

  ScrollTrigger.refresh();
}

/** Delegated pointer effects (installed once). */
export function installPointerFX() {
  if (!fine || reduce) return;
  // cursor spotlight on glass cards
  addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".card, .bid, .cat, .job, .vault");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  // 3D tilt
  addEventListener("pointermove", (e) => {
    const el = e.target.closest?.("[data-tilt]");
    document.querySelectorAll("[data-tilt].tilting").forEach((t) => { if (t !== el) { t.classList.remove("tilting"); gsap.to(t, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" }); } });
    if (!el) return;
    el.classList.add("tilting");
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 800, duration: 0.4, ease: "power2.out" });
  }, { passive: true });

  // magnetic primary buttons
  addEventListener("pointermove", (e) => {
    const b = e.target.closest?.(".btn.primary, .magnet");
    document.querySelectorAll(".magnet-on").forEach((m) => { if (m !== b) { m.classList.remove("magnet-on"); gsap.to(m, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, .4)" }); } });
    if (!b || b.disabled) return;
    b.classList.add("magnet-on");
    const r = b.getBoundingClientRect();
    gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.3, ease: "power2.out" });
  }, { passive: true });
}

/** Count a money element up from 0. */
export function countUp(el, cents, fmt) {
  if (reduce || !cents) { el.innerHTML = fmt(cents); return; }
  const o = { v: 0 };
  gsap.to(o, { v: cents, duration: 1.1, ease: "power3.out", onUpdate: () => { el.innerHTML = fmt(Math.round(o.v)); } });
}

export { gsap };
