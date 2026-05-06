import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import environments, collections, requests, execute, import_export, session_variables


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Betterman",
    description="A better API client. Lightweight, local, fast.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(environments.router)
app.include_router(collections.router)
app.include_router(requests.router)
app.include_router(execute.router)
app.include_router(import_export.router)
app.include_router(session_variables.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "name": "betterman"}
