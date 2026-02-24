FROM node:22-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source code (this might be overridden by volume in dev)
COPY . .

EXPOSE 3000

# Default command for development
CMD ["npm", "run", "start:dev"]
