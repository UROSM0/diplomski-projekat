FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

ARG VITE_GATEWAY_URL=http://localhost:5000/api/v1
ARG VITE_SOCKET_URL=http://localhost:5000
ENV VITE_GATEWAY_URL=${VITE_GATEWAY_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY electron ./electron
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
