FROM node:lts

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm clean-install

COPY . .

RUN npm run build
RUN npm prune --omit dev

ARG PORT=5000
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
