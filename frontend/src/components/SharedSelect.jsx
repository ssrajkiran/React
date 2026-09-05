import Select from "react-select";

const getComputedVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const ssStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "var(--primary)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 3px var(--primary-ring)" : "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "var(--font)",
    minHeight: "40px",
    background: "var(--bg-card)",
    "&:hover": { borderColor: "var(--primary)" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "8px",
    fontSize: "13px",
    boxShadow: "var(--shadow-lg)",
    zIndex: 9999,
    overflow: "hidden",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({
    ...base,
    maxHeight: "200px",
    overflowY: "auto",
    padding: "4px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--primary-soft)" : "transparent",
    color: state.isSelected ? "#fff" : "var(--t-base)",
    fontWeight: state.isSelected ? 600 : 400,
    borderRadius: "6px",
    margin: "2px 0",
    padding: "8px 12px",
  }),
  placeholder: (base) => ({ ...base, color: "var(--t-light)", fontSize: "13px" }),
  singleValue: (base) => ({ ...base, color: "var(--t-base)", fontWeight: 500 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "var(--t-muted)", padding: "4px" }),
  clearIndicator: (base) => ({ ...base, color: "var(--t-muted)", padding: "4px" }),
};

export default function SharedSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  isDisabled = false,
  isClearable = false,
  isSearchable = true,
  isMulti = false,
  className = "",
  ...rest
}) {
  const selected = isMulti
    ? options.filter((o) => (value || []).includes(o.value))
    : options.find((o) => o.value === value) || null;

  const handleChange = (sel) => {
    if (isMulti) {
      if (onChange) onChange(sel ? sel.map((s) => s.value) : []);
    } else {
      if (onChange) onChange(sel ? sel.value : "");
    }
  };

  return (
    <Select
      value={selected}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isMulti={isMulti}
      styles={ssStyles}
      className={className}
      classNamePrefix="ss"
      noOptionsMessage={() => "No options found"}
      menuPosition="fixed"
      menuPortalTarget={document.body}
      {...rest}
    />
  );
}
