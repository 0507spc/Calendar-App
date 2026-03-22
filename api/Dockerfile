FROM node:20-bookworm

# canvas deps
RUN apt-get update && apt-get install -y \
  libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]