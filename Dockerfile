FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm install typescript @types/node && npm run build

# Cleanup
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/examServer.js"]