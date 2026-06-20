"use client";

// tab identity + live count + which tab is "leader".
//
// There is no server to keep a list of open tabs, so we use the classic
// heartbeat + presence-map approach over a BroadcastChannel:
//  - on mount each tab picks a random id and remembers when it was born
//  - it pings { id, born } every couple seconds
//  - everyone keeps a map of the others and drops anyone who's gone quiet
//    (handles a tab that crashed and couldn't say goodbye)
//  - on close it sends BYE so the count drops right away
//
// leader = the oldest tab (smallest born). nobody "elects" it - every tab works
// it out from the same map, so when the leader closes the next-oldest just
// becomes leader on its own. labels like "Tab 01" come from age order.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRESENCE_CHANNEL,
  HEARTBEAT_INTERVAL,
  PRUNE_INTERVAL,
  STALE_MS,
} from "@/lib/constants";

// short random id so each tab can tell itself apart from the others
function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function usePresence() {
  const [self, setSelf] = useState(null); // { id, born }, set on mount
  const [peers, setPeers] = useState({}); // the other tabs: id -> { born, lastSeen }

  const peersRef = useRef(peers); // latest peers so the message handler isn't stale
  const channelRef = useRef(null);

  useEffect(() => {
    const id = makeId();
    const born = Date.now();
    const me = { id, born };
    setSelf(me);

    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channelRef.current = channel;

    // update the ref (for the handler) and state (for render) at the same time
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
        // new tab we haven't seen - ping back right away so it finds out about
        // us now instead of waiting for the next heartbeat
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

    ping(); // say hi straight away
    const beat = setInterval(ping, HEARTBEAT_INTERVAL);

    // drop tabs we haven't heard from in a while (the crash case)
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

    // let the others know we're closing so their count updates instantly
    const sayBye = () => {
      try {
        channel.postMessage({ type: "BYE", id });
      } catch {
        // channel might already be closing, no big deal
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

  // work out id / count / leader from self + peers (same result in every tab)
  return useMemo(() => {
    if (!self) {
      return { tabId: null, label: "Tab 01", tabCount: 1, isLeader: true };
    }
    const all = [
      { id: self.id, born: self.born },
      ...Object.entries(peers).map(([id, v]) => ({ id, born: v.born })),
    ];
    // oldest first, id as tiebreaker so everyone sorts the same way
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
