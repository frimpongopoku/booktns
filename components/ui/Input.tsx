import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: "var(--tx2)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          "w-full px-3 py-2 rounded-[var(--r)] text-sm transition-all duration-150",
          "border focus:outline-none focus:ring-1",
          error
            ? "border-red-400 focus:ring-red-400"
            : "focus:ring-[var(--ac)]",
          className
        )}
        style={{
          background: "var(--bg2)",
          color: "var(--tx)",
          borderColor: error ? undefined : "var(--bd)",
        }}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--tx3)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: "var(--tx2)" }}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx(
          "w-full px-3 py-2 rounded-[var(--r)] text-sm transition-all duration-150 resize-none",
          "border focus:outline-none focus:ring-1",
          error
            ? "border-red-400 focus:ring-red-400"
            : "focus:ring-[var(--ac)]",
          className
        )}
        style={{
          background: "var(--bg2)",
          color: "var(--tx)",
          borderColor: error ? undefined : "var(--bd)",
        }}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--tx3)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
