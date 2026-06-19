"use client";

// ──────────────────────────────────────────────────────────────────────────
// useSharedState — the cross-tab shared workspace.
//
// One React context owns ONE BroadcastChannel and ONE shared document. Every
// state change is committed to the pure document model, then broadcast to all
// other tabs; incoming changes are applied without re-broadcasting (no loops).
//
// - Live sync .............. BroadcastChannel (no server, no polling)
// - New-tab bootstrap ...... localStorage mirror (read once on mount)
// - Undo/redo across tabs .. the whole {present,past,future} doc is what syncs
// - SSR-safe ............... first render uses deterministic defaults; browser
//                            APIs are touched only inside effects
// - Race resolution ........ (rev, ts) ordering — last write wins on a tie
// ──────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  createDoc,
  commit,
  undo as undoDoc,
  redo as redoDoc,
  canUndo,
  canRedo,
} from "@/lib/sharedDoc";
import { CHANNEL_NAME, STORAGE_KEY, DEFAULT_STATE } from "@/lib/constants";
import { encodeInputs, decodeInputs } from "@/lib/url";

const SharedStateContext = createContext(null);

// Read the persisted present from localStorage (browser only).
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Stored as a flat "present" so the theme-bootstrap script can read .theme.
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return null;
  }
}

// Persist just the present (flat) so a fresh tab/reload restores values+theme.
function writeStored(present) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(present));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function SharedStateProvider({ children }) {
  // Deterministic first render (matches SSR) → no hydration mismatch.
  const [doc, setDoc] = useState(() => createDoc(DEFAULT_STATE));
  const [hydrated, setHydrated] = useState(false);

  const channelRef = useRef(null);
  const docRef = useRef(doc); // latest doc, for use inside event handlers
  const metaRef = useRef({ rev: 0, ts: 0 }); // last accepted (rev, ts)

  // Keep the ref in step with state so handlers never read a stale doc.
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // Apply a doc that originated locally: persist + broadcast to other tabs.
  const applyLocal = useCallback((nextDoc) => {
    if (nextDoc === docRef.current) return; // no-op commit
    const ts = Date.now();
    docRef.current = nextDoc;
    metaRef.current = { rev: nextDoc.rev, ts };
    setDoc(nextDoc);
    writeStored(nextDoc.present);
    channelRef.current?.postMessage({ type: "STATE", doc: nextDoc, ts });
  }, []);

  // Apply a doc that arrived from another tab: update locally, do NOT re-broadcast.
  const applyRemote = useCallback((incoming, ts) => {
    const cur = metaRef.current;
    const isNewer =
      incoming.rev > cur.rev || (incoming.rev === cur.rev && ts > cur.ts);
    if (!isNewer) return;
    docRef.current = incoming;
    metaRef.current = { rev: incoming.rev, ts };
    setDoc(incoming);
    writeStored(incoming.present);
  }, []);

  // Mount: hydrate from localStorage + URL, open the channel, wire the listener.
  // Precedence: URL query (shareable link) > localStorage > defaults.
  useEffect(() => {
    const stored = readStored();
    const urlInputs = decodeInputs(window.location.search);
    if (stored || Object.keys(urlInputs).length > 0) {
      const present = { ...DEFAULT_STATE, ...(stored ?? {}), ...urlInputs };
      const hydratedDoc = createDoc(present);
      docRef.current = hydratedDoc;
      metaRef.current = { rev: hydratedDoc.rev, ts: Date.now() };
      setDoc(hydratedDoc);
    }
    setHydrated(true);

    if (typeof BroadcastChannel === "undefined") return; // unsupported browser
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "STATE") {
        applyRemote(msg.doc, msg.ts);
      } else if (msg.type === "REQUEST_STATE") {
        // A newly opened tab asked for the current state (leadership bonus,
        // Phase 3). Any tab can answer; newest (rev,ts) wins on the receiver.
        channel.postMessage({
          type: "STATE",
          doc: docRef.current,
          ts: Date.now(),
        });
      }
    };

    // Ask existing tabs for the live state (so a new tab joins in-sync).
    channel.postMessage({ type: "REQUEST_STATE" });

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [applyRemote]);

  // Reflect the synced theme onto <html> (rides the same sync path as inputs).
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (doc.present.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [doc.present.theme, hydrated]);

  // Reflect the current inputs into the URL (shareable link). Debounced and via
  // replaceState so it doesn't flood browser history while dragging a slider.
  useEffect(() => {
    if (!hydrated) return;
    const { amount, rate, tenure, mode, theme } = doc.present;
    const id = setTimeout(() => {
      const qs = encodeInputs({ amount, rate, tenure, mode, theme });
      window.history.replaceState(null, "", `?${qs}`);
    }, 300);
    return () => clearTimeout(id);
  }, [
    hydrated,
    doc.present.amount,
    doc.present.rate,
    doc.present.tenure,
    doc.present.mode,
    doc.present.theme,
  ]);

  // ---- Public setters (each commits → syncs) ----
  const setField = useCallback(
    (key, value) => applyLocal(commit(docRef.current, { [key]: value })),
    [applyLocal]
  );
  const patch = useCallback(
    (fields) => applyLocal(commit(docRef.current, fields)),
    [applyLocal]
  );
  const setScenarios = useCallback(
    (scenarios) => applyLocal(commit(docRef.current, { scenarios })),
    [applyLocal]
  );
  const setPrepayments = useCallback(
    (prepayments) => applyLocal(commit(docRef.current, { prepayments })),
    [applyLocal]
  );
  const setMode = useCallback(
    (mode) => applyLocal(commit(docRef.current, { mode })),
    [applyLocal]
  );
  const setTheme = useCallback(
    (theme) => applyLocal(commit(docRef.current, { theme })),
    [applyLocal]
  );
  const toggleTheme = useCallback(() => {
    const next = docRef.current.present.theme === "dark" ? "light" : "dark";
    applyLocal(commit(docRef.current, { theme: next }));
  }, [applyLocal]);

  const undo = useCallback(() => applyLocal(undoDoc(docRef.current)), [applyLocal]);
  const redo = useCallback(() => applyLocal(redoDoc(docRef.current)), [applyLocal]);

  const value = useMemo(
    () => ({
      state: doc.present,
      hydrated,
      setField,
      patch,
      setScenarios,
      setPrepayments,
      setMode,
      setTheme,
      toggleTheme,
      undo,
      redo,
      canUndo: canUndo(doc),
      canRedo: canRedo(doc),
    }),
    [
      doc,
      hydrated,
      setField,
      patch,
      setScenarios,
      setPrepayments,
      setMode,
      setTheme,
      toggleTheme,
      undo,
      redo,
    ]
  );

  return (
    <SharedStateContext.Provider value={value}>
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx) {
    throw new Error("useSharedState must be used within a SharedStateProvider");
  }
  return ctx;
}
