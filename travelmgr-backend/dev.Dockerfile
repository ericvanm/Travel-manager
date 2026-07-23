FROM node:20

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY index.js app.js ./
COPY controllers ./controllers
COPY models ./models
COPY migrations ./migrations
COPY utils ./utils

EXPOSE 3001

CMD ["npm", "run", "dev"]
