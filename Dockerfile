# Stage 1: Build React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
# Override outDir so build goes to /app/server/public
RUN npx vite build --outDir /app/server/public

# Stage 2: Server (Debian-based for Playwright Chromium support)
FROM node:20-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
# Install Playwright Chromium + system dependencies
RUN npx playwright install chromium --with-deps
COPY server/ ./
COPY --from=client-builder /app/server/public ./public
RUN mkdir -p uploads/deals

EXPOSE 3001
CMD ["node", "index.js"]
