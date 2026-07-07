FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]