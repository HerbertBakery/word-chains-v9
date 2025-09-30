"use client";
import React, { useMemo } from "react";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

export default function Flag({
  countryName,
  title,
  className = "",
  size = 24,
}: {
  countryName: string;
  title?: string;
  className?: string;
  size?: number;
}) {
  const code = useMemo(() => {
    // Try exact, then loose (remove parentheses etc.)
    let c = countries.getAlpha2Code(countryName, "en");
    if (!c) {
      const loose = countryName
        .replace(/\(.*?\)/g, "")
        .replace(/,.*$/, "")
        .trim();
      c = countries.getAlpha2Code(loose, "en");
    }
    return (c || "").toUpperCase();
  }, [countryName]);

  const emoji = useMemo(() => (code ? toFlagEmoji(code) : "🏳️"), [code]);
  const label = title || (code ? `${countryName} (${code})` : countryName);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg ${className}`}
      title={label}
      aria-label={label}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      {emoji}
    </span>
  );
}

function toFlagEmoji(alpha2: string) {
  // A → 🇦 = 0x1F1E6 + (A-65)
  const base = 0x1F1E6;
  const A = "A".charCodeAt(0);
  const chars = [...alpha2.toUpperCase()].map((ch) =>
    String.fromCodePoint(base + (ch.charCodeAt(0) - A))
  );
  return chars.join("");
}
