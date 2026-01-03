import webview
import subprocess
import time
import os
import sys
import requests
from pathlib import Path

class DesktopApp:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:5123"
        self.backend_process = None
        self.frontend_process = None
        
    def start_backend(self):
        """Start the FastAPI backend server"""
        try:
            # Change to the backend directory
            backend_dir = Path(__file__).parent
            os.chdir(backend_dir)
            
            # Start uvicorn server in a subprocess
            self.backend_process = subprocess.Popen([
                sys.executable, "-m", "uvicorn", "main:app", 
                "--host", "127.0.0.1", "--port", "8000"
            ])
            print("Backend server started")
        except Exception as e:
            print(f"Backend error: {e}")
    
    def start_frontend(self):
        """Start the React frontend development server"""
        try:
            # Change to the frontend directory
            frontend_dir = Path(__file__).parent.parent / "react-app"
            os.chdir(frontend_dir)
            
            # Start the frontend development server
            self.frontend_process = subprocess.Popen(["npm", "run", "dev"])
            print("Frontend server started")
        except Exception as e:
            print(f"Frontend error: {e}")
    
    def wait_for_servers(self):
        """Wait for both backend and frontend servers to be ready"""
        max_attempts = 60
        attempts = 0
        
        print("Waiting for servers to be ready...")
        
        while attempts < max_attempts:
            try:
                # Check backend
                backend_response = requests.get(f"{self.backend_url}/stored-files", timeout=2)
                if backend_response.status_code == 200:
                    print("✓ Backend server is ready")
                    break
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(1)
            attempts += 1
            if attempts % 10 == 0:
                print(f"Still waiting... ({attempts}/{max_attempts})")
        
        if attempts >= max_attempts:
            print("Warning: Backend server may not be ready")
        
        # Wait a bit more for frontend
        time.sleep(5)
        print("✓ Frontend should be ready")
    
    def cleanup(self):
        """Clean up processes when app closes"""
        if self.backend_process:
            self.backend_process.terminate()
            print("Backend server stopped")
        if self.frontend_process:
            self.frontend_process.terminate()
            print("Frontend server stopped")
    
    def run(self):
        """Start the desktop application"""
        print("Starting Financial Sorting Desktop App...")
        
        try:
            # Start backend
            self.start_backend()
            
            # Start frontend
            self.start_frontend()
            
            # Wait for servers to be ready
            self.wait_for_servers()
            
            # Create the desktop window
            webview.create_window(
                title="Financial Sorting App",
                url=self.frontend_url,
                width=1200,
                height=800,
                resizable=True,
                text_select=True,
                confirm_close=True
            )
            
            # Start the webview
            webview.start(debug=True)
            
        except KeyboardInterrupt:
            print("\nShutting down...")
        finally:
            self.cleanup()

if __name__ == "__main__":
    app = DesktopApp()
    app.run() 