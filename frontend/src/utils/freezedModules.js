// Freezed modules shown by default in the timesheet module dropdown for every project.
// They are not stored as module rows - selecting one submits a virtual "FV::<name>"
// value and the entry always reports as status "Completed".
export const FREEZED_MODULES = [
  "Requirement Gathering",
  "Meeting & Discussion",
  "Document Preparation",
  "Deployment",
  "KT",
  "Enhancement",
];

export const FREEZED_PREFIX = "FV::";

export const isFreezedName = (name) =>
  FREEZED_MODULES.includes(String(name || "").trim());

// Module options for the timesheet form: the project's own modules first,
// then the freezed modules (always present for every project).
// If the project already has a module with a freezed name, its id is used so
// hours keep aggregating to that module.
export const buildModuleOptions = (tasks = []) => {
  const projectOptions = tasks
    .filter((t) => !isFreezedName(t.task))
    .map((t) => ({ value: t.id, label: t.task }));

  const freezedOptions = FREEZED_MODULES.map((name) => {
    const match = tasks.find((t) => t.task === name);
    return { value: match ? match.id : FREEZED_PREFIX + name, label: name };
  });

  return [...projectOptions, ...freezedOptions];
};
