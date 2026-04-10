# Stage 1: Build React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
# Override outDir so build goes to /app/server/public
RUN npx vite build --outDir /app/server/public

# Stage 2: Server
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=client-builder /app/server/public ./public
RUN mkdir -p uploads/deals

EXPOSE 3001
CMD ["node", "index.js"]
