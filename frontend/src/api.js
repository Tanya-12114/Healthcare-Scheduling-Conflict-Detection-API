const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const errText = (d) =>
  typeof d === "string" ? d
  : Object.entries(d || {}).map(([k, v]) =>
      `${["detail", "non_field_errors"].includes(k) ? "" : k.replace("_", " ") + ": "}${[].concat(v).join(" ")}`).join(" ");

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

export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const timeOnly = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
