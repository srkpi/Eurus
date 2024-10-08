FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG BOT_TOKEN

RUN BOT_TOKEN=$BOT_TOKEN

CMD ["npm", "run", "dev"]
