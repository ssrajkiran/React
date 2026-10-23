import { describe, it, expect } from "vitest";
import {
  SEARCH_ITEMS,
  filterSearchItems,
  resolvePath,
  getRoleFromToken,
} from "./searchItems";

const role = (r) => filterSearchItems(SEARCH_ITEMS, "", r);

const makeJwt = (payload) => {
  const body = btoa(JSON.stringify(payload));
  return `header.${body}.sig`;
};

describe("SEARCH_ITEMS registry", () => {
  it("has unique labels and paths", () => {
    const labels = SEARCH_ITEMS.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every item has label/path/icon/group", () => {
    for (const item of SEARCH_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.path).toMatch(/^\//);
      expect(item.icon).toMatch(/^bi-/);
      expect(item.group).toBeTruthy();
    }
  });

  it("includes the settings route", () => {
    expect(SEARCH_ITEMS.some((i) => i.path === "/settings")).toBe(true);
  });
});

describe("filterSearchItems", () => {
  it("filters by role", () => {
    const admin = role("admin");
    const employee = role("employee");
    expect(admin.length).toBeGreaterThan(employee.length);
    expect(admin.some((i) => i.label === "Users")).toBe(true);
    expect(employee.some((i) => i.label === "Users")).toBe(false);
  });

  it("keeps items without a roles restriction for everyone", () => {
    const shared = [...SEARCH_ITEMS, { label: "Open", path: "/open", icon: "bi-x", group: "G" }];
    expect(filterSearchItems(shared, "", "employee").some((i) => i.label === "Open")).toBe(true);
  });

  it("matches query case-insensitively on label", () => {
    const res = filterSearchItems(SEARCH_ITEMS, "holiday", "admin");
    expect(res).toHaveLength(1);
    expect(res[0].label).toBe("Holidays");
  });

  it("matches query against group", () => {
    const res = filterSearchItems(SEARCH_ITEMS, "setup", "admin");
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((i) => i.group === "Setup")).toBe(true);
  });

  it("matches query against path", () => {
    const res = filterSearchItems(SEARCH_ITEMS, "/ai-summary", "admin");
    expect(res.some((i) => i.path === "/admin/ai-summary")).toBe(true);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterSearchItems(SEARCH_ITEMS, "zzzzz-not-a-page", "admin")).toEqual([]);
  });

  it("trims the query", () => {
    expect(filterSearchItems(SEARCH_ITEMS, "   holiday  ", "admin")).toHaveLength(1);
  });

  it("applies role filter before text filter", () => {
    const res = filterSearchItems(SEARCH_ITEMS, "users", "employee");
    expect(res).toEqual([]);
  });
});

describe("resolvePath", () => {
  const altItem = { label: "Dashboard", path: "/admin", alt: "/employee" };
  const plainItem = { label: "Holidays", path: "/holidays" };

  it("returns path for admin when alt exists", () => {
    expect(resolvePath(altItem, "admin")).toBe("/admin");
  });

  it("returns alt for non-admin when alt exists", () => {
    expect(resolvePath(altItem, "employee")).toBe("/employee");
  });

  it("returns plain path when no alt", () => {
    expect(resolvePath(plainItem, "employee")).toBe("/holidays");
  });
});

describe("getRoleFromToken", () => {
  it("defaults to employee with no token", () => {
    expect(getRoleFromToken(null)).toBe("employee");
  });

  it("reads role from a valid payload", () => {
    expect(getRoleFromToken(makeJwt({ role: "admin" }))).toBe("admin");
  });

  it("defaults to employee when payload has no role", () => {
    expect(getRoleFromToken(makeJwt({ sub: 1 }))).toBe("employee");
  });

  it("falls back to employee on garbage tokens", () => {
    expect(getRoleFromToken("not-a-jwt")).toBe("employee");
    expect(getRoleFromToken("a.%%%.c")).toBe("employee");
  });
});
