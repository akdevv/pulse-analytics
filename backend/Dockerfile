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

EXPOSE 8000

CMD ["node", "--import", "tsx", "src/index.ts"]
