import sys
import os

# Suppress GitPython git binary error in serverless environments
os.environ["GIT_PYTHON_REFRESH"] = "quiet"

# Add project root directory to sys.path so backend and other modules can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] == "http":
        headers = dict(scope.get("headers", []))
        # Vercel passes the original request path in x-matched-path
        matched_path = headers.get(b"x-matched-path", b"").decode("utf-8")
        if matched_path and not matched_path.startswith("/api/index"):
            scope["path"] = matched_path
        elif scope["path"] == "/api/index.py" or scope["path"] == "/api/index" or scope["path"] == "/api":
            scope["path"] = "/"
    await fastapi_app(scope, receive, send)
