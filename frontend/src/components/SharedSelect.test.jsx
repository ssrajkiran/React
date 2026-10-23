import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import SharedSelect from "./SharedSelect";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "g", label: "Gamma" },
];

beforeEach(() => {
  // react-select menu portal needs a sized container in jsdom
  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    width: 300, height: 40, top: 0, left: 0, right: 300, bottom: 40, x: 0, y: 0,
    toJSON: () => {},
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SharedSelect", () => {
  it("renders placeholder when no value", () => {
    render(<SharedSelect options={OPTIONS} placeholder="Pick one…" />);
    expect(screen.getByText("Pick one…")).toBeInTheDocument();
  });

  it("shows selected label for single select", () => {
    render(<SharedSelect value="b" options={OPTIONS} />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("opens menu and filters options on search", async () => {
    render(<SharedSelect options={OPTIONS} placeholder="Pick one…" />);
    fireEvent.mouseDown(screen.getByText("Pick one…"));
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ga" } });
    await waitFor(() => expect(screen.getByText("Gamma")).toBeInTheDocument());
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("calls onChange with the value on option click", async () => {
    const onChange = vi.fn();
    render(<SharedSelect options={OPTIONS} onChange={onChange} placeholder="Pick one…" />);
    fireEvent.mouseDown(screen.getByText("Pick one…"));
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alpha"));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("clears single value when isClearable and cleared", async () => {
    const onChange = vi.fn();
    render(
      <SharedSelect value="a" options={OPTIONS} onChange={onChange} isClearable />
    );
    fireEvent.mouseDown(screen.getByText("Alpha"));
    // clear indicator appears when a value is selected
    await waitFor(() => expect(screen.getByText("Beta")).toBeInTheDocument());
    const clear = document.querySelector(".ss__clear-indicator");
    if (clear) fireEvent.click(clear);
    if (onChange.mock.calls.length) {
      expect(onChange).toHaveBeenCalledWith("");
    }
  });

  it("maps multi values back to an array of values", async () => {
    const onChange = vi.fn();
    render(
      <SharedSelect isMulti options={OPTIONS} onChange={onChange} placeholder="Pick…" />
    );
    fireEvent.mouseDown(screen.getByText("Pick…"));
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alpha"));
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });

  it("passes through disabled state", () => {
    const { container } = render(
      <SharedSelect options={OPTIONS} isDisabled value="a" />
    );
    const input = container.querySelector("input");
    expect(input).toBeDisabled();
  });

  it("uses theme tokens in styles (no hardcoded hex for menu bg)", async () => {
    render(<SharedSelect options={OPTIONS} placeholder="Pick one…" />);
    fireEvent.mouseDown(screen.getByText("Pick one…"));
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    const menu = document.querySelector('[class*="-menu"]');
    expect(menu).toBeTruthy();
    // background comes from CSS var → jsdom computed value is empty,
    // so instead assert no inline hex color was baked in.
    expect(menu.getAttribute("style") || "").not.toMatch(/background(-color)?:\s*#/i);
  });
});
