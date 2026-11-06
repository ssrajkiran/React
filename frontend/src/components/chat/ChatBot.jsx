import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { usePreferences } from "../../context/PreferencesContext";

export default function ChatBot() {
  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [hasUnread, setHasUnread]     = useState(false);
  const [speakingId, setSpeakingId]   = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const navigate       = useNavigate();
  const { prefs, setPrefs } = usePreferences();

  // Get user details from localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let userName = "User";
  let role = "employee";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.name) userName = payload.name;
      if (payload.role) role = payload.role;
    } catch {}
  }

  // Initial welcome message
  useEffect(() => {
    const initialGreeting = {
      id: "msg-welcome",
      sender: "bot",
      text: `Hello **${userName}**! 👋 I am your **Voltech AI Assistant**.\n\nI can help you with anything across the system:\n- 🕒 **Timesheet & Hours** (logging work, meeting entries, daily targets)\n- 🏖️ **Attendance & Leaves** (policies, leave types, applying, status)\n- 📅 **Holidays** (upcoming company & national holidays)\n- 📋 **Modules & Tasks** (tracking tasks & statuses)\n- ⚙️ **Personalization** (switching themes, accents, and fonts)\n${role === "admin" ? "- 👥 **Admin Operations** (users, roles, approving leaves)\n" : ""}\nHow may I help you today?`,
      quickLinks: [
        { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
        { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
        { label: "Holidays", path: "/holidays", icon: "bi-calendar-event" },
        { label: "Settings", path: "/settings", icon: "bi-gear" },
      ],
      suggestions: [
        "What is the leave policy?",
        "How do I log timesheet?",
        "Upcoming holidays",
        "Switch theme to dark",
        "My tasks and modules",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([initialGreeting]);
  }, [userName, role]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Keyboard shortcut: Alt + C to toggle chat, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setIsMinimized(false);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Text to speech
  const speakText = (id, text) => {
    if (!window.speechSynthesis) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, "").replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Smart client-side fallback matching if backend is offline or errors
  const generateClientFallback = (query) => {
    const q = query.trim().toLowerCase();

    // Greeting
    if (/^(hi|hello|hey|good morning|help|start)\b/i.test(q)) {
      return {
        reply: `Hi **${userName}**! 👋 How can I help you today? You can ask about timesheet, leaves, holidays, modules, or personalization settings.`,
        quickLinks: [
          { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
          { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
          { label: "Holidays", path: "/holidays", icon: "bi-calendar-event" },
        ],
        suggestions: ["How to log timesheet?", "Leave policy", "Upcoming holidays"],
      };
    }

    // Timesheet
    if (/timesheet|hour|log work|meeting|man hrs/i.test(q)) {
      return {
        reply: `🕒 **Timesheet Guide:**\n\n- **Standard Timesheet:** Select Project & Module, enter Start Time & End Time. The system calculates man hours automatically!\n- **Meeting Option:** In the Type dropdown, select **Meeting** to log hours without needing project/module selection.\n- **Daily Goal:** Standard full-time requirement is **8.0 man hours** per day.`,
        quickLinks: [
          { label: "Open Timesheet Form", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-pencil-square" },
          { label: "Timesheet Dashboard", path: role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard", icon: "bi-speedometer2" },
        ],
        suggestions: ["Leave policy", "Upcoming holidays", "Switch to dark mode"],
      };
    }

    // Leaves & Attendance
    if (/leave|attendance|casual|sick|permission|wfh|half day/i.test(q)) {
      return {
        reply: `🏖️ **Attendance & Leave Policy:**\n\n- **Casual Leave (CL):** Planned personal leaves.\n- **Sick Leave (SL):** Medical leave for illness.\n- **Permission:** Short absence during work hours (max **2 hours** per slot).\n- **Half Day (HD):** 0.5 day morning or afternoon absence.\n- **Work From Home (WH):** Approved remote day.\n\nTo apply, go to **Attendance** and click **Apply Leave**.`,
        quickLinks: [
          { label: "Apply Leave", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-plus" },
          { label: "Attendance Report", path: "/employee/report", icon: "bi-file-earmark-text" },
        ],
        suggestions: ["How to log timesheet?", "Upcoming holidays", "My tasks"],
      };
    }

    // Holidays
    if (/holiday|festival|vacation|off day|diwali|pongal/i.test(q)) {
      return {
        reply: `📅 **Holidays Information:**\n\nYou can view all upcoming official company and festival holidays on the **Holidays** page.`,
        quickLinks: [{ label: "View All Holidays", path: "/holidays", icon: "bi-calendar-event" }],
        suggestions: ["Leave policy", "Log timesheet", "Switch to dark mode"],
      };
    }

    // Tasks & Modules
    if (/task|module|project|in progress/i.test(q)) {
      return {
        reply: `📋 **Modules & Tasks:**\n\n- Track all active development tasks under **Modules**.\n- Statuses include **In Progress** and **Completed**.\n- Timesheets link directly to these tasks.`,
        quickLinks: [
          { label: "View Modules", path: "/tasks", icon: "bi-kanban" },
          { label: "Module Report", path: "/tasks/report", icon: "bi-bar-chart" },
        ],
        suggestions: ["Timesheet guide", "Leave policy", "Personalization"],
      };
    }

    // Personalization & Themes
    if (/theme|dark|light|accent|color|font|settings/i.test(q)) {
      let action = null;
      let reply = `🎨 **Personalization:** Customize your workspace with Dark/Light modes, 3 sidebar styles, 7 accent colors, and 5 typography fonts under **Settings**!`;

      if (/dark/i.test(q)) {
        action = { type: "set_theme", value: "dark" };
        reply = `🌙 Switched to **Dark Mode**!`;
      } else if (/light/i.test(q)) {
        action = { type: "set_theme", value: "light" };
        reply = `☀️ Switched to **Light Mode**!`;
      } else if (/blue/i.test(q)) {
        action = { type: "set_accent", value: "blue" };
        reply = `💙 Changed accent theme to **Blue**!`;
      } else if (/teal/i.test(q)) {
        action = { type: "set_accent", value: "teal" };
        reply = `🌊 Changed accent theme to **Teal**!`;
      } else if (/purple/i.test(q)) {
        action = { type: "set_accent", value: "purple" };
        reply = `💜 Changed accent theme to **Purple**!`;
      } else if (/rose/i.test(q)) {
        action = { type: "set_accent", value: "rose" };
        reply = `🌹 Changed accent theme to **Rose**!`;
      }

      return {
        reply,
        action,
        quickLinks: [{ label: "Open Personalization", path: "/settings", icon: "bi-palette" }],
        suggestions: ["Switch to dark mode", "Switch to light mode", "Leave policy"],
      };
    }

    // Admin
    if (role === "admin" && /admin|user|role|approval|pending/i.test(q)) {
      return {
        reply: `🛡️ **Admin Tools:**\n\n- **Users:** Add employees, edit roles and details.\n- **Roles & Permissions:** Granular view, create, edit, delete access controls.\n- **Attendance Approvals:** Review and approve/reject pending leaves.\n- **AI Timesheet Report:** Export filtered summaries to PDF.`,
        quickLinks: [
          { label: "Manage Users", path: "/employee/userslist", icon: "bi-people" },
          { label: "Roles & Permissions", path: "/admin/roles", icon: "bi-shield-lock" },
          { label: "Review Leaves", path: "/admin/leaves", icon: "bi-calendar-check" },
        ],
        suggestions: ["Timesheet guide", "Leave policy", "Holidays"],
      };
    }

    // Default
    return {
      reply: `I can assist you with:\n- 🕒 **Timesheet & Hours**\n- 🏖️ **Attendance & Leaves**\n- 📅 **Holidays**\n- 📋 **Modules & Tasks**\n- 🎨 **Personalization & Themes**\n\nChoose an action below or ask me anything!`,
      quickLinks: [
        { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
        { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
        { label: "Holidays", path: "/holidays", icon: "bi-calendar-event" },
      ],
      suggestions: ["Leave policy", "How to log timesheet?", "Switch theme to dark"],
    };
  };

  // Send message handler
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      let botResponse = null;

      // Attempt backend chatbot endpoint first
      try {
        const res = await api.post("/chatbot/message", { message: query });
        if (res?.data?.reply) {
          botResponse = {
            id: "msg-" + (Date.now() + 1),
            sender: "bot",
            text: res.data.reply,
            quickLinks: res.data.quickLinks || [],
            suggestions: res.data.suggestions || [],
            action: res.data.action || null,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
      } catch (err) {
        // Fallback to client smart NLP if backend endpoint is unavailable
      }

      // If no response from backend, use client fallback
      if (!botResponse) {
        const fallback = generateClientFallback(query);
        botResponse = {
          id: "msg-" + (Date.now() + 1),
          sender: "bot",
          text: fallback.reply,
          quickLinks: fallback.quickLinks || [],
          suggestions: fallback.suggestions || [],
          action: fallback.action || null,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }

      // Execute action if requested (e.g. theme toggle)
      if (botResponse.action) {
        if (botResponse.action.type === "set_theme") {
          setPrefs((p) => ({ ...p, theme: botResponse.action.value }));
        } else if (botResponse.action.type === "set_accent") {
          setPrefs((p) => ({ ...p, accent: botResponse.action.value }));
        }
      }

      // Add bot message
      setMessages((prev) => [...prev, botResponse]);
      if (!isOpen) setHasUnread(true);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);
    setMessages([
      {
        id: "msg-reset",
        sender: "bot",
        text: `Chat cleared. Hello **${userName}**! What would you like to check?`,
        suggestions: ["How to log timesheet?", "Leave policy", "Upcoming holidays", "Switch to dark mode"],
        quickLinks: [
          { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
          { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* ── FLOATING LAUNCHER BUTTON ── */}
      {!isOpen && (
        <button
          className="chatbot-fab"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="Chat with Voltech AI Assistant (Alt + C)"
          aria-label="Open AI Assistant"
        >
          <div className="chatbot-fab-icon-wrap">
            <i className="bi bi-robot"></i>
            <span className="chatbot-fab-pulse"></span>
            {hasUnread && <span className="chatbot-fab-unread-dot"></span>}
          </div>
          <span className="chatbot-fab-label">AI Assistant</span>
        </button>
      )}

      {/* ── CHATBOT MODAL / WINDOW ── */}
      {isOpen && (
        <aside
          className={`chatbot-window ${isMinimized ? "is-minimized" : ""}`}
          aria-label="Voltech AI Assistant Chat"
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <i className="bi bi-robot"></i>
                <span className="chatbot-status-beacon"></span>
              </div>
              <div className="chatbot-header-text">
                <div className="chatbot-title">Voltech AI Assistant</div>
                <div className="chatbot-subtitle">Online • Overall Support</div>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                className="chatbot-action-btn"
                onClick={clearChat}
                title="Clear chat history"
                aria-label="Clear chat"
              >
                <i className="bi bi-trash3"></i>
              </button>
              <button
                className="chatbot-action-btn"
                onClick={() => setIsMinimized((v) => !v)}
                title={isMinimized ? "Expand window" : "Minimize window"}
                aria-label="Minimize or Expand"
              >
                <i className={`bi ${isMinimized ? "bi-chevron-up" : "bi-dash-lg"}`}></i>
              </button>
              <button
                className="chatbot-action-btn"
                onClick={() => {
                  setIsOpen(false);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  setSpeakingId(null);
                }}
                title="Close assistant (Esc)"
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          {/* Body & Messages */}
          {!isMinimized && (
            <>
              <div className="chatbot-body">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chatbot-msg-row ${msg.sender}`}>
                    {msg.sender === "bot" && (
                      <div className="chatbot-msg-avatar">
                        <i className="bi bi-robot"></i>
                      </div>
                    )}
                    <div className="chatbot-msg-content">
                      <div className="chatbot-bubble">
                        <div className="chatbot-bubble-text">
                          {msg.text.split("\n").map((line, idx) => {
                            if (!line.trim()) return <div key={idx} className="chatbot-line-break" />;
                            // Render simple bold markdown
                            const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                            return (
                              <div
                                key={idx}
                                dangerouslySetInnerHTML={{ __html: formatted }}
                              />
                            );
                          })}
                        </div>

                        {/* Quick Action Navigation Links */}
                        {msg.quickLinks && msg.quickLinks.length > 0 && (
                          <div className="chatbot-links-grid">
                            {msg.quickLinks.map((link, lIdx) => (
                              <button
                                key={lIdx}
                                className="chatbot-link-chip"
                                onClick={() => {
                                  navigate(link.path);
                                  if (window.innerWidth < 768) setIsOpen(false);
                                }}
                              >
                                {link.icon && <i className={`bi ${link.icon}`}></i>}
                                <span>{link.label}</span>
                                <i className="bi bi-arrow-right-short ms-auto"></i>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="chatbot-msg-footer">
                        <span className="chatbot-msg-time">{msg.timestamp}</span>
                        {msg.sender === "bot" && (
                          <button
                            className={`chatbot-speech-btn ${speakingId === msg.id ? "is-speaking" : ""}`}
                            onClick={() => speakText(msg.id, msg.text)}
                            title={speakingId === msg.id ? "Stop voice" : "Read aloud"}
                            aria-label="Speak response"
                          >
                            <i className={`bi ${speakingId === msg.id ? "bi-volume-up-fill" : "bi-volume-up"}`}></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <div className="chatbot-msg-row bot">
                    <div className="chatbot-msg-avatar">
                      <i className="bi bi-robot"></i>
                    </div>
                    <div className="chatbot-typing-bubble">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Bar */}
              {messages.length > 0 && messages[messages.length - 1]?.suggestions && (
                <div className="chatbot-suggestions-bar">
                  <div className="chatbot-suggestions-scroll">
                    {messages[messages.length - 1].suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        className="chatbot-suggestion-pill"
                        onClick={() => handleSendMessage(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Footer */}
              <div className="chatbot-footer">
                <input
                  ref={inputRef}
                  type="text"
                  className="chatbot-input"
                  placeholder="Ask anything (e.g., leaves, timesheet, holidays)..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isTyping}
                />
                <button
                  className="chatbot-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isTyping}
                  title="Send message (Enter)"
                  aria-label="Send"
                >
                  <i className="bi bi-send-fill"></i>
                </button>
              </div>
            </>
          )}
        </aside>
      )}
    </>
  );
}
