"use client";

import { useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/emi";

// A labelled control where a number input and a range slider stay in sync:
// editing one instantly updates the other. The slider always emits clamped
// values; the number box allows free typing and clamps on blur, so you can
// type "1500000" without it fighting you mid-keystroke.
export default function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  prefix,
  suffix,
  minLabel,
  maxLabel,
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // When the value changes from elsewhere (e.g. another tab, undo, slider),
  // reflect it in the text box — but never while the user is typing in it.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const fill = `linear-gradient(to right, #4f46e5 ${pct}%, var(--border) ${pct}%)`;

  const handleSlider = (e) => onChange(clamp(Number(e.target.value), min, max));

  const handleText = (e) => {
    const raw = e.target.value;
    setText(raw);
    const n = Number(raw);
    if (raw !== "" && Number.isFinite(n)) onChange(n); // live, unclamped while typing
  };

  const handleBlur = () => {
    focused.current = false;
    const n = Number(text);
    const next = Number.isFinite(n) ? clamp(n, min, max) : min;
    setText(String(next));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        <div className="card-muted flex items-center rounded-lg px-2.5 py-1.5 min-w-[120px] justify-end gap-1">
          {prefix && <span className="text-muted text-sm">{prefix}</span>}
          <input
            type="number"
            value={text}
            min={min}
            max={max}
            step={step}
            onFocus={() => (focused.current = true)}
            onChange={handleText}
            onBlur={handleBlur}
            className="bg-transparent w-full text-right font-semibold outline-none"
          />
          {suffix && <span className="text-muted text-sm">{suffix}</span>}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={handleSlider}
        style={{ background: fill }}
      />

      <div className="flex justify-between text-[11px] text-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
