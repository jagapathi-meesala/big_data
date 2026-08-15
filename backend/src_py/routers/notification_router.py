
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from ..core.database import get_db

router = APIRouter()

async def check_table(db: AsyncSession):
    await db.execute(text('''
        CREATE TABLE IF NOT EXISTS system_notifications (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'INFO',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
    '''))
    await db.commit()

@router.get("/")
async def get_notifications(db: AsyncSession = Depends(get_db)):
    await check_table(db)
    result = await db.execute(text('''
        SELECT * FROM system_notifications
        ORDER BY "createdAt" DESC
        LIMIT 20;
    '''))
    notifications = [dict(row._mapping) for row in result.all()]
    return {"notifications": notifications}

@router.post("/")
async def create_notification(title: str = Body(...), message: str = Body(...), type: str = Body('INFO'), db: AsyncSession = Depends(get_db)):
    await check_table(db)
    await db.execute(text('''
        INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
        VALUES (:title, :message, :type, NOW(), NOW());
    '''), {"title": title, "message": message, "type": type})
    await db.commit()
    return {"message": "Notification created."}
