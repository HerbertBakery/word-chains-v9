// app/components/DexAnimalIcon.tsx
"use client";

import React from "react";

type DexState = "locked" | "discovered" | "claimed";

export default function DexAnimalIcon({
  name,
  state,
  size = 44,
}: {
  name: string;
  state: DexState;
  size?: number;
}) {
  const key = singularize(normKey(name));
  const emoji = EMOJI_MAP[key];

  const muted = state !== "claimed";
  const pulse = state === "discovered";

  if (emoji) {
    return (
      <span
        role="img"
        aria-label={name}
        title={state === "claimed" ? name : undefined}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        className={[
          muted ? "opacity-40 grayscale" : "",
          pulse ? "animate-pulse" : "",
        ].join(" ")}
      >
        {emoji}
      </span>
    );
  }

  // Fallback: deterministic monogram SVG
  const letters = key.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = hash(key) % 360;

  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={[
        "rounded-xl",
        muted ? "opacity-40 grayscale" : "",
        pulse ? "animate-pulse" : "",
      ].join(" ")}
    >
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`hsl(${hue} 70% 45%)`} />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="#fff"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}
      >
        {letters}
      </text>
    </svg>
  );
}

/* ---------- helpers ---------- */
function normKey(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
function singularize(w: string) {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

/** Large emoji map; extend anytime. Unknowns fall back to monogram. */
const EMOJI_MAP: Record<string, string> = {
  // mammals
  dog: "🐶", puppy: "🐶",
  wolf: "🐺", fox: "🦊", cat: "🐱", tiger: "🐯", lion: "🦁", leopard: "🐆",
  horse: "🐴", zebra: "🦓", cow: "🐮", ox: "🐂", bison: "🦬",
  pig: "🐷", boar: "🐗", hippopotamus: "🦛", rhino: "🦏", rhinoceros: "🦏",
  elephant: "🐘", mammoth: "🦣", camel: "🐪", "two-humped camel": "🐫", llama: "🦙", alpaca: "🦙",
  giraffe: "🦒", goat: "🐐", sheep: "🐑", ram: "🐏", deer: "🦌", moose: "🫎", reindeer: "🦌",
  monkey: "🐒", gorilla: "🦍", orangutan: "🦧", bear: "🐻", "polar bear": "🐻‍❄️",
  panda: "🐼", koala: "🐨", beaver: "🦫", otter: "🦦", skunk: "🦨", badger: "🦡", hedgehog: "🦔",
  bat: "🦇", mouse: "🐭", rat: "🐀", hamster: "🐹", rabbit: "🐰", hare: "🐇",
  kangaroo: "🦘", raccoon: "🦝", sloth: "🦥", squirrel: "🐿️",
  // birds
  bird: "🐦", chicken: "🐔", rooster: "🐓", turkey: "🦃", duck: "🦆", swan: "🦢", goose: "🪿",
  eagle: "🦅", owl: "🦉", dove: "🕊️", peacock: "🦚", parrot: "🦜", flamingo: "🦩", penguin: "🐧",
  // reptiles & amphibians
  crocodile: "🐊", alligator: "🐊", lizard: "🦎", snake: "🐍", turtle: "🐢",
  frog: "🐸",
  // fish & sea
  fish: "🐟", "tropical fish": "🐠", blowfish: "🐡", shark: "🦈", whale: "🐳", dolphin: "🐬",
  seal: "🦭", octopus: "🐙", squid: "🦑", lobster: "🦞", crab: "🦀", shrimp: "🦐",
  // insects & others
  butterfly: "🦋", bug: "🐛", ant: "🐜", bee: "🐝", honeybee: "🐝", beetle: "🪲",
  "lady beetle": "🐞", ladybug: "🐞", spider: "🕷️", scorpion: "🦂", snail: "🐌",
};
