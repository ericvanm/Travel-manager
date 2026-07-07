FROM node:18

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --gid 1001 nodejs

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY index.js app.js cli.js run-migration.js ./
COPY controllers ./controllers
COPY models ./models
COPY migrations ./migrations
COPY utils ./utils

RUN chown -R nodejs:nodejs /usr/src/app

USER nodejs

EXPOSE 3001

CMD ["npm", "run", "dev"]
