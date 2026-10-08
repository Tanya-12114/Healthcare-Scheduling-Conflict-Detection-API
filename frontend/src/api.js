const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const errText = (d) =>
  typeof d === "string" ? d
  : Object.entries(d || {}).map(([k, v]) =>
      `${["detail", "non_field_errors"].includes(k) ? "" : k.replaceAll("_", " ") + ": "}${[].concat(v).join(" ")}`).join(" ");

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Token ${token}` }) },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401 && token) { localStorage.clear(); window.location.href = "/login"; }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(errText(data) || `Request failed (${res.status})`);
  return data;
}

export const session = {
  save(res, username) {
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", res.user?.username || username);
    localStorage.setItem("staff", res.user?.is_staff ? "1" : "");
  },
  isStaff: () => localStorage.getItem("staff") === "1",
  name: () => localStorage.getItem("user") || "",
};

export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (d) => new Date(d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
export const timeOnly = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");