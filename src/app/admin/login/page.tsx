"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { login } from "@/lib/admin-api";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[color:var(--admin-bg)]" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await login(username, password);
      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* ambient corner accents on the page */}
      <CornerAccent className="top-6 left-6" />
      <CornerAccent className="top-6 right-6" rotate={90} />
      <CornerAccent className="bottom-6 left-6" rotate={-90} />
      <CornerAccent className="bottom-6 right-6" rotate={180} />

      <div className="admin-panel admin-scan w-full max-w-[420px] p-7 relative">
        <div className="mb-5 flex items-center gap-2">
          <span className="admin-status-dot" />
          <span className="admin-eyebrow">Auth Required</span>
        </div>

        <h1 className="admin-title text-2xl mb-1.5">AndresAI Ops</h1>
        <p className="text-sm text-[color:var(--admin-text-dim)] mb-6">
          Sign in to manage chat data and the knowledge base.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="admin-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="admin-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="admin-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="admin-input"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="admin-btn admin-btn-primary w-full mt-2"
          >
            {submitting ? "Authenticating…" : "Initiate Session"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[color:var(--admin-border)] text-[0.66rem] tracking-[0.18em] uppercase font-mono text-[color:var(--admin-text-muted)] text-center">
          jwt session · http-only cookie
        </div>
      </div>
    </div>
  );
}

function CornerAccent({ className = "", rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div
      className={`pointer-events-none absolute h-6 w-6 ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <span
        className="absolute top-0 left-0 h-px w-full"
        style={{ background: "var(--admin-accent)" }}
      />
      <span
        className="absolute top-0 left-0 h-full w-px"
        style={{ background: "var(--admin-accent)" }}
      />
    </div>
  );
}
