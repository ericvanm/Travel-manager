FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm rebuild bcrypt --build-from-source
RUN npm rebuild multer --build-from-source || true

EXPOSE 3001

CMD ["npm", "start"]