import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

const rangeStart = (days: number) => new Date(Date.now() - days * 86400_000);

const groupCount = <T extends string>(rows: { [k in T]: string | null }[], key: T) => {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = (row[key] as string) || "Unknown";
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

/** Overview: totals, timeseries, device/browser/country breakdown, top paths. */
analyticsRouter.get("/overview", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
  const since = rangeStart(days);

  const [redirectCount, activeCount, totalScans, scans, top] = await Promise.all([
    prisma.redirect.count(),
    prisma.redirect.count({ where: { enabled: true } }),
    prisma.scanEvent.count(),
    prisma.scanEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, device: true, browser: true, country: true, visitorId: true },
    }),
    prisma.redirect.findMany({
      orderBy: { scanCount: "desc" },
      take: 8,
      select: { id: true, path: true, scanCount: true, destinationUrl: true },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
  }
  for (const s of scans) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  res.json({
    totals: {
      redirects: redirectCount,
      activeRedirects: activeCount,
      totalScans,
      scansInRange: scans.length,
      uniqueVisitors: new Set(scans.map((s) => s.visitorId)).size,
    },
    timeseries: [...buckets.entries()].map(([date, scans]) => ({ date, scans })),
    devices: groupCount(scans, "device"),
    browsers: groupCount(scans, "browser"),
    countries: groupCount(scans, "country"),
    topRedirects: top,
  });
});

/** Per-redirect analytics with timestamp history. */
analyticsRouter.get("/redirects/:id", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
  const since = rangeStart(days);

  const redirect = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!redirect) return res.status(404).json({ error: "Redirect not found" });

  const scans = await prisma.scanEvent.findMany({
    where: { redirectId: redirect.id, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
  }
  for (const s of scans) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  res.json({
    totals: {
      totalScans: redirect.scanCount,
      scansInRange: scans.length,
      uniqueVisitors: new Set(scans.map((s) => s.visitorId)).size,
    },
    timeseries: [...buckets.entries()].map(([date, scans]) => ({ date, scans })),
    devices: groupCount(scans, "device"),
    browsers: groupCount(scans, "browser"),
    countries: groupCount(scans, "country"),
    history: scans.slice(0, 100).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      device: s.device,
      os: s.os,
      browser: s.browser,
      country: s.country,
      referer: s.referer,
    })),
  });
});
