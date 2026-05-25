"use client";

import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  const confirmClass =
    variant === "destructive"
      ? "admin-btn admin-btn-danger"
      : "admin-btn admin-btn-primary";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle asChild>
            <div className="flex flex-col gap-1">
              <span className="admin-eyebrow">Confirm</span>
              <span className="admin-mono text-base text-[color:var(--admin-text)]">
                {title}
              </span>
            </div>
          </DialogTitle>
          {description ? (
            <DialogDescription asChild>
              <div className="text-sm text-[color:var(--admin-text-dim)] leading-relaxed">
                {description}
              </div>
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            className="admin-btn"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${confirmClass} inline-flex items-center gap-1.5`}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
