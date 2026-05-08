from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from .database import create_tables
from .routers import clients, articles, categories, devis, interventions, factures, profil

app = FastAPI(title="HVAC ERP API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()


app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(articles.router, prefix="/api/articles", tags=["articles"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(devis.router, prefix="/api/devis", tags=["devis"])
app.include_router(interventions.router, prefix="/api/interventions", tags=["interventions"])
app.include_router(factures.router, prefix="/api/factures", tags=["factures"])
app.include_router(profil.router, prefix="/api/profil", tags=["profil"])

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
