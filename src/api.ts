// Thin client for the public claracars.pt API. No secrets, no business logic here —
// everything (inventory, valuation, ISV, leads) lives behind these public endpoints.

export const API_BASE =
  process.env.CLARACARS_API_BASE?.replace(/\/$/, "") ||
  "https://claracars.pt/api/public";

export const SITE = process.env.CLARACARS_SITE || "claracars";
export const DEFAULT_LANG = process.env.CLARACARS_LANG || "en";

const UA = "claracars-mcp/0.1";

async function req(path: string, init?: RequestInit): Promise<any> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data?.detail || data?.raw || res.statusText;
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return data;
}

export function apiGet(path: string, params?: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const sep = path.includes("?") ? "&" : "?";
  return req(qs.toString() ? `${path}${sep}${qs}` : path);
}

export function apiPost(path: string, body: unknown) {
  return req(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
