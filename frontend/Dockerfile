# Этап 1: Сборка
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_API_BASE_URL=http://212.113.120.58:8088
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Этап 2: Раздача статики через Nginx
FROM nginx:stable-alpine
# Копируем билд из первого этапа в папку, которую обслуживает nginx
COPY --from=build /app/dist /usr/share/nginx/html
# (Если у тебя старый проект, папка может называться /build вместо /dist)

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]