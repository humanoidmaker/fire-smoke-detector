from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    organization: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    organization: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    email_notifications: bool = True
    alert_threshold: str = "medium"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
