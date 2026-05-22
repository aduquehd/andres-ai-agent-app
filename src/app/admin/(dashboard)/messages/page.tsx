"use client";

import {
  ArrowDown,
  ArrowUp,
  Filter,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAdminLiveStream } from "@/lib/admin-realtime";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import {
  deleteMessage,
  listMessageCountries,
  listMessages,
  type MessageRow,
  type MessageSort,
} from "@/lib/admin-api";
import { ClientBadge } from "@/lib/client-icons";
import { formatDateTime, truncate } from "@/lib/format";

type DirectionFilter = "all" | "incoming" | "outgoing";

const SORTS: { value: MessageSort; label: string; icon: typeof ArrowDown }[] = [
  { value: "created_desc", label: "Newest", icon: ArrowDown },
  { value: "created_asc", label: "Oldest", icon: ArrowUp },
];

const DIRECTION_LABEL: Record<DirectionFilter, string> = {
  all: "All",
  incoming: "Incoming",
  outgoing: "Outgoing",
};

export default function MessagesPage() {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState<MessageRow | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Filter / sort state
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [country, setCountry] = useState<string>("");
  const [sort, setSort] = useState<MessageSort>("created_desc");
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    listMessageCountries()
      .then(setCountries)
      .catch((err) => {
        console.error("Failed to load countries", err);
      });
  }, []);

  // Bump refreshKey when any filter/sort changes so DataPanel refetches + resets offset.
  useEffect(() => {
    setRefresh((r) => r + 1);
  }, [direction, country, sort]);

  // Live updates from the admin WebSocket: refetch on any event that touches
  // the messages list. DataPanel suppresses the loader on background refreshes
  // so this won't flicker.
  useAdminLiveStream(
    useCallback((event) => {
      if (
        event.type === "message.created" ||
        event.type === "message.deleted" ||
        event.type === "user.deleted"
      ) {
        setRefresh((r) => r + 1);
      }
    }, []),
  );

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) =>
      listMessages({
        q: params.q,
        limit: params.limit,
        offset: params.offset,
        direction: direction === "all" ? undefined : direction,
        country: country || undefined,
        sort,
      }),
    [direction, country, sort],
  );

  async function handleDelete(id: number) {
    if (!confirm(`Delete message ${id}?`)) return;
    try {
      await deleteMessage(id);
      toast.success("Message deleted");
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const directionFilterActive = direction !== "all";

  const directionHeader = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded px-1 -mx-1 -my-0.5 py-0.5 transition-colors hover:bg-[color:var(--admin-accent-hover)] ${
            directionFilterActive
              ? "text-[color:var(--admin-accent)]"
              : "text-[color:var(--admin-text-dim)]"
          }`}
        >
          <span>DIR</span>
          <Filter
            className={`h-3 w-3 ${
              directionFilterActive ? "text-[color:var(--admin-accent)]" : "opacity-60"
            }`}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel className="admin-eyebrow">Direction</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setDirection("all")}
          className={direction === "all" ? "text-[color:var(--admin-accent)]" : ""}
        >
          All
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setDirection("incoming")}
          className={
            direction === "incoming" ? "text-[color:var(--admin-accent)]" : ""
          }
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Incoming
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setDirection("outgoing")}
          className={
            direction === "outgoing" ? "text-[color:var(--admin-accent)]" : ""
          }
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Outgoing
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<MessageRow>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        width: "70px",
        cell: (m) => <span className="admin-id">#{m.id}</span>,
      },
      {
        key: "direction",
        header: directionHeader,
        width: "110px",
        cell: (m) =>
          m.direction === "outgoing" ? (
            <span className="admin-badge admin-badge-accent">
              <ArrowUp className="h-3 w-3" />
              Out
            </span>
          ) : (
            <span className="admin-badge admin-badge-violet">
              <ArrowDown className="h-3 w-3" />
              In
            </span>
          ),
      },
      {
        key: "user_id",
        header: "User",
        width: "80px",
        cell: (m) => (
          <button
            type="button"
            className="admin-id-dim hover:text-[color:var(--admin-accent)] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUserId(m.user_id);
            }}
            aria-label={`Open user ${m.user_id}`}
          >
            #{m.user_id}
          </button>
        ),
      },
      {
        key: "created_at",
        header: "Created",
        cell: (m) => (
          <span className="admin-mono text-xs text-[color:var(--admin-text-dim)] whitespace-nowrap">
            {formatDateTime(m.created_at)}
          </span>
        ),
      },
      {
        key: "message",
        header: "Message",
        cell: (m) => (
          <div className="flex items-start gap-2">
            <span className="text-sm">{truncate(m.message, 80)}</span>
            {m.message.length > 80 ? (
              <button
                type="button"
                className="admin-btn px-2 py-0.5 text-[0.62rem]"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(m);
                }}
              >
                View
              </button>
            ) : null}
          </div>
        ),
      },
      {
        key: "location",
        header: "Loc",
        cell: (m) => (
          <div className="flex items-center gap-2 text-xs">
            {m.city ? <span>{m.city}</span> : null}
            {m.country ? (
              <span className="admin-badge admin-badge-accent">{m.country}</span>
            ) : null}
            {!m.city && !m.country ? (
              <span className="text-[color:var(--admin-text-muted)]">—</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "user_agent",
        header: "Client",
        cell: (m) => <ClientBadge userAgent={m.user_agent} />,
      },
      {
        key: "response_time_ms",
        header: "Latency",
        width: "90px",
        cell: (m) =>
          m.response_time_ms ? (
            <span className="admin-mono text-xs text-[color:var(--admin-accent)]">
              {m.response_time_ms}ms
            </span>
          ) : (
            <span className="text-[color:var(--admin-text-muted)]">—</span>
          ),
      },
      {
        key: "actions",
        header: "",
        width: "60px",
        align: "right",
        cell: (m) => (
          <button
            type="button"
            className="admin-btn admin-btn-icon admin-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(m.id);
            }}
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [direction],
  );

  const filters = (
    <>
      <FilterGroup label="Country">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="admin-input py-1.5 text-xs uppercase tracking-widest font-[Orbitron]"
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterGroup>

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

      {directionFilterActive ? (
        <button
          type="button"
          onClick={() => setDirection("all")}
          className="admin-mono text-[0.62rem] uppercase tracking-widest text-[color:var(--admin-text-dim)] hover:text-[color:var(--admin-accent)] transition-colors"
        >
          dir: {DIRECTION_LABEL[direction]} ✕
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <DataPanel
        title="Messages"
        description="Individual chat messages exchanged with users."
        columns={columns}
        fetcher={fetcher}
        rowKey={(m) => m.id}
        searchPlaceholder="message content | ip"
        emptyMessage="No messages match the current filters."
        refreshKey={refresh}
        filters={filters}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <span className="admin-eyebrow mb-2 block">Transmission</span>
              <span className="admin-mono text-base">Message #{open?.id}</span>
            </DialogTitle>
            <DialogDescription className="admin-mono text-xs">
              {open?.direction === "outgoing" ? "OUT" : "IN"} · user #{open?.user_id} ·{" "}
              {formatDateTime(open?.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm leading-relaxed border border-[color:var(--admin-border)] rounded-md p-4 bg-black/30">
            {open?.message}
          </div>
        </DialogContent>
      </Dialog>

      <UserDetailsDialog
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
