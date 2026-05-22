"use client";

import { ArrowDown, ArrowUp, Bot, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteUser, getUserStats, type UserStats } from "@/lib/admin-api";
import { ClientBadge } from "@/lib/client-icons";
import { formatDateTime, truncate } from "@/lib/format";

interface UserDetailsDialogProps {
  userId: number | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function UserDetailsDialog({
  userId,
  onClose,
  onDeleted,
}: UserDetailsDialogProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId == null) return;
    let cancelled = false;
    setLoading(true);
    getUserStats(userId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load user");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Treat stale stats (from a previously-opened user) as "still loading"
  const statsForCurrent = stats && stats.user.id === userId ? stats : null;

  async function handleDelete() {
    if (stats == null) return;
    const confirmMsg =
      `Delete user #${stats.user.id} and ALL related data?\n\n` +
      `· ${stats.messages_total} messages\n` +
      `· ${stats.agent_messages_total} agent message records\n\n` +
      `This cannot be undone.`;
    if (!confirm(confirmMsg)) return;
    setDeleting(true);
    try {
      const result = await deleteUser(stats.user.id);
      toast.success(
        `User deleted (${result.messages_deleted} messages, ${result.agent_messages_deleted} agent records)`,
      );
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const open = userId != null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span className="admin-eyebrow mb-2 block">User Profile</span>
            <span className="admin-mono text-base">
              {stats ? `${stats.user.username} · #${stats.user.id}` : `User #${userId ?? ""}`}
            </span>
          </DialogTitle>
          <DialogDescription className="admin-mono text-xs">
            {stats?.user.browser_id ? `browser ${truncate(stats.user.browser_id, 28)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading || !statsForCurrent ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--admin-accent)]" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                label="Total messages"
                value={statsForCurrent.messages_total.toLocaleString()}
              />
              <StatCard
                icon={<Bot className="h-3.5 w-3.5" />}
                label="Agent records"
                value={statsForCurrent.agent_messages_total.toLocaleString()}
              />
              <StatCard
                icon={<ArrowDown className="h-3.5 w-3.5" />}
                label="Incoming"
                value={statsForCurrent.messages_incoming.toLocaleString()}
                tone="violet"
              />
              <StatCard
                icon={<ArrowUp className="h-3.5 w-3.5" />}
                label="Outgoing"
                value={statsForCurrent.messages_outgoing.toLocaleString()}
                tone="accent"
              />
            </div>

            <div className="border border-[color:var(--admin-border)] rounded-md p-4 space-y-2 bg-black/20">
              <Row label="Username">
                <span className="admin-mono text-xs">{statsForCurrent.user.username}</span>
              </Row>
              <Row label="Joined">
                <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
                  {formatDateTime(statsForCurrent.user.created_at) || "—"}
                </span>
              </Row>
              <Row label="First message">
                <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
                  {formatDateTime(statsForCurrent.first_message_at) || "—"}
                </span>
              </Row>
              <Row label="Last message">
                <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
                  {formatDateTime(statsForCurrent.last_message_at) || "—"}
                </span>
              </Row>
              <Row label="Avg latency">
                <span className="admin-mono text-xs text-[color:var(--admin-accent)]">
                  {statsForCurrent.avg_response_time_ms != null
                    ? `${Math.round(statsForCurrent.avg_response_time_ms)}ms`
                    : "—"}
                </span>
              </Row>
              <Row label="Location">
                <span className="text-xs">
                  {[
                    statsForCurrent.user.city,
                    statsForCurrent.user.region,
                    statsForCurrent.user.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </Row>
              <Row label="IP">
                <span className="admin-mono text-xs">
                  {statsForCurrent.user.ip_address ?? "—"}
                </span>
              </Row>
              <Row label="Client">
                <ClientBadge userAgent={statsForCurrent.user.user_agent} />
              </Row>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="admin-btn admin-btn-danger inline-flex items-center gap-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete user and all related data
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "accent" | "violet";
}) {
  const toneClass =
    tone === "accent"
      ? "text-[color:var(--admin-accent)]"
      : tone === "violet"
      ? "text-[#c4b5fd]"
      : "text-[color:var(--admin-text)]";
  return (
    <div className="border border-[color:var(--admin-border)] rounded-md p-3 bg-black/20">
      <div className="admin-eyebrow flex items-center gap-1.5 mb-1">
        <span className={toneClass}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`admin-mono text-lg ${toneClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="admin-eyebrow shrink-0">{label}</span>
      <span className="text-right min-w-0 truncate">{children}</span>
    </div>
  );
}
