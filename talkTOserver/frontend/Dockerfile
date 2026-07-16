FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Exposure for Vite dev server
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
