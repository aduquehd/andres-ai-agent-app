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
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import { KnowledgeBaseForm } from "@/components/admin/KnowledgeBaseForm";
import {
  deleteKnowledgeBase,
  listKnowledgeBase,
  type KnowledgeBaseRow,
} from "@/lib/admin-api";
import { formatDateTime, truncate } from "@/lib/format";

export default function KnowledgeBasePage() {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBaseRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) => listKnowledgeBase(params),
    [],
  );

  async function performDelete() {
    if (confirmDeleteId == null) return;
    try {
      await deleteKnowledgeBase(confirmDeleteId);
      toast.success("Entry deleted");
      setRefresh((r) => r + 1);
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: KnowledgeBaseRow) {
    setEditing(row);
    setOpen(true);
  }

  function handleSaved() {
    setOpen(false);
    setEditing(null);
    setRefresh((r) => r + 1);
  }

  const columns: Column<KnowledgeBaseRow>[] = [
    {
      key: "id",
      header: "ID",
      width: "70px",
      cell: (k) => <span className="admin-id">#{k.id}</span>,
    },
    {
      key: "type",
      header: "Type",
      width: "120px",
      cell: (k) =>
        k.type ? (
          <span className="admin-badge admin-badge-violet">{k.type}</span>
        ) : (
          <span className="text-[color:var(--admin-text-muted)]">—</span>
        ),
    },
    {
      key: "title",
      header: "Title",
      cell: (k) => <span className="font-medium text-[color:var(--admin-text)]">{k.title}</span>,
    },
    {
      key: "content",
      header: "Content",
      cell: (k) => (
        <span className="text-sm text-[color:var(--admin-text-dim)]">
          {truncate(k.content, 100)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      cell: (k) => (
        <span className="admin-mono text-xs text-[color:var(--admin-text-dim)] whitespace-nowrap">
          {formatDateTime(k.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      align: "right",
      cell: (k) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            className="admin-btn admin-btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(k);
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
              setConfirmDeleteId(k.id);
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
        title="Knowledge Base"
        description="Vector-indexed entries used by the RAG pipeline. Click a row to edit."
        columns={columns}
        fetcher={fetcher}
        rowKey={(k) => k.id}
        searchPlaceholder="title | content"
        emptyMessage="No knowledge base entries yet."
        refreshKey={refresh}
        onRowClick={openEdit}
        toolbarActions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New Entry
          </button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle asChild>
              <div className="flex flex-col gap-1">
                <span className="admin-eyebrow">
                  {editing ? "Edit Entry" : "New Entry"}
                </span>
                <span className="admin-mono text-base">
                  {editing ? `kb_entry #${editing.id}` : "kb_entry"}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <KnowledgeBaseForm
            initial={editing}
            onSaved={handleSaved}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title={`Delete knowledge base entry #${confirmDeleteId ?? ""}?`}
        description="This will permanently remove the entry from the knowledge base. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={performDelete}
      />
    </>
  );
}
