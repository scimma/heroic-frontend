FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and inject Vite env vars from build args
COPY . .
ARG VITE_HEROIC_URL
ARG VITE_SIMBAD2K_API_URL
ENV VITE_HEROIC_URL=$VITE_HEROIC_URL
ENV VITE_SIMBAD2K_API_URL=$VITE_SIMBAD2K_API_URL
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
