"""
Authentication Models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class UserType(str, Enum):
    PLATFORM = "platform"
    TENANT = "tenant"
    CONSULTANT = "consultant"
    BUSINESS = "business"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: UserType
    user_id: str
    tenant_slug: Optional[str] = None
    name: str
    email: str
    role: str

class ImpersonateRequest(BaseModel):
    tenant_id: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
