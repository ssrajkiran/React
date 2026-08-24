import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toDateString = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const toDateObj = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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
      maxDate={toDateObj(max)}
      minDate={toDateObj(min)}
      placeholderText={placeholder}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      {...rest}
    />
  );
}
