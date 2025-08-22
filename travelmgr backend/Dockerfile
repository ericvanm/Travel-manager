FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm rebuild bcrypt --build-from-source

EXPOSE 3001

CMD ["npm", "start"]