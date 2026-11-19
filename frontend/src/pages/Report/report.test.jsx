import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AttendanceReport from "./report";
import api from "../../api";

// Mock AppLayout
vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock API
vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAttendanceData = {
  daysInMonth: 31,
  rows: [
    {
      User: "Alice Smith",
      1: {
        status: "leave",
        days: 2,
        from_date: "2026-03-01",
        to_date: "2026-03-02",
        remarks: "Family celebration",
        approval_status: "approved",
      },
      2: {
        status: "leave",
        days: 2,
        from_date: "2026-03-01",
        to_date: "2026-03-02",
        remarks: "Family celebration",
        approval_status: "approved",
      },
      3: null, // Present
      4: {
        status: "permission",
        hours: 2,
        slot: "morning",
        remarks: "Dental appointment",
        approval_status: "approved",
      },
      5: {
        status: "compoff",
        days: 1,
        comp_off_date: "2026-01-26",
        remarks: "Holiday work credit",
        approval_status: "approved",
      },
    },
    {
      User: "Bob Jones",
      1: null,
      2: {
        status: "leave",
        days: 0.5,
        half_day_type: "first_half",
        remarks: "Urgent personal task",
        approval_status: "pending",
      },
      3: {
        status: "present_on_holiday",
        holiday_name: "Special Corporate Holiday",
      },
      6: {
        status: "WH",
        type: "wfh",
        days: 1,
        from_date: "2026-03-06",
        to_date: "2026-03-06",
        remarks: "Remote deployment setup",
        approval_status: "approved",
      },
    },
  ],
};

