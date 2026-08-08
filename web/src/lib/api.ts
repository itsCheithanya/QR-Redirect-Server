export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

const TOKEN_KEY = "qr_admin_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    if (!location.pathname.startsWith("/login")) location.href = "/login";
    throw new Error("Session expired, please sign in again");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Authenticated binary download (QR files, ZIP export). */
export async function download(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Redirect {
  id: string;
  path: string;
  destinationUrl: string;
  title: string | null;
  enabled: boolean;
  scanCount: number;
  expiresAt: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  qrUrl: string;
}

export interface Overview {
  totals: { redirects: number; activeRedirects: number; totalScans: number; scansInRange: number; uniqueVisitors: number };
  timeseries: { date: string; scans: number }[];
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  topRedirects: { id: string; path: string; scanCount: number; destinationUrl: string }[];
}
