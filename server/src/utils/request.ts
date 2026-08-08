import crypto from "crypto";
import type { Request } from "express";
import { UAParser } from "ua-parser-js";

export function clientIp(req: Request): string {
  const fwd = (req.headers["x-forwarded-for"] as string) || "";
  return (fwd.split(",")[0] || req.socket.remoteAddress || "").trim();
}

export function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function parseUa(userAgent: string) {
  const ua = new UAParser(userAgent).getResult();
  const type = ua.device.type;
  return {
    device: type ? type : "desktop",
    os: ua.os.name || "Unknown",
    browser: ua.browser.name || "Unknown",
  };
}

/** Anonymous but stable-per-visitor id (ip + user agent). */
export function visitorId(req: Request): string {
  return hash(`${clientIp(req)}|${req.headers["user-agent"] || ""}`).slice(0, 32);
}

/** Country from common proxy headers (Cloudflare / Vercel / Fly). */
export function country(req: Request): string | null {
  return (
    (req.headers["cf-ipcountry"] as string) ||
    (req.headers["x-vercel-ip-country"] as string) ||
    (req.headers["x-country-code"] as string) ||
    null
  );
}
