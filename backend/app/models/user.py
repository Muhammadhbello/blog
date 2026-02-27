from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "staff"  # chairman, treasurer, hod, collector, consultant, business_user, auditor, staff
    department_id: Optional[str] = None
    ward_id: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    tenant_id: Optional[str] = None

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class UserInDB(User):
    hashed_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: Optional[str] = None
    department_id: Optional[str] = None
    ward_id: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    login_type: str = "user"  # user, business, consultant

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    tenant: Optional[dict] = None

class PlatformUserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "admin"  # admin, super_admin

class PlatformUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "admin"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class PlatformUserInDB(PlatformUser):
    hashed_password: str
