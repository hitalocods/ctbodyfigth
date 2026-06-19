"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  className,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col rounded-[1.75rem] border border-white/10 bg-[#0c0c0c] p-5 shadow-glow sm:max-h-[calc(100dvh-3rem)] sm:p-6",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">{children}</div>
        {onClose ? (
          <div className="mt-6 flex justify-end pb-[env(safe-area-inset-bottom)]">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Fechar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
