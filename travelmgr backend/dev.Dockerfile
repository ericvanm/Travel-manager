FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install multer
RUN npm ci

COPY . .

RUN npm rebuild bcrypt --build-from-source


EXPOSE 3001

CMD ["npm", "run", "dev"]