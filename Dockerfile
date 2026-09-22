FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY apps/letter/package.json apps/letter/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY apps ./apps
COPY packages ./packages
COPY public ./public

ARG VITE_SITE_URL=https://elfmailroom.com
ARG VITE_BUSINESS_NAME
ARG VITE_BUSINESS_COUNTRY
ARG VITE_BUSINESS_ADDRESS
ARG VITE_BUSINESS_ABN
ARG VITE_SUPPORT_EMAIL
ARG VITE_PRIVACY_RETENTION
ARG VITE_PRIVACY_PROVIDERS
ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_SITE_URL=$VITE_SITE_URL \
    VITE_BUSINESS_NAME=$VITE_BUSINESS_NAME \
    VITE_BUSINESS_COUNTRY=$VITE_BUSINESS_COUNTRY \
    VITE_BUSINESS_ADDRESS=$VITE_BUSINESS_ADDRESS \
    VITE_BUSINESS_ABN=$VITE_BUSINESS_ABN \
    VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL \
    VITE_PRIVACY_RETENTION=$VITE_PRIVACY_RETENTION \
    VITE_PRIVACY_PROVIDERS=$VITE_PRIVACY_PROVIDERS \
    VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID

RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/data/mailroom.sqlite
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/apps/landing/dist ./apps/landing/dist
COPY --from=build --chown=node:node /app/apps/letter/dist ./apps/letter/dist
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared

USER node
EXPOSE 3001

CMD ["node", "apps/api/src/server.js"]
