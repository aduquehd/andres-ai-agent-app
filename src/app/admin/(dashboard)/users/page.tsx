"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { DataPanel, type Column } from "@/components/admin/DataPanel";
import { deleteUser, listUsers, type UserRow } from "@/lib/admin-api";
import { formatDateTime, formatUserAgent, truncate } from "@/lib/format";

export default function UsersPage() {
  const [refresh, setRefresh] = useState(0);

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) => listUsers(params),
    [],
  );

  async function handleDelete(id: number) {
    if (!confirm(`Delete user ${id}? This cannot be undone.`)) return;
    try {
      await deleteUser(id);
      toast.success("User deleted");
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: "id",
      header: "ID",
      width: "70px",
      cell: (u) => <span className="admin-id">#{u.id}</span>,
    },
    {
      key: "username",
      header: "Username",
      cell: (u) => <span className="admin-mono text-xs">{truncate(u.username, 18)}</span>,
    },
    {
      key: "browser_id",
      header: "Browser",
      cell: (u) => <span className="admin-id-dim">{truncate(u.browser_id, 18)}</span>,
    },
    {
      key: "ip_address",
      header: "IP",
      cell: (u) => (
        <span className="admin-mono text-xs">{u.ip_address ?? "—"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
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
      cell: (u) => (
        <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
          {formatUserAgent(u.user_agent) || "—"}
        </span>
      ),
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
            handleDelete(u.id);
          }}
          aria-label="Delete user"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
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
  );
}
