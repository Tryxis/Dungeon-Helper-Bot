# A small production image. Build:  docker build -t dungeon-helper-bot .
# Run:  docker run -d --env-file .env -v "$PWD/data:/app/data" --name dhb dungeon-helper-bot
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first, so a code change doesn't reinstall node_modules.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# The tracker and counters live here; mount a volume so they survive a rebuild.
RUN mkdir -p /app/data && chown -R node:node /app
ENV DATA_DIR=/app/data

USER node

# No ports: the bot dials out to Discord over the gateway, nothing dials in.
CMD ["node", "src/index.js"]
