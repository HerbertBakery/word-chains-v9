"use client";
import { useEffect } from "react";

/**
 * SfxUnlock
 * - Safely initializes a shared AudioContext on first user interaction
 * - Plays a tiny inaudible blip to "unlock" audio on iOS/Safari
 * - No UI; just mount this somewhere once (e.g., _app or layout)
 */
export default function SfxUnlock() {
  useEffect(() => {
    // Guard SSR and unsupported environments
    if (typeof window === "undefined") return;

    // If we've already unlocked, skip
    if ((window as any).__sfx_unlocked) return;

    // Create (or reuse) a shared AudioContext
    const getCtx = (): AudioContext | null => {
      try {
        const AC =
          (window as any).AudioContext ||
          (window as any).webkitAudioContext;
        if (!AC) return null;

        // Reuse one context across the app
        const existing = (window as any).__wc_audio_ctx as AudioContext | undefined;
        if (existing) return existing;

        const created: AudioContext = new AC();
        (window as any).__wc_audio_ctx = created;
        return created;
      } catch {
        return null;
      }
    };

    const unlockOnce = () => {
      const ctx = getCtx();
      if (!ctx) return; // Hard bail if no WebAudio

      // Resume without blocking UI
      ctx.resume().catch(() => {});

      // 10ms blip at near-zero gain to satisfy iOS user-gesture requirement
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      try {
        osc.start();
        setTimeout(() => {
          try { osc.stop(); } catch {}
          try { osc.disconnect(); } catch {}
          try { gain.disconnect(); } catch {}
        }, 10);
      } catch {
        // ignore
      }

      (window as any).__sfx_unlocked = true;
      // Remove listeners after success
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
      window.removeEventListener("touchstart", unlockOnce);
    };

    // Try to unlock on first interaction
    window.addEventListener("pointerdown", unlockOnce, { once: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
    window.addEventListener("touchstart", unlockOnce, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
      window.removeEventListener("touchstart", unlockOnce);
    };
  }, []);

  return null;
}
