export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return iso ?? "";
  }
}

export function truncate(s: string | null | undefined, max = 80): string {
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

export function formatUserAgent(ua: string | null | undefined): string {
  if (!ua) return "";

  let browser = "Unknown";
  let version = "";
  let os = "Unknown OS";

  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "iOS";
  else if (ua.includes("iPad")) os = "iPadOS";
  else if (ua.includes("Linux")) os = "Linux";

  const m = (re: RegExp) => ua.match(re)?.[1]?.split(".")[0] ?? "";

  if (ua.includes("Edg/")) {
    browser = "Edge";
    version = m(/Edg\/([\d.]+)/);
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    version = m(/Firefox\/([\d.]+)/);
  } else if (ua.includes("Chrome/") && ua.includes("Safari/")) {
    browser = "Chrome";
    version = m(/Chrome\/([\d.]+)/);
  } else if (ua.includes("Safari/") && ua.includes("Version/")) {
    browser = "Safari";
    version = m(/Version\/([\d.]+)/);
  }

  const browserInfo = version ? `${browser} ${version}` : browser;
  return `${browserInfo} · ${os}`;
}
