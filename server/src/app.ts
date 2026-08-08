import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { publicRedirectRouter } from "./routes/redirect.public";
import { redirectsRouter } from "./routes/redirects";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 50 }), authRouter);
  app.use("/api/redirects", redirectsRouter);
  app.use("/api/analytics", analyticsRouter);

  // Public scan entry point — must stay last so /api/* wins.
  app.use("/", publicRedirectRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
