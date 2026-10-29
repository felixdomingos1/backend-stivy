# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma precisa de openssl para detectar o binary target correcto
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev \
  && npx prisma generate

# ---------- runtime ----------
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p logs uploads && chown -R node:node /app
USER node

EXPOSE 3000

# Aplica migrações pendentes e arranca a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
