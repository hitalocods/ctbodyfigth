import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
