"""
Tenant Models - For tenant-specific data
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid

# ============== USER & ROLES ==============

class TenantUserRole(str, Enum):
    CHAIRMAN = "chairman"
    TREASURER = "treasurer"
    HOD = "hod"
    COLLECTOR = "collector"
    CONSULTANT_ADMIN = "consultant_admin"
    AUDITOR = "auditor"
    AGENT_ADMIN = "agent_admin"
    BUSINESS_USER = "business_user"

class TenantUserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: TenantUserRole
    department_id: Optional[str] = None
    ward_id: Optional[str] = None

class TenantUserCreate(TenantUserBase):
    password: str = Field(..., min_length=6)

class TenantUserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[TenantUserRole] = None
    department_id: Optional[str] = None
    ward_id: Optional[str] = None
    is_active: Optional[bool] = None

class TenantUser(TenantUserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class TenantUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: TenantUserRole
    department_id: Optional[str]
    ward_id: Optional[str]
    is_active: bool
    created_at: datetime

# ============== WARDS ==============

class WardBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class WardCreate(WardBase):
    pass

class WardUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class Ward(WardBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== DEPARTMENTS ==============

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    head_user_id: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_user_id: Optional[str] = None

class Department(DepartmentBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== REVENUE ==============

class RevenueCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class RevenueCategoryCreate(RevenueCategoryBase):
    pass

class RevenueCategory(RevenueCategoryBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenueItemBase(BaseModel):
    name: str
    category_id: str
    base_amount: float
    description: Optional[str] = None

class RevenueItemCreate(RevenueItemBase):
    pass

class RevenueItem(RevenueItemBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenuePointBase(BaseModel):
    name: str
    code: str
    ward_id: str
    address: Optional[str] = None
    coordinates: Optional[dict] = None

class RevenuePointCreate(RevenuePointBase):
    pass

class RevenuePoint(RevenuePointBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== BUSINESSES ==============

class BusinessSize(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"

class BusinessStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"

class BusinessBase(BaseModel):
    business_name: str
    registration_number: str
    owner_name: str
    owner_email: Optional[EmailStr] = None
    owner_phone: str
    ward_id: str
    address: str
    business_type: str
    size: BusinessSize = BusinessSize.SMALL
    
class BusinessCreate(BusinessBase):
    password: Optional[str] = None  # For business portal login

class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[EmailStr] = None
    owner_phone: Optional[str] = None
    address: Optional[str] = None
    business_type: Optional[str] = None
    size: Optional[BusinessSize] = None
    status: Optional[BusinessStatus] = None

class Business(BusinessBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: BusinessStatus = BusinessStatus.ACTIVE
    virtual_account_number: Optional[str] = None
    virtual_account_bank: Optional[str] = None
    hashed_password: Optional[str] = None
    total_invoiced: float = 0
    total_paid: float = 0
    balance: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class BusinessResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    business_name: str
    registration_number: str
    owner_name: str
    owner_email: Optional[str]
    owner_phone: str
    ward_id: str
    address: str
    business_type: str
    size: BusinessSize
    status: BusinessStatus
    virtual_account_number: Optional[str]
    virtual_account_bank: Optional[str]
    total_invoiced: float
    total_paid: float
    balance: float
    created_at: datetime

# ============== CONSULTANTS ==============

class ConsultantBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    company_name: Optional[str] = None
    commission_rate: float = 10.0  # Percentage

class ConsultantCreate(ConsultantBase):
    password: str = Field(..., min_length=6)

class Consultant(ConsultantBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    is_active: bool = True
    total_collected: float = 0
    total_commission: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConsultantAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    consultant_id: str
    revenue_point_id: str
    revenue_item_ids: List[str] = Field(default_factory=list)
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== INVOICES ==============

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class InvoiceItemBase(BaseModel):
    revenue_item_id: str
    description: str
    quantity: int = 1
    unit_price: float
    amount: float

class InvoiceBase(BaseModel):
    business_id: str
    ward_id: str
    due_date: date
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemBase]

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    business_id: str
    ward_id: str
    status: InvoiceStatus = InvoiceStatus.DRAFT
    subtotal: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    amount_paid: float = 0
    balance: float = 0
    due_date: date
    issued_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    payment_link: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class InvoiceItem(InvoiceItemBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str

class InvoicePayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    amount: float
    payment_method: str  # cash, transfer, card
    reference: str
    gateway: Optional[str] = None
    received_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== TICKETS ==============

class TicketBatchStatus(str, Enum):
    CREATED = "created"
    ASSIGNED = "assigned"
    IN_USE = "in_use"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TicketStatus(str, Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class TicketBatchBase(BaseModel):
    revenue_point_id: str
    revenue_item_id: str
    start_number: int
    end_number: int
    unit_price: float
    validity_days: int = 1

class TicketBatchCreate(TicketBatchBase):
    assigned_to: Optional[str] = None  # collector user_id

class TicketBatch(TicketBatchBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_number: str
    status: TicketBatchStatus = TicketBatchStatus.CREATED
    assigned_to: Optional[str] = None
    total_tickets: int = 0
    tickets_sold: int = 0
    tickets_cancelled: int = 0
    total_value: float = 0
    amount_collected: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str
    batch_id: str
    revenue_point_id: str
    revenue_item_id: str
    amount: float
    status: TicketStatus = TicketStatus.AVAILABLE
    sold_at: Optional[datetime] = None
    sold_by: Optional[str] = None
    valid_until: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketSellRequest(BaseModel):
    ticket_id: str
    payer_name: Optional[str] = None
    payer_phone: Optional[str] = None
    payment_method: str = "cash"

class TicketPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    amount: float
    payment_method: str
    payer_name: Optional[str] = None
    payer_phone: Optional[str] = None
    collected_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== CLOSINGS ==============

class ClosingStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"

class ClosingType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"

class ClosingBase(BaseModel):
    closing_type: ClosingType = ClosingType.DAILY
    closing_date: date
    notes: Optional[str] = None

class ClosingCreate(ClosingBase):
    expected_amount: float
    actual_amount: float
    ticket_ids: List[str] = Field(default_factory=list)
    invoice_payment_ids: List[str] = Field(default_factory=list)

class Closing(ClosingBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    collector_id: str
    status: ClosingStatus = ClosingStatus.PENDING
    expected_amount: float = 0
    actual_amount: float = 0
    variance: float = 0
    variance_percentage: float = 0
    ticket_count: int = 0
    invoice_payment_count: int = 0
    ticket_ids: List[str] = Field(default_factory=list)
    invoice_payment_ids: List[str] = Field(default_factory=list)
    submitted_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== SETTINGS ==============

class PaymentSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str  # paymentpoint, palmpay
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    merchant_id: Optional[str] = None
    callback_url: Optional[str] = None
    is_active: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SMSSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str  # termii, twilio, africastalking
    api_key: Optional[str] = None
    sender_id: Optional[str] = None
    is_active: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # invoice_issued, payment_received, ticket_sold, etc.
    channel: str  # sms, email
    subject: Optional[str] = None
    body: str
    is_active: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== AUDIT LOG ==============

class TenantAuditLog(BaseModel):
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

# ============== DEFAULTERS ==============

class Defaulter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    invoice_id: str
    amount_owed: float
    days_overdue: int
    last_notified: Optional[datetime] = None
    notification_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
