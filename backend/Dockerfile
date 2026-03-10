FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY backend/package.json ./package.json
RUN npm install

COPY backend/tsconfig.json ./tsconfig.json
COPY backend/prisma ./prisma
COPY backend/src ./src

RUN npm run prisma:generate && npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:push && npm run start"]