import { Router } from "express";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { clientIp, country, hash, parseUa, visitorId } from "../utils/request";

export const publicRedirectRouter = Router();

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f19;color:#e7e9ee;
      font:16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
 .card{max-width:26rem;width:calc(100% - 2rem);background:#141a29;border:1px solid #232c40;
       border-radius:16px;padding:2rem;text-align:center}
 h1{font-size:1.25rem;margin:0 0 .5rem} p{color:#98a2b3;margin:0 0 1.25rem}
 input,button{width:100%;box-sizing:border-box;padding:.75rem 1rem;border-radius:10px;font-size:1rem}
 input{background:#0b0f19;border:1px solid #2b3549;color:#e7e9ee;margin-bottom:.75rem}
 button{background:#4f7cff;border:0;color:#fff;font-weight:600;cursor:pointer}
</style></head><body><div class="card">${body}</div></body></html>`;

/** GET /:path — the scan entry point. */
publicRedirectRouter.get("/:path", async (req, res, next) => {
  const path = req.params.path;
  if (!/^[a-zA-Z0-9._~-]+$/.test(path)) return next();

  const redirect = await prisma.redirect.findUnique({ where: { path } });
  if (!redirect) return next();

  if (!redirect.enabled) {
    return res.status(410).send(page("Link disabled", "<h1>Link disabled</h1><p>This QR code is no longer active.</p>"));
  }
  if (redirect.expiresAt && redirect.expiresAt.getTime() < Date.now()) {
    return res.status(410).send(page("Link expired", "<h1>Link expired</h1><p>This QR code has passed its expiration date.</p>"));
  }
  if (redirect.passwordHash) {
    return res.status(401).send(
      page(
        "Password required",
        `<h1>Password required</h1><p>This link is protected.</p>
         <form method="post" action="/${encodeURIComponent(path)}">
           <input type="password" name="password" placeholder="Enter password" autofocus required/>
           <button type="submit">Continue</button>
         </form>`,
      ),
    );
  }

  await logScan(req, redirect.id);
  return res.redirect(config.redirectStatus, redirect.destinationUrl);
});

/** POST /:path — password submission. */
publicRedirectRouter.post("/:path", async (req, res, next) => {
  const redirect = await prisma.redirect.findUnique({ where: { path: req.params.path } });
  if (!redirect || !redirect.passwordHash) return next();
  if (!redirect.enabled || (redirect.expiresAt && redirect.expiresAt.getTime() < Date.now())) {
    return res.status(410).send(page("Unavailable", "<h1>Unavailable</h1><p>This QR code is no longer active.</p>"));
  }

  const supplied = String((req.body || {}).password || "");
  if (!(await bcrypt.compare(supplied, redirect.passwordHash))) {
    return res.status(401).send(
      page(
        "Password required",
        `<h1>Incorrect password</h1><p>Please try again.</p>
         <form method="post" action="/${encodeURIComponent(redirect.path)}">
           <input type="password" name="password" placeholder="Enter password" autofocus required/>
           <button type="submit">Continue</button>
         </form>`,
      ),
    );
  }

  await logScan(req, redirect.id);
  return res.redirect(config.redirectStatus, redirect.destinationUrl);
});

async function logScan(req: any, redirectId: string) {
  const userAgent = String(req.headers["user-agent"] || "");
  const { device, os, browser } = parseUa(userAgent);
  try {
    await prisma.$transaction([
      prisma.scanEvent.create({
        data: {
          redirectId,
          visitorId: visitorId(req),
          ipHash: clientIp(req) ? hash(clientIp(req)) : null,
          country: country(req),
          device,
          os,
          browser,
          referer: (req.headers.referer as string) || null,
          userAgent: userAgent.slice(0, 512),
        },
      }),
      prisma.redirect.update({ where: { id: redirectId }, data: { scanCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    console.error("Failed to log scan", err);
  }
}
