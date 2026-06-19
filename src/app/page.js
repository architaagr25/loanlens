"use client";

// TEMPORARY Phase 2 sync demo — proves cross-tab state sharing works before the
// full workspace UI is built (Phase 4+). This page is replaced later.
import { useSharedState } from "@/hooks/useSharedState";
import { formatINR } from "@/lib/format";

export default function Page() {
  const {
    state,
    hydrated,
    setField,
    toggleTheme,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSharedState();

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card p-8 w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold">LoanLens — Sync Demo</h1>
          <p className="text-muted text-sm">
            Open this page in a second tab. Changes sync instantly via the
            BroadcastChannel API. {hydrated ? "" : "(hydrating…)"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Loan Amount: {formatINR(state.amount)}
          </label>
          <input
            type="range"
            min={10000}
            max={5000000}
            step={10000}
            value={state.amount}
            onChange={(e) => setField("amount", Number(e.target.value))}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium"
          >
            Theme: {state.theme}
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-4 py-2 rounded-lg card-muted text-sm font-medium disabled:opacity-40"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-4 py-2 rounded-lg card-muted text-sm font-medium disabled:opacity-40"
          >
            Redo
          </button>
        </div>

        <p className="text-muted text-xs">
          Drag the slider in one tab → watch the other update. Toggle theme →
          both tabs flip. Undo/Redo → reflected everywhere.
        </p>
      </div>
    </main>
  );
}
