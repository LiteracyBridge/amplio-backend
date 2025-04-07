FROM node:lts

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm clean-install --omit dev

COPY . .

RUN \
  if [ -f env.staging ]; then mv .env.staging .env; \
  fi


ARG PORT=5000
ENV PORT=${PORT}
ENV HOST="0.0.0.0"

CMD ["node", "dist/main.js"]
