# Etapa de construcción
FROM node:20-slim as build-stage

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# CORRECCIÓN DE PERMISOS: Asegurar que los binarios sean ejecutables
# Esto soluciona el error 'vite: Permission denied'
RUN chmod +x node_modules/.bin/vite

# Argumento para la URL de la API
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Ejecutar el build
RUN npm run build

# Etapa de producción
FROM nginx:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]