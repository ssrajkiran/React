import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeeTimesheetList from "./EmployeeTimesheetList";
import AdminTimesheetList from "./AdminTimesheetList";
import api from "../../api";

// Mock AppLayout
vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock API
vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock toastify
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("Timesheet Meeting Type Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("token", "header." + btoa(JSON.stringify({ id: 5, role: "employee" })) + ".sig");

    api.get.mockImplementation((url) => {
      if (url.includes("/timesheet/employee/projects") || url.includes("/timesheet/admin/projects")) {
        return Promise.resolve({ data: [{ id: 1, project_name: "Phoenix System" }] });
      }
      if (url.includes("/timesheet/employee/tasks") || url.includes("/timesheet/admin/tasks")) {
        return Promise.resolve({ data: [{ id: 10, task_name: "Auth Core" }] });
      }
      if (url.includes("/timesheet/leave-dates") || url.includes("/timesheet/admin/leave-dates")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/timesheet/admin/users")) {
        return Promise.resolve({ data: [{ id: 5, name: "Alice Smith" }] });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockResolvedValue({ data: { message: "Timesheet added successfully" } });
  });

  it("renders 'Meeting' option in EmployeeTimesheetList Type dropdown and hides Project/Module when selected", async () => {
    render(
      <MemoryRouter>
        <EmployeeTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Add Timesheet")).toBeInTheDocument();
    });

    // Open Add Timesheet modal
    fireEvent.click(screen.getByText("Add Timesheet"));

    await waitFor(() => {
      expect(screen.getByText("Log your work hours")).toBeInTheDocument();
    });

    const modal = document.querySelector(".ul-modal");
    expect(modal).toBeInTheDocument();

    // Find Type select inside modal
    const typeSelect = modal.querySelector("select.et-input");
    expect(typeSelect).toHaveValue("project");

    // Options include Project, Permission, Meeting
    const options = Array.from(typeSelect.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("project");
    expect(options).toContain("permission");
    expect(options).toContain("meeting");

    // Switch to Meeting
    fireEvent.change(typeSelect, { target: { value: "meeting" } });
    expect(typeSelect).toHaveValue("meeting");

    // Project and Module are not shown
    expect(screen.queryByText("— Select Project —")).not.toBeInTheDocument();
    expect(screen.queryByText("— Select Module —")).not.toBeInTheDocument();

    // Meeting hints and description should be present
    expect(screen.getByText(/Meeting mode: Project and Module are not required/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the meeting agenda, attendees, or key takeaways/i)).toBeInTheDocument();
  });

  it("renders 'Meeting' option in AdminTimesheetList Type dropdown and hides Project/Module", async () => {
    render(
      <MemoryRouter>
        <AdminTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Add Timesheet")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Timesheet"));

    await waitFor(() => {
      expect(screen.getByText("Log work hours for a user")).toBeInTheDocument();
    });

    const modal = document.querySelector(".ul-modal");
    expect(modal).toBeInTheDocument();

    const typeSelect = modal.querySelector("select.ts-input");
    expect(typeSelect).toHaveValue("project");

    const options = Array.from(typeSelect.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("project");
    expect(options).toContain("permission");
    expect(options).toContain("meeting");

    fireEvent.change(typeSelect, { target: { value: "meeting" } });

    // Verify Project and Module fields are hidden
    expect(screen.queryByText("— Select Project —")).not.toBeInTheDocument();
    expect(screen.queryByText("— Select Module —")).not.toBeInTheDocument();
    expect(screen.getByText(/Meeting mode: Project and Module are not required/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the meeting agenda, attendees, or key takeaways/i)).toBeInTheDocument();
  });
});
