import { Router } from "express";
import archiver from "archiver";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { qrDataUrl, qrPng, qrSvg } from "../utils/qr";

export const redirectsRouter = Router();
redirectsRouter.use(requireAuth);

const RESERVED = new Set(["api", "admin", "health", "assets", "static", "favicon.ico", "robots.txt"]);

const pathSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._~-]+$/, "Path may only contain letters, numbers, dot, dash, underscore, tilde")
  .refine((p) => !RESERVED.has(p.toLowerCase()), "This path is reserved");

const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .url("Destination must be a valid URL")
  .refine((u) => /^https?:\/\//i.test(u), "Destination must start with http:// or https://");

const baseSchema = z.object({
  path: pathSchema,
  destinationUrl: urlSchema,
  title: z.string().trim().max(120).optional().nullable(),
  enabled: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
  password: z.string().min(4).max(128).optional().nullable(),
});

export const publicUrlFor = (path: string) => `${config.publicBaseUrl}/${path}`;

const shape = (r: any) => ({
  id: r.id,
  path: r.path,
  destinationUrl: r.destinationUrl,
  title: r.title,
  enabled: r.enabled,
  scanCount: r.scanCount,
  expiresAt: r.expiresAt,
  hasPassword: Boolean(r.passwordHash),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  qrUrl: publicUrlFor(r.path),
  qrImagePath: r.qrImagePath ?? `/api/redirects/${r.id}/qr.png`,
});

/** List with search / filter / pagination. */
redirectsRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all");
  const take = Math.min(Number(req.query.limit || 100), 500);
  const skip = Math.max(Number(req.query.offset || 0), 0);

  const where: any = {};
  if (q) {
    where.OR = [
      { path: { contains: q, mode: "insensitive" } },
      { destinationUrl: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "enabled") where.enabled = true;
  if (status === "disabled") where.enabled = false;
  if (status === "expired") where.expiresAt = { lt: new Date() };

  const [items, total] = await Promise.all([
    prisma.redirect.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.redirect.count({ where }),
  ]);
  res.json({ total, items: items.map(shape) });
});

redirectsRouter.get("/:id", async (req, res) => {
  const item = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Redirect not found" });
  res.json({ ...shape(item), qrDataUrl: await qrDataUrl(publicUrlFor(item.path), { size: 512 }) });
});

redirectsRouter.post("/", requireRole("ADMIN", "EDITOR"), async (req, res) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;

  const exists = await prisma.redirect.findUnique({ where: { path: d.path } });
  if (exists) return res.status(409).json({ error: "That path is already in use" });

  const item = await prisma.redirect.create({
    data: {
      path: d.path,
      destinationUrl: d.destinationUrl,
      title: d.title || null,
      enabled: d.enabled,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      passwordHash: d.password ? await bcrypt.hash(d.password, 12) : null,
      createdById: req.user!.id,
    },
  });
  res.status(201).json(shape(item));
});

redirectsRouter.put("/:id", requireRole("ADMIN", "EDITOR"), async (req, res) => {
  const parsed = baseSchema.partial().extend({ removePassword: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;

  const current = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Redirect not found" });

  if (d.path && d.path !== current.path) {
    const taken = await prisma.redirect.findUnique({ where: { path: d.path } });
    if (taken) return res.status(409).json({ error: "That path is already in use" });
  }

  const item = await prisma.redirect.update({
    where: { id: current.id },
    data: {
      path: d.path ?? undefined,
      destinationUrl: d.destinationUrl ?? undefined,
      title: d.title === undefined ? undefined : d.title || null,
      enabled: d.enabled ?? undefined,
      expiresAt: d.expiresAt === undefined ? undefined : d.expiresAt ? new Date(d.expiresAt) : null,
      passwordHash: d.removePassword ? null : d.password ? await bcrypt.hash(d.password, 12) : undefined,
    },
  });
  res.json(shape(item));
});

redirectsRouter.delete("/:id", requireRole("ADMIN", "EDITOR"), async (req, res) => {
  const current = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Redirect not found" });
  await prisma.redirect.delete({ where: { id: current.id } });
  res.status(204).end();
});

/** QR image endpoints. */
redirectsRouter.get("/:id/qr.png", async (req, res) => {
  const item = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Redirect not found" });
  const png = await qrPng(publicUrlFor(item.path), { size: Number(req.query.size || 1024) });
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="${item.path}.png"`);
  res.send(png);
});

redirectsRouter.get("/:id/qr.svg", async (req, res) => {
  const item = await prisma.redirect.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Redirect not found" });
  const svg = await qrSvg(publicUrlFor(item.path));
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="${item.path}.svg"`);
  res.send(svg);
});

/** Bulk export as ZIP (PNG + SVG for every redirect). */
redirectsRouter.get("/export/zip", async (_req, res) => {
  const items = await prisma.redirect.findMany({ orderBy: { path: "asc" } });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="qr-codes.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", () => res.status(500).end());
  archive.pipe(res);

  const manifest: any[] = [];
  for (const item of items) {
    const url = publicUrlFor(item.path);
    archive.append(await qrPng(url, { size: 1024 }), { name: `png/${item.path}.png` });
    archive.append(await qrSvg(url), { name: `svg/${item.path}.svg` });
    manifest.push({ path: item.path, url, destinationUrl: item.destinationUrl, enabled: item.enabled });
  }
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  await archive.finalize();
});
