FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Install all deps (tsx is a devDep but needed at runtime — noEmit:true prevents tsc compile)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

CMD ["node", "--import", "tsx", "src/index.ts"]
