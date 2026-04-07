FROM node:20-alpine

WORKDIR /app

COPY packages/backend/package.json ./package.json
RUN npm install

COPY packages/backend ./

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
