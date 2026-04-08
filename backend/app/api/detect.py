from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..ml.fire_detector import get_detector
from ..models.detection import DetectionStats, AlertAcknowledge

router = APIRouter(prefix="/api/detect", tags=["Detection"])


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    camera_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/bmp"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Use JPEG, PNG, WebP, or BMP.")

    image_bytes = await file.read()
    if len(image_bytes) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 10MB.")

    detector = get_detector()
    result = detector.detect(image_bytes)

    # Save to database
    db = get_db()
    camera_name = None
    if camera_id:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if camera:
            camera_name = camera["name"]

    record = {
        "user_id": user["id"],
        "camera_id": camera_id,
        "camera_name": camera_name,
        "detected": result["detected"],
        "detection_type": result["type"],
        "confidence": result["confidence"],
        "severity": result["severity"],
        "regions": result["regions"],
        "recommendation": result["recommendation"],
        "image_width": result["image_width"],
        "image_height": result["image_height"],
        "acknowledged": False,
        "created_at": datetime.now(timezone.utc),
    }
    insert_result = await db.detections.insert_one(record)
    record["id"] = str(insert_result.inserted_id)

    # Send alert email for significant detections
    if result["detected"] and result["severity"] in ["high", "critical"]:
        if user.get("email_notifications", True):
            from ..services.email_service import send_alert_email
            await send_alert_email(
                to=user["email"],
                detection_type=result["type"],
                severity=result["severity"],
                confidence=result["confidence"],
                camera_name=camera_name or "Manual Upload",
                timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                recommendation=result["recommendation"],
            )

    return {
        "id": record["id"],
        **result,
    }


@router.get("/alerts")
async def get_alerts(
    page: int = 1,
    limit: int = 20,
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    user=Depends(get_current_user),
):
    db = get_db()
    query = {"user_id": user["id"], "detected": True}
    if severity:
        query["severity"] = severity
    if acknowledged is not None:
        query["acknowledged"] = acknowledged

    total = await db.detections.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.detections.find(query).sort("created_at", -1).skip(skip).limit(limit)
    alerts = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        alerts.append(doc)

    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/alert/acknowledge/{alert_id}")
async def acknowledge_alert(
    alert_id: str,
    data: AlertAcknowledge,
    user=Depends(get_current_user),
):
    db = get_db()
    result = await db.detections.update_one(
        {"_id": ObjectId(alert_id), "user_id": user["id"]},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_by": user["name"],
                "acknowledged_at": datetime.now(timezone.utc),
                "acknowledge_notes": data.notes,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}


@router.get("/stats", response_model=DetectionStats)
async def get_stats(user=Depends(get_current_user)):
    db = get_db()
    uid = user["id"]

    total_scans = await db.detections.count_documents({"user_id": uid})
    total_detections = await db.detections.count_documents({"user_id": uid, "detected": True})
    fire = await db.detections.count_documents({"user_id": uid, "detection_type": {"$in": ["Fire", "Fire+Smoke"]}})
    smoke = await db.detections.count_documents({"user_id": uid, "detection_type": {"$in": ["Smoke", "Fire+Smoke"]}})
    critical = await db.detections.count_documents({"user_id": uid, "severity": "critical"})
    high = await db.detections.count_documents({"user_id": uid, "severity": "high"})
    medium = await db.detections.count_documents({"user_id": uid, "severity": "medium"})
    low = await db.detections.count_documents({"user_id": uid, "severity": "low"})
    ack = await db.detections.count_documents({"user_id": uid, "detected": True, "acknowledged": True})
    unack = await db.detections.count_documents({"user_id": uid, "detected": True, "acknowledged": False})

    return DetectionStats(
        total_scans=total_scans,
        total_detections=total_detections,
        fire_detections=fire,
        smoke_detections=smoke,
        critical_alerts=critical,
        high_alerts=high,
        medium_alerts=medium,
        low_alerts=low,
        acknowledged=ack,
        unacknowledged=unack,
    )
