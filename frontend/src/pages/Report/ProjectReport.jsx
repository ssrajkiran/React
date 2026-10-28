import { useEffect, useState, useMemo } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
import SharedSelect from "../../components/SharedSelect";
import { fmtDate as fmtDateShared } from "../../utils";

const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const totalMin = Math.round(n * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const fmtDate = (iso) => {
  if (!iso) return "";
  return fmtDateShared(iso);
};

const initials = (name) =>
  (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const statusClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "rp-status rp-status-done";
  if (s === "in progress") return "rp-status rp-status-prog";
  return "rp-status";
};

export default function ProjectReport() {
  const [tab, setTab] = useState("project");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectData, setProjectData] = useState(null);
  const [moduleRows, setModuleRows] = useState([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);
  const [openGroups, setOpenGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/reports/projects")
      .then((r) => setProjects(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    api.get("/reports/module-wise")
      .then((r) => setModuleRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setModuleRows([]))
      .finally(() => setLoadingModules(false));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    api.get("/reports/project-wise", { params: { project_id: projectId } })
      .then((r) => setProjectData(r.data))
      .catch(() => setProjectData(null))
      .finally(() => setLoadingProject(false));
  }, [projectId]);

  const handleProjectChange = (value) => {
    setProjectId(value);
    setProjectData(null);
    setLoadingProject(!!value);
  };

  const searchQ = searchQuery.trim().toLowerCase();

  const filteredProjectModules = useMemo(() => {
    if (!projectData) return [];
    if (!searchQ) return projectData.modules;
    const out = [];
    for (const m of projectData.modules) {
      const headHit = `${m.module_name || ""} ${m.status || ""}`.toLowerCase().includes(searchQ);
      if (headHit) { out.push(m); continue; }
      const entries = (m.entries || []).filter((e) =>
        `${e.work_description || ""} ${e.person || ""} ${fmtDate(e.date)}`.toLowerCase().includes(searchQ)
      );
      if (entries.length > 0) out.push({ ...m, entries });
    }
    return out;
  }, [projectData, searchQ]);

  const filteredModuleRows = useMemo(() => {
    if (!searchQ) return moduleRows;
    return moduleRows.filter((r) =>
      `${r.module_name || ""} ${r.project_name || ""} ${r.status || ""} ${(r.persons || []).join(" ")}`
        .toLowerCase()
        .includes(searchQ)
    );
  }, [moduleRows, searchQ]);

  const moduleGroups = useMemo(() => {
    const groups = [];
    const index = {};
    filteredModuleRows.forEach((r) => {
      if (!index[r.project_id]) {
        index[r.project_id] = {
          project_id: r.project_id,
          project_name: r.project_name,
          modules: [],
          total_hours: 0,
        };
        groups.push(index[r.project_id]);
      }
      index[r.project_id].modules.push(r);
      index[r.project_id].total_hours += Number(r.total_hours) || 0;
    });
    return groups.map((g) => ({
      ...g,
      total_hours: Math.round(g.total_hours * 100) / 100,
    }));
  }, [filteredModuleRows]);

  const allClosed =
    moduleGroups.length > 0 &&
    moduleGroups.every((g) => !openGroups[g.project_id]);

  const toggleGroup = (id) =>
    setOpenGroups((o) => {
      const n = { ...o };
      if (n[id]) delete n[id];
      else n[id] = true;
      return n;
    });

  const toggleAll = () =>
    setOpenGroups(
      allClosed
        ? Object.fromEntries(moduleGroups.map((g) => [g.project_id, true]))
        : {}
    );

  return (
    <AppLayout>
      <style>{styles}</style>

      <div className="rp-head">
        <span className="rp-eyebrow">Reports</span>
        <h2 className="rp-title">Project &amp; Module Report</h2>
        <p className="rp-sub">Timesheet work split by project and by module</p>
      </div>

      <div className="rp-toolbar">
        <div className="rp-tabs">
          <button
            className={`rp-tab ${tab === "project" ? "active" : ""}`}
            onClick={() => setTab("project")}
          >
            <i className="bi bi-folder2-open" /> Project-wise
          </button>
          <button
            className={`rp-tab ${tab === "module" ? "active" : ""}`}
            onClick={() => {
              setTab("module");
              setOpenGroups({});
            }}
          >
            <i className="bi bi-grid-3x3-gap" /> Module-wise
          </button>
        </div>
        <div className="rp-search">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder={tab === "project" ? "Search modules, work, person…" : "Search project, module, person…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button className="rp-search-clear" title="Clear search" onClick={() => setSearchQuery("")}>
              <i className="bi bi-x-lg" />
            </button>
          ) : (
            <span className="rp-search-count">
              {tab === "project"
                ? `${projectData ? filteredProjectModules.length : 0} modules`
                : `${filteredModuleRows.length} modules`}
            </span>
          )}
        </div>
      </div>

      {/* ══════════ PROJECT-WISE ══════════ */}
      {tab === "project" && (
        <div className="rp-card">
          <div className="rp-filter">
            <span className="rp-filter-label">Select project</span>
            <div className="rp-select-wrap">
              <SharedSelect
                options={projects.map((p) => ({ value: p.id, label: p.project_name }))}
                value={projectId}
                onChange={handleProjectChange}
                placeholder="Choose a project…"
              />
            </div>
          </div>

          {loadingProject ? (
            <div className="rp-loading">
              <i className="bi bi-arrow-repeat rp-spin" /> Loading report…
            </div>
          ) : !projectData ? (
            <div className="rp-empty">
              <i className="bi bi-folder2-open rp-empty-icon" />
              <p className="rp-empty-title">Select a project to view its report</p>
              <p className="rp-empty-sub">Modules, work descriptions and man hours will appear here</p>
            </div>
          ) : (
            <>
              {/* Overall project heading + persons */}
              <div className="rp-overall">
                <div className="rp-overall-left">
                  <span className="rp-overall-eyebrow">Overall project</span>
                  <h3 className="rp-overall-name">{projectData.project.project_name}</h3>
                  <span className="rp-overall-hours">
                    <i className="bi bi-clock" /> {fmtHrs(projectData.total_hours)} total man hours
                  </span>
                </div>
                <div className="rp-overall-right">
                  <span className="rp-persons-label">Timesheet by</span>
                  <div className="rp-persons">
                    {projectData.persons.length > 0 ? (
                      projectData.persons.map((p) => (
                        <span className="rp-person" key={p.name}>
                          <span className="rp-person-avatar">{initials(p.name)}</span>
                          <span className="rp-person-name">{p.name}</span>
                          <span className="rp-person-hrs">{fmtHrs(p.hours)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="rp-person-none">No timesheet entries yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modules */}
              {projectData.modules.length === 0 ? (
                <div className="rp-empty">
                  <p className="rp-empty-title">No modules in this project</p>
                </div>
              ) : filteredProjectModules.length === 0 ? (
                <div className="rp-empty">
                  <p className="rp-empty-title">No results for “{searchQuery}”</p>
                  <p className="rp-empty-sub">Try a different module, work description or person name</p>
                </div>
              ) : (
                <div className="rp-modules">
                  {filteredProjectModules.map((m, mi) => (
                    <div className="rp-module" key={m.task_id}>
                      <div className="rp-module-head">
                        <div className="rp-module-title">
                          <span className="rp-module-index">{mi + 1}</span>
                          <h4 className="rp-module-name">{m.module_name}</h4>
                          <span className={statusClass(m.status)}>{m.status}</span>
                        </div>
                        <span className="rp-module-hours">{fmtHrs(m.total_hours)}</span>
                      </div>
                      {m.entries.length > 0 ? (
                        <div className="rp-entries">
                          {m.entries.map((e, i) => (
                            <div className="rp-entry" key={i}>
                              <div className="rp-entry-main">
                                <span className="rp-entry-desc">{e.work_description}</span>
                                <span className="rp-entry-meta">
                                  {e.person} <span className="rp-dot">·</span> {fmtDate(e.date)}
                                </span>
                              </div>
                              <span className="rp-entry-hours">{fmtHrs(e.man_hrs)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rp-module-empty">No timesheet entries for this module</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ MODULE-WISE (grouped by project) ══════════ */}
      {tab === "module" && (
        <div className="rp-card">
          {loadingModules ? (
            <div className="rp-loading">
              <i className="bi bi-arrow-repeat rp-spin" /> Loading report…
            </div>
          ) : moduleRows.length === 0 ? (
            <div className="rp-empty">
              <i className="bi bi-grid-3x3-gap rp-empty-icon" />
              <p className="rp-empty-title">No modules found</p>
            </div>
          ) : moduleGroups.length === 0 ? (
            <div className="rp-empty">
              <i className="bi bi-search rp-empty-icon" />
              <p className="rp-empty-title">No results for “{searchQuery}”</p>
              <p className="rp-empty-sub">Try a different project, module or person name</p>
            </div>
          ) : (
            <>
              <div className="rp-acc-actions">
                <button type="button" className="rp-acc-toggle" onClick={toggleAll}>
                  <i className={`bi ${allClosed ? "bi-arrows-expand" : "bi-arrows-collapse"}`} />
                  {allClosed ? "Expand all" : "Collapse all"}
                </button>
              </div>
              <div className="rp-table-head">
                <span>Module</span>
                <span>Persons</span>
                <span>Hours</span>
              </div>
              <div className="rp-groups">
                {moduleGroups.map((g) => {
                  const closed = !openGroups[g.project_id];
                  return (
                    <div className={`rp-group${closed ? " is-closed" : ""}`} key={g.project_id}>
                      <button
                        type="button"
                        className="rp-group-head"
                        onClick={() => toggleGroup(g.project_id)}
                        aria-expanded={!closed}
                      >
                        <span className="rp-group-title">
                          <span className="rp-group-icon">
                            <i className={`bi ${closed ? "bi-folder2" : "bi-folder2-open"}`} />
                          </span>
                          <span className="rp-group-name">{g.project_name}</span>
                          <span className="rp-group-count">
                            {g.modules.length} {g.modules.length === 1 ? "module" : "modules"}
                          </span>
                        </span>
                        <span className="rp-group-right">
                          <span className="rp-group-hours">{fmtHrs(g.total_hours)}</span>
                          <i className={`bi bi-chevron-down rp-group-chev${closed ? " is-closed" : ""}`} />
                        </span>
                      </button>
                      {!closed &&
                        g.modules.map((row) => (
                          <div className="rp-row" key={row.task_id}>
                            <span className="rp-row-module">
                              <span className="rp-row-module-name">{row.module_name}</span>
                              <span className="rp-row-module-meta">
                                <span className={statusClass(row.status)}>{row.status}</span>
                                <span className="rp-row-entries">{row.entry_count} entries</span>
                              </span>
                            </span>
                            <span className="rp-row-persons">
                              {row.persons.length > 0 ? (
                                row.persons.map((n) => (
                                  <span className="rp-name-chip" key={n}>
                                    <span className="rp-name-chip-avatar">{initials(n)}</span>
                                    {n}
                                  </span>
                                ))
                              ) : (
                                <span className="rp-person-none">—</span>
                              )}
                            </span>
                            <span className="rp-row-hours">{fmtHrs(row.total_hours)}</span>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  /* ── Canvas ── */
  .page-content { background: var(--bg); }

  /* ── Header ── */
  .rp-head { margin-bottom: 18px; }
  .rp-eyebrow {
    display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--primary); margin-bottom: 6px;
  }
  .rp-title { font-size: 24px; font-weight: 800; margin: 0; color: var(--t-base); letter-spacing: -0.02em; }
  .rp-sub { font-size: 13px; color: var(--t-muted); margin: 5px 0 0; }

  /* ── Tabs ── */
  .rp-toolbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
  .rp-toolbar .rp-tabs { margin-bottom:0; }
  .rp-search {
    display:flex; align-items:center; gap:8px; background:var(--bg-card);
    border:1px solid var(--border); border-radius:20px; padding:7px 14px;
    min-width:270px; box-shadow:var(--shadow-sm); transition:border-color 0.15s;
  }
  .rp-search:focus-within { border-color:var(--primary); }
  .rp-search > i { font-size:12px; color:var(--t-muted); }
  .rp-search input {
    flex:1; min-width:0; border:none; outline:none; background:transparent;
    font-family:var(--font); font-size:12.5px; color:var(--t-base);
  }
  .rp-search input::placeholder { color:var(--t-muted); }
  .rp-search-clear {
    display:flex; align-items:center; justify-content:center; border:none; background:var(--bg-muted);
    color:var(--t-muted); width:17px; height:17px; border-radius:50%; font-size:9px; cursor:pointer; padding:0;
  }
  .rp-search-clear:hover { background:var(--danger-soft); color:var(--danger); }
  .rp-search-count { font-size:11px; font-weight:700; color:var(--t-muted); white-space:nowrap; }
  @media (max-width: 768px) { .rp-search { min-width:180px; flex:1; } }
  .rp-tabs {
    display: flex; gap: 4px; margin-bottom: 18px;
    background: var(--bg-muted); border-radius: 10px; padding: 4px;
    width: fit-content;
  }
  .rp-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border: 0; border-radius: 8px;
    background: transparent; cursor: pointer;
    font-size: 13px; font-weight: 600; font-family: var(--font);
    color: var(--t-muted); transition: all 0.15s;
  }
  .rp-tab i { font-size: 14px; }
  .rp-tab:hover { color: var(--t-base); }
  .rp-tab.active {
    background: var(--bg-card); color: var(--primary);
    box-shadow: var(--shadow-card);
  }

  /* ── Card ── */
  .rp-card {
    background: var(--bg-card); border-radius: var(--radius-lg);
    padding: 22px; min-width: 0;
    box-shadow: var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20);
  }

  /* ── Filter ── */
  .rp-filter { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
  .rp-filter-label {
    font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--t-muted);
  }
  .rp-select-wrap { min-width: 280px; }

  /* ── Overall project heading ── */
  .rp-overall {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 20px; flex-wrap: wrap;
    background: linear-gradient(120deg, color-mix(in srgb, var(--primary) 7%, transparent), rgba(236, 72, 153, 0.06));
    border-radius: var(--radius-lg); padding: 20px 22px; margin-bottom: 18px;
  }
  .rp-overall-eyebrow {
    display: block; font-size: 10.5px; font-weight: 700; letter-spacing: 1.8px;
    text-transform: uppercase; color: var(--primary); margin-bottom: 5px;
  }
  .rp-overall-name { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: var(--t-base); letter-spacing: -0.02em; }
  .rp-overall-hours {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12.5px; font-weight: 700; color: var(--t-base);
    background: var(--bg-card); padding: 5px 12px; border-radius: 999px;
    box-shadow: var(--shadow-sm);
  }
  .rp-overall-hours i { color: var(--primary); }
  .rp-overall-right { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .rp-persons-label {
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--t-muted);
  }
  .rp-persons { display: flex; gap: 8px; flex-wrap: wrap; }
  .rp-person {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--bg-card); padding: 5px 12px 5px 5px;
    border-radius: 999px; box-shadow: var(--shadow-sm);
  }
  .rp-person-avatar, .rp-name-chip-avatar {
    width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
    display: grid; place-items: center;
    font-size: 10px; font-weight: 700; color: var(--on-primary);
    background: linear-gradient(135deg, var(--primary), #EC4899);
  }
  .rp-person-name { font-size: 12.5px; font-weight: 600; color: var(--t-base); }
  .rp-person-hrs {
    font-size: 11px; font-weight: 700; color: var(--primary);
    background: var(--primary-soft); padding: 2px 8px; border-radius: 999px;
  }
  .rp-person-none { font-size: 12.5px; color: var(--t-muted); font-style: italic; }

  /* ── Modules ── */
  .rp-modules { display: flex; flex-direction: column; gap: 14px; }
  .rp-module {
    background: var(--bg); border-radius: var(--radius-lg);
    padding: 16px 18px; box-shadow: var(--shadow-sm);
  }
  .rp-module-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 10px; flex-wrap: wrap;
  }
  .rp-module-title { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
  .rp-module-index {
    width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
    display: grid; place-items: center;
    font-size: 11px; font-weight: 800; color: var(--primary);
    background: var(--primary-soft);
  }
  .rp-module-name { font-size: 14.5px; font-weight: 700; margin: 0; color: var(--t-base); }
  .rp-status {
    font-size: 10px; font-weight: 700; padding: 3px 9px;
    border-radius: 999px; background: var(--bg-muted); color: var(--t-muted);
    white-space: nowrap;
  }
  .rp-status-done { background: var(--success-soft); color: var(--success); }
  .rp-status-prog { background: var(--warning-soft); color: var(--warning); }
  .rp-module-hours {
    font-size: 13px; font-weight: 800; color: var(--primary);
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }

  /* ── Entries ── */
  .rp-entries { display: flex; flex-direction: column; }
  .rp-entry {
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px; padding: 9px 4px;
  }
  .rp-entry + .rp-entry { border-top: 1px dashed var(--border-soft); }
  .rp-entry-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .rp-entry-desc { font-size: 13px; color: var(--t-base); line-height: 1.45; }
  .rp-entry-meta { font-size: 11.5px; color: var(--t-muted); }
  .rp-dot { opacity: 0.5; }
  .rp-entry-hours {
    font-size: 12.5px; font-weight: 700; color: var(--t-base);
    background: var(--bg-card); padding: 4px 11px; border-radius: 999px;
    box-shadow: var(--shadow-sm); white-space: nowrap; flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .rp-module-empty { font-size: 12.5px; color: var(--t-muted); font-style: italic; padding: 6px 4px 2px; }

  /* ── Module-wise (grouped by project) ── */
  .rp-table-head, .rp-row {
    display: grid;
    grid-template-columns: minmax(200px, 1.6fr) minmax(190px, 1.5fr) 90px;
    gap: 14px; align-items: center;
  }
  .rp-table-head {
    padding: 0 8px 6px;
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--t-muted);
    margin-top: 4px;
  }
  .rp-table-head span:last-child, .rp-row-hours { text-align: right; }
  .rp-acc-actions { display: flex; justify-content: flex-end; margin-top: 2px; }
  .rp-acc-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 700;
    color: var(--t-muted); padding: 5px 9px; border-radius: 8px;
    transition: background 0.12s, color 0.12s;
  }
  .rp-acc-toggle:hover { background: var(--bg-muted); color: var(--primary); }
  .rp-groups { display: flex; flex-direction: column; }
  .rp-group + .rp-group { margin-top: 18px; }
  .rp-group-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; width: 100%; background: var(--bg-muted);
    padding: 11px 14px; border: none; border-radius: 10px;
    font-family: inherit; text-align: left; cursor: pointer;
    transition: background 0.12s;
  }
  .rp-group-head:hover { background: var(--bg-hover); }
  .rp-group.is-closed .rp-group-head { box-shadow: var(--shadow-sm); }
  .rp-group-right { display: inline-flex; align-items: center; gap: 10px; }
  .rp-group-chev { font-size: 11px; color: var(--t-muted); transition: transform 0.18s; }
  .rp-group-chev.is-closed { transform: rotate(-90deg); }
  .rp-group-title { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
  .rp-group-icon {
    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
    display: grid; place-items: center; font-size: 13px;
    background: var(--primary-soft); color: var(--primary);
  }
  .rp-group-name { font-size: 14px; font-weight: 800; margin: 0; color: var(--t-base); }
  .rp-group-count {
    font-size: 11px; font-weight: 700; color: var(--t-muted);
    background: var(--bg-card); padding: 3px 10px; border-radius: 999px;
    box-shadow: var(--shadow-sm); white-space: nowrap;
  }
  .rp-group-hours {
    font-size: 13.5px; font-weight: 800; color: var(--primary);
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  .rp-row {
    padding: 12px 8px; border-radius: var(--radius);
    transition: background 0.12s; margin-top: 2px;
  }
  .rp-row:hover { background: var(--bg-hover); }
  .rp-row + .rp-row { border-top: 1px solid var(--border-soft); }
  .rp-row-module { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .rp-row-module-name { font-size: 13px; color: var(--t-base); }
  .rp-row-module-meta { display: flex; align-items: center; gap: 8px; }
  .rp-row-entries { font-size: 11px; color: var(--t-muted); }
  .rp-row-persons { display: flex; gap: 6px; flex-wrap: wrap; }
  .rp-name-chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: var(--t-base);
    background: var(--bg-muted); padding: 4px 10px 4px 4px;
    border-radius: 999px;
  }
  .rp-name-chip-avatar { width: 20px; height: 20px; font-size: 9px; }
  .rp-row-hours {
    font-size: 13.5px; font-weight: 800; color: var(--primary);
    font-variant-numeric: tabular-nums;
  }

  /* ── States ── */
  .rp-loading { text-align: center; color: var(--t-muted); padding: 46px 0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .rp-empty { text-align: center; padding: 46px 20px; }
  .rp-empty-icon { font-size: 36px; color: var(--t-muted); opacity: 0.3; display: block; margin-bottom: 10px; }
  .rp-empty-title { font-size: 13.5px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .rp-empty-sub { font-size: 12.5px; color: var(--t-muted); margin: 0; }
  .rp-spin { animation: rp-spin 0.7s linear infinite; display: inline-block; }
  @keyframes rp-spin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .rp-table-head { display: none; }
    .rp-row {
      grid-template-columns: 1fr; gap: 8px;
      background: var(--bg); padding: 14px; margin-bottom: 8px;
      box-shadow: var(--shadow-sm);
    }
    .rp-row-hours { text-align: left; }
    .rp-select-wrap { min-width: 220px; flex: 1; }
  }
  @media (max-width: 560px) {
    .rp-title { font-size: 20px; }
    .rp-overall { padding: 16px; }
    .rp-card { padding: 16px; }
  }
`;
