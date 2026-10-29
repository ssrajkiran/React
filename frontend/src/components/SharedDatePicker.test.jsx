import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SharedDatePicker from "./SharedDatePicker";

describe("SharedDatePicker", () => {
  it("renders input with formatted initial date and placeholder", () => {
    render(<SharedDatePicker value="2026-10-29" placeholder="Choose date" />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("29-10-2026");
  });

  it("opens calendar and renders 3-letter day names including Sun, Mon, etc.", async () => {
    const user = userEvent.setup();
    render(<SharedDatePicker value="2026-10-29" />);
    const input = screen.getByRole("textbox");
    await user.click(input);

    const dayNameNodes = document.querySelectorAll(".react-datepicker__day-name");
    expect(dayNameNodes.length).toBe(7);

    const dayTexts = Array.from(dayNameNodes).map((node) => {
      const span = node.querySelector("span[aria-hidden='true']");
      return (span?.textContent || node.textContent).trim();
    });

    expect(dayTexts).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("calls onChange with YYYY-MM-DD when a day is selected", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SharedDatePicker value="2026-10-01" onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    await user.click(input);

    const day15 = screen.getByLabelText(/October 15th, 2026/i);
    await user.click(day15);

    expect(handleChange).toHaveBeenCalledWith("2026-10-15");
  });
});
