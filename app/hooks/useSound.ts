// app/hooks/useSound.ts
"use client";

import { useEffect, useMemo, useRef } from "react";

type Cat = "name" | "animal" | "country" | "food" | "brand" | "screen" | "same";
type SoundKey =
  | "accept"
  | "invalid"
  | "warning"
  | "unlock"
  | "mission"
  | "coin"
  | "gameover"
  | "bigword"
  | "used"
  | "typing"
  | `power_${Cat}_ready`
  | `power_${Cat}_use`;

// Known shortcuts; everything else will fall back to `/sfx/${key}.mp3`
const SRC: Partial<Record<string, string>> = {
  accept:  "/sfx/accept.mp3",
  invalid: "/sfx/invalid.mp3",
  warning: "/sfx/warning.mp3",
  unlock:  "/sfx/unlock.mp3",
  mission: "/sfx/mission.mp3",
  coin:    "/sfx/coin.mp3",
  gameover:"/sfx/gameover.mp3",
  typing:  "/sfx/typing.mp3",

  // If you kept the file name "over-2000.mp3" map bigword -> over-2000
  bigword: "/sfx/bigword.mp3", // change to "/sfx/over-2000.mp3" if you didn't rename
};

type Pool = { els: HTMLAudioElement[]; i: number };
function makeAudio(src: string) {
  const a = new Audio(src);
  a.preload = "auto";
  (a as any).playsInline = true;
  a.crossOrigin = "anonymous";
  return a;
}

// Fallback resolver: if not in SRC, try `/sfx/${key}.mp3`
function resolveSrc(key: string): string | undefined {
  if (SRC[key]) return SRC[key]!;
  // allow dynamic power_* & any other direct filename match
  return `/sfx/${key}.mp3`;
}

export function useSound() {
  const htmlPoolsRef = useRef<Map<string, Pool>>(new Map());
  const buffersRef   = useRef<Map<string, AudioBuffer>>(new Map());
  const decodingRef  = useRef<Map<string, Promise<void>>>(new Map()); // avoid duplicate decodes
  const acRef        = useRef<AudioContext | null>(null);
  const unlockedRef  = useRef(false);

  // Pre-decode a few frequent SFX for snappy Safari
  const KEYS_TO_PREDECODE = useMemo<string[]>(
    () => ["accept", "invalid", "typing", "warning", "coin"].filter((k) => !!resolveSrc(k)),
    []
  );

  const getHtmlPool = (key: string, size = 4) => {
    const src = resolveSrc(key);
    if (!src) return null;
    const pools = htmlPoolsRef.current;
    let p = pools.get(key);
    if (!p) {
      const els = Array.from({ length: size }, () => makeAudio(src));
      p = { els, i: 0 };
      pools.set(key, p);
    }
    return p;
  };

  const ensureDecoded = async (key: string) => {
    const ac = acRef.current;
    if (!ac) return; // no AC yet; we'll play via HTMLAudio
    if (buffersRef.current.has(key)) return; // already decoded
    if (decodingRef.current.has(key)) return decodingRef.current.get(key); // in-flight

    const src = resolveSrc(key);
    if (!src) return;

    const p = (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const ab = await res.arrayBuffer();
        const buf = await ac.decodeAudioData(ab);
        buffersRef.current.set(key, buf);
      } catch {
        // ignore; HTMLAudio fallback will still work
      }
    })();

    decodingRef.current.set(key, p);
    return p;
  };

  // Unlock on first gesture; create AC; pre-decode common SFX
  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      (window as any).__sfx_unlocked = true;

      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC && !acRef.current) {
          const ac = new AC({ sampleRate: 44100 });
          acRef.current = ac;
          ac.resume().catch(() => {});
          // tiny inaudible blip to open the audio route
          try {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            gain.gain.value = 0.0001;
            osc.connect(gain).connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + 0.01);
          } catch {}
        }
      } catch {}

      // Pre-decode a few right away
      const ac = acRef.current;
      if (ac) {
        KEYS_TO_PREDECODE.forEach((k) => { void ensureDecoded(k); });
      }

      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [KEYS_TO_PREDECODE]);

  // Public play API
  const play = (key: string, opts?: { volume?: number }) => {
    if (!unlockedRef.current) return;

    const ac = acRef.current;
    const buf = buffersRef.current.get(key);

    // If already decoded, use ultra-low-latency WebAudio
    if (ac && buf) {
      try {
        const src = ac.createBufferSource();
        src.buffer = buf;
        const gain = ac.createGain();
        gain.gain.value = Math.max(0, Math.min(1, opts?.volume ?? 1));
        src.connect(gain).connect(ac.destination);
        src.start();
      } catch {
        // fall through
      }
      return;
    }

    // Kick off decode for next time (non-blocking)
    void ensureDecoded(key);

    // Immediate fallback: HTMLAudio pool using dynamic src
    const p = getHtmlPool(key);
    if (!p) return;
    const a = p.els[p.i];
    p.i = (p.i + 1) % p.els.length;

    try {
      a.currentTime = 0;
      if (opts?.volume != null) a.volume = Math.max(0, Math.min(1, opts.volume));
      a.play().catch(() => {});
    } catch {}
  };

  return { play, isUnlocked: () => unlockedRef.current };
}
