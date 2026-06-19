// ──────────────────────────────────────────────────────────────────────────
// Shared document model — the synced "workspace" as a pure, testable object.
//
// Shape:  { present, past[], future[], rev }
//   present : the current field values every tab reads/renders
//   past    : prior presents (for undo), bounded to MAX_HISTORY
//   future  : undone presents (for redo)
//   rev     : monotonically increasing revision; used to resolve cross-tab races
//             (a tab ignores any incoming doc whose rev is not newer)
//
// Keeping this pure (no React, no browser) means undo/redo is unit-testable and
// the same document syncs verbatim across tabs — so cross-tab undo is automatic.
// ──────────────────────────────────────────────────────────────────────────

import { DEFAULT_STATE } from "./constants";

export const MAX_HISTORY = 50;

// The fields that make up the synced "present" (no history bookkeeping here).
function pickPresent(state) {
  const {
    amount,
    rate,
    tenure,
    mode,
    theme,
    scenarios,
    prepayments,
    lastActiveScenarioId,
  } = state;
  return {
    amount,
    rate,
    tenure,
    mode,
    theme,
    scenarios,
    prepayments,
    lastActiveScenarioId,
  };
}

// Build a fresh document from a present (defaults if none provided).
export function createDoc(present = DEFAULT_STATE) {
  return {
    present: pickPresent(present),
    past: [],
    future: [],
    rev: 0,
  };
}

// Commit a new present: push the old present onto `past`, clear `future`
// (a fresh edit invalidates the redo stack), bump the revision.
// `patch` is a partial set of fields merged into the current present.
export function commit(doc, patch) {
  const nextPresent = { ...doc.present, ...patch };

  // No-op if nothing actually changed (avoids polluting history).
  if (shallowEqual(nextPresent, doc.present)) return doc;

  const past = [...doc.past, doc.present];
  if (past.length > MAX_HISTORY) past.shift(); // bound the history

  return {
    present: nextPresent,
    past,
    future: [],
    rev: doc.rev + 1,
  };
}

// Move one step back in history. Returns the same doc if nothing to undo.
export function undo(doc) {
  if (doc.past.length === 0) return doc;
  const previous = doc.past[doc.past.length - 1];
  return {
    present: previous,
    past: doc.past.slice(0, -1),
    future: [doc.present, ...doc.future],
    rev: doc.rev + 1,
  };
}

// Move one step forward in history. Returns the same doc if nothing to redo.
export function redo(doc) {
  if (doc.future.length === 0) return doc;
  const next = doc.future[0];
  return {
    present: next,
    past: [...doc.past, doc.present],
    future: doc.future.slice(1),
    rev: doc.rev + 1,
  };
}

export function canUndo(doc) {
  return doc.past.length > 0;
}

export function canRedo(doc) {
  return doc.future.length > 0;
}

// Shallow equality over the present's top-level fields (arrays compared by
// reference — setters always pass new arrays when contents change).
function shallowEqual(a, b) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
