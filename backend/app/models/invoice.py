from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class InvoiceItem(BaseModel):
    revenue_item_id: str
    revenue_item_name: str
    quantity: int = 1
    unit_price: float
    amount: float

class InvoiceBase(BaseModel):
    business_id: str
    business_name: Optional[str] = None
    items: List[InvoiceItem]
    total_amount: float
    due_date: datetime
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    send_sms: bool = False

class Invoice(InvoiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = ""
    tenant_id: str
    status: str = "pending"  # pending, paid, partial, overdue, cancelled
    amount_paid: float = 0.0
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    payment_method: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    business_id: str
    business_name: Optional[str] = None
    items: List[InvoiceItem]
    total_amount: float
    amount_paid: float
    status: str
    due_date: datetime
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    created_at: datetime

class BulkInvoiceRequest(BaseModel):
    business_ids: List[str]
    revenue_item_ids: List[str]
    due_date: datetime
    send_sms: bool = False
    tariffs: Optional[dict] = None  # {"small": 1000, "medium": 2000, "large": 3000}

class BulkInvoicePreview(BaseModel):
    total_businesses: int
    total_amount: float
    items_breakdown: List[dict]

class PaymentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    tenant_id: str
    amount: float
    payment_method: str  # cash, transfer, card, pos
    reference: str
    status: str = "success"  # success, pending, failed
    gateway_response: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        extra = "ignore"
