FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Output goes to ../server/public via vite.config.js outDir
# We'll copy it manually in docker-compose build context

FROM scratch AS export
COPY --from=builder /app/../server/public /public
