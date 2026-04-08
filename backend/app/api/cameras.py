from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.detection import CameraCreate

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


@router.get("/")
async def list_cameras(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.cameras.find({"user_id": user["id"]}).sort("created_at", -1)
    cameras = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        cameras.append(doc)
    return {"cameras": cameras}


@router.post("/", status_code=201)
async def create_camera(data: CameraCreate, user=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user["id"],
        "name": data.name,
        "location": data.location,
        "stream_url": data.stream_url,
        "is_active": data.is_active,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.cameras.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.get("/{camera_id}")
async def get_camera(camera_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.cameras.find_one({"_id": ObjectId(camera_id), "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Camera not found")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.put("/{camera_id}")
async def update_camera(camera_id: str, data: CameraCreate, user=Depends(get_current_user)):
    db = get_db()
    result = await db.cameras.update_one(
        {"_id": ObjectId(camera_id), "user_id": user["id"]},
        {
            "$set": {
                "name": data.name,
                "location": data.location,
                "stream_url": data.stream_url,
                "is_active": data.is_active,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": "Camera updated"}


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, user=Depends(get_current_user)):
    db = get_db()
    result = await db.cameras.delete_one({"_id": ObjectId(camera_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": "Camera deleted"}
