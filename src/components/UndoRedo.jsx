"use client";

import { useEffect } from "react";
import { useSharedState } from "@/hooks/useSharedState";

// undo/redo buttons + keyboard shortcuts. history is part of the synced doc, so
// hitting undo rolls back every tab at once.
//   Ctrl/Cmd+Z        -> undo
//   Ctrl/Cmd+Shift+Z  -> redo  (Ctrl+Y too)
export default function UndoRedo() {
  const { undo, redo, canUndo, canRedo } = useSharedState();

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;

      // leave normal text undo alone when you're typing in a field
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="card-muted p-1 inline-flex gap-1 rounded-full">
      <IconBtn label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
        </svg>
      </IconBtn>
      <IconBtn label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 14l5-5-5-5" />
          <path d="M20 9H9a5 5 0 0 0 0 10h1" />
        </svg>
      </IconBtn>
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-8 h-8 grid place-items-center rounded-full hover:opacity-80 transition disabled:opacity-30"
    >
      {children}
    </button>
  );
}
