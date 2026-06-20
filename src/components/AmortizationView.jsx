"use client";

import { useEffect, useMemo, useState } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { buildSchedule, findBreakEvenMonth } from "@/lib/emi";
import AmortTable from "./AmortTable";
import AmortChart from "./AmortChart";
import ExportCsvButton from "./ExportCsvButton";

const ROWS_PER_PAGE = 12;

// the schedule section: builds the rows + break-even (memoized), paginates the
// table 12 at a time, and flips between table and chart. title/subtitle and the
// usePrepayments flag let the same component cover both single mode and the
// prepayment-adjusted version.
export default function AmortizationView({
  title = "Amortization Schedule",
  subtitle = "Month-by-month principal & interest breakdown",
  usePrepayments = false,
}) {
  const { state } = useSharedState();
  const { amount, rate, tenure, prepayments, theme } = state;

  const rows = useMemo(
    () =>
      buildSchedule(amount, rate, tenure, usePrepayments ? prepayments : []),
    [amount, rate, tenure, prepayments, usePrepayments]
  );

  const breakEvenMonth = useMemo(() => findBreakEvenMonth(rows), [rows]);

  const [view, setView] = useState("table"); // table or chart - just this tab, not synced
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

  // if the schedule gets shorter (e.g. tenure dropped), snap back into range
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const start = page * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b divider pb-4 -mx-5 px-5">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-muted text-xs">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {breakEvenMonth && (
            <span className="text-xs text-muted">
              Break-even at{" "}
              <span className="text-brand-600 font-semibold">
                month {breakEvenMonth}
              </span>
            </span>
          )}
          <div className="card-muted p-1 inline-flex gap-1 rounded-lg">
            <ToggleBtn active={view === "table"} onClick={() => setView("table")}>
              Table
            </ToggleBtn>
            <ToggleBtn active={view === "chart"} onClick={() => setView("chart")}>
              Chart
            </ToggleBtn>
          </div>
          <ExportCsvButton rows={rows} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm py-6 text-center">
          No schedule to show for the current inputs.
        </p>
      ) : view === "table" ? (
        <>
          <AmortTable rows={pageRows} breakEvenMonth={breakEvenMonth} />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted">
              Showing {start + 1}–{Math.min(start + ROWS_PER_PAGE, rows.length)}{" "}
              of {rows.length} months
            </span>
            <div className="flex items-center gap-2">
              <PageBtn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                ‹ Prev
              </PageBtn>
              <span className="text-xs text-muted">
                {page + 1} / {pageCount}
              </span>
              <PageBtn
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </PageBtn>
            </div>
          </div>
        </>
      ) : (
        <AmortChart rows={rows} theme={theme} breakEvenMonth={breakEvenMonth} />
      )}
    </section>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-md text-sm font-medium transition " +
        (active ? "bg-brand-600 text-white" : "text-muted hover:opacity-80")
      }
    >
      {children}
    </button>
  );
}

function PageBtn({ disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 rounded-md card text-xs disabled:opacity-40 hover:opacity-80 transition"
    >
      {children}
    </button>
  );
}
