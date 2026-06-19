import { describe, it, expect } from "vitest";
import {
  createDoc,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
  MAX_HISTORY,
} from "./sharedDoc";

describe("createDoc", () => {
  it("starts with no history and rev 0", () => {
    const doc = createDoc();
    expect(doc.past).toEqual([]);
    expect(doc.future).toEqual([]);
    expect(doc.rev).toBe(0);
    expect(canUndo(doc)).toBe(false);
    expect(canRedo(doc)).toBe(false);
  });
});

describe("commit", () => {
  it("applies a patch and records history", () => {
    let doc = createDoc();
    const before = doc.present.amount;
    doc = commit(doc, { amount: 2000000 });
    expect(doc.present.amount).toBe(2000000);
    expect(doc.past.length).toBe(1);
    expect(doc.past[0].amount).toBe(before);
    expect(doc.rev).toBe(1);
    expect(canUndo(doc)).toBe(true);
  });

  it("is a no-op when nothing changes (no history pollution)", () => {
    let doc = createDoc();
    const same = doc.present.amount;
    const next = commit(doc, { amount: same });
    expect(next).toBe(doc); // identical reference returned
    expect(next.past.length).toBe(0);
  });

  it("clears the redo stack on a fresh edit", () => {
    let doc = createDoc();
    doc = commit(doc, { rate: 12 });
    doc = undo(doc); // future now has one entry
    expect(canRedo(doc)).toBe(true);
    doc = commit(doc, { rate: 15 }); // fresh edit
    expect(canRedo(doc)).toBe(false);
  });

  it("bounds history to MAX_HISTORY entries", () => {
    let doc = createDoc();
    for (let i = 1; i <= MAX_HISTORY + 10; i++) {
      doc = commit(doc, { tenure: (i % 84) + 1 });
    }
    expect(doc.past.length).toBeLessThanOrEqual(MAX_HISTORY);
  });
});

describe("undo / redo", () => {
  it("reverts the last change and can reapply it", () => {
    let doc = createDoc();
    const original = doc.present.amount;
    doc = commit(doc, { amount: 3000000 });

    doc = undo(doc);
    expect(doc.present.amount).toBe(original);
    expect(canRedo(doc)).toBe(true);

    doc = redo(doc);
    expect(doc.present.amount).toBe(3000000);
  });

  it("undo on empty history returns the same doc", () => {
    const doc = createDoc();
    expect(undo(doc)).toBe(doc);
  });

  it("redo on empty future returns the same doc", () => {
    const doc = createDoc();
    expect(redo(doc)).toBe(doc);
  });

  it("supports multi-step undo across several edits", () => {
    let doc = createDoc();
    doc = commit(doc, { amount: 1000000 });
    doc = commit(doc, { amount: 2000000 });
    doc = commit(doc, { amount: 2500000 });
    expect(doc.present.amount).toBe(2500000);

    doc = undo(doc);
    expect(doc.present.amount).toBe(2000000);
    doc = undo(doc);
    expect(doc.present.amount).toBe(1000000);
  });

  it("every mutation bumps rev (used for cross-tab race resolution)", () => {
    let doc = createDoc();
    const r0 = doc.rev;
    doc = commit(doc, { theme: "dark" });
    const r1 = doc.rev;
    doc = undo(doc);
    const r2 = doc.rev;
    expect(r1).toBeGreaterThan(r0);
    expect(r2).toBeGreaterThan(r1);
  });
});
