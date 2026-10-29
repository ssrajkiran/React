import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import api from "../../api";

const TYPE_ICONS = {
  info: "bi-info-circle",
  success: "bi-check-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  danger: "bi-x-circle-fill",
  birthday: "bi-gift",
};

function timeAgo(date) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setItems((res.data.notifications || []).filter((n) => !n.is_read));
      setUnread(res.data.unread_count || 0);
    } catch {
      /* keep last known state */
    }
  }, []);

  useEffect(() => {
    const boot = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) load();
    setOpen((o) => !o);
  };

  const removeLocal = (id) =>
    setItems((list) => list.filter((n) => n.id !== id));

  const openItem = async (item) => {
    setOpen(false);
    if (!item.is_read) {
      try {
        await api.put(`/notifications/${item.id}/read`);
      } catch {
        /* ignore */
      }
      setUnread((u) => Math.max(0, u - 1));
      removeLocal(item.id);
    }
    if (item.link) navigate(item.link);
  };

  const dismissItem = async (e, n) => {
    e.stopPropagation();
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
      } catch {
        /* ignore */
      }
      setUnread((u) => Math.max(0, u - 1));
    }
    removeLocal(n.id);
  };

  const markAll = async () => {
    try {
      await api.put("/notifications/read-all");
    } catch {
      /* ignore */
    }
    setUnread(0);
    setItems([]);
  };

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        className="topbar-circle-btn"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggle}
      >
        <i className="bi bi-bell"></i>
        {unread > 0 && (
          <span className="topbar-notif-badge">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <span className="notif-heading">
              Notifications
              {unread > 0 && <span className="notif-count">{unread}</span>}
            </span>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">
                <i className="bi bi-bell-slash"></i>
                <p>No notifications yet</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item${n.is_read ? "" : " unread"}`}
                  onClick={() => openItem(n)}
                >
                  <span className={`notif-icon notif-icon-${n.type || "info"}`}>
                    <i className={`bi ${TYPE_ICONS[n.type] || TYPE_ICONS.info}`}></i>
                  </span>
                  <span className="notif-body">
                    <span className="notif-title">
                      {n.title}
                      {!n.is_read && <span className="notif-dot"></span>}
                    </span>
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                  </span>
                  <span
                    className="notif-close"
                    title="Dismiss"
                    onClick={(e) => dismissItem(e, n)}
                  >
                    <i className="bi bi-x-lg"></i>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
