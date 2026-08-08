# Production deployment guide

## 1. DNS and TLS

Point a short hostname at your server, e.g. `qr.mycompany.com` → your host's IP.
Short domains make for smaller, more scannable QR codes.

Set `PUBLIC_BASE_URL=https://qr.mycompany.com` **before** printing any QR codes —
the value is baked into every generated code.

## 2. Secrets

```bash
cp .env.example .env
openssl rand -hex 32     # paste into JWT_SECRET
```

Set a strong `ADMIN_PASSWORD` and `POSTGRES_PASSWORD`. Never commit `.env`.

## 3. Build and run

```bash
docker compose up -d --build
docker compose logs -f server
```

Migrations run automatically on container start (`prisma migrate deploy`), followed by the
idempotent seed that creates the bootstrap admin.

## 4. Reverse proxy (Caddy example)

```caddy
qr.mycompany.com {
    handle /api/* { reverse_proxy 127.0.0.1:4000 }
    handle /health { reverse_proxy 127.0.0.1:4000 }
    handle /admin* { reverse_proxy 127.0.0.1:8080 }
    handle { reverse_proxy 127.0.0.1:4000 }   # scan traffic
}
```

Nginx equivalent:

```nginx
server {
  listen 443 ssl http2;
  server_name qr.mycompany.com;

  location /api/  { proxy_pass http://127.0.0.1:4000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
  location /admin { proxy_pass http://127.0.0.1:8080/; }
  location /      { proxy_pass http://127.0.0.1:4000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
}
```

The API sets `trust proxy`, so forward `X-Forwarded-For` for accurate visitor stats. Add
`CF-IPCountry` (Cloudflare) or `X-Country-Code` for country analytics.

## 5. Hardening checklist

- [ ] `JWT_SECRET` is 32+ random bytes and unique per environment
- [ ] `CORS_ORIGIN` set to your dashboard origin (not `*`)
- [ ] Postgres port not published publicly (remove the mapping if present)
- [ ] Admin password rotated after first login (`POST /api/auth/change-password`)
- [ ] TLS enforced with HSTS at the proxy
- [ ] Daily database backups (see below)

## 6. Backups

```bash
docker compose exec -T db pg_dump -U qr qrdb | gzip > backup-$(date +%F).sql.gz
gunzip -c backup-2026-01-01.sql.gz | docker compose exec -T db psql -U qr qrdb
```

## 7. Scaling

- The API is stateless — run several replicas behind the proxy.
- `ScanEvent` grows with traffic; archive rows older than N months, or aggregate into a
  daily rollup table and prune.
- Consider PgBouncer once you run many API replicas.

## 8. Upgrades

```bash
git pull
docker compose up -d --build
```

Prisma migrations are applied automatically at startup; take a backup first.
