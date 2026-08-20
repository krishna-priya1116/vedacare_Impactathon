"""
VedaCare — FastAPI application entry point.
Includes all routers, CORS config, DB table creation, and scheduler startup.

Run with:
    cd vedacare/backend
    uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from scheduler import start_scheduler

# Import routers
from routers.auth import router as auth_router
from routers.patients import router as patients_router
from routers.prescriptions import router as prescriptions_router
from routers.medications import router as medications_router
from routers.appointments import router as appointments_router
from routers.alerts import router as alerts_router
from routers.admin import router as admin_router
from routers.summary import router as summary_router
from fastapi.staticfiles import StaticFiles
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + start scheduler
    Base.metadata.create_all(bind=engine)
    print("[Startup] Database tables created.")
    scheduler = start_scheduler()
    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    print("[Shutdown] Scheduler stopped.")


app = FastAPI(
    title="VedaCare API",
    description="Backend API for the VedaCare medication management platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(prescriptions_router)
app.include_router(medications_router)
app.include_router(appointments_router)
app.include_router(alerts_router)
app.include_router(admin_router)
app.include_router(summary_router)

# Mount audio directory
audio_dir = os.path.join(os.path.dirname(__file__), "ai_pipeline", "audio_cache")
os.makedirs(audio_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=audio_dir), name="audio")


# Standard error response format (per ARCHITECTURE.md §9)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "SERVER_ERROR", "message": str(exc)},
        },
    )


@app.get("/")
def health():
    return {"status": "ok", "service": "VedaCare API", "version": "1.0.0"}
