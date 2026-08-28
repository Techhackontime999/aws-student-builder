"use client";

import {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";

type EmoteKind = "hover" | "click" | "section";

interface Emote {
  id: number;
  emoji: string;
  kind: EmoteKind;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  size: number;
  delay: number;
  duration: number;
}

const pool: Record<EmoteKind, string[]> = {
  hover: ["☁️", "💾", "⚡", "🛡️", "🧠", "🚀", "🔥", "💡", "🌩️", "⚙️"],
  click: ["🚀", "⚡", "🔥", "💥", "💾", "💡", "⚙️", "🌩️", "✨", "📦"],
  section: ["☁️", "🌩️", "🧠", "💡", "🚀", "🛡️", "⚙️", "📦", "💾", "🔥", "🛰️", "⚡"],
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const k = 1.2;

const HOVER_SELECTOR =
  "a, button, [role='button'], input, textarea, select, label, .team-card, .focus-card, .why-item, .social-card, .resource-column, .principle, .tabs, .stat";

const SECTION_MAP: Array<[string, string[]]> = [
  ["#about", ["👋", "🌱", "☁️"]],
  ["#events", ["📅", "🎯", "💡"]],
  ["#team", ["🤝", "⚡", "💛"]],
  ["#projects", ["🛠️", "🚀", "📦"]],
  ["#resources", ["📚", "📖", "🧠"]],
  ["#community", ["🤝", "💬", "💡"]],
  [".enquiry", ["📮", "📧", "☁️"]],
  [".join-cta", ["☁️", "🚀", "✨"]],
];

interface ParticleDef {
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  duration: number;
}

function burstDefs(size = 2): ParticleDef[] {
  const defs: ParticleDef[] = [];
  for (let i = 0; i < size; i++) {
    const angle = rand(-20, -70); // upward fan (degrees)
    const a = (angle * Math.PI) / 180;
    const dist = rand(34, 66);
    const rot = rand(-160, 160);
    defs.push({
      dx: Math.cos(a) * dist * (i % 2 === 0 ? 1 : -1),
      dy: Math.sin(a) * dist,
      rotate: rot,
      scale: rand(0.85, 1.25),
      duration: rand(0.6, 0.95),
    });
  }
  return defs;
}

export const CursorEmotes: FC = () => {
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const idRef = useRef(0);
  const posRef = useRef({ x: 0, y: 0 });
  const lastHover = useRef(0);
  const lastClick = useRef(0);
  const reduced = useRef(false);

  const make = useCallback(
    (
      emoji: string,
      kind: EmoteKind,
      x: number,
      y: number,
      defs: ParticleDef[],
      baseSize = 26,
    ) => {
      const base = idRef.current + 1;
      const created: Emote[] = defs.map((d, i) => ({
        id: base + i,
        emoji,
        kind,
        x,
        y,
        dx: d.dx,
        dy: d.dy,
        rotate: d.rotate,
        scale: d.scale,
        size: baseSize - (kind === "click" ? i * 3 : 0) + rand(-2, 2),
        delay: i * 0.03,
        duration: d.duration,
      }));
      idRef.current = base + defs.length - 1;
      setEmotes((prev) => [...prev.slice(-20), ...created]);
      // remove exactly the ones we just added
      const ids = new Set(created.map((c) => c.id));
      window.setTimeout(
        () => setEmotes((prev) => prev.filter((e) => !ids.has(e.id))),
        Math.max(...defs.map((d) => d.duration)) * 1000 + 400,
      );
    },
    [],
  );

  // onClick + onMouseover + section observer
  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !el.closest?.(HOVER_SELECTOR)) return;
      const now = performance.now();
      if (!reduced.current && now - lastHover.current < 300) return;
      lastHover.current = now;
      createHoverParticles(posRef.current.x, posRef.current.y, make);
    };

    const onClick = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastClick.current < 140) return;
      lastClick.current = now;
      make(
        pick(pool.click),
        "click",
        e.clientX,
        e.clientY,
        burstDefs(reduced.current ? 1 : 3),
        28,
      );
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("click", onClick);

    // Section entry reveal
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const r = target.getBoundingClientRect();
          let emojis = ["☁️", "✨"];
          for (const [sel, list] of SECTION_MAP) {
            if (target.matches(sel)) {
              emojis = list;
              break;
            }
          }
          createSectionParticles(
            pick(emojis),
            r.left + r.width * 0.5,
            r.top + Math.min(70, r.height * 0.2),
            make,
          );
        }
      },
      { threshold: 0.45 },
    );

    const selectors = [
      ...SECTION_MAP.map(([s]) => s),
      ".hero",
      ".focus",
      ".why",
      ".stats",
    ];
    const els: HTMLElement[] = [];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        els.push(el);
        observer.observe(el);
      });
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("click", onClick);
      observer.disconnect();
    };
  }, [make]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9996,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {emotes.map((e) => (
          <Particle key={e.id} emote={e} />
        ))}
      </AnimatePresence>
    </div>
  );
};

/** A single animated emote particle driven by framer-motion keyframes. */
const Particle: FC<{ emote: Emote }> = ({ emote }) => (
  <motion.span
    className="cursor-emote"
    style={{
      left: emote.x,
      top: emote.y,
    }}
    initial={{
      scale: 0,
      rotate: emote.kind === "click" ? rand(-30, 30) : -8,
      opacity: 0,
      x: 0,
      y: 0,
    }}
    animate={{
      scale: [0, emote.scale * k, 1],
      opacity: [0, 1, 1, 0],
      rotate: emote.rotate,
      x: emote.dx,
      y: emote.dy,
    }}
    exit={{ opacity: 0, scale: 0.6 }}
    transition={{
      delay: emote.delay,
      duration: emote.duration,
      times: [0, 0.25, 1],
      ease: [0.16, 1, 0.3, 1],
    }}
  >
    <span className="cursor-emote-emoji" style={{ fontSize: emote.size }}>
      {emote.emoji}
    </span>
  </motion.span>
);

/** Creates a gentle "probe bubble" cluster for hovers. */
function createHoverParticles(
  x: number,
  y: number,
  make: (
    emoji: string,
    kind: EmoteKind,
    x: number,
    y: number,
    defs: ParticleDef[],
    baseSize?: number,
  ) => void,
) {
  const angle = (-35 * Math.PI) / 180;
  make(
    pick(pool.hover),
    "hover",
    x,
    y - 6,
    [
      {
        dx: Math.cos(angle) * 22,
        dy: Math.sin(angle) * 22 - 16,
        rotate: rand(-18, 18),
        scale: 1.15,
        duration: 1.0,
      },
    ],
    24,
  );
}

/** Creates a celebratory pop for section entry. */
function createSectionParticles(
  emoji: string,
  x: number,
  y: number,
  make: (
    emoji: string,
    kind: EmoteKind,
    x: number,
    y: number,
    defs: ParticleDef[],
    baseSize?: number,
  ) => void,
) {
  make(
    emoji,
    "section",
    x,
    y,
    [
      {
        dx: rand(-8, 8),
        dy: -34,
        rotate: rand(-14, 14),
        scale: 1.25,
        duration: 1.15,
      },
      {
        dx: rand(-34, 34),
        dy: -10,
        rotate: rand(-60, 60),
        scale: 0.9,
        duration: 1.0,
      },
    ],
    30,
  );
}
