
from fastapi import FastAPI, Request
from .core.database import engine, Base
import socketio

app = FastAPI(title="AI Powered Distributed Disaster Resource Allocation System")
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"status": "online", "system": "AI Powered Distributed Disaster Resource Allocation System"}

from .routers import auth_router, incidents_router, resources_router, allocations_router
from .routers import iot_router, dashboard_router, analytics_router, weather_router, report_router, notification_router, users_router

app.include_router(auth_router.router, prefix="/api/v1/auth")
app.include_router(users_router.router, prefix="/api/v1/users")
app.include_router(incidents_router.router, prefix="/api/v1/incidents")
app.include_router(resources_router.router, prefix="/api/v1/resources")
app.include_router(allocations_router.router, prefix="/api/v1/allocations")
app.include_router(iot_router.router, prefix="/api/v1/iot")
app.include_router(dashboard_router.router, prefix="/api/v1/dashboard")
app.include_router(analytics_router.router, prefix="/api/v1/analytics")
app.include_router(weather_router.router, prefix="/api/v1/weather")
app.include_router(report_router.router, prefix="/api/v1/reports")
app.include_router(notification_router.router, prefix="/api/v1/notifications")
