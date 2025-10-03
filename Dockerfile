FROM node:24.5.0-alpine

# Install ffpeg
RUN apk add ffmpeg

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
