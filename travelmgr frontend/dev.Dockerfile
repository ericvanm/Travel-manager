FROM node:22

WORKDIR /usr/src/app

COPY . .

RUN rm package-lock.json

# Change npm ci to npm install since we are going to be in development mode
RUN npm install -omit=optional
RUN npm install @rollup/rollup-linux-x64-gnu
RUN npm install @esbuild/linux-x64

# npm run dev is the command to start the application in development mode
CMD ["npm", "run", "dev", "--", "--host"]