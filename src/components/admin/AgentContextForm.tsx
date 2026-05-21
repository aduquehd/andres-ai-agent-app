"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createAgentContext,
  updateAgentContext,
  type AgentContextRow,
} from "@/lib/admin-api";

interface Props {
  initial?: AgentContextRow | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function AgentContextForm({ initial, onSaved, onCancel }: Props) {
  const [status, setStatus] = useState<boolean>(initial?.status ?? false);
  const [agentPrompt, setAgentPrompt] = useState(initial?.agent_prompt ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { status, agent_prompt: agentPrompt || null };
      if (initial) {
        await updateAgentContext(initial.id, payload);
        toast.success("Agent context updated");
      } else {
        await createAgentContext(payload);
        toast.success("Agent context created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 mt-2">
      <div>
        <label className="admin-label">Status</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus(true)}
            className={`admin-btn ${status ? "admin-btn-primary" : ""}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatus(false)}
            className={`admin-btn ${!status ? "admin-btn-primary" : ""}`}
          >
            Inactive
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="ac-prompt" className="admin-label">Agent Prompt</label>
        <textarea
          id="ac-prompt"
          value={agentPrompt}
          onChange={(e) => setAgentPrompt(e.target.value)}
          rows={14}
          placeholder="// system prompt used by the agent..."
          className="admin-textarea"
        />
      </div>

      <div className="flex justify-end gap-2 -mx-6 px-6 pt-4 border-t border-[color:var(--admin-border)]">
        <button
          type="button"
          className="admin-btn"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create"}
        </button>
      </div>
    </form>
  );
}
