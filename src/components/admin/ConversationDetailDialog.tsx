"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronUp,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteUser,
  getUserStats,
  listMessages,
  type MessageRow,
  type UserStats,
} from "@/lib/admin-api";
import { useAdminLiveStream } from "@/lib/admin-realtime";
import { ClientBadge } from "@/lib/client-icons";
import { formatDateTime, truncate } from "@/lib/format";

interface ConversationDetailDialogProps {
  userId: number | null;
  onClose: () => void;
  onDeleted?: () => void;
}

const PAGE_SIZE = 50;

export function ConversationDetailDialog({
  userId,
  onClose,
  onDeleted,
}: ConversationDetailDialogProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);

  // Reset state and load both stats + recent messages when a new user is opened.
  useEffect(() => {
    if (userId == null) return;
    let cancelled = false;
    setStats(null);
    setMessages([]);
    setMessagesTotal(0);
    setLoadingStats(true);
    setLoadingMessages(true);

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
        if (!cancelled) setLoadingStats(false);
      });

    listMessages({ user_id: userId, sort: "created_desc", limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return;
        setMessages([...page.items].reverse());
        setMessagesTotal(page.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load conversation");
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Jump to the latest message after initial load.
  useEffect(() => {
    if (!loadingMessages && messages.length > 0 && scrollerRef.current) {
      const el = scrollerRef.current;
      el.scrollTop = el.scrollHeight;
    }
    // Intentionally depend on loadingMessages and userId only so this fires on
    // first load per user, not on every message append.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMessages, userId]);

  // Preserve scroll position when older messages are prepended.
  useLayoutEffect(() => {
    if (prevScrollHeightRef.current != null && scrollerRef.current) {
      const el = scrollerRef.current;
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
    }
  }, [messages]);

  const handleLoadOlder = useCallback(async () => {
    if (userId == null || loadingOlder) return;
    if (messages.length >= messagesTotal) return;
    setLoadingOlder(true);
    try {
      const page = await listMessages({
        user_id: userId,
        sort: "created_desc",
        limit: PAGE_SIZE,
        offset: messages.length,
      });
      if (scrollerRef.current) {
        prevScrollHeightRef.current = scrollerRef.current.scrollHeight;
      }
      setMessages((prev) => [...[...page.items].reverse(), ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [userId, loadingOlder, messages.length, messagesTotal]);

  // Live updates: append/remove messages for this user, close on user deletion.
  useAdminLiveStream(
    useCallback(
      (event) => {
        if (userId == null) return;
        if (event.type === "message.created" && event.message.user_id === userId) {
          // Defensive id-based dedupe: even if the same WS event were
          // dispatched twice, we only want one bubble + one stat increment.
          let inserted = false;
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.message.id)) return prev;
            inserted = true;
            return [...prev, event.message];
          });
          if (!inserted) return;
          const el = scrollerRef.current;
          const nearBottom =
            !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setMessagesTotal((t) => t + 1);
          setStats((prev) => {
            if (!prev) return prev;
            const isIn = event.message.direction === "incoming";
            return {
              ...prev,
              messages_total: prev.messages_total + 1,
              messages_incoming: prev.messages_incoming + (isIn ? 1 : 0),
              messages_outgoing: prev.messages_outgoing + (isIn ? 0 : 1),
              last_message_at: event.message.created_at,
            };
          });
          if (nearBottom && el) {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight;
            });
          }
        } else if (event.type === "message.deleted") {
          setMessages((prev) => {
            if (!prev.some((m) => m.id === event.id)) return prev;
            return prev.filter((m) => m.id !== event.id);
          });
          setMessagesTotal((t) => Math.max(0, t - 1));
        } else if (event.type === "user.deleted" && event.id === userId) {
          onClose();
        }
      },
      [userId, onClose],
    ),
  );

  async function handleDelete() {
    if (!stats) return;
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
  const statsForCurrent = stats && stats.user.id === userId ? stats : null;
  const hasOlder = messages.length < messagesTotal;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl sm:max-w-6xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-[color:var(--admin-border)]">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[color:var(--admin-accent)]" />
            <span className="admin-eyebrow">Conversation</span>
            <span className="admin-mono text-sm text-[color:var(--admin-text)] truncate">
              {statsForCurrent
                ? `${statsForCurrent.user.username} · #${statsForCurrent.user.id}`
                : `#${userId ?? ""}`}
            </span>
          </DialogTitle>
          <DialogDescription className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
            {statsForCurrent?.user.browser_id
              ? `browser ${truncate(statsForCurrent.user.browser_id, 36)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] flex-1 min-h-0">
          {/* Info column */}
          <aside className="border-b md:border-b-0 md:border-r border-[color:var(--admin-border)] overflow-y-auto p-5 space-y-5 bg-black/20">
            {loadingStats || !statsForCurrent ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--admin-accent)]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <StatCard
                    icon={<MessageSquare className="h-3 w-3" />}
                    label="Messages"
                    value={statsForCurrent.messages_total.toLocaleString()}
                  />
                  <StatCard
                    icon={<Bot className="h-3 w-3" />}
                    label="Records"
                    value={statsForCurrent.agent_messages_total.toLocaleString()}
                  />
                  <StatCard
                    icon={<ArrowDown className="h-3 w-3" />}
                    label="Incoming"
                    value={statsForCurrent.messages_incoming.toLocaleString()}
                    tone="violet"
                  />
                  <StatCard
                    icon={<ArrowUp className="h-3 w-3" />}
                    label="Outgoing"
                    value={statsForCurrent.messages_outgoing.toLocaleString()}
                    tone="accent"
                  />
                </div>

                <div className="space-y-3">
                  <Row label="Joined">
                    <span className="admin-mono text-sm text-[color:var(--admin-text-dim)]">
                      {formatDateTime(statsForCurrent.user.created_at) || "—"}
                    </span>
                  </Row>
                  <Row label="First message">
                    <span className="admin-mono text-sm text-[color:var(--admin-text-dim)]">
                      {formatDateTime(statsForCurrent.first_message_at) || "—"}
                    </span>
                  </Row>
                  <Row label="Last message">
                    <span className="admin-mono text-sm text-[color:var(--admin-text-dim)]">
                      {formatDateTime(statsForCurrent.last_message_at) || "—"}
                    </span>
                  </Row>
                  <Row label="Avg latency">
                    <span className="admin-mono text-sm text-[color:var(--admin-accent)]">
                      {statsForCurrent.avg_response_time_ms != null
                        ? `${Math.round(statsForCurrent.avg_response_time_ms)}ms`
                        : "—"}
                    </span>
                  </Row>
                  <Row label="Location">
                    <span className="text-sm">
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
                    <span className="admin-mono text-sm break-all">
                      {statsForCurrent.user.ip_address ?? "—"}
                    </span>
                  </Row>
                  <Row label="Client">
                    <ClientBadge userAgent={statsForCurrent.user.user_agent} className="text-sm" />
                  </Row>
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-danger w-full inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete user and cascade-remove all messages + agent records"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete user
                </button>
              </>
            )}
          </aside>

          {/* Conversation column */}
          <div
            ref={scrollerRef}
            className="overflow-y-auto px-6 py-4 min-h-[300px]"
          >
            {loadingMessages ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--admin-accent)]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-[color:var(--admin-text-dim)]">
                <span className="admin-mono text-xs uppercase tracking-widest">
                  &gt; no messages on record
                </span>
              </div>
            ) : (
              <>
                {hasOlder ? (
                  <div className="flex justify-center mb-4">
                    <button
                      type="button"
                      onClick={handleLoadOlder}
                      disabled={loadingOlder}
                      className="admin-btn inline-flex items-center gap-2"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.66rem" }}
                    >
                      {loadingOlder ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      )}
                      Load older ({messagesTotal - messages.length} left)
                    </button>
                  </div>
                ) : (
                  <div className="text-center mb-4 admin-mono text-[0.62rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
                    — start of conversation —
                  </div>
                )}

                <Thread messages={messages} />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Thread({ messages }: { messages: MessageRow[] }) {
  let lastDayKey: string | null = null;
  // Wider gap between bubble groups (4 = 1rem) makes it visually obvious which
  // metadata row belongs to which bubble above it.
  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const dayKey = m.created_at
          ? new Date(m.created_at).toDateString()
          : "unknown";
        const showDivider = dayKey !== lastDayKey;
        lastDayKey = dayKey;
        return (
          <div key={m.id}>
            {showDivider ? <DayDivider iso={m.created_at} /> : null}
            <Bubble message={m} />
          </div>
        );
      })}
    </div>
  );
}

function DayDivider({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const date = new Date(iso);
  const label = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[color:var(--admin-border)]" />
      <span className="admin-mono text-[0.62rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
        {label}
      </span>
      <div className="flex-1 h-px bg-[color:var(--admin-border)]" />
    </div>
  );
}

function Bubble({ message }: { message: MessageRow }) {
  const isOut = message.direction === "outgoing";
  const timeLabel = message.created_at
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.created_at))
    : "";

  // Render markdown for agent (incoming) responses. User prompts (outgoing) are
  // shown as plain text since they don't contain markdown.
  const renderedHtml = useMemo(() => {
    if (isOut) return null;
    const raw = marked.parse(message.message, { async: false }) as string;
    return raw.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
  }, [isOut, message.message]);

  const containerClass = isOut ? "flex justify-end" : "flex justify-start";
  const bubbleClass = isOut
    ? "bg-[rgba(0,255,209,0.06)] border border-[rgba(0,255,209,0.25)] text-[color:var(--admin-text)] rounded-2xl rounded-br-sm"
    : "bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.35)] text-[color:var(--admin-text)] rounded-2xl rounded-bl-sm";
  const metaClass =
    "admin-mono text-[0.6rem] uppercase tracking-widest text-[color:var(--admin-text-muted)] mt-1";

  return (
    <div className={containerClass} title={formatDateTime(message.created_at)}>
      <div className="max-w-[78%] flex flex-col">
        <div className={`px-3.5 py-2 ${bubbleClass}`}>
          {isOut ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.message}
            </div>
          ) : (
            <div
              className="admin-bubble-md text-sm leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: renderedHtml ?? "" }}
            />
          )}
        </div>
        <div className={`${metaClass} ${isOut ? "text-right pr-1" : "pl-1"} inline-flex items-center gap-1.5`}>
          {isOut ? (
            <ArrowUp className="h-2.5 w-2.5 text-[color:var(--admin-accent)]" />
          ) : (
            <ArrowDown className="h-2.5 w-2.5 text-[#c4b5fd]" />
          )}
          <span>{timeLabel}</span>
          {message.response_time_ms ? (
            <span className="text-[color:var(--admin-text-muted)]">
              · {message.response_time_ms}ms
            </span>
          ) : null}
        </div>
      </div>
    </div>
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
    <div className="border border-[color:var(--admin-border)] rounded-md p-2 bg-black/30">
      <div className="admin-eyebrow flex items-center gap-1 mb-0.5">
        <span className={toneClass}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`admin-mono text-base ${toneClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  // Stacked layout (label above value) — values like UUIDs, IPs, and dates
  // are too long to fit on one line in a 320px sidebar without truncating.
  return (
    <div className="flex flex-col gap-0.5">
      <span className="admin-eyebrow admin-eyebrow-bare">{label}</span>
      <span className="break-all">{children}</span>
    </div>
  );
}
