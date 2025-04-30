FROM node:18-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies required by Chromium
RUN apt-get update && apt-get install -y \
  chromium \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm-dev \
  libgtk-3-0 \
  libnss3 \
  libxss1 \
  libasound2 \
  libxtst6 \
  fonts-liberation \
  xdg-utils \
  wget \
  && apt-get clean

# Set working directory
WORKDIR /app

# Copy app files
COPY package*.json ./
RUN npm install

COPY . .

# Set Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000
CMD ["node", "index.js"]

