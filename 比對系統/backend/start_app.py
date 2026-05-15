import uvicorn
import webbrowser
import threading
import sys
import os
import time

def open_browser():
    """Wait for server to start then open browser"""
    time.sleep(1.5) # Give uvicorn a moment
    webbrowser.open("http://127.0.0.1:8000")

def main():
    # Ensure correct working directory for PyInstaller
    if getattr(sys, 'frozen', False):
        os.chdir(sys._MEIPASS)
        
    # Run Uvicorn with direct app object
    from main import app
    
    # Simple port finding or fallback
    import socket
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0

    port = 8000
    if is_port_in_use(port):
        print(f"Port {port} is busy, trying 8001...")
        port = 8001
        
    # Update browser URL
    def open_browser_delayed(url):
        time.sleep(1.5)
        webbrowser.open(url)

    threading.Thread(target=open_browser_delayed, args=(f"http://127.0.0.1:{port}",), daemon=True).start()
    
    # Use direct app instance to avoid import errors in frozen state
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
