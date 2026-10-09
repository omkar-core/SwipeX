"""
Database connection for the Auth & Identity service.

Day 2 checklist item: "Local DB/Redis confirmed working"
Defaults to PostgreSQL; falls back to local SQLite so you're not blocked
waiting on Intern 5's shared docker-compose.dev.yml.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_current_url = None
_current_engine = None
_current_sessionmaker = None

Base = declarative_base()


def get_engine():
    global _current_url, _current_engine, _current_sessionmaker
    url = os.getenv("DATABASE_URL", "sqlite:///./auth_service_dev.db")
    if _current_engine is None or _current_url != url:
        _current_url = url
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _current_engine = create_engine(url, connect_args=connect_args)
        _current_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=_current_engine)
    return _current_engine


def get_sessionmaker():
    get_engine()
    return _current_sessionmaker


# Maintain top-level exports for backwards compatibility with test files importing engine / SessionLocal
class _EngineProxy:
    def __getattr__(self, item):
        return getattr(get_engine(), item)

class _SessionLocalProxy:
    def __call__(self, *args, **kwargs):
        return get_sessionmaker()(*args, **kwargs)

engine = _EngineProxy()
SessionLocal = _SessionLocalProxy()


def get_db():
    db = get_sessionmaker()()
    try:
        yield db
    finally:
        db.close()
