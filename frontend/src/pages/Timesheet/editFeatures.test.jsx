import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeeTimesheetList from "./EmployeeTimesheetList";
import AdminTimesheetList from "./AdminTimesheetList";
import Leaves from "../Form/leaves";
import api from "../../api";

// Mock AppLayout
vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock api
vi.mock("../../api", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("Timesheet & Leave Edit Enablement", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Employee Timesheet Edit Option", () => {
    it("renders edit button on timesheet row and opens edit modal with prefilled data", async () => {
      // Mock auth token
      const tokenPayload = btoa(JSON.stringify({ id: 5, name: "Employee User", role: "employee" }));
      localStorage.setItem("token", `header.${tokenPayload}.signature`);

      api.get.mockImplementation((url) => {
        if (url === "/timesheet/employee") {
          return Promise.resolve({
            data: [
              {
                timesheet_id: 101,
                timesheet_date: "2026-11-06",
                man_hrs: 2.5,
                start_time: "09:00:00",
                end_time: "11:30:00",
                work_description: "Developing timesheet edit feature",
                project_id: 1,
                project_name: "Internal Project",
                task_id: 201,
                task_name: "Core Development",
                task_status: "In Progress",
              },
            ],
          });
        }
        if (url.includes("/timesheet/employee/projects")) {
          return Promise.resolve({ data: [{ id: 1, project_name: "Internal Project" }] });
        }
        if (url.includes("/timesheet/employee/tasks/")) {
          return Promise.resolve({ data: [{ id: 201, task_name: "Core Development" }] });
        }
        if (url.includes("/timesheet/leave-dates")) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter>
          <EmployeeTimesheetList />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText("Core Development")).toBeInTheDocument();
      });

      // Find the Edit button in the table row
      const editBtn = screen.getByTitle("Edit");
      expect(editBtn).toBeInTheDocument();

      // Click Edit
      fireEvent.click(editBtn);

      // Modal should open with Edit Timesheet title and Update Timesheet button
      expect(screen.getByText("Edit Timesheet")).toBeInTheDocument();
      expect(screen.getByText("Modify your logged hours")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update Timesheet" })).toBeInTheDocument();
    });
  });

  describe("Admin Timesheet Edit Option", () => {
    it("renders edit button on admin timesheet row and opens edit modal with prefilled data", async () => {
      const tokenPayload = btoa(JSON.stringify({ id: 1, name: "Admin User", role: "admin" }));
      localStorage.setItem("token", `header.${tokenPayload}.signature`);

      api.get.mockImplementation((url) => {
        if (url === "/timesheet/admin") {
          return Promise.resolve({
            data: [
              {
                timesheet_id: 202,
                timesheet_date: "2026-11-06",
                man_hrs: 4.0,
                start_time: "10:00:00",
                end_time: "14:00:00",
                work_description: "Admin reviewing system",
                timesheet_created_by: 5,
                employee_name: "Employee User",
                project_id: 2,
                project_name: "Client Portal",
                task_id: 302,
                task_name: "Review Architecture",
                task_status: "In Progress",
              },
            ],
          });
        }
        if (url.includes("/timesheet/list/users")) {
          return Promise.resolve({ data: [{ id: 5, name: "Employee User" }] });
        }
        if (url.includes("/timesheet/admin/projects/")) {
          return Promise.resolve({ data: [{ id: 2, project_name: "Client Portal" }] });
        }
        if (url.includes("/timesheet/admin/tasks/")) {
          return Promise.resolve({ data: [{ id: 302, task_name: "Review Architecture" }] });
        }
        if (url.includes("/timesheet/leave-dates")) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter>
          <AdminTimesheetList />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Review Architecture")).toBeInTheDocument();
      });

      const editBtn = screen.getByTitle("Edit");
      expect(editBtn).toBeInTheDocument();

      fireEvent.click(editBtn);

      expect(screen.getByText("Edit Timesheet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update Timesheet" })).toBeInTheDocument();
    });
  });

  describe("Leaves Edit Option after Approval for Admin vs Employee", () => {
    it("enables edit for Admin on approved leaves, but hides edit for Employee", async () => {
      // 1. Test as Employee
      const empPayload = btoa(JSON.stringify({ id: 5, name: "Employee User", role: "employee" }));
      localStorage.setItem("token", `header.${empPayload}.signature`);

      api.get.mockImplementation((url) => {
        if (url.includes("/leaves/my")) {
          return Promise.resolve({
            data: [
              {
                id: 501,
                type: "leave",
                start: "2026-11-10",
                end: "2026-11-10",
                days: 1,
                status: "approved",
                remarks: "Personal work",
              },
            ],
          });
        }
        if (url.includes("/leaves/permission-remaining")) {
          return Promise.resolve({ data: { remaining: 2 } });
        }
        if (url.includes("/leaves/holidays")) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      const { unmount } = render(
        <MemoryRouter>
          <Leaves />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Personal work")).toBeInTheDocument();
      });

      // Employee should see View button, but NOT Edit button for approved leave
      expect(screen.getByTitle("View")).toBeInTheDocument();
      expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();

      unmount();

      // 2. Test as Admin
      const adminPayload = btoa(JSON.stringify({ id: 1, name: "Admin User", role: "admin" }));
      localStorage.setItem("token", `header.${adminPayload}.signature`);

      render(
        <MemoryRouter>
          <Leaves />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Personal work")).toBeInTheDocument();
      });

      // Admin SHOULD see Edit button even though leave is approved!
      expect(screen.getByTitle("Edit")).toBeInTheDocument();
    });
  });
});
