# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Verify build succeeded
RUN test -f dist/server.js || (echo "Build failed: dist/server.js not found" && exit 1)

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]

