# LoanLens — EMI Calculator with Shared Workspace — Build Plan

A Loan EMI Calculator where multiple browser tabs share the same calculator state in
real-time via the **BroadcastChannel API**. No backend, no polling, no localStorage event hacks.

---

## 0. Tech Stack (exactly as specified in the assignment)

| Constraint | Decision |
|---|---|
| Framework | **Next.js 14+, App Router** |
| UI library | **React — hooks only, no class components** |
| Language | **JavaScript only** (no TypeScript) |
| Styling | **Tailwind CSS** |
| Backend | **None** |
| Charting | Recharts (assignment explicitly allows any charting lib) |
| Cross-tab sync | **BroadcastChannel API** (confirmed by design-ref footer) |
| Hosting | Public GitHub repo + Vercel domain — **must NOT contain "Groww"** → name = **LoanLens** |

Hard rules to honor throughout:
- All browser-API code (`BroadcastChannel`, `window`, `localStorage`) must be **client-only**
  with guarded effects → **no SSR/CSR hydration mismatch** (named evaluation criterion).
- Derived values (EMI, schedules) are **computed/memoized, never stored** → no stale state.
- Proper hook usage, no stale closures, no unnecessary re-renders (named criterion).

---

## 1. Project Structure

```
loanlens/
  jsconfig.json                  # "@/*" path alias
  next.config.mjs
  tailwind.config.js
  postcss.config.js
  package.json
  README.md
  PLAN.md
  src/
    app/
      layout.js                  # html/body, theme class application, font
      page.js                    # single client page; composes the workspace
      globals.css                # tailwind directives + CSS variables for theming
    lib/
      emi.js                     # ALL pure math (no React)
      emi.test.js                # unit tests vs PDF's exact worked numbers
      format.js                  # ₹ Indian-grouping + year/month label helpers
      url.js                     # encode/decode inputs <-> query string
      constants.js               # bounds, defaults, channel name, storage keys
    hooks/
      useSharedState.js          # store + BroadcastChannel + localStorage + undo
      usePresence.js             # heartbeat, tab id, live count, leader election
    components/
      Header.jsx                 # logo, tab id + LEADER badge, tab count, theme toggle
      ThemeToggle.jsx
      ModeTabs.jsx               # Single | Compare | Prepayment
      InputPanel.jsx             # the three SliderInput rows (single mode)
      SliderInput.jsx            # synced number input + range slider (reusable)
      SummaryCards.jsx           # EMI / Total Interest / Total Payable
      PrincipalInterestBar.jsx   # split progress bar + % labels + legend
      SensitivityGrid.jsx        # 7x7 read-only grid, center highlighted
      AmortizationView.jsx       # wraps table/chart toggle + break-even + export
      AmortTable.jsx             # paginated table (10-12 rows/page)
      AmortChart.jsx             # stacked bar (principal vs interest) per month
      ExportCsvButton.jsx        # CSV download (bonus 3)
      CompareMode.jsx            # up to 3 scenario cards, best highlighted
      ScenarioCard.jsx           # one comparison card (name, inputs, results)
      PrepaymentPlanner.jsx      # add/list prepayments + impact summary
```

---

## 2. Math Core — `lib/emi.js` (built & tested FIRST)

All functions are pure (no React). Every function below is verified against the PDF's
worked examples in `emi.test.js`.

### 2.1 `monthlyRate(annualRatePct)` → `annualRatePct / 12 / 100`
- 11% → 0.0091666… (PDF: 0.009167)

### 2.2 `calculateEMI(P, annualRatePct, n)`
```
r = monthlyRate(annualRatePct)
if r === 0:  EMI = P / n           // zero-interest edge case (avoid divide-by-zero)
else:        EMI = P*r*(1+r)^n / ((1+r)^n − 1)
```
- **Test:** P=1500000, 11%, 48 → ≈ 38768.
- Edge: n=0 guarded; r=0 handled; extreme rate 36% handled.

### 2.3 `summarize(P, annualRatePct, n)` → `{ emi, totalPayable, totalInterest, principalPct, interestPct }`
```
emi            = calculateEMI(...)
totalPayable   = emi * n
totalInterest  = totalPayable − P
principalPct   = P / totalPayable * 100
interestPct    = totalInterest / totalPayable * 100
```
- **Test:** totalPayable ≈ 1860878, totalInterest ≈ 360878 for the base loan.

