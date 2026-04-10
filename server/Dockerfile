FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads/deals public

EXPOSE 3001

CMD ["node", "index.js"]
