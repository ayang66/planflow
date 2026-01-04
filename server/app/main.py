from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, plans, ai
from app.services.redis import check_redis_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    
    # 检查 Redis 连接
    if check_redis_connection():
        print("✅ Redis connected")
    else:
        print("⚠️ Redis not available, refresh tokens will not be persisted")
    
    yield
    # Shutdown


app = FastAPI(
    title="PlanFlow AI API",
    description="AI-powered goal decomposition and planning backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "PlanFlow AI API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
