// The shared workspace as a plain object so it's easy to test and easy to sync.
//
//   { present, past[], future[], rev }
//   present -> what every tab shows right now
//   past    -> undo stack (capped at MAX_HISTORY)
//   future  -> redo stack
//   rev     -> goes up on every change; lets a tab ignore older incoming docs
//
// Since the whole thing (history included) is what syncs across tabs, undo just
// works across tabs for free.

import { DEFAULT_STATE } from "./constants";

export const MAX_HISTORY = 50;

// pull out just the fields we sync (leave the history bookkeeping out)
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

// start a fresh doc with empty history
export function createDoc(present = DEFAULT_STATE) {
  return {
    present: pickPresent(present),
    past: [],
    future: [],
    rev: 0,
  };
}

// apply a partial change. push the old present onto the undo stack, wipe redo
// (a new edit kills the redo path), bump rev. no-op if nothing changed so we
// don't spam the history.
export function commit(doc, patch) {
  const nextPresent = { ...doc.present, ...patch };

  if (shallowEqual(nextPresent, doc.present)) return doc;

  const past = [...doc.past, doc.present];
  if (past.length > MAX_HISTORY) past.shift();

  return {
    present: nextPresent,
    past,
    future: [],
    rev: doc.rev + 1,
  };
}

// step back. returns the same doc if there's nothing to undo.
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

// step forward.
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

// is there anything to undo / redo (for enabling the buttons)
export function canUndo(doc) {
  return doc.past.length > 0;
}

export function canRedo(doc) {
  return doc.future.length > 0;
}

// shallow compare - arrays are compared by reference since setters always hand
// us new arrays when something actually changes
function shallowEqual(a, b) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
