FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY index.js app.js cli.js run-migration.js ./
COPY controllers ./controllers
COPY models ./models
COPY migrations ./migrations
COPY utils ./utils

EXPOSE 3001

CMD ["npm", "start"]
