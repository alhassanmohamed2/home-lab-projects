# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

EXPOSE 3001
CMD ["npm", "start"]