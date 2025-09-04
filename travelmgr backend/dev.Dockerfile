FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install connect-pg-simple

COPY . .

RUN npm rebuild bcrypt --build-from-source


EXPOSE 3001

CMD ["npm", "run", "dev"]