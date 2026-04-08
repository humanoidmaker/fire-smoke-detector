from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]
    await db.command("ping")
    print(f"[FireWatch] Connected to MongoDB: {settings.MONGODB_DB}")


async def close_db():
    global client
    if client:
        client.close()
        print("[FireWatch] MongoDB connection closed")


def get_db():
    return db


# Alias for compatibility
init_db = connect_db
