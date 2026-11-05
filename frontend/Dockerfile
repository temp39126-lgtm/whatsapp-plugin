FROM node:22-alpine AS base

RUN npm install -g pnpm@11.1.3

FROM base AS deps

WORKDIR /app

COPY frontend/package.json ./package.json
COPY frontend/pnpm-lock.yaml ./pnpm-lock.yaml
COPY frontend/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY frontend/patches ./patches

RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
COPY shared/ ../shared/

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED=false

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED=$NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED

RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/public ./app/public
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./app/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "app/server.js"]
