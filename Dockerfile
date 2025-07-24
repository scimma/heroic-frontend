FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build static files
COPY . .
RUN npm run build

# Serve with nginx
FROM nginx:alpine
# Copy built files into nginx’s html root
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
