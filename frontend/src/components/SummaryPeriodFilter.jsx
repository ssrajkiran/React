/* eslint-disable react-refresh/only-export-components -- FY helpers are co-located with the filter */
import { useState } from "react";
import SharedSelect from "./SharedSelect";
import SharedDatePicker from "./SharedDatePicker";
import { fmtDate } from "../utils";

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function currentFinancialYear() {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: iso(startYear, 4, 1), to: iso(startYear + 1, 3, 31) };
}

export function financialYearOptions(count = 5) {
  const { from } = currentFinancialYear();
  const curStart = Number(from.slice(0, 4));
  return Array.from({ length: count }, (_, i) => {
    const y = curStart - i;
    return {
      value: `${iso(y, 4, 1)}|${iso(y + 1, 3, 31)}`,
      label: `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}${i === 0 ? " (Current)" : ""}`,
    };
  });
}

export const defaultSummaryPeriod = () => {
  const fy = currentFinancialYear();
  return { mode: "fy", from: fy.from, to: fy.to };
};

const labelFor = (p) =>
  p.mode === "fy"
    ? `Financial Year ${fmtDate(p.from)} – ${fmtDate(p.to)}`
    : `${fmtDate(p.from)} – ${fmtDate(p.to)}`;

export default function SummaryPeriodFilter({ value, onChange }) {
  const period = value || defaultSummaryPeriod();
  const fyValue = `${period.from}|${period.to}`;

  const [customFrom, setCustomFrom] = useState(period.from);
  const [customTo, setCustomTo] = useState(period.to);

  const fyOptions = financialYearOptions();

  const emit = (next) => {
    if (next.from && next.to && next.from <= next.to) onChange(next);
  };

  return (
    <div className="spf-root">
      <style>{styles}</style>
      <div className="spf-row">
        <div className="spf-modes">
          <button
            className={`spf-mode ${period.mode === "fy" ? "spf-mode-active" : ""}`}
            onClick={() => {
              const fy = currentFinancialYear();
              setCustomFrom(fy.from);
              setCustomTo(fy.to);
              emit({ mode: "fy", from: fy.from, to: fy.to });
            }}
          >
            <i className="bi bi-calendar2" /> Financial Year
          </button>
          <button
            className={`spf-mode ${period.mode === "custom" ? "spf-mode-active" : ""}`}
            onClick={() => emit({ mode: "custom", from: customFrom, to: customTo })}
          >
            <i className="bi bi-calendar3" /> Date Range
          </button>
        </div>

        {period.mode === "fy" ? (
          <div className="spf-fy">
            <SharedSelect
              value={fyValue}
              onChange={(val) => {
                if (!val) return;
                const [from, to] = val.split("|");
                setCustomFrom(from);
                setCustomTo(to);
                emit({ mode: "fy", from, to });
              }}
              options={fyOptions}
              placeholder="Select financial year…"
              isSearchable={false}
            />
          </div>
        ) : (
          <div className="spf-range">
            <SharedDatePicker
              value={period.from}
              onChange={(v) => {
                setCustomFrom(v);
                if (v && period.to) emit({ mode: "custom", from: v, to: period.to });
              }}
              max={period.to || undefined}
              placeholder="From"
            />
            <span className="spf-sep">→</span>
            <SharedDatePicker
              value={period.to}
              onChange={(v) => {
                setCustomTo(v);
                if (v && period.from) emit({ mode: "custom", from: period.from, to: v });
              }}
              min={period.from || undefined}
              placeholder="To"
            />
          </div>
        )}

        <span className="spf-label" title={labelFor(period)}>
          <i className="bi bi-funnel" /> {labelFor(period)}
        </span>
      </div>
    </div>
  );
}

const styles = `
  .spf-root { min-width: 0; }
  .spf-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .spf-modes { display: flex; background: var(--bg-muted); border-radius: var(--radius); padding: 3px; gap: 4px; }
  .spf-mode {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; border: none; border-radius: var(--radius);
    background: transparent; color: var(--t-muted);
    font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font);
    transition: all 0.15s; white-space: nowrap;
  }
  .spf-mode:hover { color: var(--t-base); }
  .spf-mode-active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .spf-fy { min-width: 210px; }
  .spf-range { display: flex; align-items: center; gap: 8px; }
  .spf-sep { color: var(--t-muted); font-size: 12px; }
  .spf-label {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11.5px; font-weight: 600; color: var(--primary);
    background: var(--primary-soft); border-radius: 20px; padding: 5px 12px;
    white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
  }
  @media (max-width: 768px) {
    .spf-row { width: 100%; }
    .spf-fy { min-width: 160px; flex: 1; }
    .spf-label { width: 100%; justify-content: center; }
  }
`;
