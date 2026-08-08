FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
# Dev-only workaround: bypass TLS verification while Prisma downloads engines.
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
COPY . .
RUN npm run build

FROM public.ecr.aws/docker/library/node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy; npx prisma db push --skip-generate; node dist/seed.js || true; node dist/index.js"]
