import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ROUTE_MESSAGES } from "../../utils/routeMessages";

export default function RouteLoader() {
  const location = useLocation();
  const [phase, setPhase] = useState(null); // null | "in" | "out"
  const [msg, setMsg] = useState(ROUTE_MESSAGES[0]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMsg(ROUTE_MESSAGES[Math.floor(Math.random() * ROUTE_MESSAGES.length)]);
    setPhase("in");
    const t1 = setTimeout(() => setPhase("out"), 540);
    const t2 = setTimeout(() => setPhase(null), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname]);

  if (!phase) return null;

  return (
    <div
      className={`route-loader${phase === "out" ? " route-loader-out" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="route-loader-card">
        <div className="route-loader-mark">
          <span className="route-loader-ring" />
          <span className="route-loader-ring route-loader-ring-2" />
          <span className="route-loader-core">V</span>
        </div>
        <p className="route-loader-text">
          {msg}
          <span className="route-loader-dots" />
        </p>
        <div className="route-loader-bar" />
      </div>
    </div>
  );
}
