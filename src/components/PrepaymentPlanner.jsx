"use client";

import { useMemo, useState } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { prepaymentImpact } from "@/lib/emi";
import { formatINR, formatMonths } from "@/lib/format";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "p-" + crypto.randomUUID().slice(0, 6);
  }
  return "p-" + Math.random().toString(36).slice(2, 8);
}

// add lump-sum prepayments and see what they save. the list is synced state so
// it shows up in every tab. the tricky bits (cap at the balance, ignore months
// past the tenure, sum same-month ones) are handled over in emi.js.
export default function PrepaymentPlanner() {
  const { state, setPrepayments } = useSharedState();
  const { amount, rate, tenure, prepayments } = state;

  const [month, setMonth] = useState("12");
  const [amt, setAmt] = useState("100000");

  const impact = useMemo(
    () => prepaymentImpact(amount, rate, tenure, prepayments),
    [amount, rate, tenure, prepayments]
  );

  const monthNum = Number(month);
  const amtNum = Number(amt);
  const valid =
    Number.isInteger(monthNum) &&
    monthNum >= 1 &&
    monthNum <= tenure &&
    Number.isFinite(amtNum) &&
    amtNum > 0;

  const add = () => {
    if (!valid) return;
    setPrepayments([
      ...prepayments,
      { id: newId(), month: monthNum, amount: amtNum },
    ]);
  };

  const remove = (id) =>
    setPrepayments(prepayments.filter((p) => p.id !== id));

  const sorted = [...prepayments].sort((a, b) => a.month - b.month);

  return (
    <section className="card p-5 space-y-4">
      <div className="border-b divider pb-3 -mx-5 px-5">
        <h2 className="font-semibold">Prepayment Planner</h2>
        <p className="text-muted text-xs">
          Schedule lump-sum payments and see interest saved
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: add + list */}
        <div className="card-muted p-4 space-y-4">
          <p className="text-sm font-medium">Add a one-time prepayment</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Month">
              <input
                type="number"
                min={1}
                max={tenure}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="card px-3 py-2 rounded-lg w-24 outline-none"
              />
            </Field>
            <Field label="Amount (₹)">
              <input
                type="number"
                min={1}
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                className="card px-3 py-2 rounded-lg w-40 outline-none"
              />
            </Field>
            <button
              onClick={add}
              disabled={!valid}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {!valid && (month !== "" || amt !== "") && (
            <p className="text-xs text-amber-600">
              Month must be 1–{tenure} and amount greater than 0.
            </p>
          )}

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="text-muted text-sm py-2">
                No prepayments yet. Add one above to see the impact.
              </p>
            ) : (
              sorted.map((p) => (
                <div
                  key={p.id}
                  className="card flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                >
                  <span>
                    Month <span className="font-semibold">{p.month}</span> ·{" "}
                    {formatINR(p.amount)}
                  </span>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label="Remove prepayment"
                    className="text-muted hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: impact */}
        <div className="card-muted p-4 space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Prepayment Impact
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm">Interest Saved</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatINR(impact.interestSaved)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Tenure Reduced By</span>
            <span className="text-xl font-bold">
              {impact.tenureReduced > 0
                ? formatMonths(impact.tenureReduced)
                : "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t divider text-sm">
            <Stat label="Original Tenure" value={formatMonths(impact.originalTenure)} />
            <Stat
              label="New Tenure"
              value={formatMonths(impact.newTenure)}
              accent
            />
            <Stat
              label="Original Interest"
              value={formatINR(impact.originalTotalInterest)}
            />
            <Stat
              label="New Interest"
              value={formatINR(impact.newTotalInterest)}
              accent
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <span className="block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className={"font-semibold " + (accent ? "text-brand-600" : "")}>
        {value}
      </p>
    </div>
  );
}
