# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy data files
COPY ../data ./data

# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]