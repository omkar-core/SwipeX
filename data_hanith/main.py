"""
Main Application Entry Point for SwipeX Job & Data Intelligence Service.
FastAPI ASGI application exposing job listings, details, and search endpoints.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import jobs, swipes, companies

app = FastAPI(
    title="SwipeX Job & Data Intelligence Service",
    description="Microservice responsible for job listings, company data, skill mapping, search, and swipe recording in SwipeX.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Enable CORS for frontend and cross-service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(jobs.router)
app.include_router(swipes.router)
app.include_router(companies.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "job-data-service"}
