"use client";

// The cross-tab shared state. One context, one BroadcastChannel, one shared doc.
// A local change gets committed then broadcast; an incoming change is applied
// without re-broadcasting so we don't loop forever.
//
// Notes:
//  - live sync is BroadcastChannel (no server, no polling)
//  - a new tab bootstraps from localStorage + URL on mount
//  - undo/redo syncs because the whole {present,past,future} doc is sent
//  - first render uses fixed defaults so SSR and client match (no hydration warning)
//  - if two tabs edit at once, (rev, ts) decides the winner - last write wins

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

// read the saved state from localStorage (browser only)
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // stored flat so the inline theme script in layout.js can read .theme
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return null;
  }
}

// save the present so a reload/new tab comes back with the same values + theme
function writeStored(present) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(present));
  } catch {
    // localStorage can throw in private mode / when full - just ignore it
  }
}

export function SharedStateProvider({ children }) {
  // start from fixed defaults so server + first client render agree
  const [doc, setDoc] = useState(() => createDoc(DEFAULT_STATE));
  const [hydrated, setHydrated] = useState(false);

  const channelRef = useRef(null);
  const docRef = useRef(doc); // latest doc, so event handlers don't read a stale one
  const metaRef = useRef({ rev: 0, ts: 0 }); // last accepted (rev, ts)

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // a change made in this tab: save it and tell the other tabs
  const applyLocal = useCallback((nextDoc) => {
    if (nextDoc === docRef.current) return; // nothing changed
    const ts = Date.now();
    docRef.current = nextDoc;
    metaRef.current = { rev: nextDoc.rev, ts };
    setDoc(nextDoc);
    writeStored(nextDoc.present);
    channelRef.current?.postMessage({ type: "STATE", doc: nextDoc, ts });
  }, []);

  // a change from another tab: apply it, but DON'T re-broadcast or we'd loop
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

  // on mount: load saved/URL state, open the channel, start listening.
  // a shared link wins over localStorage which wins over defaults.
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

    if (typeof BroadcastChannel === "undefined") return; // old browser, skip sync
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "STATE") {
        applyRemote(msg.doc, msg.ts);
      } else if (msg.type === "REQUEST_STATE") {
        // a new tab is asking what the current state is - reply with ours.
        // any tab can answer; the newest (rev,ts) wins on their end anyway.
        channel.postMessage({
          type: "STATE",
          doc: docRef.current,
          ts: Date.now(),
        });
      }
    };

    // ask whoever's already open for the live state so we join in sync
    channel.postMessage({ type: "REQUEST_STATE" });

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [applyRemote]);

  // push the theme onto <html>. theme is just another synced field, so this
  // updates in every tab.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (doc.present.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [doc.present.theme, hydrated]);

  // keep the inputs in the URL so it's shareable. debounced + replaceState so
  // dragging a slider doesn't spam the back button.
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

  // setters - each one commits and syncs
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

// grab the shared state anywhere under the provider
export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx) {
    throw new Error("useSharedState must be used within a SharedStateProvider");
  }
  return ctx;
}
