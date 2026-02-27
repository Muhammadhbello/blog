from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class Ward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    tenant_id: str
    population: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class WardCreate(BaseModel):
    name: str
    code: Optional[str] = None
    population: Optional[int] = None

class Department(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    tenant_id: str
    hod_id: Optional[str] = None
    hod_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    hod_id: Optional[str] = None

class RevenueCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    tenant_id: str
    department_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class RevenueCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department_id: Optional[str] = None

class RevenueItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    tenant_id: str
    description: Optional[str] = None
    base_amount: float
    tariffs: Optional[Dict[str, float]] = None  # {"small": 1000, "medium": 2000, "large": 3000}
    frequency: str = "one-time"  # one-time, monthly, quarterly, annually
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class RevenueItemCreate(BaseModel):
    name: str
    code: Optional[str] = None
    category_id: str
    description: Optional[str] = None
    base_amount: float
    tariffs: Optional[Dict[str, float]] = None
    frequency: str = "one-time"

class RevenuePoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    tenant_id: str
    ward_id: Optional[str] = None
    ward_name: Optional[str] = None
    address: Optional[str] = None
    gps_coordinates: Optional[str] = None
    collector_id: Optional[str] = None
    collector_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class RevenuePointCreate(BaseModel):
    name: str
    code: Optional[str] = None
    ward_id: Optional[str] = None
    address: Optional[str] = None
    gps_coordinates: Optional[str] = None
    collector_id: Optional[str] = None

class Closing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    collector_id: str
    collector_name: Optional[str] = None
    revenue_point_id: Optional[str] = None
    revenue_point_name: Optional[str] = None
    closing_date: datetime
    closing_type: str = "daily"  # daily, weekly
    total_tickets_sold: int = 0
    total_amount: float = 0.0
    cash_collected: float = 0.0
    pos_collected: float = 0.0
    transfer_collected: float = 0.0
    discrepancy: float = 0.0
    notes: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class ClosingCreate(BaseModel):
    revenue_point_id: Optional[str] = None
    closing_date: datetime
    closing_type: str = "daily"
    total_tickets_sold: int
    total_amount: float
    cash_collected: float = 0.0
    pos_collected: float = 0.0
    transfer_collected: float = 0.0
    notes: Optional[str] = None