### 2.4 `buildSchedule(P, annualRatePct, n, prepayments = [])` → `Row[]`
Returns rows `{ month, emi, principalPaid, interestPaid, prepayment, balance }`.
```
balance = P
for month = 1..n (and continue while balance > 0):
    prepay = sum of prepayments scheduled for this month   // multiple-in-same-month → sum
    if prepay > 0:
        prepay = min(prepay, balance)                      // cap so balance never < 0
        balance -= prepay                                  // applied BEFORE interest
    if balance <= 0: push final row, break
    interestPaid  = balance * r
    principalPaid = emi − interestPaid
    if principalPaid >= balance:                           // final month: clear exactly
        principalPaid = balance
        actualEMI     = principalPaid + interestPaid
        balance       = 0
    else:
        balance -= principalPaid
    push row; if balance === 0: break
```
- Reduce-tenure strategy: EMI fixed, prepayment shortens loan → loop ends early.
- **Test (no prepay):** month1 → interest 13750, principal 25018, balance 1474982;
  month2 balance 1449734.
- **Test (₹1,00,000 @ month 12):** schedule length ≈ 45; new total interest ≈ 322401.

### 2.5 `findBreakEvenMonth(rows)` → month number
- First month where **cumulative principal repaid > cumulative interest paid**.
- Computed correctly (NOT the screenshot's placeholder "month 1").
- Returns null if never (e.g. loan closed too early / degenerate).

### 2.6 `prepaymentImpact(P, annualRatePct, n, prepayments)` → `{ newTenure, originalTenure, interestSaved, tenureReduced, originalTotalInterest, newTotalInterest }`
```
base   = buildSchedule(P, rate, n, [])
withPP = buildSchedule(P, rate, n, prepayments)
originalTotalInterest = sum(base.interestPaid)
newTotalInterest      = sum(withPP.interestPaid)
interestSaved = originalTotalInterest − newTotalInterest
newTenure     = withPP.length
tenureReduced = n − newTenure
```

### 2.7 `sensitivityGrid(P, currentRate, currentTenure)` → `{ rates[], tenures[], cells[][], centerRow, centerCol }`
```
rateOffsets   = [−3,−2,−1,0,+1,+2,+3]
tenureOffsets = [−24,−12,−6,0,+6,+12,+24]
rates   = dedupe(clamp(currentRate + o, 1, 36) for o in rateOffsets)     // sorted, unique
tenures = dedupe(clamp(currentTenure + o, 1, 84) for o in tenureOffsets) // sorted, unique
cells[t][r] = calculateEMI(P, rates[r], tenures[t])
centerRow/centerCol = index of currentTenure / currentRate (the headline EMI)
```
- Clamp to bounds, de-duplicate collapsed repeats near edges (tenure=3 → −6/−12/−24 all →1).
- Up to 7×7 = 49 evals; **memoized** in the component (`useMemo`) — recompute only on input change.
- **Test:** for 48mo row at 9/10/11/12/13% → 37328 / 38044 / 38768 / 39501 / 40241.

### 2.8 `lowestCostScenario(scenarios)` → index
- `min(totalPayable)` = `min(emi * n)`. Returns winning scenario index.
- **Test:** A(24mo)=1677882 < B(48mo)=1860878 < C(60mo)=1956818 → winner A.

### 2.9 `lib/format.js`
- `formatINR(n)` → `₹15,00,000` (Indian digit grouping, no decimals for display).
- `formatMonths(m)` → `"4 yr"`, `"3 yr 6 mo"`, `"1 mo"` (for sensitivity axis labels).
- `roundCurrency(n)` → rounding helper (consistent rounding across UI).

---

## 3. Shared State + Cross-Tab Sync — `hooks/useSharedState.js`

The single source of truth. Built & verified (2 tabs syncing) BEFORE most UI.

### 3.1 State shape (everything that must sync)
```js
{
  amount: 1500000,
  rate: 11,
  tenure: 48,
  mode: 'single',                 // 'single' | 'compare' | 'prepayment'
  theme: 'light',                 // 'light' | 'dark'
  scenarios: [ {id,name,amount,rate,tenure}, ... up to 3 ],
  prepayments: [ {id, month, amount}, ... ],
}
```
Defaults applied on a fresh tab (assignment: new tab shows sensible defaults).

### 3.2 Sync mechanism (BroadcastChannel)
- One channel: `new BroadcastChannel('loanlens')`.
- On any local state change → `setState` + broadcast `{type:'STATE', state, origin: tabId, seq}`.
- On receiving `STATE` → merge if `seq` newer (last-write-wins via monotonically increasing seq).
- **localStorage mirror:** also write state to `localStorage` so a brand-new tab bootstraps
  from the last known state (allowed; live updates still flow through BroadcastChannel).
- All wrapped in `useEffect` (client-only); SSR renders defaults → no hydration mismatch
  (we gate first paint with a `mounted` flag where browser values are needed).

### 3.3 Undo across tabs (Bonus 2)
- Shared `history[]` (bounded, e.g. 50) + `pointer`.
- Each committed change pushes a snapshot.
- **Ctrl+Z** in any tab → broadcast `{type:'UNDO'}` → every tab moves pointer back and
  applies the prior snapshot. (Optional Ctrl+Shift+Z / Ctrl+Y → redo.)
- History itself lives in shared state so all tabs share one timeline.

### 3.4 Public API returned by the hook
```js
const {
  state, setField, setScenarios, setPrepayments, setMode, setTheme,
  undo, redo, canUndo, canRedo, resetFromLeader
} = useSharedState();
```

---

## 4. Presence & Leadership — `hooks/usePresence.js`

### 4.1 Tab identity (Feature 7)
- Each tab gets a stable id on mount (e.g. `Tab 01`, `Tab 02` … or short uuid). Display in header.

### 4.2 Live tab count (heartbeat + presence map)
- Every ~2s broadcast `{type:'HEARTBEAT', tabId, born}`.
- Maintain map `{tabId → lastSeen}`; prune entries older than ~5s.
- `beforeunload` → broadcast `{type:'BYE', tabId}` for instant removal.
- Count = map size → shown live ("1 tab", "3 tabs"); decrements when a tab closes.

### 4.3 Leader election (Bonus 1)
- Leader = the tab with the **earliest `born` timestamp** among alive tabs (deterministic).
- New tab on mount → broadcast `{type:'REQUEST_STATE'}`; leader replies `{type:'STATE', ...}`
  → new tab adopts current state instead of defaults.
- If leader's heartbeat goes stale → remaining tabs recompute leader (earliest born) → re-elected.
- Header shows **LEADER** badge on the leader tab (matches design reference).

---

## 5. UI — matches the design reference (pages 11–14)

### 5.1 Layout (from "UI Layout Expectations")
```
Header: logo "EMI Workspace" | Tab id + LEADER badge | "N tab(s)" | theme toggle
ModeTabs: [ Single ] [ Compare ] [ Prepayment ]
SINGLE MODE:
  Left  : Input Panel (3 synced slider+number rows, with min/max captions)
  Right : Summary Cards (EMI / Total Interest / Total Payable)
          Principal-vs-Interest split bar (+ % labels, indigo/amber legend)
          Sensitivity Analysis (7x7 grid)
  Below : Amortization Schedule (Table/Chart toggle, break-even label, Export CSV)
```
- Footer note: "Open this page in a second tab — inputs, theme, and mode stay in sync
  via the BroadcastChannel API."

### 5.2 Feature 1 — Calculator UI
- `SliderInput`: number input **and** range slider stay in sync (edit one → updates other).
- Bounds: Amount ₹10,000–₹50,00,000 · Rate 1%–36% · Tenure 1–84 months.
- Clamp + sanitize input; reject NaN; handle zero/empty gracefully.
- Outputs: Monthly EMI, Total Interest, Total Payable, Interest-to-Principal split bar.

### 5.3 Feature 2 — Amortization Schedule
- Columns: **Month · EMI · Principal Paid · Interest Paid · Prepayment · Balance Remaining**.
- **Paginated** 10–12 rows/page (design shows "Showing 1–12 of 48", Prev/Next, "1/4").
- **Break-even row highlighted** + "Break-even at month N" label (correct computation).
- **Toggle Table ↔ stacked bar Chart** (principal vs interest per month, Recharts).
- Indigo = principal, amber/orange = interest (matches design colors).

### 5.4 Feature 3 — Compare Mode
- Up to **3 scenarios**, each its own Amount/Rate/Tenure + editable **name**.
- Card layout shows Monthly EMI / Total Interest / Total Payable per scenario.
- **Lowest total payable** card highlighted with green **"BEST VALUE"** badge.
- "+ Add Scenario" (disabled at 3); remove (×) per card.
- Switching back to Single **retains last active scenario's values** (seed single inputs).
- Scenarios sync across tabs.

### 5.5 Feature 4 — What-If Sensitivity Grid
- Read-only 7×7 grid; rows = tenures (yr/mo labels), cols = rates (%).
- Center cell (current inputs) **highlighted** and equals headline EMI.
- Live-updates on input change; memoized.
- Clamp + dedupe handled by `sensitivityGrid()`.

### 5.6 Feature 5 — Prepayment Planner
- Inputs: month + amount + "Add"; list of added prepayments (removable).
- Impact panel: **New tenure, Interest saved, Tenure reduced**, original vs new (tenure + interest).
- **Adjusted amortization schedule** reflecting prepayments (reuses AmortizationView with
  the Prepayment column populated).
- Edge cases: prepay > balance (cap + close), month > tenure (validate/ignore),
  same-month prepayments summed.
- Prepayments sync across tabs.

### 5.7 Feature 8 — Theme Sync
- Dark/light toggle; theme is **just another field** in shared state → rides the same channel.
- Switching in one tab flips all tabs. Tailwind `dark:` classes via `class` strategy on `<html>`.
- Matches dark-mode screenshots (pages 13–14).

---

## 6. Bonus Challenges (ALL FOUR)

1. **Tab Leadership / Source of Truth** — §4.3 (new tab pulls state from leader; re-election).
2. **Undo Across Tabs** — §3.3 (Ctrl+Z reverts last change in every tab).
3. **Export CSV** — `ExportCsvButton` downloads the (possibly prepayment-adjusted) schedule.
4. **URL State** — `lib/url.js` encodes amount/rate/tenure (+ mode) in query string; parsed on
   load (URL > localStorage > defaults precedence), updated (debounced) as inputs change.
   Shareable link reproduces a scenario.

---

## 7. Edge Cases Checklist (explicitly required)

- [ ] Zero interest rate → EMI = P/n (no divide-by-zero).
- [ ] Extreme rate (36%) and bounds clamping on every input.
- [ ] n at bounds (1 and 84).
- [ ] Empty / NaN / out-of-range inputs sanitized.
- [ ] Prepayment > outstanding balance → cap, close loan that month.
- [ ] Prepayment month beyond tenure → ignore/validate.
- [ ] Multiple prepayments same month → summed.
- [ ] Sensitivity grid clamp + dedupe at edges (e.g. tenure=3).
- [ ] Break-even = correct cumulative-principal-exceeds-interest month.
- [ ] New tab → sensible defaults (then leader state if available).
- [ ] No hydration mismatch from browser APIs.

---

## 8. Verification

- `emi.test.js` asserts every PDF worked number (EMI 38768; totals 1860878/360878;
  amort m1/m2; sensitivity row; compare winner A; prepayment interest-saved ≈ 38477).
- Manual: open 2–3 tabs → verify inputs, mode, theme, scenarios, prepayments, undo,
  tab count, leader badge all sync; close a tab → count drops + re-election.

---

## 9. Build Order (one day)

| # | Phase | Output |
|---|---|---|
| 0 | Scaffold | Next 14 + Tailwind + jsconfig, base layout/globals |
| 1 | Math + tests | `emi.js`, `format.js`, `emi.test.js` green vs PDF numbers |
| 2 | Shared store + sync | `useSharedState.js`; 2 tabs sync verified |
| 3 | Presence + leadership | `usePresence.js`; tab id, count, LEADER badge |
| 4 | Calculator UI | Header, ModeTabs, InputPanel/SliderInput, SummaryCards, bar |
| 5 | Amortization | AmortTable (paginated, break-even), AmortChart, toggle |
| 6 | Sensitivity + Compare | SensitivityGrid, CompareMode/ScenarioCard |
| 7 | Prepayment + Theme | PrepaymentPlanner, ThemeToggle, dark mode |
| 8 | Bonuses | Undo (Ctrl+Z), CSV, URL state, leadership polish |
| 9 | Polish + README | Responsive pass, dark polish, README, deploy guide |

---

## 10. Deliverables

- Runs locally (`npm install && npm run dev`).
- README.md: overview, features, how sync works (BroadcastChannel), formulas, setup,
  bonus notes, deploy steps.
- Public GitHub repo + Vercel domain — **no "Groww" in either name**.
