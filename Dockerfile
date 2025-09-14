FROM jrottenberg/ffmpeg:7-scratch AS ffmpeg_builder

FROM node:lts

# Install ffpeg
# Copy FFmpeg and its libraries from the ffmpeg_builder stage
COPY --from=ffmpeg_builder /bin/ffmpeg /usr/bin/ffmpeg
COPY --from=ffmpeg_builder /bin/ffprobe /usr/bin/ffprobe
COPY --from=ffmpeg_builder /usr/lib/ /usr/lib/

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
