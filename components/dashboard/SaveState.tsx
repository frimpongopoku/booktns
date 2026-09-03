"use client";

import { Check, Zap } from "lucide-react";
import Button from "@/components/ui/Button";

// Marks a control that writes the moment you change it, so nobody hunts for
// a Save button that doesn't apply to it. Pair it with the field's label.
export function AutoSaveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium align-middle"
      style={{ background: "var(--green-bg)", color: "var(--green)" }}
    >
      <Zap size={9} />
      Saves automatically
    </span>
  );
}

// Marks a group of fields that only persist when the Save bar is used —
// the counterpart to AutoSaveBadge, so every field on the page says which
// of the two it is rather than leaving the reader to guess.
export function ManualSaveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium align-middle"
      style={{ background: "var(--bg3)", color: "var(--tx3)" }}
    >
      Needs saving
    </span>
  );
}

interface UnsavedChangesBarProps {
  dirty: boolean;
  saving: boolean;
  justSaved: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

// A docked bar that appears only once something has actually changed. This
// replaces a permanently-visible "Save Changes" button, which gave no signal
// about whether there was anything to save or whether an edit had already
// been written — the specific confusion this is here to remove.
//
// `sticky bottom-0` rather than `fixed`: it docks to the bottom of the
// settings panel's own scroll flow, so it can't cover the mobile bottom nav.
export function UnsavedChangesBar({ dirty, saving, justSaved, onSave, onDiscard }: UnsavedChangesBarProps) {
  if (justSaved && !dirty) {
    return (
      <div
        className="sticky bottom-4 z-20 flex items-center gap-2 px-4 py-3 rounded-[var(--rl)]"
        style={{ background: "var(--green-bg)", border: "1px solid var(--green)", boxShadow: "var(--shadow-sm)" }}
      >
        <Check size={15} style={{ color: "var(--green)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--green)" }}>Changes saved</p>
      </div>
    );
  }

  if (!dirty) return null;

  return (
    <div
      className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-[var(--rl)]"
      style={{ background: "var(--bg2)", border: "1px solid var(--ac)", boxShadow: "var(--shadow-sm)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
        You have unsaved changes
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button size="sm" loading={saving} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
