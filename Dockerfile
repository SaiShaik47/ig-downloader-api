FROM node:20-bullseye

# Install ffmpeg + python + pip, then install yt-dlp via pip
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
  && pip3 install --no-cache-dir -U yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
