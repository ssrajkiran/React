import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fmtDob } from "../../utils";
import CreateUser from "./createuser";
import UsersPresent from "./userlist";
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

describe("Date of Birth & Birthday Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("token", "header." + btoa(JSON.stringify({ id: 1, role: "admin" })) + ".sig");

    api.get.mockImplementation((url) => {
      if (url.includes("/roles/list")) {
        return Promise.resolve({ data: [{ id: 1, name: "admin" }, { id: 2, name: "employee" }] });
      }
      if (url.includes("/auth/users") || url === "/auth") {
        return Promise.resolve({
          data: [
            { id: 16, name: "Govardhan K", email: "govardhan@company.com", role: "employee", dob: "2002-05-10" },
            { id: 23, name: "Rajkiran S S", email: "rajkiran@company.com", role: "employee", dob: "2001-10-16" },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  describe("fmtDob formatting", () => {
    it("formats YYYY-MM-DD correctly to DD-MM-YYYY", () => {
      expect(fmtDob("2002-05-10")).toBe("10-05-2002");
      expect(fmtDob("1995-12-25")).toBe("25-12-1995");
    });

    it("formats ISO strings without timezone day shifts", () => {
      expect(fmtDob("2002-05-10T00:00:00.000Z")).toBe("10-05-2002");
    });

    it("returns '—' for missing or empty dates", () => {
      expect(fmtDob(null)).toBe("—");
      expect(fmtDob(undefined)).toBe("—");
      expect(fmtDob("")).toBe("—");
    });
  });

  describe("CreateUser Datepicker Limit & Modal Width", () => {
    it("renders Date of Birth picker without max limit in CreateUser page", async () => {
      render(
        <MemoryRouter>
          <CreateUser />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("New User Details")).toBeInTheDocument();
      });

      // Find Date of Birth input
      const dobInput = document.querySelector(".cu-input");
      expect(dobInput).toBeInTheDocument();
      // Should not have any max attribute restricting past/future years
      expect(dobInput).not.toHaveAttribute("max");

      // Verify cu-page-wrap and cu-form-card are present for modal-width layout
      const pageWrap = document.querySelector(".cu-page-wrap");
      const formCard = document.querySelector(".cu-form-card");
      expect(pageWrap).toBeInTheDocument();
      expect(formCard).toBeInTheDocument();
    });
  });

  describe("UserList Datepicker Limit, Table DOB & Create/Edit Modals", () => {
    it("renders DOB column formatted as DD-MM-YYYY in Users table", async () => {
      render(
        <MemoryRouter>
          <UsersPresent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Govardhan K")).toBeInTheDocument();
      });

      // Verify formatted DOB
      expect(screen.getByText("10-05-2002")).toBeInTheDocument();
      expect(screen.getByText("16-10-2001")).toBeInTheDocument();
    });

    it("opens edit modal with proper modal width class and Date of Birth datepicker", async () => {
      render(
        <MemoryRouter>
          <UsersPresent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Govardhan K")).toBeInTheDocument();
      });

      // Click Edit on first user
      const editBtns = screen.getAllByTitle("Edit User");
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument();
      });

      const modal = document.querySelector(".ul-modal");
      expect(modal).toHaveClass("ul-modal-md");
      expect(modal).toHaveClass("ul-user-modal");

      const dobInput = modal.querySelector(".ul-input.sd-datepicker");
      expect(dobInput).toBeInTheDocument();
      expect(dobInput).not.toHaveAttribute("max");
      expect(dobInput.value).toBe("10-05-2002");
    });

    it("opens create modal with proper modal width class when Add User is clicked", async () => {
      render(
        <MemoryRouter>
          <UsersPresent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Govardhan K")).toBeInTheDocument();
      });

      // Click Add User button
      const addBtn = screen.getByRole("button", { name: /add user/i });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();
      });

      const modal = document.querySelector(".ul-modal.ul-user-modal");
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass("ul-modal-md");
      expect(modal).toHaveClass("ul-user-modal");

      expect(screen.getByPlaceholderText("e.g. John Doe")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. john@company.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter a secure password")).toBeInTheDocument();
    });
  });
});
