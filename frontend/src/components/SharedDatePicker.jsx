import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toDateString = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const toDateObj = (s) => {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  const str = String(s).trim();
  // YYYY-MM-DD (with or without time / ISO suffix)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(dt) ? null : dt;
  }
  // DD-MM-YYYY or DD/MM/YYYY
  const m2 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m2) {
    const dt = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(str);
  return isNaN(dt) ? null : dt;
};

export default function SharedDatePicker({
  value = "",
  onChange,
  className = "",
  disabled = false,
  max,
  min,
  placeholder = "Select date",
  ...rest
}) {
  const [startDate, setStartDate] = useState(toDateObj(value));

  useEffect(() => {
    setStartDate(toDateObj(value));
  }, [value]);

  const handleChange = (date) => {
    setStartDate(date);
    if (onChange) {
      onChange(date ? toDateString(date) : "");
    }
  };

  return (
    <DatePicker
      selected={startDate}
      onChange={handleChange}
      dateFormat="dd-MM-yyyy"
      className={`sd-datepicker ${className}`}
      disabled={disabled}
      maxDate={max ? toDateObj(max) : undefined}
      minDate={min ? toDateObj(min) : undefined}
      placeholderText={placeholder}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      scrollableYearDropdown
      yearDropdownItemNumber={120}
      formatWeekDay={(day) => day.slice(0, 3)}
      {...rest}
    />
  );
}
