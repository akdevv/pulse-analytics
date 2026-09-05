FROM node:22-alpine AS base
# Pinned to package.json's "packageManager". Any other version self-installs
# that one and fails: its Linux binary is not in a macOS-resolved lockfile.
RUN npm install -g pnpm@10.27.0
WORKDIR /app

# All deps: tsx is a devDep but the CMD needs it at runtime.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm exec prisma generate

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

CMD ["node", "--import", "tsx", "src/index.ts"]
