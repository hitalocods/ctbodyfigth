import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-gold-300 to-gold-500 text-black shadow-glow hover:brightness-110",
  secondary:
    "border border-gold-200/15 bg-white/5 text-white hover:bg-white/10 hover:border-gold-200/25",
  ghost: "bg-transparent text-white hover:bg-white/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:pointer-events-none disabled:opacity-50 sm:w-auto",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
