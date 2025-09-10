"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";

type Point = { x: number; y: number };

type VfxAPI = {
  confettiBurst(opts?: { power?: number }): void;
  ringBurstAt(x: number, y: number): void;
  ringBurstAtFromEl(target: Element | string): void;
  shake(target: Element | string, ms?: number): void;
  glowOnce(target: Element | string): void;
};

const VfxCtx = createContext<VfxAPI | null>(null);

function ensureStylesInjected() {
  if (document.getElementById("wc-vfx-styles")) return;
  const style = document.createElement("style");
  style.id = "wc-vfx-styles";
  style.textContent = `
@keyframes wc-ring {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.9; }
  80% { opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}
@keyframes wc-confetti {
  0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--dx, 80px), var(--dy, 120px)) rotate(360deg); opacity: 0; }
}
.wc-ring {
  position: fixed; left: 0; top: 0; width: 80px; height: 80px;
  border: 3px solid rgba(0,0,0,0.35); border-radius: 9999px;
  pointer-events: none; z-index: 9999; animation: wc-ring 500ms ease-out forwards;
}
.wc-glow-once {
  box-shadow: 0 0 0 0 rgba(99,102,241,0.0);
  transition: box-shadow 120ms ease-in-out;
}
.wc-glow-once.__go {
  box-shadow: 0 0 0 4px rgba(99,102,241,0.35), 0 0 0 8px rgba(99,102,241,0.15);
}
.wc-shake {
  animation: wc-shake-anim var(--dur, 250ms) ease both;
}
@keyframes wc-shake-anim {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}
.wc-confetti-piece {
  position: fixed; width: 8px; height: 8px; border-radius: 2px;
  background: rgba(0,0,0,0.6); pointer-events: none; z-index: 9999;
  animation: wc-confetti var(--t, 700ms) ease-out forwards;
}`;
  document.head.appendChild(style);
}

function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function toElement(t: Element | string): Element | null {
  if (typeof t === "string") return document.querySelector(t);
  return t ?? null;
}

export function VfxProvider({ children }: { children: React.ReactNode }) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ensureStylesInjected();
  }, []);

  const api: VfxAPI = {
    confettiBurst(opts) {
      const power = Math.max(0.5, Math.min(3, opts?.power ?? 1));
      const count = Math.round(12 * power);
      const { innerWidth: W, innerHeight: H } = window;
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < count; i++) {
        const n = document.createElement("div");
        n.className = "wc-confetti-piece";
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 80 + Math.random() * 60 * power;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist + 30;
        n.style.left = `${cx}px`;
        n.style.top = `${cy}px`;
        n.style.setProperty("--dx", `${dx}px`);
        n.style.setProperty("--dy", `${dy}px`);
        n.style.setProperty("--t", `${600 + Math.random() * 400}ms`);
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 1200);
      }
    },

    ringBurstAt(x, y) {
      const n = document.createElement("div");
      n.className = "wc-ring";
      n.style.left = `${x}px`;
      n.style.top = `${y}px`;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 600);
    },

    ringBurstAtFromEl(target) {
      const el = toElement(target);
      if (!el) return;
      const { x, y } = centerOf(el);
      this.ringBurstAt(x, y);
    },

    shake(target, ms = 250) {
      const el = toElement(target);
      if (!el) return;
      el.classList.add("wc-shake");
      el.style.setProperty("--dur", `${ms}ms`);
      const clear = () => {
        el.classList.remove("wc-shake");
        el.removeEventListener("animationend", clear);
      };
      el.addEventListener("animationend", clear);
    },

    glowOnce(target) {
      const el = toElement(target);
      if (!el) return;
      el.classList.add("wc-glow-once");
      // kick in on next frame to trigger transition
      requestAnimationFrame(() => {
        el.classList.add("__go");
        setTimeout(() => {
          el.classList.remove("__go");
          // keep base class (harmless), or remove both:
          // el.classList.remove("wc-glow-once");
        }, 250);
      });
    },
  };

  return (
    <VfxCtx.Provider value={api}>
      {children}
    </VfxCtx.Provider>
  );
}

export function useVFX(): VfxAPI {
  const ctx = useContext(VfxCtx);
  if (!ctx) {
    // Safe no-op fallback so app doesn't crash if provider isn't mounted
    return {
      confettiBurst: () => {},
      ringBurstAt: () => {},
      ringBurstAtFromEl: () => {},
      shake: () => {},
      glowOnce: () => {},
    };
  }
  return ctx;
}
