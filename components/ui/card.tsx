import type { HTMLAttributes } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  statusColor?: "default" | "active" | "warning" | "expired" | "frozen";
}

const statusStyles = {
  default: "border-white/10 bg-white/5",
  active: "border-status-active/30 bg-status-active/10",
  warning: "border-status-warning/30 bg-status-warning/10",
  expired: "border-status-expired/30 bg-status-expired/10",
  frozen: "border-status-frozen/30 bg-status-frozen/10",
};

export function Card({ className, statusColor = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-3xl p-5 shadow-glow backdrop-blur-sm sm:p-6",
        statusStyles[statusColor],
        className,
      )}
      {...props}
    />
  );
}
