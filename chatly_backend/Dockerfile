# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY prisma/migrations/bootstrap.sh ./prisma/migrations/bootstrap.sh
RUN chmod +x ./prisma/migrations/bootstrap.sh

EXPOSE 4000

# Baseline migration history (db-push era DBs) then apply pending migrations
CMD ["sh", "-c", "sh prisma/migrations/bootstrap.sh && node dist/main.js"]
