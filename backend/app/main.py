from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.modules.agenda.router import router as agenda_router
from app.modules.articles.router import router as articles_router
from app.modules.clients.router import router as clients_router
from app.modules.devis.router import router as devis_router
from app.modules.facturation.router import router as facturation_router

FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="HVAC Dashboard API",
        version="1.0.0",
        debug=settings.debug,
        docs_url="/api/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    cors_origins = ["*"] if settings.debug else []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    prefix = settings.api_v1_prefix
    app.include_router(clients_router, prefix=f"{prefix}/clients", tags=["Clients"])
    app.include_router(articles_router, prefix=f"{prefix}/articles", tags=["Articles"])
    app.include_router(devis_router, prefix=f"{prefix}/devis", tags=["Devis"])
    app.include_router(facturation_router, prefix=f"{prefix}/facturation", tags=["Facturation"])
    app.include_router(agenda_router, prefix=f"{prefix}/agenda", tags=["Agenda"])

    static_dir = FRONTEND_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/health")
    async def health():
        return {"status": "ok", "environment": settings.environment}

    @app.get("/sw.js", include_in_schema=False)
    async def service_worker():
        sw_path = FRONTEND_DIR / "static" / "sw.js"
        response = FileResponse(str(sw_path), media_type="application/javascript")
        response.headers["Service-Worker-Allowed"] = "/"
        response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        return FileResponse(str(FRONTEND_DIR / "templates" / "index.html"))

    return app


app = create_app()
