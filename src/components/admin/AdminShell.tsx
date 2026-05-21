"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  Bot,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";

import { HttpError, logout, me, type AdminUser } from "@/lib/admin-api";

type NavItem = {
  href: string;
  label: string;
  cmd: string; // terminal-style label (e.g. "overview", "users.list")
  icon: LucideIcon;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", cmd: "overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", cmd: "users.list", icon: Users },
  { href: "/admin/messages", label: "Messages", cmd: "messages.list", icon: MessageSquare },
  { href: "/admin/agent-messages", label: "Agent Messages", cmd: "agent.messages", icon: Bot },
  { href: "/admin/knowledge-base", label: "Knowledge Base", cmd: "kb.entries", icon: Brain },
  { href: "/admin/agent-contexts", label: "Agent Contexts", cmd: "agent.context", icon: Database },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof HttpError && err.status === 401) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toast.error(err instanceof Error ? err.message : "Failed to load session");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="admin-mono-dim flex items-center gap-3 text-sm">
          <span className="admin-status-dot" />
          <span className="tracking-widest uppercase">Authenticating…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const active = NAV.find((n) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`),
  );

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="admin-sidebar hidden md:flex md:flex-col">
        <div className="px-4 pt-5 pb-4 border-b border-[color:var(--admin-border)]">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="admin-status-dot" />
            <span className="admin-eyebrow">Ops Console</span>
          </div>
          <div className="admin-mono text-[1.05rem] tracking-wider text-[color:var(--admin-text)] font-semibold">
            AndresAI
            <span className="text-[color:var(--admin-text-faint)]"> /</span>
            <span className="text-[color:var(--admin-accent)]"> admin</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? "is-active" : ""}`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="admin-nav-arrow">&gt;</span>
                <span>{item.cmd}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[color:var(--admin-border)]">
          <div className="px-2 mb-2 text-[0.62rem] tracking-[0.18em] uppercase font-mono text-[color:var(--admin-text-muted)]">
            session
          </div>
          <div className="px-2 mb-3 admin-mono text-[0.78rem] text-[color:var(--admin-text)] truncate">
            {user.username}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-btn w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col min-w-0">
        <header className="admin-topbar admin-scan flex h-14 items-center justify-between px-4 md:px-6">
          <div className="admin-breadcrumb truncate">
            <span className="admin-breadcrumb-slash">//</span>
            <span>andresai</span>
            <span className="admin-breadcrumb-slash">/</span>
            <span>admin</span>
            {active ? (
              <>
                <span className="admin-breadcrumb-slash">/</span>
                <span className="admin-breadcrumb-active">{active.cmd}</span>
              </>
            ) : null}
          </div>
          <div className="md:hidden">
            <button type="button" onClick={handleLogout} className="admin-btn admin-btn-icon">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3 admin-mono text-xs text-[color:var(--admin-text-muted)]">
            <span className="admin-status-dot" />
            <span>system online</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
