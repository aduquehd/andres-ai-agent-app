"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import { AgentContextForm } from "@/components/admin/AgentContextForm";
import {
  deleteAgentContext,
  listAgentContexts,
  type AgentContextRow,
} from "@/lib/admin-api";
import { formatDateTime, truncate } from "@/lib/format";

export default function AgentContextsPage() {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgentContextRow | null>(null);

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) =>
      listAgentContexts({ limit: params.limit, offset: params.offset }),
    [],
  );

  async function handleDelete(id: number) {
    if (!confirm(`Delete agent context ${id}?`)) return;
    try {
      await deleteAgentContext(id);
      toast.success("Agent context deleted");
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: AgentContextRow) {
    setEditing(row);
    setOpen(true);
  }

  function handleSaved() {
    setOpen(false);
    setEditing(null);
    setRefresh((r) => r + 1);
  }

  const columns: Column<AgentContextRow>[] = [
    {
      key: "id",
      header: "ID",
      width: "70px",
      cell: (a) => <span className="admin-id">#{a.id}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      cell: (a) =>
        a.status ? (
          <span className="admin-badge admin-badge-success">Active</span>
        ) : (
          <span className="admin-badge">Inactive</span>
        ),
    },
    {
      key: "agent_prompt",
      header: "Prompt",
      cell: (a) => (
        <span className="text-sm text-[color:var(--admin-text-dim)]">
          {a.agent_prompt ? truncate(a.agent_prompt, 140) : (
            <span className="text-[color:var(--admin-text-muted)]">—</span>
          )}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      cell: (a) => (
        <span className="admin-mono text-xs text-[color:var(--admin-text-dim)] whitespace-nowrap">
          {formatDateTime(a.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      align: "right",
      cell: (a) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            className="admin-btn admin-btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(a);
            }}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-icon admin-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(a.id);
            }}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataPanel
        title="Agent Contexts"
        description="Agent system prompts and active context entries. Click a row to edit."
        columns={columns}
        fetcher={fetcher}
        rowKey={(a) => a.id}
        searchable={false}
        emptyMessage="No agent contexts yet."
        refreshKey={refresh}
        onRowClick={openEdit}
        toolbarActions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New Context
          </button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              <span className="admin-eyebrow mb-2 block">
                {editing ? "Edit Context" : "New Context"}
              </span>
              <span className="admin-mono text-base">
                {editing ? `agent_ctx #${editing.id}` : "agent_ctx"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <AgentContextForm
            initial={editing}
            onSaved={handleSaved}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
