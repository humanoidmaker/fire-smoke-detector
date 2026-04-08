from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float
    label: str


class DetectionResult(BaseModel):
    detected: bool
    type: Optional[str] = None
    confidence: float = 0.0
    severity: Optional[str] = None
    regions: List[BoundingBox] = []
    recommendation: str = ""
    image_width: int = 0
    image_height: int = 0


class DetectionRecord(BaseModel):
    id: Optional[str] = None
    user_id: str
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    detected: bool
    detection_type: Optional[str] = None
    confidence: float
    severity: Optional[str] = None
    regions: List[dict] = []
    recommendation: str = ""
    image_path: Optional[str] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AlertAcknowledge(BaseModel):
    notes: Optional[str] = None


class Camera(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    location: str = ""
    stream_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CameraCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str = ""
    stream_url: Optional[str] = None
    is_active: bool = True


class DetectionStats(BaseModel):
    total_scans: int = 0
    total_detections: int = 0
    fire_detections: int = 0
    smoke_detections: int = 0
    critical_alerts: int = 0
    high_alerts: int = 0
    medium_alerts: int = 0
    low_alerts: int = 0
    acknowledged: int = 0
    unacknowledged: int = 0
