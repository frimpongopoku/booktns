"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--r)] transition-all duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary: "text-white disabled:opacity-50",
    secondary: "disabled:opacity-50",
    ghost: "disabled:opacity-50",
    danger: "disabled:opacity-50",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--ac)",
      color: "white",
    },
    secondary: {
      background: "var(--bg3)",
      color: "var(--tx)",
    },
    ghost: {
      background: "transparent",
      color: "var(--tx2)",
    },
    danger: {
      background: "rgba(185,28,28,0.08)",
      color: "#B91C1C",
    },
  };

  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {children}
    </button>
  );
}
