"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Modal } from "./modal";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="flex gap-3">
        <div className="h-fit rounded-full bg-red-50 p-2 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
