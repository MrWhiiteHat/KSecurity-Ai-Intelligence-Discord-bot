FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/bot/package.json ./packages/bot/package.json
COPY packages/dashboard/package.json ./packages/dashboard/package.json
RUN npm install

COPY . .

RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma
RUN npm run build --workspaces --if-present

EXPOSE 8080

CMD ["node", "scripts/railway-start.js"]
