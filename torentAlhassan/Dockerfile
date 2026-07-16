# Use Node.js as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p /downloads /app/data

# Expose the application port
EXPOSE 8214

# Set environment variables
ENV PORT=8214
ENV DOWNLOAD_PATH=/downloads

# Start the application
CMD ["npm", "start"]
