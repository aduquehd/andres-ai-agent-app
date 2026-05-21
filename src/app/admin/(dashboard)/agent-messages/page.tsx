"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataPanel, type Column } from "@/components/admin/DataPanel";
import {
  deleteAgentMessage,
  listAgentMessages,
  type AgentMessageRow,
} from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";

function prettyJSON(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

export default function AgentMessagesPage() {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState<AgentMessageRow | null>(null);

  const fetcher = useCallback(
    (params: { q?: string; limit: number; offset: number }) =>
      listAgentMessages({ limit: params.limit, offset: params.offset }),
    [],
  );

  async function handleDelete(id: number) {
    if (!confirm(`Delete agent message ${id}?`)) return;
    try {
      await deleteAgentMessage(id);
      toast.success("Agent message deleted");
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: Column<AgentMessageRow>[] = [
    {
      key: "id",
      header: "ID",
      width: "70px",
      cell: (m) => <span className="admin-id">#{m.id}</span>,
    },
    {
      key: "user_id",
      header: "User",
      width: "90px",
      cell: (m) => <span className="admin-id-dim">#{m.user_id}</span>,
    },
    {
      key: "preview",
      header: "Payload",
      cell: (m) => (
        <div className="flex items-center gap-2">
          <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
            {m.message_list.length} chars
          </span>
          <button
            type="button"
            className="admin-btn px-2 py-0.5 text-[0.62rem]"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(m);
            }}
          >
            Inspect
          </button>
        </div>
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
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      <DataPanel
        title="Agent Messages"
        description="Pydantic AI message history per user."
        columns={columns}
        fetcher={fetcher}
        rowKey={(m) => m.id}
        searchable={false}
        emptyMessage="No agent messages yet."
        refreshKey={refresh}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              <span className="admin-eyebrow mb-2 block">Payload</span>
              <span className="admin-mono text-base">Agent message #{open?.id}</span>
            </DialogTitle>
            <DialogDescription className="admin-mono text-xs">
              user #{open?.user_id} · {formatDateTime(open?.created_at)}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-[color:var(--admin-border)] bg-black/40 p-4 text-xs leading-relaxed admin-mono text-[color:var(--admin-text)]">
            {open ? prettyJSON(open.message_list) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
