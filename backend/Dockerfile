# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 8080
EXPOSE 10000

# Start the server
CMD ["npm", "start"]

