// read/write the calculator inputs from the URL query string so a scenario can
// be shared as a link. pure - no window access in here.

import { BOUNDS } from "./constants";
import { clamp } from "./emi";

// short keys to keep the link tidy: a=amount, r=rate, t=tenure, m=mode, th=theme
export function encodeInputs({ amount, rate, tenure, mode, theme }) {
  const params = new URLSearchParams();
  params.set("a", String(amount));
  params.set("r", String(rate));
  params.set("t", String(tenure));
  if (mode) params.set("m", mode);
  if (theme) params.set("th", theme);
  return params.toString();
}

// parse the query string back into inputs. anything missing or junk is dropped
// and the rest is clamped, so a hand-edited link can't break the app.
export function decodeInputs(search) {
  const params = new URLSearchParams(search);
  const out = {};

  // grab a number, skipping empty values - Number("") is 0 which we don't want
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
