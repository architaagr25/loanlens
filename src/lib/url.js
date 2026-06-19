// Encode/decode calculator inputs to/from the URL query string, so a specific
// scenario can be shared via link. Pure functions — no window access here.

import { BOUNDS } from "./constants";
import { clamp } from "./emi";

// Short keys keep the URL compact: a=amount, r=rate, t=tenure, m=mode, th=theme.
export function encodeInputs({ amount, rate, tenure, mode, theme }) {
  const params = new URLSearchParams();
  params.set("a", String(amount));
  params.set("r", String(rate));
  params.set("t", String(tenure));
  if (mode) params.set("m", mode);
  if (theme) params.set("th", theme);
  return params.toString();
}

// Parse a query string into a partial, validated inputs object. Unknown/invalid
// values are dropped so a malformed link can't corrupt state.
export function decodeInputs(search) {
  const params = new URLSearchParams(search);
  const out = {};

  // Parse a numeric param, skipping missing/empty values (Number("") === 0).
  const num = (key) => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const a = num("a");
  if (a !== null) out.amount = clamp(a, BOUNDS.amount.min, BOUNDS.amount.max);

  const r = num("r");
  if (r !== null) out.rate = clamp(r, BOUNDS.rate.min, BOUNDS.rate.max);

  const t = num("t");
  if (t !== null) {
    out.tenure = clamp(Math.round(t), BOUNDS.tenure.min, BOUNDS.tenure.max);
  }

  const m = params.get("m");
  if (m === "single" || m === "compare" || m === "prepayment") out.mode = m;

  const th = params.get("th");
  if (th === "light" || th === "dark") out.theme = th;

  return out;
}
