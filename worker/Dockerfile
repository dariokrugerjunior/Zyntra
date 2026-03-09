FROM node:20-alpine

WORKDIR /app

COPY worker/package.json ./package.json
RUN npm install

COPY worker/tsconfig.json ./tsconfig.json
COPY worker/src ./src

RUN npm run build

CMD ["npm", "run", "start"]
