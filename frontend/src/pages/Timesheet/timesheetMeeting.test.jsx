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
    localStorage.setItem("token", "header." + btoa(JSON.stringify({ id: 5, role: "admin" })) + ".sig");

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
      if (url === "/timesheet/employee" || url === "/timesheet/admin") {
        return Promise.resolve({
          data: [
            {
              timesheet_id: 101,
              timesheet_date: "2026-11-03",
              task_id: null,
              project_id: null,
              project_name: "Meeting",
              task_name: "Sprint Review",
              task_status: "Completed",
              work_description: "Sprint Review with client",
              start_time: "10:00:00",
              end_time: "11:00:00",
              man_hrs: 1,
              timesheet_created_by: 5,
              created_by_name: "Alice Smith",
            },
          ],
        });
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

    // Options include Project, Break, Meeting
    const options = Array.from(typeSelect.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("project");
    expect(options).toContain("break");
    expect(options).toContain("meeting");

    // Switch to Break
    fireEvent.change(typeSelect, { target: { value: "break" } });
    expect(typeSelect).toHaveValue("break");
    expect(screen.getByText(/Break mode: 15 minutes auto-assigned/i)).toBeInTheDocument();

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
    expect(options).toContain("break");
    expect(options).toContain("meeting");

    fireEvent.change(typeSelect, { target: { value: "meeting" } });

    // Verify Project and Module fields are hidden
    expect(screen.queryByText("— Select Project —")).not.toBeInTheDocument();
    expect(screen.queryByText("— Select Module —")).not.toBeInTheDocument();
    expect(screen.getByText(/Meeting mode: Project and Module are not required/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the meeting agenda, attendees, or key takeaways/i)).toBeInTheDocument();
  });

  it("displays 'Meeting' as Project in the timesheet table instead of 'Permission'", async () => {
    render(
      <MemoryRouter>
        <EmployeeTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Meeting")).toBeInTheDocument();
    });

    // Verify table row displays "Meeting" as project pill
    const meetingPill = screen.getByText("Meeting");
    expect(meetingPill).toHaveClass("et-project-pill");
    expect(screen.queryByText("Permission")).not.toBeInTheDocument();
  });

  it("opens delete modal with enhanced width, height, and padding classes", async () => {
    render(
      <MemoryRouter>
        <EmployeeTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle("Delete")).toBeInTheDocument();
    });

    // Click delete action button
    fireEvent.click(screen.getByTitle("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Delete Timesheet")).toBeInTheDocument();
    });

    const deleteModal = document.querySelector(".ts-delete-modal");
    expect(deleteModal).toBeInTheDocument();

    const deleteBody = document.querySelector(".ts-delete-body");
    expect(deleteBody).toBeInTheDocument();

    // Verify confirmation text mentions the meeting task name inside delete body
    expect(deleteBody.querySelector("strong")).toHaveTextContent("Sprint Review");
  });

  it("formats legacy 'Permission' entries as 'Break' on the list page", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/timesheet/employee" || url === "/timesheet/admin") {
        return Promise.resolve({
          data: [
            {
              timesheet_id: 102,
              timesheet_date: "2026-11-03",
              task_id: null,
              project_id: null,
              project_name: "Permission",
              task_name: "Permission",
              task_status: "Permission",
              work_description: "Permission",
              start_time: "14:00:00",
              end_time: "14:15:00",
              man_hrs: 0.25,
              timesheet_created_by: 5,
              created_by_name: "Alice Smith",
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <EmployeeTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Break").length).toBeGreaterThan(0);
    });

    // Ensure "Permission" is not displayed in the table
    expect(screen.queryByText("Permission")).not.toBeInTheDocument();
  });

  it("clicking delete button in AdminTimesheetList does not trigger row click / view modal", async () => {
    render(
      <MemoryRouter>
        <AdminTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle("Delete")).toBeInTheDocument();
    });

    // Click delete action button
    fireEvent.click(screen.getByTitle("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Delete Timesheet")).toBeInTheDocument();
    });

    // View modal header "Timesheet Entry #" should NOT be in the document
    expect(screen.queryByText(/Timesheet Entry #/i)).not.toBeInTheDocument();
  });

  it("renders Meeting entry with Project 'Meeting' and Status 'Completed' even if backend returned project_name 'Break'", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/timesheet/admin" || url === "/timesheet/employee") {
        return Promise.resolve({
          data: [
            {
              timesheet_id: 330,
              timesheet_date: "2026-11-03",
              task_id: "MEETING",
              entry_type: "meeting",
              project_id: null,
              project_name: "Break", // backend evaluated ELSE 'Break' previously
              task_name: "tsf",
              task_status: "Break",
              work_description: "tsf",
              start_time: "09:00:00",
              end_time: "12:00:00",
              man_hrs: 3,
              timesheet_created_by: 5,
              created_by_name: "Alice Smith",
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <AdminTimesheetList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("tsf").length).toBeGreaterThan(0);
    });

    // Project column MUST show Meeting, not Break
    const projectPills = document.querySelectorAll(".ts-project-pill");
    expect(projectPills.length).toBe(1);
    expect(projectPills[0]).toHaveTextContent("Meeting");

    // Status column MUST show Completed, not Break
    const statusPills = document.querySelectorAll(".ts-status-pill");
    expect(statusPills.length).toBe(1);
    expect(statusPills[0]).toHaveTextContent("Completed");

    // "Break" should NOT appear in the project or status pill
    expect(projectPills[0]).not.toHaveTextContent("Break");
    expect(statusPills[0]).not.toHaveTextContent("Break");
  });
});
