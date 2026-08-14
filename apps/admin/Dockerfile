FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile


FROM deps AS development
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "node_modules/.bin/vite dev apps/admin --host 0.0.0.0 --port ${PORT:-3001}"]


FROM deps AS builder
COPY . .
RUN pnpm build:admin


FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/nx.json /app/tsconfig.base.json ./
COPY --from=builder /app/apps/admin ./apps/admin

EXPOSE 3001
# cwd must be apps/admin: @tanstack/start-plugin-core's preview-server-plugin
# resolves the built server entry relative to process.cwd() instead of vite's
# configured root, so it only finds apps/admin/dist/server/server.js when
# invoked from inside apps/admin.
CMD ["sh", "-c", "cd apps/admin && ../../node_modules/.bin/vite preview --host 0.0.0.0 --port ${PORT:-3001}"]
