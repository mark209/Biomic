"use client";

import { X } from "lucide-react";
import { Button } from "./button";

export function Modal({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-line bg-white shadow-soft sm:rounded-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
