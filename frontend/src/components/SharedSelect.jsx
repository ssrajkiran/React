import Select from "react-select";

const ssStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#5048E5" : "#E5E7EB",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(80,72,229,0.1)" : "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    minHeight: "38px",
    background: "#fff",
    "&:hover": { borderColor: "#5048E5" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "10px",
    fontSize: "13px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#5048E5" : state.isFocused ? "#EEF2FF" : "transparent",
    color: state.isSelected ? "#fff" : "#111827",
    fontWeight: state.isSelected ? 600 : 400,
  }),
  placeholder: (base) => ({ ...base, color: "#9CA3AF", fontSize: "13px" }),
  singleValue: (base) => ({ ...base, color: "#111827", fontWeight: 500 }),
};

export default function SharedSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  isDisabled = false,
  isClearable = false,
  isSearchable = true,
  className = "",
  ...rest
}) {
  const selected = options.find((o) => o.value === value) || null;

  const handleChange = (sel) => {
    if (onChange) onChange(sel ? sel.value : "");
  };

  return (
    <div className={`ss-select-wrap ${className}`}>
      <Select
        value={selected}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable={isSearchable}
        styles={ssStyles}
        noOptionsMessage={() => "No options found"}
        {...rest}
      />
    </div>
  );
}
