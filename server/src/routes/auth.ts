import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, signToken, type Role } from "../middleware/auth";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials payload" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const payload = { id: user.id, email: user.email, role: user.role as Role };
  res.json({ token: signToken(payload), user: payload });
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

authRouter.post("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const schema = credentials.extend({ role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json(user);
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  res.json({ ok: true });
});
