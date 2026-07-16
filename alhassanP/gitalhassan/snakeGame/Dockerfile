FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for sqlite3 (if needed)
# python3, make, g++ are often required for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
