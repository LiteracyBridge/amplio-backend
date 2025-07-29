FROM node:lts

RUN apt-get install -y --no-install-recommends ffmpeg

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
