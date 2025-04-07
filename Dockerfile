FROM node:lts

WORKDIR /app

COPY package.json package-lock.json ./

COPY . .

RUN npm clean-install --omit dev

ARG PORT=5000
ENV PORT=${PORT}
ENV HOST="0.0.0.0"

CMD node dist/main.js
