from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class BusinessBase(BaseModel):
    name: str
    registration_number: Optional[str] = None
    business_type: str  # e.g., "shop", "restaurant", "hotel", "market_stall"
    category_id: Optional[str] = None
    size: str = "small"  # small, medium, large
    ward_id: Optional[str] = None
    department_id: Optional[str] = None
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    owner_name: str
    owner_phone: Optional[str] = None
    owner_nin: Optional[str] = None
    status: str = "active"  # active, inactive, suspended
    virtual_account_number: Optional[str] = None
    virtual_account_bank: Optional[str] = None

class BusinessCreate(BusinessBase):
    password: Optional[str] = None  # For business portal access

class Business(BusinessBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_invoices: int = 0
    total_paid: float = 0.0
    total_outstanding: float = 0.0

    class Config:
        extra = "ignore"

class BusinessInDB(Business):
    hashed_password: Optional[str] = None

class BusinessResponse(BaseModel):
    id: str
    name: str
    registration_number: Optional[str] = None
    business_type: str
    category_id: Optional[str] = None
    size: str
    ward_id: Optional[str] = None
    ward_name: Optional[str] = None
    department_id: Optional[str] = None
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    owner_name: str
    status: str
    virtual_account_number: Optional[str] = None
    virtual_account_bank: Optional[str] = None
    created_at: datetime
    total_invoices: int = 0
    total_paid: float = 0.0
    total_outstanding: float = 0.0

class BusinessCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    tenant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"
