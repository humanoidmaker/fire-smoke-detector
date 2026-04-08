from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId

from ..models.user import UserCreate, UserLogin, UserResponse, UserUpdate, TokenResponse
from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token, get_current_user
from ..services.email_service import send_welcome_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "organization": data.organization,
        "role": "user",
        "is_active": True,
        "email_notifications": True,
        "alert_threshold": "medium",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id})
    await send_welcome_email(data.email, data.name)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=data.name,
            email=data.email,
            organization=data.organization,
            role="user",
            is_active=True,
            created_at=user_doc["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
            organization=user.get("organization"),
            role=user.get("role", "user"),
            is_active=user.get("is_active", True),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        organization=user.get("organization"),
        role=user.get("role", "user"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"],
    )


@router.put("/settings")
async def update_settings(data: UserUpdate, user=Depends(get_current_user)):
    db = get_db()
    update = {"updated_at": datetime.now(timezone.utc)}
    if data.name is not None:
        update["name"] = data.name
    if data.organization is not None:
        update["organization"] = data.organization
    update["email_notifications"] = data.email_notifications
    update["alert_threshold"] = data.alert_threshold

    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Settings updated successfully"}
