# Playwright resmi Docker image — Chromium dahil, tüm bağımlılıklar kurulu
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Bağımlılıkları önce kopyala (cache için)
COPY package*.json ./
RUN npm install --omit=dev

# Kaynak kodu kopyala
COPY . .

# Chromium binary konumunu belirt
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
