// app/components/SfxUnlock.tsx
"use client";

import { useEffect } from "react";

export default function SfxUnlock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unlocked = false;
    let ctx: AudioContext | null = null;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;

      // mark global so play() can bail fast until unlocked
      (window as any).__sfx_unlocked = true;

      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC && !ctx) {
          ctx = new AC();
          // don't await; avoid blocking UI thread
          ctx.resume().catch(() => {});
          // tiny 10ms inaudible blip
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.01);
        }
      } catch {}

      // nudge HTMLAudio silently (non-blocking)
      try {
        const a = new Audio("/sfx/accept.mp3");
        a.volume = 0.01;
        a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
      } catch {}

      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    // only pointer/touch so we never touch keyboard events
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  return null;
}
