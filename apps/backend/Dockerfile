FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN pnpm db:generate
RUN pnpm build:backend


FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/backend ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
