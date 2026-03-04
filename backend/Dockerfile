# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build && npm run build:worker

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
