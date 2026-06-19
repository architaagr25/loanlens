"use client";

import { scheduleToCsv } from "@/lib/csv";

// Downloads the given schedule rows as a CSV file. Builds a Blob and clicks a
// temporary link — no backend involved.
export default function ExportCsvButton({ rows, filename = "amortization.csv" }) {
  const download = () => {
    const csv = scheduleToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      disabled={!rows || rows.length === 0}
      className="px-3 py-1.5 rounded-lg card text-sm font-medium hover:opacity-80 transition disabled:opacity-40 flex items-center gap-1.5"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      Export CSV
    </button>
  );
}
