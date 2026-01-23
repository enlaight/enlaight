FROM node:20-bookworm-slim AS build
WORKDIR /app

ENV CI=true \
    npm_config_loglevel=warn

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Start the dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
