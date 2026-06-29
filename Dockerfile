# Base stage
FROM node:18-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY apps/mobile/package*.json ./apps/mobile/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/auth/package*.json ./packages/auth/
COPY packages/tenant/package*.json ./packages/tenant/
COPY packages/user/package*.json ./packages/user/
COPY packages/role/package*.json ./packages/role/
COPY packages/permission/package*.json ./packages/permission/
COPY packages/subscription/package*.json ./packages/subscription/
COPY packages/billing/package*.json ./packages/billing/
COPY packages/notification/package*.json ./packages/notification/
COPY packages/files/package*.json ./packages/files/
COPY packages/settings/package*.json ./packages/settings/

RUN npm ci

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 3000 3001 4000

CMD ["npm", "run", "start"]
