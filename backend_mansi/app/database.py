"""
Database connection for the Auth & Identity service.

Day 2 checklist item: "Local DB/Redis confirmed working"
Defaults to PostgreSQL; falls back to local SQLite so you're not blocked
waiting on Intern 5's shared docker-compose.dev.yml.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Once Intern 5's docker-compose.dev.yml is up:
#   postgresql://swipex:swipex@localhost:5432/swipex_auth
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./auth_service_dev.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
