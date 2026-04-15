#!/bin/bash

# Start Ollama service in the background
echo "Starting Ollama daemon..."
ollama serve &

# Wait for Ollama to wake up
echo "Waiting for Ollama to initialize..."
sleep 10

# Pull the specific model needed for the Risk Engine
echo "Pulling gemma3:1b model (this may take a few minutes)..."
ollama pull gemma3:1b

# Start the FastAPI Backend (Uvicorn for production)
echo "Starting Financial Risk Engine Server on Port 5000..."
exec uvicorn app:app --host 0.0.0.0 --port 5000 --workers 4
