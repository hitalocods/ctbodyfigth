import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  leadingIcon?: ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  helperText,
  leadingIcon,
  className,
  containerClassName,
  id,
  ...props
}: InputProps) {
  return (
    <div className={cn("min-w-0 w-full", containerClassName)}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-white/80" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition focus-within:border-gold-200/30 focus-within:bg-black/60">
        {leadingIcon ? <span className="shrink-0 text-gold-200">{leadingIcon}</span> : null}
        <input
          id={id}
          className={cn(
            "min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30",
            className,
          )}
          {...props}
        />
      </div>
      {helperText ? <p className="mt-2 text-xs text-white/45">{helperText}</p> : null}
    </div>
  );
}
