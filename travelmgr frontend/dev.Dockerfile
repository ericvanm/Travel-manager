FROM node:20

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]