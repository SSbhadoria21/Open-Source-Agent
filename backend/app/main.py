from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return clean JSON error responses for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "detail": "An internal server error occurred."},
    )


@app.get("/")
def root():
    return {"message": "Welcome to the Open Source Mentee Agent API"}


@app.get("/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
