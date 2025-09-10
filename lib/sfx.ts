// app/lib/sfx.ts
type SfxKey = "accept" | "invalid" | "unlock" | "coin" | "warning" | "gameover" | "keypress";

const SRC: Record<SfxKey, string> = {
  accept:  "/sfx/accept.mp3",
  invalid: "/sfx/invalid.mp3",
  unlock:  "/sfx/unlock.mp3",
  coin:    "/sfx/coin.mp3",
  warning: "/sfx/warning.mp3",
  gameover:"/sfx/gameover.mp3",
  keypress:"/sfx/keypress.mp3",
};

// small pools so we don't allocate on each keystroke
const pools = new Map<SfxKey, { els: HTMLAudioElement[]; i: number }>();
const lastAt = new Map<SfxKey, number>();

function getPool(key: SfxKey, size = 4) {
  let p = pools.get(key);
  if (!p) {
    const els = Array.from({ length: size }, () => {
      const a = new Audio(SRC[key]);
      a.preload = "auto";
      return a;
    });
    p = { els, i: 0 };
    pools.set(key, p);
  }
  return p;
}

// set this to false to temporarily silence per-keypress SFX without code edits
export let KEY_SFX_ENABLED = true;

export function playSfxKey(key: SfxKey, volume = 1.0) {
  // bail fast if not unlocked (esp. Safari) to avoid any blocking on first key
  if (!(window as any).__sfx_unlocked) return;

  // throttle very rapid events
  const now = performance.now();
  const minGap = key === "keypress" ? 60 : 0; // 60ms throttle for typing
  const last = lastAt.get(key) ?? 0;
  if (now - last < minGap) return;
  lastAt.set(key, now);

  // optional global kill-switch for typing sound
  if (key === "keypress" && !KEY_SFX_ENABLED) return;

  const p = getPool(key);
  const a = p.els[p.i];
  p.i = (p.i + 1) % p.els.length;

  try {
    a.currentTime = 0;
    a.volume = volume;
    // fire-and-forget; never await
    a.play().catch(() => {});
  } catch {}
}
