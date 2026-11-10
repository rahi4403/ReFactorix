import os
import sys
import socket
import uvicorn

def find_available_port(start_port=8000, max_attempts=10):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

if __name__ == "__main__":
    is_cloud = bool(os.environ.get("PORT"))
    port = int(os.environ.get("PORT", find_available_port(8000)))
    host = "0.0.0.0" if is_cloud else "127.0.0.1"
    print(f"============================================================")
    print(f"  ReFactorix: Autonomous Legacy Code & Security Modernizer  ")
    print(f"  Dashboard running on: http://{host}:{port}                ")
    print(f"============================================================")
    uvicorn.run("backend.app:app", host=host, port=port, log_level="info", reload=False)

