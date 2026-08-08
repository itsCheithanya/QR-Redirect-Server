import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:4000").replace(/\/$/, ""),
  redirectStatus: Number(process.env.REDIRECT_STATUS || 302) === 301 ? 301 : 302,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin12345",
};
