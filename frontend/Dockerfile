# Этап 1: Сборка
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Этап 2: Раздача статики через Nginx
FROM nginx:stable-alpine
# Копируем билд из первого этапа в папку, которую обслуживает nginx
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]