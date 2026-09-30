"""
Main application entry point for backend_mansi.
Exposes the FastAPI app from backend_mansi.app.main.
"""
import sys
from pathlib import Path

# Ensure backend_mansi is in sys.path so 'app' imports work seamlessly
_pkg_root = Path(__file__).resolve().parent
if str(_pkg_root) not in sys.path:
    sys.path.insert(0, str(_pkg_root))

from app.main import app

__all__ = ["app"]
