# QR Redirect Server

A self-hosted **dynamic QR code redirection platform**. QR codes always encode a URL on *your*
server (`https://qr.mycompany.com/promo`), so the printed code never changes — you can repoint,
disable or expire the destination at any time and see scan analytics for every code.

```
Scan  ->  https://qr.mycompany.com/promo  ->  302  ->  https://example.com/summer-sale
                    (logged: time, device, browser, country)
```

## Features

**Dashboard** — responsive React UI, list/create/edit/delete redirects, search + status filter,
live QR preview, PNG/SVG download, copy redirect URL, scan counters and charts.

**Redirect management** — custom paths with uniqueness validation, destination URL validation,
enable/disable, optional expiration date, optional password protection.

**QR generation** — automatic per path, high-resolution PNG (up to 4096px) and vector SVG,
bulk export of every code as a ZIP with a `manifest.json`.

**Analytics** — total scans, unique visitors, timestamped history, device/OS/browser detection,
country via proxy headers, per-redirect and global dashboard charts.

**Backend** — REST API, JWT auth with bcrypt hashing, role-based access (ADMIN/EDITOR/VIEWER),
Helmet, CORS and rate limiting on auth routes.

## Tech stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, shadcn-style UI, Recharts |
| Backend   | Node.js, Express, TypeScript, Zod                        |
| Database  | PostgreSQL + Prisma ORM                                  |
| QR        | `qrcode`                                                 |
| Auth      | JWT (`jsonwebtoken`) + `bcryptjs`                        |
| Deploy    | Docker + Docker Compose                                  |

## Project structure

```text
qr-redirect-server/
├── docker-compose.yml
├── .env.example
├── README.md
├── DEPLOYMENT.md
├── server/                  # Express API + redirect engine
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.ts app.ts config.ts seed.ts
│   │   ├── lib/prisma.ts
│   │   ├── middleware/auth.ts
│   │   ├── routes/auth.ts redirects.ts analytics.ts redirect.public.ts
│   │   └── utils/qr.ts request.ts
│   └── Dockerfile
└── web/                     # React dashboard
    ├── src/
    │   ├── App.tsx main.tsx index.css
    │   ├── components/ (ui/, QrPreview, RedirectDialog, ScanChart)
    │   ├── lib/ (api.ts, utils.ts)
    │   └── pages/ (Login, Dashboard, RedirectDetail)
    ├── nginx.conf
    └── Dockerfile
```

## Quick start (Docker)

```bash
cp .env.example .env         # edit JWT_SECRET, ADMIN_PASSWORD, PUBLIC_BASE_URL
docker compose up -d --build
```

* Dashboard: http://localhost:8080
* API / redirects: http://localhost:4000
* Default login: the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`

## Quick start (local dev)

```bash
# 1. Postgres
docker compose up -d db

# 2. API
cd server
cp ../.env.example .env
npm install
npx prisma migrate dev --name init
npm run seed          # creates the admin user + sample redirects
npm run dev           # http://localhost:4000

# 3. Dashboard
cd ../web
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev           # http://localhost:5173
```

## Environment variables

| Variable          | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `DATABASE_URL`    | PostgreSQL connection string                           |
| `PORT`            | API port (default 4000)                                |
| `JWT_SECRET`      | Long random string used to sign tokens                 |
| `JWT_EXPIRES_IN`  | Token lifetime, e.g. `7d`                              |
| `PUBLIC_BASE_URL` | Base URL encoded into every QR, e.g. `https://qr.mycompany.com` |
| `REDIRECT_STATUS` | `302` (default) or `301`                               |
| `CORS_ORIGIN`     | Allowed dashboard origin(s), comma separated           |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin created by `npm run seed` |
| `VITE_API_URL`    | API base URL used by the dashboard build               |

## API reference

All `/api/*` routes except `POST /api/auth/login` require `Authorization: Bearer <token>`.

| Method | Endpoint                          | Description                        |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/api/auth/login`                 | Sign in, returns JWT               |
| GET    | `/api/auth/me`                    | Current user                       |
| POST   | `/api/auth/users`                 | Create user (ADMIN)                |
| POST   | `/api/auth/change-password`       | Change own password                |
| GET    | `/api/redirects?q=&status=`       | List / search / filter             |
| POST   | `/api/redirects`                  | Create redirect                    |
| GET    | `/api/redirects/:id`              | Get one (includes QR data URL)     |
| PUT    | `/api/redirects/:id`              | Update                             |
| DELETE | `/api/redirects/:id`              | Delete                             |
| GET    | `/api/redirects/:id/qr.png?size=` | High-res PNG                       |
| GET    | `/api/redirects/:id/qr.svg`       | Vector SVG                         |
| GET    | `/api/redirects/export/zip`       | Bulk ZIP of all QR codes           |
| GET    | `/api/analytics/overview?days=30` | Global stats + charts              |
| GET    | `/api/analytics/redirects/:id`    | Per-redirect stats + history       |
| GET    | `/health`                         | Health check                       |
| GET    | `/:path`                          | **Public scan endpoint → 302/301** |

## Redirect flow

1. Look up `path` in the database.
2. Return 410 if the redirect is disabled.
3. Return 410 if `expiresAt` has passed.
4. If password protected, render the unlock form (`POST /:path` verifies with bcrypt).
5. Log the scan event and increment `scanCount`.
6. Redirect with `REDIRECT_STATUS` (302 by default; use 301 only for permanent links —
   browsers cache 301s and later destination changes may not be picked up).

## Data model

`User(id, email, passwordHash, role, createdAt, updatedAt)`
`Redirect(id, path, destinationUrl, title, qrImagePath, enabled, scanCount, passwordHash, expiresAt, createdAt, updatedAt)`
`ScanEvent(id, redirectId, visitorId, ipHash, country, device, os, browser, referer, userAgent, createdAt)`

Raw IPs are never stored — only a SHA-256 hash, used to approximate unique visitors.

## License

MIT
