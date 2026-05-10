from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import habits, records, tasks

app = FastAPI(title="Habit Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(habits.router)
app.include_router(records.router)
app.include_router(tasks.router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/debug-headers")
async def debug_headers(request: Request):
    return dict(request.headers)
