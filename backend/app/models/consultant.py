from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class ConsultantBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    commission_rate: float = 10.0  # Default 10%
    status: str = "active"  # active, inactive, suspended

class ConsultantCreate(ConsultantBase):
    password: str
    assigned_ward_ids: Optional[List[str]] = None
    assigned_revenue_item_ids: Optional[List[str]] = None

class Consultant(ConsultantBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    assigned_ward_ids: List[str] = []
    assigned_revenue_item_ids: List[str] = []
    total_collections: float = 0.0
    total_commission: float = 0.0
    wallet_balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class ConsultantInDB(Consultant):
    hashed_password: str

class ConsultantResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    commission_rate: float
    status: str
    assigned_ward_ids: List[str] = []
    assigned_revenue_item_ids: List[str] = []
    total_collections: float = 0.0
    total_commission: float = 0.0
    wallet_balance: float = 0.0
    created_at: datetime

class ConsultantDashboard(BaseModel):
    today_collections: float = 0.0
    today_tickets_sold: int = 0
    monthly_collections: float = 0.0
    monthly_commission: float = 0.0
    wallet_balance: float = 0.0
    pending_closings: int = 0
    assigned_wards: List[dict] = []
    recent_sales: List[dict] = []

class ConsultantWalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    consultant_id: str
    tenant_id: str
    type: str  # credit, debit, withdrawal
    amount: float
    balance_after: float
    description: str
    reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class Collector(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: str
    tenant_id: str
    user_id: Optional[str] = None
    assigned_revenue_point_id: Optional[str] = None
    assigned_revenue_point_name: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class CollectorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    assigned_revenue_point_id: Optional[str] = None
