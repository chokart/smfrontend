# Etapa de construcción
FROM node:20-slim as build-stage

WORKDIR /app

# Aprovechar el caché de capas de Docker para dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código fuente (excluyendo node_modules vía .dockerignore)
COPY . .

# Argumento para la URL de la API durante la compilación de Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Compilación estática de producción
RUN npm run build

# Etapa de producción optimizada con Nginx
FROM nginx:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]