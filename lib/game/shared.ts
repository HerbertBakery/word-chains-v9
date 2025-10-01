// Shared helpers for Chain rules

export type ChainKey = "name" | "animal" | "country" | "food" | "brand" | "screen";

// Must start with a letter; rest can include letters/spaces/'/&/-/.
export const INPUT_RE = /^[a-zA-Z][a-zA-Z\s'\-&.]*$/;

export const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Normalization for detectors
export const norm = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[\s'\-&.]/g, "");

export const singularize = (w: string) => {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
};

export const stripCorpSuffixes = (s: string) =>
  s
    .replace(/\b(company|co|corp|corporation|inc|incorporated|ltd|limited|llc|plc|ag|sa|gmbh)\b\.?/gi, "")
    .replace(/\b(the)\b/gi, "")
    .trim();

/** Find first alphabetic letter (ASCII) scanning forward; fallback to first char */
export const firstLetter = (w: string) => {
  const plain = stripDiacritics(String(w));
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i];
    if (/[A-Za-z]/.test(ch)) return ch;
  }
  return plain[0] ?? "";
};

/** Find last alphabetic letter (ASCII) scanning backward; fallback to last char */
export const lastLetter = (w: string) => {
  const plain = stripDiacritics(String(w));
  for (let i = plain.length - 1; i >= 0; i--) {
    const ch = plain[i];
    if (/[A-Za-z]/.test(ch)) return ch;
  }
  return plain[plain.length - 1] ?? "";
};

export function isAnimal(animals: Set<string>, w: string) {
  if (animals.has(w)) return true;
  if (w.endsWith("es") && animals.has(w.slice(0, -2))) return true;
  if (w.endsWith("s") && animals.has(w.slice(0, -1))) return true;
  return false;
}

// Build shared detectors/validators from the loaded datasets
export function makeDetectors(opts: {
  dict: Set<string> | null;
  animals: Set<string>;
  countries: Set<string>;
  names: Set<string>;
  foods: Set<string>;
  brands: Set<string>;
  screens: Set<string>;
  dictNorm: Set<string>;
  animalsNorm: Set<string>;
  countriesNorm: Set<string>;
  namesNorm: Set<string>;
  foodsNorm: Set<string>;
  brandsNorm: Set<string>;
  screensNorm: Set<string>;
  strictDictionary: boolean;
}) {
  const {
    dict, animals, countries, names, foods, brands, screens,
    dictNorm, animalsNorm, countriesNorm, namesNorm, foodsNorm, brandsNorm, screensNorm,
    strictDictionary
  } = opts;

  const getCategories = (w: string): Set<ChainKey> => {
    const set = new Set<ChainKey>();
    const lw = w.toLowerCase().trim();
    const nw = norm(w);
    const lwSing = singularize(lw);
    const nwSing = singularize(nw);
    const brandForm = norm(stripCorpSuffixes(w));

    if (countries.has(lw) || countriesNorm.has(nw)) set.add("country");
    if (isAnimal(animals, lw) || animalsNorm.has(nw)) set.add("animal");
    if (names.has(lw) || namesNorm.has(nw)) set.add("name");
    if (foods.has(lw) || foodsNorm.has(nw) || foods.has(lwSing) || foodsNorm.has(nwSing)) set.add("food");
    if (brands.has(lw) || brandsNorm.has(nw) || brandsNorm.has(brandForm)) set.add("brand");
    if (screens.has(lw) || screensNorm.has(nw)) set.add("screen");

    return set;
  };

  async function validateWord(w: string): Promise<boolean> {
    if (!INPUT_RE.test(w)) return false;
    if (!strictDictionary) return true;

    const lw = w.toLowerCase().trim();
    const lwSing = singularize(lw);
    const nw = norm(w);
    const nwSing = singularize(nw);
    const brandForm = norm(stripCorpSuffixes(w));

    if (dict && (dict.has(lw) || dictNorm.has(nw))) return true;
    if (countries.has(lw) || countriesNorm.has(nw)) return true;
    if (names.has(lw) || namesNorm.has(nw)) return true;
    if (isAnimal(animals, lw) || animalsNorm.has(nw)) return true;
    if (screens.has(lw) || screensNorm.has(nw)) return true;
    if (foods.has(lw) || foodsNorm.has(nw) || foods.has(lwSing) || foodsNorm.has(nwSing)) return true;
    if (brands.has(lw) || brandsNorm.has(nw) || brandsNorm.has(brandForm)) return true;

    return false;
  }

  return { getCategories, validateWord };
}
