FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]