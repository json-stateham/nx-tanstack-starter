FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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
COPY --from=builder /app/dist/apps/admin ./dist/apps/admin

# @tanstack/start-plugin-core's preview-server-plugin resolves the server
# entry as an absolute path rooted at "/" instead of the actual outDir
# (resolves to /dist/apps/admin/server/server.js regardless of WORKDIR).
# Symlinking /dist to the real build output satisfies that broken lookup.
RUN ln -s /app/dist /dist

EXPOSE 3001
CMD ["sh", "-c", "node_modules/.bin/vite preview apps/admin --host 0.0.0.0 --port ${PORT:-3001}"]
