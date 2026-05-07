FROM node:20-bookworm-slim AS build
WORKDIR /app

ENV CI=true \
    npm_config_loglevel=warn

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .
ARG VITE_API_BASE_URL
ARG VITE_N8N_CHAT_URL
ARG VITE_N8N_SUPPORT_ASSISTANT_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_N8N_CHAT_URL=${VITE_N8N_CHAT_URL} \
    VITE_N8N_SUPPORT_ASSISTANT_URL=${VITE_N8N_SUPPORT_ASSISTANT_URL}

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]