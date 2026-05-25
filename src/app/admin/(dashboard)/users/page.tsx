"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ConversationDetailDialog } from "@/components/admin/ConversationDetailDialog";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import { deleteUser, listUsers, type UserRow } from "@/lib/admin-api";
import { useAdminLiveStream } from "@/lib/admin-realtime";
import { ClientBadge } from "@/lib/client-icons";
import { formatDateTime } from "@/lib/format";

export default function UsersPage() {
  const [refresh, setRefresh] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) => listUsers(params),
    [],
  );

  useAdminLiveStream(
    useCallback((event) => {
      if (event.type === "user.created" || event.type === "user.deleted") {
        setRefresh((r) => r + 1);
      }
    }, []),
  );

  async function performDelete() {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    try {
      await deleteUser(id);
      toast.success("User deleted");
      setRefresh((r) => r + 1);
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: "id",
      header: "ID",
      width: "70px",
      cell: (u) => (
        <button
          type="button"
          className="admin-id hover:text-[color:var(--admin-accent-strong)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUserId(u.id);
          }}
          aria-label={`Open user ${u.id}`}
        >
          #{u.id}
        </button>
      ),
    },
    {
      key: "username",
      header: "Username",
      width: "200px",
      cell: (u) => (
        <span
          className="admin-mono text-xs text-[color:var(--admin-text)] block truncate"
          title={u.username}
        >
          {u.username}
        </span>
      ),
    },
    {
      key: "browser_id",
      header: "Browser",
      width: "200px",
      cell: (u) => (
        <span
          className="admin-id-dim block truncate"
          title={u.browser_id}
        >
          {u.browser_id}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP",
      width: "140px",
      cell: (u) => (
        <span className="admin-mono text-xs whitespace-nowrap">
          {u.ip_address ?? "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      width: "180px",
      cell: (u) => (
        <div className="flex items-center gap-2">
          {u.city ? (
            <span className="text-sm text-[color:var(--admin-text)]">{u.city}</span>
          ) : null}
          {u.country ? (
            <span className="admin-badge admin-badge-accent">{u.country}</span>
          ) : null}
          {!u.city && !u.country ? (
            <span className="text-[color:var(--admin-text-muted)]">—</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "user_agent",
      header: "Client",
      cell: (u) => <ClientBadge userAgent={u.user_agent} />,
    },
    {
      key: "created_at",
      header: "Created",
      cell: (u) => (
        <span className="admin-mono text-xs text-[color:var(--admin-text-dim)] whitespace-nowrap">
          {formatDateTime(u.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right",
      cell: (u) => (
        <button
          type="button"
          className="admin-btn admin-btn-icon admin-btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDeleteId(u.id);
          }}
          aria-label="Delete user"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      <DataPanel
        title="Users"
        description="Visitors identified by their browser UUID."
        columns={columns}
        fetcher={fetcher}
        rowKey={(u) => u.id}
        searchPlaceholder="username | browser_id | ip | country | city"
        emptyMessage="No users yet."
        refreshKey={refresh}
      />

      <ConversationDetailDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onDeleted={() => setRefresh((r) => r + 1)}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title={`Delete user #${confirmDeleteId ?? ""}?`}
        description="This cascades to all of the user's messages and agent records. This cannot be undone."
        confirmLabel="Delete user"
        variant="destructive"
        onConfirm={performDelete}
      />
    </>
  );
}
