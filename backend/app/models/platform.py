"""
Platform Models - For managing tenants and platform users
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class TenantStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"

class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Tenant/LGA name")
    slug: str = Field(..., min_length=2, max_length=50, description="URL-friendly identifier")
    domain: Optional[str] = Field(None, description="Custom domain if any")
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    country: str = "Nigeria"

class TenantCreate(TenantBase):
    admin_email: EmailStr = Field(..., description="Email for the tenant's initial admin user")
    admin_name: str = Field(..., description="Name for the tenant's initial admin user")
    admin_password: str = Field(..., min_length=6)

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None

class Tenant(TenantBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    db_name: str = Field(..., description="Tenant database name")
    status: TenantStatus = TenantStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    suspended_at: Optional[datetime] = None
    subscription_plan: str = "basic"
    settings: dict = Field(default_factory=dict)

class TenantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    slug: str
    domain: Optional[str]
    contact_email: str
    contact_phone: Optional[str]
    address: Optional[str]
    state: Optional[str]
    country: str
    status: TenantStatus
    created_at: datetime
    subscription_plan: str

# Platform User Models
class PlatformUserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    SUPPORT_ADMIN = "support_admin"
    FINANCE_ADMIN = "finance_admin"

class PlatformUserBase(BaseModel):
    email: EmailStr
    name: str
    role: PlatformUserRole = PlatformUserRole.SUPPORT_ADMIN

class PlatformUserCreate(PlatformUserBase):
    password: str = Field(..., min_length=6)

class PlatformUser(PlatformUserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class PlatformUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    name: str
    role: PlatformUserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

# Audit Log
class PlatformAuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: dict = Field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
