"use client";

import { ArrowDown, ArrowUp, Clock, Hash } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConversationDetailDialog } from "@/components/admin/ConversationDetailDialog";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import {
  listConversations,
  type ConversationRow,
  type ConversationSort,
} from "@/lib/admin-api";
import { useAdminLiveStream } from "@/lib/admin-realtime";
import { formatDateTime, truncate } from "@/lib/format";

const SORTS: { value: ConversationSort; label: string; icon: typeof Clock }[] = [
  { value: "last_activity_desc", label: "Recent activity", icon: Clock },
  { value: "messages_desc", label: "Most messages", icon: Hash },
  { value: "user_newest", label: "Newest user", icon: ArrowDown },
];

export default function ConversationsPage() {
  const [refresh, setRefresh] = useState(0);
  const [sort, setSort] = useState<ConversationSort>("last_activity_desc");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    setRefresh((r) => r + 1);
  }, [sort]);

  useAdminLiveStream(
    useCallback((event) => {
      if (
        event.type === "message.created" ||
        event.type === "message.deleted" ||
        event.type === "user.deleted" ||
        event.type === "user.created"
      ) {
        setRefresh((r) => r + 1);
      }
    }, []),
  );

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) =>
      listConversations({
        q: params.q,
        limit: params.limit,
        offset: params.offset,
        sort,
      }),
    [sort],
  );

  const columns: Column<ConversationRow>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        width: "260px",
        cell: (c) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <button
              type="button"
              className="admin-id text-left hover:text-[color:var(--admin-accent-strong)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUserId(c.user.id);
              }}
            >
              #{c.user.id}
            </button>
            <span className="admin-mono text-[0.7rem] text-[color:var(--admin-text-dim)] truncate">
              {truncate(c.user.username, 24)}
            </span>
          </div>
        ),
      },
      {
        key: "messages",
        header: "Messages",
        width: "160px",
        cell: (c) => (
          <div className="flex items-center gap-2 admin-mono text-xs">
            <span className="text-[color:var(--admin-text)]">
              {c.messages_total.toLocaleString()}
            </span>
            <span className="text-[color:var(--admin-text-muted)]">·</span>
            <span className="inline-flex items-center gap-0.5 text-[color:var(--admin-accent)]">
              <ArrowUp className="h-3 w-3" />
              {c.messages_outgoing}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#c4b5fd]">
              <ArrowDown className="h-3 w-3" />
              {c.messages_incoming}
            </span>
          </div>
        ),
      },
      {
        key: "last_activity",
        header: "Last activity",
        width: "180px",
        cell: (c) => (
          <span className="admin-mono text-xs text-[color:var(--admin-text-dim)] whitespace-nowrap">
            {formatDateTime(c.last_message_at) || "—"}
          </span>
        ),
      },
      {
        key: "location",
        header: "Loc",
        width: "140px",
        cell: (c) => (
          <div className="flex items-center gap-2 text-xs">
            {c.user.city ? <span>{c.user.city}</span> : null}
            {c.user.country ? (
              <span className="admin-badge admin-badge-accent">{c.user.country}</span>
            ) : null}
            {!c.user.city && !c.user.country ? (
              <span className="text-[color:var(--admin-text-muted)]">—</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "preview",
        header: "Last message",
        width: "420px",
        cell: (c) => {
          if (!c.preview) {
            return <span className="text-[color:var(--admin-text-muted)]">—</span>;
          }
          const isOut = c.preview.direction === "outgoing";
          return (
            <div className="flex items-center gap-2 max-w-[400px]" title={c.preview.message}>
              {isOut ? (
                <ArrowUp className="h-3 w-3 text-[color:var(--admin-accent)] shrink-0" />
              ) : (
                <ArrowDown className="h-3 w-3 text-[#c4b5fd] shrink-0" />
              )}
              <span className="text-xs text-[color:var(--admin-text-dim)] truncate italic">
                &ldquo;{c.preview.message}&rdquo;
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const filters = (
    <FilterGroup label="Sort">
      {SORTS.map((s) => {
        const Icon = s.icon;
        return (
          <FilterPill
            key={s.value}
            active={sort === s.value}
            onClick={() => setSort(s.value)}
          >
            <Icon className="h-3 w-3" />
            {s.label}
          </FilterPill>
        );
      })}
    </FilterGroup>
  );

  return (
    <>
      <DataPanel
        title="Conversations"
        description="One row per user — all the messages they've exchanged with the agent. Click anywhere on a row to open the full thread."
        columns={columns}
        fetcher={fetcher}
        rowKey={(c) => c.user.id}
        searchPlaceholder="username | browser_id | ip | country | city"
        emptyMessage="No conversations yet."
        refreshKey={refresh}
        filters={filters}
        onRowClick={(c) => setSelectedUserId(c.user.id)}
      />

      <ConversationDetailDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onDeleted={() => setRefresh((r) => r + 1)}
      />
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.62rem] tracking-[0.18em] uppercase font-[Orbitron] text-[color:var(--admin-text-muted)]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-btn ${active ? "admin-btn-primary" : ""}`}
      style={{ padding: "0.35rem 0.7rem", fontSize: "0.62rem" }}
    >
      {children}
    </button>
  );
}
