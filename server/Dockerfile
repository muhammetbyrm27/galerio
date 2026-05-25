# Galerio API — Faz 1 Docker
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads

EXPOSE 5000

# Önce DB beklenir, admin seed, sonra API başlar (scripts/docker-start.js)
CMD ["node", "scripts/docker-start.js"]
