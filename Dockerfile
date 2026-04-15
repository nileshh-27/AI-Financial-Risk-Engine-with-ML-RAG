# --- STEP 1: Build the Vite Frontend ---
FROM node:20-slim AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- STEP 2: Final Runtime Image ---
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set Up App Directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from Stage 1 into the backend folder
# This matches your app.py which serves from client/dist or similar
COPY --from=build-frontend /app/dist /app/client/dist
COPY . .

# Environment Variables
ENV PORT=5000
ENV FLASK_ENV=production
ENV OLLAMA_HOST=0.0.0.0

# Expose port 5000
EXPOSE 5000

# Ensure entrypoint is executable
RUN chmod +x scripts/entrypoint.sh
ENTRYPOINT ["./scripts/entrypoint.sh"]
