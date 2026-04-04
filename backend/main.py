from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, admin, member, orders, stocks

app = FastAPI(
    title="Game Store API",
    description="REST API untuk Game Store dengan MySQL tanpa ORM",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(member.router)
app.include_router(orders.router)
app.include_router(stocks.router)

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Game Store API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
