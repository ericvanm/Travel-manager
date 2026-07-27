FROM node:20

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV HOME=/usr/src/app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --gid 1001 nodejs

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY index.js app.js run-migration.js ./
COPY controllers ./controllers
COPY models ./models
COPY migrations ./migrations
COPY utils ./utils
COPY config ./config

RUN chown -R nodejs:nodejs /usr/src/app

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]
