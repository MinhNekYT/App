FROM node:22-slim

WORKDIR /app

# Install from the committed npm lockfile before copying application code.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

ENV NODE_ENV=production

# `index.js` loads the built bot-and-web runtime from dist/index.js.
CMD ["node", "index.js"]
