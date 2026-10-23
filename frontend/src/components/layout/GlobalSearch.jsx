import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  SEARCH_ITEMS,
  filterSearchItems,
  resolvePath,
  getRoleFromToken,
} from "../../utils/searchItems";

const styles = `
.gs-overlay { position: fixed; inset: 0; z-index: 10050; display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; background: rgba(15,23,42,0.55); backdrop-filter: blur(3px); animation: gs-fade 0.15s ease; }
@keyframes gs-fade { from { opacity: 0; } to { opacity: 1; } }
.gs-modal { width: min(560px, calc(100vw - 32px)); background: var(--bg-card); border-radius: 14px; box-shadow: 0 24px 64px rgba(0,0,0,0.35); overflow: hidden; animation: gs-pop 0.18s ease; }
@keyframes gs-pop { from { opacity: 0; transform: translateY(-8px) scale(0.985); } to { opacity: 1; transform: none; } }
.gs-input-wrap { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border-soft); }
.gs-input-wrap i { color: var(--t-muted); font-size: 15px; }
.gs-input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--t-base); font-family: var(--font); }
.gs-input::placeholder { color: var(--t-light); }
.gs-esc { font-size: 10px; font-weight: 600; color: var(--t-muted); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 5px; padding: 2px 6px; font-family: var(--font-mono); }
.gs-list { max-height: 340px; overflow-y: auto; padding: 8px; }
.gs-group { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--t-light); padding: 10px 10px 5px; }
.gs-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer; text-align: left; font-family: var(--font); font-size: 13.5px; color: var(--t-base); transition: background 0.12s; }
.gs-item i { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
.gs-item .gs-path { margin-left: auto; font-size: 11px; color: var(--t-light); font-family: var(--font-mono); }
.gs-item:hover, .gs-item.is-active { background: var(--primary-soft); }
.gs-item.is-active i { background: var(--primary); color: #fff; }
.gs-empty { text-align: center; color: var(--t-muted); font-size: 13px; padding: 28px 12px; }
.gs-empty i { display: block; font-size: 24px; margin-bottom: 8px; opacity: 0.5; }
`;

// Mounted only while open (parent renders it conditionally) so state
// starts fresh every time without reset-effects.
export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const role = useMemo(() => getRoleFromToken(), []);

  const results = useMemo(
    () => filterSearchItems(SEARCH_ITEMS, query, role),
    [query, role]
  );

  useEffect(() => {
    inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const go = (item) => {
    navigate(resolvePath(item, role));
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    }
  };

  let lastGroup = null;

  return (
    <>
      <style>{styles}</style>
      <div className="gs-overlay" onClick={onClose} role="presentation">
        <div className="gs-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Global search">
          <div className="gs-input-wrap">
            <i className="bi bi-search"></i>
            <input
              ref={inputRef}
              className="gs-input"
              placeholder="Search pages, reports, settings…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
            <span className="gs-esc">ESC</span>
          </div>
          <div className="gs-list" role="listbox">
            {results.length === 0 ? (
              <div className="gs-empty">
                <i className="bi bi-search-heart"></i>
                No pages match “{query}”
              </div>
            ) : (
              results.map((item, i) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.label}>
                    {showGroup && <div className="gs-group">{item.group}</div>}
                    <button
                      className={`gs-item ${i === active ? "is-active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      role="option"
                      aria-selected={i === active}
                    >
                      <i className={`bi ${item.icon}`}></i>
                      {item.label}
                      <span className="gs-path">{resolvePath(item, role)}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
