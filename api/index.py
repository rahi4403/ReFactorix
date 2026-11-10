import sys
import os

# Suppress GitPython git binary error in serverless environments
os.environ["GIT_PYTHON_REFRESH"] = "quiet"

# Add project root directory to sys.path so backend and other modules can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app import app
