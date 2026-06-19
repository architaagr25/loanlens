"use client";

// ──────────────────────────────────────────────────────────────────────────
// usePresence — tab identity, live tab count, and leader election.
//
// There is no server to keep a list of open tabs, so we use the classic
// heartbeat + presence-map approach over a BroadcastChannel:
//
//   - Each tab has a unique id + a `born` timestamp (set once on mount).
//   - Every HEARTBEAT_INTERVAL it broadcasts a PING { id, born }.
//   - Each tab keeps a map of peers { id -> { born, lastSeen } } and prunes
//     any peer not heard from within STALE_MS (covers crashes / hard closes).
//   - On close it broadcasts BYE for instant removal in the other tabs.
//   - Leader = the longest-lived tab (smallest `born`, id as tiebreaker). When
//     the leader disappears, the next-oldest tab automatically becomes leader —
//     no election messages needed, every tab computes it from the same map.
//
// Friendly labels ("Tab 01", "Tab 02") are derived from each tab's rank by age.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRESENCE_CHANNEL,
  HEARTBEAT_INTERVAL,
  PRUNE_INTERVAL,
  STALE_MS,
} from "@/lib/constants";

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function usePresence() {
  const [self, setSelf] = useState(null); // { id, born } — set on mount
  const [peers, setPeers] = useState({}); // other tabs: id -> { born, lastSeen }

  const peersRef = useRef(peers); // latest peers, readable in handlers
  const channelRef = useRef(null);

  useEffect(() => {
    const id = makeId();
    const born = Date.now();
    const me = { id, born };
    setSelf(me);

    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channelRef.current = channel;

    // Update both the ref (for handlers) and state (for render) together.
    const updatePeers = (updater) => {
      peersRef.current = updater(peersRef.current);
      setPeers(peersRef.current);
    };

    const ping = () => channel.postMessage({ type: "PING", id, born });

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "PING") {
        const isNewcomer = !peersRef.current[msg.id];
        updatePeers((prev) => ({
          ...prev,
          [msg.id]: { born: msg.born, lastSeen: Date.now() },
        }));
        // A tab we've never seen just announced itself — reply at once so it
        // learns about us immediately instead of waiting a heartbeat.
        if (isNewcomer) ping();
      } else if (msg.type === "BYE") {
        updatePeers((prev) => {
          if (!prev[msg.id]) return prev;
          const next = { ...prev };
          delete next[msg.id];
          return next;
        });
      }
    };

    ping(); // announce ourselves immediately
    const beat = setInterval(ping, HEARTBEAT_INTERVAL);

    // Sweep out tabs we haven't heard from recently (covers crashes).
    const prune = setInterval(() => {
      const now = Date.now();
      updatePeers((prev) => {
        let changed = false;
        const next = {};
        for (const key in prev) {
          if (now - prev[key].lastSeen < STALE_MS) next[key] = prev[key];
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, PRUNE_INTERVAL);

    // Tell the others we're leaving (instant count update for graceful closes).
    const sayBye = () => {
      try {
        channel.postMessage({ type: "BYE", id });
      } catch {
        /* channel may already be closing */
      }
    };
    window.addEventListener("beforeunload", sayBye);
    window.addEventListener("pagehide", sayBye);

    return () => {
      sayBye();
      clearInterval(beat);
      clearInterval(prune);
      window.removeEventListener("beforeunload", sayBye);
      window.removeEventListener("pagehide", sayBye);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Derive identity/count/leader from self + peers (all tabs compute the same).
  return useMemo(() => {
    if (!self) {
      return { tabId: null, label: "Tab 01", tabCount: 1, isLeader: true };
    }
    const all = [
      { id: self.id, born: self.born },
      ...Object.entries(peers).map(([id, v]) => ({ id, born: v.born })),
    ];
    // Oldest first; id breaks ties so every tab agrees on the same order.
    all.sort((a, b) => a.born - b.born || (a.id < b.id ? -1 : 1));

    const myIndex = all.findIndex((t) => t.id === self.id);
    return {
      tabId: self.id,
      label: `Tab ${String(myIndex + 1).padStart(2, "0")}`,
      tabCount: all.length,
      isLeader: myIndex === 0,
    };
  }, [self, peers]);
}
