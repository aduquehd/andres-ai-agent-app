"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createKnowledgeBase,
  updateKnowledgeBase,
  type KnowledgeBasePayload,
  type KnowledgeBaseRow,
  type KnowledgeBaseType,
} from "@/lib/admin-api";

const TYPES: KnowledgeBaseType[] = ["hobbies", "foods"];

interface Props {
  initial?: KnowledgeBaseRow | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function KnowledgeBaseForm({ initial, onSaved, onCancel }: Props) {
  const [type, setType] = useState<KnowledgeBaseType>(initial?.type ?? "hobbies");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    const payload: KnowledgeBasePayload = { type, title: title.trim(), content };
    try {
      if (initial) {
        await updateKnowledgeBase(initial.id, payload);
        toast.success("Updated. Embedding regenerated.");
      } else {
        await createKnowledgeBase(payload);
        toast.success("Created. Embedding generated.");
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
        <label className="admin-label">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`admin-btn ${type === t ? "admin-btn-primary" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="kb-title" className="admin-label">Title</label>
        <input
          id="kb-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="kb-content" className="admin-label">Content</label>
        <textarea
          id="kb-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          required
          className="admin-textarea"
        />
        <p className="mt-2 text-[0.66rem] tracking-[0.18em] uppercase font-mono text-[color:var(--admin-text-muted)]">
          // embedding will regenerate on save
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--admin-border)] -mx-6 px-6 pt-4">
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
