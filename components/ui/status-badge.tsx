import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type StatusBadgeState = "ativo" | "vencido" | "congelado";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusBadgeState;
}

const styles: Record<StatusBadgeState, string> = {
  ativo: "border-status-active/25 bg-status-active/12 text-status-active",
  vencido: "border-status-expired/25 bg-status-expired/12 text-status-expired",
  congelado: "border-status-frozen/25 bg-status-frozen/12 text-status-frozen",
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        styles[status],
        className,
      )}
      {...props}
    />
  );
}
