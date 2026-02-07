
FROM oven/bun:1.3.6-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build


FROM oven/bun:1.3.6-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9221


COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 9221
CMD ["bun", "server.js"]
