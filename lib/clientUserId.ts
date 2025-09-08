export function getClientUserId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "wc_uid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    const rand = Math.random().toString(36).slice(2, 10);
    id = `anon_${rand}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
