export const ROUTE_MESSAGES = [
  "Warming up the dashboard…",
  "Counting today’s minutes…",
  "Aligning your modules…",
  "Shuffling time slots…",
  "Polishing the pixels…",
  "Fetching fresh data…",
  "Almost there…",
];

export function pickRouteMessage() {
  return ROUTE_MESSAGES[Math.floor(Math.random() * ROUTE_MESSAGES.length)];
}
