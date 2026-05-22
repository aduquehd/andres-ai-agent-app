import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function ChromeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2a10 10 0 0 1 8.66 5H12a5 5 0 0 0-4.78 3.55L3.34 7.4A10 10 0 0 1 12 2Zm-8.95 6.97 3.88 6.72A5 5 0 0 0 12 17h.06l-3.77 6.53A10 10 0 0 1 3.05 8.97ZM13.4 21.96l3.88-6.72A5 5 0 0 0 17 12a5 5 0 0 0-1-3h7.55a10 10 0 0 1-10.15 12.96ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
    </svg>
  );
}

function FirefoxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.6 6.3c.7 1 1.2 2.2 1.5 3.4a10 10 0 0 1-9.8 12.3 9.93 9.93 0 0 1-9.9-9.4c-.1-3 1.1-5.7 3.1-7.5C4.4 7.5 4 9.4 4.7 11c.4-1.4 1.3-2.6 2.5-3.4-.4 1 .1 2.2 1.1 2.7-.7-1.7.4-3.7 2-4.7 1-.6 2-1 3.2-1-.6.4-.9 1.2-.6 1.9.3.7 1.1 1 1.8.8-.7 1.1.2 2.6 1.5 2.6.6 0 1.2-.3 1.5-.8.1 1.3-.6 2.6-1.8 3.2 1.6 0 3 1.3 3 3 0 1.4-1 2.6-2.3 2.9 1.7 0 3-1.3 3-3 0-1.1-.6-2.1-1.5-2.7 1.1-.3 1.8-1.3 1.7-2.5Z" />
    </svg>
  );
}

function SafariIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15.5 8.5-2.1 5.4-5.4 2.1 2.1-5.4 5.4-2.1Z" fill="currentColor" stroke="none" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

function EdgeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c5.5 0 10 4 10 9 0 1.6-.4 2.7-1.1 3.4-.7.7-1.7 1-2.7 1-1.7 0-3.4-.9-3.4-2.6 0-.6.2-1.2.5-1.7.2-.4.1-.9-.2-1.2-.3-.3-.8-.3-1.2-.1-1.5.8-2.5 2.4-2.5 4 0 2.8 2.4 5.2 5.6 5.8C15.2 21 13.6 22 12 22A10 10 0 0 1 2.6 8.6 9 9 0 0 1 12 2Zm-7.4 8.3C5.4 7.4 8.4 5 12 5c2.8 0 5.2 1.5 6.6 3.8-1.3-.5-2.7-.8-4.1-.8-3 0-5.7 1.2-7.4 3.3-1 1.2-1.6 2.6-1.8 4.1-.6-1.4-.9-3-.7-5.1Z" />
    </svg>
  );
}

function GlobeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C5.8 6.9 4 8 3 9.9c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 2 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9s2.1.9 3.4.8c1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-3 1.4-3.1-.1-.1-2.7-1-2.6-4ZM13.9 4.5c.7-.9 1.2-2.1 1-3.3-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3.1-1.5Z" />
    </svg>
  );
}

function WindowsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M3 5.4 11 4v8H3Zm0 7.6h8v8L3 19.6Zm9-9.1L22 2.6V12h-10Zm0 9.1h10v9.4l-10-1.3Z" />
    </svg>
  );
}

function AndroidIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M5.5 9a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-3 0v-5A1.5 1.5 0 0 1 5.5 9Zm13 0a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-3 0v-5A1.5 1.5 0 0 1 18.5 9ZM8.4 4.3l-1-1.6a.3.3 0 0 1 .1-.4.3.3 0 0 1 .4.1l1 1.7a6.5 6.5 0 0 1 6.2 0l1-1.7a.3.3 0 0 1 .4-.1c.2.1.2.3.1.4l-1 1.6A5.7 5.7 0 0 1 18 9H6a5.7 5.7 0 0 1 2.4-4.7ZM6 10h12v7a1.5 1.5 0 0 1-1.5 1.5H15v3a1.5 1.5 0 0 1-3 0v-3h-1.5v3a1.5 1.5 0 0 1-3 0v-3H7.5A1.5 1.5 0 0 1 6 17ZM10 7a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2Zm4 0a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2Z" />
    </svg>
  );
}

function LinuxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c-2.2 0-3.5 1.6-3.5 4 0 1.2.4 2.4 1.1 3.6-1.5 1.5-3 4.5-3 7.7 0 1.6.4 3 1.5 3.6.6.3 1.3.2 1.8-.2.4-.4.6-1 .8-1.6.2-.7.4-1.4.7-1.7.2.7.5 1.4.8 2 .5.9 1.2 1.5 2.2 1.5h.4c1 0 1.7-.6 2.2-1.5.3-.6.6-1.3.8-2 .3.3.5 1 .7 1.7.2.6.4 1.2.8 1.6.5.4 1.2.5 1.8.2 1.1-.6 1.5-2 1.5-3.6 0-3.2-1.5-6.2-3-7.7.7-1.2 1.1-2.4 1.1-3.6 0-2.4-1.3-4-3.5-4Zm-2 5.5a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Zm4 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Zm-2 3.5c.9 0 2 .4 2.7 1l-.5.5c-.6.6-1.4 1-2.2 1s-1.6-.4-2.2-1l-.5-.5c.7-.6 1.8-1 2.7-1Z" />
    </svg>
  );
}

function SmartphoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

interface ClientInfo {
  browser: string;
  browserVersion: string;
  os: string;
  BrowserIcon: (props: IconProps) => React.ReactElement;
  OSIcon: (props: IconProps) => React.ReactElement;
  browserColor: string;
  osColor: string;
}

export function parseClient(ua: string | null | undefined): ClientInfo | null {
  if (!ua) return null;

  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";
  let BrowserIcon: ClientInfo["BrowserIcon"] = GlobeIcon;
  let OSIcon: ClientInfo["OSIcon"] = GlobeIcon;
  let browserColor = "var(--admin-text-dim)";
  let osColor = "var(--admin-text-dim)";

  const m = (re: RegExp) => ua.match(re)?.[1]?.split(".")[0] ?? "";

  if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = m(/Edg\/([\d.]+)/);
    BrowserIcon = EdgeIcon;
    browserColor = "#3aa1ff";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = m(/Firefox\/([\d.]+)/);
    BrowserIcon = FirefoxIcon;
    browserColor = "#ff7139";
  } else if (ua.includes("Chrome/") && ua.includes("Safari/")) {
    browser = "Chrome";
    browserVersion = m(/Chrome\/([\d.]+)/);
    BrowserIcon = ChromeIcon;
    browserColor = "#4caf50";
  } else if (ua.includes("Safari/") && ua.includes("Version/")) {
    browser = "Safari";
    browserVersion = m(/Version\/([\d.]+)/);
    BrowserIcon = SafariIcon;
    browserColor = "#1aa9ff";
  }

  if (ua.includes("Windows NT 10.0")) {
    os = "Windows 10/11";
    OSIcon = WindowsIcon;
    osColor = "#3aa1ff";
  } else if (ua.includes("Windows NT 6.3")) {
    os = "Windows 8.1";
    OSIcon = WindowsIcon;
    osColor = "#3aa1ff";
  } else if (ua.includes("Windows NT")) {
    os = "Windows";
    OSIcon = WindowsIcon;
    osColor = "#3aa1ff";
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
    OSIcon = AppleIcon;
    osColor = "#e5e7eb";
  } else if (ua.includes("Android")) {
    os = "Android";
    OSIcon = AndroidIcon;
    osColor = "#a4c639";
  } else if (ua.includes("iPhone")) {
    os = "iOS";
    OSIcon = SmartphoneIcon;
    osColor = "#e5e7eb";
  } else if (ua.includes("iPad")) {
    os = "iPadOS";
    OSIcon = SmartphoneIcon;
    osColor = "#e5e7eb";
  } else if (ua.includes("Linux")) {
    os = "Linux";
    OSIcon = LinuxIcon;
    osColor = "#ffb800";
  }

  return { browser, browserVersion, os, BrowserIcon, OSIcon, browserColor, osColor };
}

export function ClientBadge({
  userAgent,
  className,
}: {
  userAgent: string | null | undefined;
  className?: string;
}) {
  const info = parseClient(userAgent);
  if (!info) {
    return <span className="text-[color:var(--admin-text-muted)]">—</span>;
  }
  const { browser, browserVersion, os, BrowserIcon, OSIcon, browserColor, osColor } = info;
  return (
    <span className={`inline-flex items-center gap-1.5 admin-mono text-xs ${className ?? ""}`}>
      <BrowserIcon className="h-3.5 w-3.5 shrink-0" style={{ color: browserColor }} />
      <span className="text-[color:var(--admin-text-dim)]">
        {browser}
        {browserVersion ? ` ${browserVersion}` : ""}
      </span>
      <span className="text-[color:var(--admin-text-muted)]">·</span>
      <OSIcon className="h-3.5 w-3.5 shrink-0" style={{ color: osColor }} />
      <span className="text-[color:var(--admin-text-dim)]">{os}</span>
    </span>
  );
}
