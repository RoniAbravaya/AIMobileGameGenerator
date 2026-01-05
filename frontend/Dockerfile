# GameFactory Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Default command (dev mode)
CMD ["npm", "run", "dev"]
