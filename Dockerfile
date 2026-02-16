FROM node:18-alpine

WORKDIR /app

# Enable Corepack for Yarn
RUN corepack enable

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Remove dev dependencies
RUN yarn install --production --frozen-lockfile

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/examServer.js"]