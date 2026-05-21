const STORAGE_KEY = "chat_user_id";
const BROWSER_ID_KEY = "chat_browser_id";
const THEME_KEY = "chat_theme";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function resetUserId(): string {
  const id = uuid();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function getBrowserId(): string {
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" ? "light" : "dark";
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}
