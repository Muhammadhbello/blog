from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class TicketBase(BaseModel):
    revenue_item_id: str
    revenue_item_name: Optional[str] = None
    amount: float
    quantity: int = 1

class TicketCreate(TicketBase):
    batch_size: int = 1

class Ticket(TicketBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str = ""
    tenant_id: str
    batch_id: Optional[str] = None
    status: str = "available"  # available, sold, used, cancelled
    sold_at: Optional[datetime] = None
    sold_by: Optional[str] = None
    sold_to: Optional[str] = None
    revenue_point_id: Optional[str] = None
    collector_id: Optional[str] = None
    qr_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    revenue_item_id: str
    revenue_item_name: Optional[str] = None
    amount: float
    quantity: int
    status: str
    sold_at: Optional[datetime] = None
    sold_by: Optional[str] = None
    collector_name: Optional[str] = None
    created_at: datetime

class TicketBatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    revenue_item_id: str
    revenue_item_name: Optional[str] = None
    total_tickets: int
    total_amount: float
    tickets_sold: int = 0
    tickets_available: int = 0
    status: str = "active"  # active, completed, cancelled
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class TicketSaleRequest(BaseModel):
    ticket_ids: List[str]
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    payment_method: str = "cash"
    revenue_point_id: Optional[str] = None

class TicketVerifyRequest(BaseModel):
    ticket_number: str

class TicketVerifyResponse(BaseModel):
    valid: bool
    ticket: Optional[TicketResponse] = None
    message: str
