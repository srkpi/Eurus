FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG BOT_TOKEN
ENV BOT_TOKEN=${BOT_TOKEN}

CMD ["npm", "run", "start"]
