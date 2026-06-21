"use client";

import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function OtpInput({ value, onChange }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        const next = [...value];
        next[index - 1] = "";
        onChange(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...value];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    onChange(next);
    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-xl font-medium rounded-[var(--r)] border transition-all duration-150 focus:outline-none focus:ring-2"
          style={{
            background: "var(--bg2)",
            color: "var(--tx)",
            borderColor: value[i] ? "var(--ac)" : "var(--bd)",
            boxShadow: value[i] ? "0 0 0 2px var(--ac-bg)" : undefined,
          }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
