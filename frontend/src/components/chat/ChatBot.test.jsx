import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PreferencesProvider } from "../../context/PreferencesContext";
import ChatBot from "./ChatBot";

const renderChatBot = () => {
  return render(
    <MemoryRouter>
      <PreferencesProvider>
        <ChatBot />
      </PreferencesProvider>
    </MemoryRouter>
  );
};

describe("ChatBot Component (Overall Assistant for All Persons)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders the floating FAB launcher button", () => {
    renderChatBot();
    const fab = screen.getByRole("button", { name: /open ai assistant/i });
    expect(fab).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("opens the chatbot window when FAB is clicked and displays welcome message", () => {
    renderChatBot();
    const fab = screen.getByRole("button", { name: /open ai assistant/i });
    fireEvent.click(fab);

    const titles = screen.getAllByText(/Voltech AI Assistant/i);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Online • Overall Support/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
  });

  it("displays quick navigation links in the initial message", () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const timesheetBtn = screen.getByRole("button", { name: /^timesheet$/i });
    const attendanceBtn = screen.getByRole("button", { name: /^attendance$/i });
    const holidaysBtn = screen.getByRole("button", { name: /^holidays$/i });
    const settingsBtn = screen.getByRole("button", { name: /^settings$/i });

    expect(timesheetBtn).toBeInTheDocument();
    expect(attendanceBtn).toBeInTheDocument();
    expect(holidaysBtn).toBeInTheDocument();
    expect(settingsBtn).toBeInTheDocument();
  });

  it("user can send a query and receive an intelligent response", async () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const input = screen.getByPlaceholderText(/Ask anything/i);
    const sendBtn = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "leave policy" } });
    fireEvent.click(sendBtn);

    // User message should appear
    expect(screen.getByText("leave policy")).toBeInTheDocument();

    // Bot response should arrive with leave policy details
    await waitFor(() => {
      expect(screen.getByText(/Casual Leave \(CL\)/i)).toBeInTheDocument();
    });
  });

  it("clicking a suggestion pill triggers the question", async () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const sugPill = screen.getByText("Upcoming holidays");
    fireEvent.click(sugPill);

    await waitFor(() => {
      expect(screen.getByText(/Holidays Information/i)).toBeInTheDocument();
    });
  });

  it("allows minimizing and expanding the chatbot window", () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const minBtn = screen.getByRole("button", { name: /minimize or expand/i });
    fireEvent.click(minBtn);

    // When minimized, input is hidden
    expect(screen.queryByPlaceholderText(/Ask anything/i)).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(minBtn);
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
  });

  it("clears chat history when clear button is clicked", () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const clearBtn = screen.getByRole("button", { name: /clear chat/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText(/Chat cleared/i)).toBeInTheDocument();
  });

  it("closes the chat window when close button is clicked", () => {
    renderChatBot();
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Online • Overall Support/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open ai assistant/i })).toBeInTheDocument();
  });

  it("toggles chat window via Alt+C shortcut", () => {
    renderChatBot();
    expect(screen.queryByText(/Online • Overall Support/i)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "c", altKey: true });
    expect(screen.getByText(/Online • Overall Support/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "c", altKey: true });
    expect(screen.queryByText(/Online • Overall Support/i)).not.toBeInTheDocument();
  });
});
