# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --network-timeout 600000; \
  elif [ -f package-lock.json ]; then npm install --production=false; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Set the API URL for the build process
ENV NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Build arguments for Faro observability (can be overridden at build time)
ARG NEXT_PUBLIC_FARO_URL
ARG NEXT_PUBLIC_FARO_APP_NAME
ARG NEXT_PUBLIC_FARO_ENVIRONMENT

# Set Faro environment variables for build
ENV NEXT_PUBLIC_FARO_URL=${NEXT_PUBLIC_FARO_URL:-https://faro-collector-prod-ap-southeast-1.grafana.net/collect/e7f08c774cd87e43db18cf1eea7d66fc}
ENV NEXT_PUBLIC_FARO_APP_NAME=${NEXT_PUBLIC_FARO_APP_NAME:-bookmanagement-frontend}
ENV NEXT_PUBLIC_FARO_ENVIRONMENT=${NEXT_PUBLIC_FARO_ENVIRONMENT:-production}

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]