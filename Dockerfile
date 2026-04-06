FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package.json server.js ./
RUN npm install

EXPOSE 3100
CMD ["node", "server.js"]
