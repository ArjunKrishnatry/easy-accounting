#!/usr/bin/env python3
"""Entry point for the FastAPI backend server."""
import uvicorn

# Explicit imports so PyInstaller can detect dependencies
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