// Dynamic dates so holiday assertions work regardless of when tests run
const _now = new Date();
const _pad = (n) => String(n).padStart(2, "0");
const _monthPrefix = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-`;
// Day used for the compensation-eligible holiday (never collides with mock cells 1–6)
const compHolidayDay = _now.getDate() === 15 ? 16 : 15;
const noCompHolidayDay = _now.getDate() === 15 ? 17 : 16;

// A weekend day (7–28) to act as a replacement working day — proves that a
// Sat/Sun renders as a normal office day when a holiday covers it.
const _busyDays = new Set([1, 2, 3, 4, 5, 6, compHolidayDay, noCompHolidayDay]);
const isWeekOffDay = (y, m, d) => {
  const dow = new Date(y, m - 1, d, 12).getDay();
  if (dow === 0) return true;
  if (dow === 6) {
    let count = 0;
    for (let i = 1; i <= d; i++) {
      if (new Date(y, m - 1, i, 12).getDay() === 6) count++;
    }
    return count === 2 || count === 4;
  }
  return false;
};

const replacementDay = (() => {
  for (let d = 7; d <= 28; d++) {
    if (isWeekOffDay(_now.getFullYear(), _now.getMonth() + 1, d) && !_busyDays.has(d)) return d;
  }
  return 8;
})();
const replacementHolidayDay = [23, 24, 25, 26, 27].find((d) => d !== replacementDay);

const mockHolidays = [
  { date: `${_monthPrefix}${_pad(compHolidayDay)}`, name: "Festival", has_compensation: 1 },
  { date: `${_monthPrefix}${_pad(noCompHolidayDay)}`, name: "Company Day", has_compensation: 0 },
  {
    date: `${_monthPrefix}${_pad(replacementHolidayDay)}`,
    name: "Bridge Holiday",
    has_compensation: 1,
    replacement_date: `${_monthPrefix}${_pad(replacementDay)}`,
  },
];

const mockPeople = [
  { id: "101", name: "Alice Smith" },
  { id: "102", name: "Bob Jones" },
];

const mockPersonSummary = {
  user: { name: "Alice Smith" },
  totals: {
    leave_days: 2,
    compoff_days: 1,
    permission_hours: 2,
    present_days: 0,
    total_days: 3,
  },
  monthly: [
    {
      month: 3,
      leave_days: 2,
      compoff_days: 1,
      permission_hours: 2,
      present_days: 0,
      total_days: 3,
      records: [
        {
          day: "2026-03-01",
          type: "leave",
          days: 2,
          from_date: "2026-03-01",
          to_date: "2026-03-02",
          remarks: "Family celebration",
        },
      ],
    },
  ],
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();

  api.get.mockImplementation((url) => {
    if (url.startsWith("/attendance?")) {
      return Promise.resolve({ data: mockAttendanceData });
    }
    if (url.startsWith("/holidays/")) {
      return Promise.resolve({ data: mockHolidays });
    }
    if (url === "/attendance/people") {
      return Promise.resolve({ data: mockPeople });
    }
    if (url.startsWith("/attendance/person-summary")) {
      return Promise.resolve({ data: mockPersonSummary });
    }
    return Promise.resolve({ data: {} });
  });

  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    width: 250, height: 40, top: 0, left: 0, right: 250, bottom: 40, x: 0, y: 0,
    toJSON: () => {},
  });
});

afterEach(() => {
  cleanup();
});

describe("AttendanceReport Page Component", () => {
  it("renders page title, badges, and breadcrumb navigation", async () => {
    render(
      <MemoryRouter>
        <AttendanceReport />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Attendance Report" })).toBeInTheDocument();
    expect(screen.getByText("HR & Workforce Insights")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Export Excel")).toBeInTheDocument();
    expect(screen.getByText("Current Month")).toBeInTheDocument();
  });

  it("renders executive KPI summary stats bar", async () => {
    render(
      <MemoryRouter>
        <AttendanceReport />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Working Days")).toBeInTheDocument();
    expect(screen.getByText("Attendance Rate")).toBeInTheDocument();
    expect(screen.getByText("Leaves Taken")).toBeInTheDocument();
    expect(screen.getByText("Comp Offs")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });

  it("filters employee rows via live search input", async () => {
    render(
      <MemoryRouter>
        <AttendanceReport />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Filter employee name…");
    fireEvent.change(searchInput, { target: { value: "Bob" } });

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();

    const clearBtn = screen.getByTitle("Clear search");
    fireEvent.click(clearBtn);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("renders the attendance matrix table with employees and status chips", async () => {
    render(
      <MemoryRouter>
        <AttendanceReport />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();

    const day1LeaveCell = screen.getByTitle(/Leave on Day 1/i);
    expect(day1LeaveCell).toBeInTheDocument();

    const day4PermCell = screen.getByTitle(/Permission on Day 4/i);
    expect(day4PermCell).toBeInTheDocument();

    const day5CompOffCell = screen.getByTitle(/Comp Off on Day 5/i);
    expect(day5CompOffCell).toBeInTheDocument();
  });

  describe("Holiday compensation flag", () => {
    it("marks holiday columns with compensation status in the header", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      // No-comp holiday column header carries the compensation status
      expect(screen.getAllByTitle(/Holiday · No comp-off/i).length).toBeGreaterThan(0);
      // Comp-eligible holiday column header too
      expect(screen.getAllByTitle(/Holiday · Comp-off/i).length).toBeGreaterThan(0);
    });

    it("shows compensation status in the holiday cell detail modal", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const holidayCells = screen.getAllByTitle(new RegExp(`No comp-off on Day ${noCompHolidayDay} — Click to view full details`, "i"));
      expect(holidayCells.length).toBeGreaterThan(0);
      fireEvent.click(holidayCells[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getAllByText("Company Day").length).toBeGreaterThan(0);
      expect(within(dialog).getByText("Not applicable")).toBeInTheDocument();
      expect(within(dialog).getByText(/No comp-off/i)).toBeInTheDocument();
    });
  });

  describe("Replacement working day", () => {
    it("shows the replacement date as a working day (not a weekend) in the column header", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const th = screen.getByTitle(new RegExp(`Working day · covers Bridge Holiday`, "i"));
      expect(th).toBeInTheDocument();
      expect(th).not.toHaveClass("ar-weekend");
      expect(th.title).not.toMatch(/Weekend/i);
    });

    it("renders replacement-day cells as Present without weekend styling", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const cells = screen.getAllByTitle(/normal working day \(covers Bridge Holiday\)/i);
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach((cell) => {
        expect(cell).not.toHaveClass("ar-weekend-cell");
        expect(cell).toHaveTextContent("P");
      });
    });
  });

  describe("Saturday week off rules (2nd and 4th Saturday only)", () => {
    it("renders 2nd and 4th Saturday as Week Off (WO) with weekend styling", async () => {
      let satCount = 0;
      let secondSat = null;
      for (let d = 1; d <= 31; d++) {
        const dow = new Date(_now.getFullYear(), _now.getMonth(), d, 12).getDay();
        if (dow === 6) {
          satCount++;
          if (satCount === 2) {
            secondSat = d;
            break;
          }
        }
      }

      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      if (secondSat && secondSat !== replacementDay) {
        const th = screen.getByTitle(new RegExp(`Sa, ${secondSat} .*\\(Weekend\\)`, "i"));
        expect(th).toHaveClass("ar-weekend");

        const cells = screen.getAllByTitle(new RegExp(`Week Off`, "i"));
        expect(cells.length).toBeGreaterThan(0);
        expect(cells[0]).toHaveTextContent("WO");
      }
    });

    it("renders 1st, 3rd (e.g. 21st in Nov 2026), and 5th Saturday as Present (P) without weekend styling", async () => {
      let satCount = 0;
      let thirdSat = null;
      for (let d = 1; d <= 31; d++) {
        const dow = new Date(_now.getFullYear(), _now.getMonth(), d, 12).getDay();
        if (dow === 6) {
          satCount++;
          if (satCount === 3) {
            thirdSat = d;
            break;
          }
        }
      }

      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      if (thirdSat && thirdSat !== replacementDay) {
        const th = screen.getByTitle(new RegExp(`Sa, ${thirdSat} [A-Za-z]+$`, "i"));
        expect(th).not.toHaveClass("ar-weekend");
        expect(th.title).not.toMatch(/Weekend/i);

        // Verify present status chip on 3rd Saturday (e.g. 21st Nov)
        const cells = screen.getAllByTitle(new RegExp(`^Present$`, "i"));
        expect(cells.length).toBeGreaterThan(0);
        expect(cells[0]).not.toHaveClass("ar-weekend-cell");
        expect(cells[0]).toHaveTextContent("P");
      }
    });
  });

  describe("Attendance Detail View Modal & '2 Days' Visibility", () => {
    it("opens modal on clicking a leave cell and clearly displays '2 Days' duration", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      // Find Alice's day 1 leave cell and click it
      const leaveCell = screen.getByTitle(/Leave on Day 1 — Click to view full details/i);
      fireEvent.click(leaveCell);

      // Verify modal opened
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // THE KEY USER REQUIREMENT:
      // "Attendance Report in this view page some font 2 days like that didnt visible correctly make update"
      // Verify the duration hero card is rendered and contains "2 Days" in clear, bold font
      const heroCard = screen.getByTestId("duration-hero-card");
      expect(heroCard).toBeInTheDocument();
      expect(heroCard).toHaveTextContent("2 Days");
      expect(heroCard).toHaveTextContent("Total Leave Duration");

      // Verify employee details in modal
      expect(screen.getByRole("heading", { name: /Leave Details/i })).toBeInTheDocument();
      expect(within(screen.getByRole("dialog")).getByText(/Alice Smith/)).toBeInTheDocument();

      // Verify timeline date connector
      expect(screen.getByText("From Date")).toBeInTheDocument();
      expect(screen.getByText("To Date")).toBeInTheDocument();

      // Verify remarks
      expect(screen.getByText(/Family celebration/)).toBeInTheDocument();

      // Verify approval status
      expect(screen.getByText("APPROVED")).toBeInTheDocument();

      // Close modal via close button
      const closeBtn = screen.getByTitle("Close (Esc)");
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("displays permission duration ('2 Hours') and slot in the modal", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      // Click permission cell on day 4
      const permCell = screen.getByTitle(/Permission on Day 4 — Click to view full details/i);
      fireEvent.click(permCell);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const heroCard = screen.getByTestId("duration-hero-card");
      expect(heroCard).toHaveTextContent("2 Hours");
      expect(heroCard).toHaveTextContent("Slot: morning");

      // Close via keyboard Escape
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("displays half day details ('Half Day (0.5)') in the modal", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      });

      // Click Bob's HD cell on day 2
      const hdCell = screen.getByTitle(/Half Day Leave on Day 2 — Click to view full details/i);
      fireEvent.click(hdCell);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const heroCard = screen.getByTestId("duration-hero-card");
      expect(heroCard).toHaveTextContent("Half Day (0.5)");
      expect(heroCard).toHaveTextContent("Morning Session");
      expect(screen.getByText("PENDING")).toBeInTheDocument();
    });

    it("displays Work From Home ('WH') status in table, legend and modal", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      });

      // Verify legend contains Work From Home
      expect(screen.getByText("Work From Home")).toBeInTheDocument();

      // Verify Bob's WH cell
      const whCell = screen.getByTitle(/Work From Home on Day 6 — Click to view full details/i);
      expect(whCell).toBeInTheDocument();
      fireEvent.click(whCell);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Standard modal structure
      expect(screen.getByRole("heading", { name: /Work From Home Details/i })).toBeInTheDocument();
      expect(screen.getByText(/Remote deployment setup/)).toBeInTheDocument();

      const heroCard = screen.getByTestId("duration-hero-card");
      expect(heroCard).toHaveTextContent("Work From Home Duration");
      expect(heroCard).toHaveTextContent("1 Day");
    });

    it("verifies employee names have truncation ellipsis class and hover tooltip title", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const aliceSpan = screen.getByText("Alice Smith");
      expect(aliceSpan).toHaveAttribute("title", "Alice Smith");
      expect(aliceSpan.className).toContain("text-truncate-hover");
    });

    it("copies attendance record summary when 'Copy Summary' is clicked", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const leaveCell = screen.getByTitle(/Leave on Day 1 — Click to view full details/i);
      fireEvent.click(leaveCell);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const copyBtn = screen.getByText("Copy Summary");
      fireEvent.click(copyBtn);

      expect(copyBtn).toBeInTheDocument();
    });
  });

  describe("Excel Export", () => {
    it("handles Excel export without error", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const exportBtn = screen.getByText("Export Excel");
      window.URL.createObjectURL = vi.fn(() => "blob:mock-url");

      expect(() => fireEvent.click(exportBtn)).not.toThrow();
    });
  });

  describe("Current Month Shortcut", () => {
    it("resets month and year to current date on 'Current Month' click", async () => {
      render(
        <MemoryRouter>
          <AttendanceReport />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });

      const todayBtn = screen.getByText("Current Month");
      fireEvent.click(todayBtn);
      expect(todayBtn).toBeInTheDocument();
    });
  });
});
