# LoanLens — EMI Calculator with Shared Workspace

**Live demo:** https://loanlens-ruddy.vercel.app

A loan EMI calculator where every open browser tab shares the same state in real time. Change the loan amount in one tab and every other tab updates instantly — no server, no polling, no page refresh. It's the kind of pattern collaborative financial tools use, built here with just the browser.

Open it in two tabs and drag a slider. The other tab follows along.

## Features

**Calculator**
- Loan Amount / Interest Rate / Tenure, each with a number input and a slider that stay in sync
- Live Monthly EMI, Total Interest, Total Payable, and a principal-vs-interest split bar
- Uses the reducing-balance method (interest on the outstanding balance, not the original principal)

**Amortization schedule**
- Full month-by-month table (paginated, 12 rows a page)
- Break-even month highlighted (first month principal repaid overtakes interest paid)
- Toggle between the table and a stacked bar chart (principal vs interest per month)

**Compare mode**
- Up to 3 scenarios side by side, each with its own inputs
- Lowest total payable is highlighted as the best value
- Switching back to single mode keeps the last scenario you were editing

**What-if sensitivity grid**
- 7×7 grid of EMIs for rates and tenures around your current pick (±1/2/3%, ±6/12/24 months)
- Clamped to valid bounds and de-duped near the edges, current cell highlighted

**Prepayment planner**
- Schedule one-off lump-sum prepayments (reduce-tenure strategy — EMI stays fixed, the loan finishes sooner)
- Shows interest saved and months saved, plus a prepayment-adjusted schedule

**Cross-tab + presence**
- All state (inputs, scenarios, prepayments, mode, theme) syncs across tabs
- Each tab shows an id, a live count of open tabs, and a LEADER badge
- Dark / light theme that flips in every tab at once

**Bonuses (all four)**
- Undo / redo across tabs (Ctrl+Z, Ctrl+Shift+Z) — the history is shared, so a rollback applies everywhere
- Export the schedule as a CSV
- Calculator inputs encoded in the URL, so a scenario can be shared as a link
- Tab leadership — a new tab pulls the current state instead of starting from defaults, and a new leader is picked if the leader closes

## Tech stack

- Next.js 14 (App Router)
- React (hooks only, no class components)
- JavaScript
- Tailwind CSS
- Recharts (for the amortization chart)
- Vitest (for the math tests)

No backend.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Open it again in a second tab to see the sync.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm test        # run the unit tests
```

## How the cross-tab sync works

There's no server keeping tabs in sync, so everything rides the **BroadcastChannel API**.

The whole workspace is modelled as one plain object — `{ present, past, future, rev }` — where `present` is what every tab renders and `past`/`future` are the undo/redo stacks. This lives in `src/lib/sharedDoc.js` as pure functions, which keeps it easy to test.

A React context (`src/hooks/useSharedState.js`) owns a single `BroadcastChannel` and that one document:

- A change made locally gets committed to the document, saved to `localStorage`, and broadcast to the other tabs.
- A change received from another tab is applied but **not** re-broadcast, so there's no feedback loop.
- If two tabs edit at the same instant, a `(rev, ts)` comparison decides the winner — last write wins, so tabs always converge.
- Because the whole document (history included) is what syncs, undo/redo works across tabs for free.

A new tab reads `localStorage` on load and also asks the other tabs for the live state, so it joins already in sync rather than from defaults. Theme is just another field in this same document, which is why flipping it updates every tab.

**Presence** runs on its own channel (`src/hooks/usePresence.js`). Each tab heartbeats every couple of seconds; everyone keeps a map of who's alive and drops anyone who goes quiet (covers a crashed tab). The oldest tab is the leader — nobody elects it, every tab computes it from the same map, so when the leader closes the next-oldest takes over automatically.

Everything touching `window` / `BroadcastChannel` / `localStorage` runs inside effects, and the first render uses fixed defaults, so the server and client markup match (no hydration mismatch).

## The formulas

Monthly rate: `r = annualRate / 12 / 100`

EMI (reducing balance):

```
EMI = P · r · (1 + r)^n / ((1 + r)^n − 1)
```

(0% interest is handled as `P / n` to avoid dividing by zero.)

Totals:

```
Total Payable  = EMI × n
Total Interest = (EMI × n) − P
```

Amortization, month by month, carrying the balance forward:

```
interest  = balance × r
principal = EMI − interest
balance   = balance − principal
```

Prepayment is subtracted from the balance at the start of its month, before interest. The EMI stays the same, so the balance hits zero in fewer months. Interest saved and months saved come from comparing the schedule with and without prepayments.

## Edge cases

- 0% interest, and extreme rates
- Inputs clamped to their valid ranges; empty / invalid inputs handled
- Prepayment larger than the balance is capped (loan closes that month)
- Prepayment past the tenure is ignored
- Multiple prepayments in the same month are summed
- Sensitivity grid clamps and de-dupes near the edges
- Final EMI is trimmed so the balance lands exactly on zero (no floating-point dust)

## Tests

```bash
npm test
```

The math is checked against the worked examples from the spec — EMI of ₹38,768 for ₹15,00,000 at 11% over 48 months, the amortization figures, the sensitivity row, the compare winner, the prepayment savings — plus the document model (commit / undo / redo) and the CSV and URL helpers.

## Notes / scope

- Sync is between tabs of the **same browser** on the same device — that's what BroadcastChannel does, and it's the point of the no-backend approach. Different browsers or devices would need a server.
- The shareable URL carries the core calculator inputs (amount, rate, tenure, mode, theme) — it's a snapshot link, not a live channel.

## Project structure

```
src/
  app/            layout, page, global styles
  lib/            emi math, formatting, CSV, URL, shared-doc model (+ tests)
  hooks/          useSharedState (sync), usePresence (tabs/leader)
  components/     header, inputs, summary, amortization, compare, prepayment, etc.
```
