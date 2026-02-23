"""
Invoice Service - Manages invoice lifecycle and payments
"""
from typing import Optional, List
from datetime import datetime, timezone, date, timedelta
from app.database import db_manager
from app.models.tenant import (
    Invoice, InvoiceCreate, InvoiceItem, InvoicePayment, 
    InvoiceStatus, Defaulter, Business
)
import uuid

class InvoiceService:
    def __init__(self, tenant_slug: str):
        self.tenant_slug = tenant_slug
        self.db = db_manager.get_tenant_db(tenant_slug)
    
    async def generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        year = datetime.now().year
        # Count existing invoices for this year
        count = await self.db.invoices.count_documents({
            "invoice_number": {"$regex": f"^INV-{year}-"}
        })
        return f"INV-{year}-{str(count + 1).zfill(6)}"
    
    async def create_invoice(self, data: InvoiceCreate, created_by: str) -> Invoice:
        """Create a new invoice"""
        invoice_number = await self.generate_invoice_number()
        
        # Calculate totals
        subtotal = sum(item.amount for item in data.items)
        tax_amount = 0  # Can be configured per tenant
        total_amount = subtotal + tax_amount
        
        invoice = Invoice(
            id=str(uuid.uuid4()),
            invoice_number=invoice_number,
            business_id=data.business_id,
            ward_id=data.ward_id,
            status=InvoiceStatus.DRAFT,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            amount_paid=0,
            balance=total_amount,
            due_date=data.due_date,
            notes=data.notes,
            created_at=datetime.now(timezone.utc),
            created_by=created_by,
        )
        
        # Save invoice
        invoice_dict = invoice.model_dump()
        invoice_dict['created_at'] = invoice_dict['created_at'].isoformat()
        invoice_dict['due_date'] = invoice_dict['due_date'].isoformat()
        await self.db.invoices.insert_one(invoice_dict)
        
        # Save invoice items
        for item_data in data.items:
            item = InvoiceItem(
                id=str(uuid.uuid4()),
                invoice_id=invoice.id,
                revenue_item_id=item_data.revenue_item_id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                amount=item_data.amount,
            )
            await self.db.invoice_items.insert_one(item.model_dump())
        
        return invoice
    
    async def issue_invoice(self, invoice_id: str, issued_by: str) -> Optional[Invoice]:
        """Issue an invoice (change from draft to issued)"""
        await self.db.invoices.update_one(
            {"id": invoice_id, "status": InvoiceStatus.DRAFT},
            {"$set": {
                "status": InvoiceStatus.ISSUED,
                "issued_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return await self.get_invoice(invoice_id)
    
    async def record_payment(self, invoice_id: str, amount: float, 
                            payment_method: str, reference: str,
                            received_by: str, gateway: str = None,
                            notes: str = None) -> Optional[InvoicePayment]:
        """Record a payment against an invoice"""
        invoice = await self.get_invoice(invoice_id)
        if not invoice:
            return None
        
        # Create payment record
        payment = InvoicePayment(
            id=str(uuid.uuid4()),
            invoice_id=invoice_id,
            amount=amount,
            payment_method=payment_method,
            reference=reference,
            gateway=gateway,
            received_by=received_by,
            notes=notes,
            created_at=datetime.now(timezone.utc),
        )
        payment_dict = payment.model_dump()
        payment_dict['created_at'] = payment_dict['created_at'].isoformat()
        await self.db.invoice_payments.insert_one(payment_dict)
        
        # Update invoice amounts
        new_amount_paid = invoice.amount_paid + amount
        new_balance = invoice.total_amount - new_amount_paid
        
        # Determine new status
        if new_balance <= 0:
            new_status = InvoiceStatus.PAID
        elif new_amount_paid > 0:
            new_status = InvoiceStatus.PARTIALLY_PAID
        else:
            new_status = invoice.status
        
        update_data = {
            "amount_paid": new_amount_paid,
            "balance": max(0, new_balance),
            "status": new_status,
        }
        if new_status == InvoiceStatus.PAID:
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.invoices.update_one(
            {"id": invoice_id},
            {"$set": update_data}
        )
        
        # Update business balance
        await self.db.businesses.update_one(
            {"id": invoice.business_id},
            {"$inc": {"total_paid": amount, "balance": -amount}}
        )
        
        # Remove from defaulters if paid
        if new_status == InvoiceStatus.PAID:
            await self.db.defaulters.delete_one({"invoice_id": invoice_id})
        
        return payment
    
    async def get_invoice(self, invoice_id: str) -> Optional[Invoice]:
        """Get invoice by ID"""
        doc = await self.db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if doc:
            # Convert string dates back
            if isinstance(doc.get('due_date'), str):
                doc['due_date'] = date.fromisoformat(doc['due_date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            return Invoice(**doc)
        return None
    
    async def get_invoice_items(self, invoice_id: str) -> List[InvoiceItem]:
        """Get items for an invoice"""
        cursor = self.db.invoice_items.find({"invoice_id": invoice_id}, {"_id": 0})
        items = []
        async for doc in cursor:
            items.append(InvoiceItem(**doc))
        return items
    
    async def get_invoice_payments(self, invoice_id: str) -> List[InvoicePayment]:
        """Get payments for an invoice"""
        cursor = self.db.invoice_payments.find({"invoice_id": invoice_id}, {"_id": 0})
        payments = []
        async for doc in cursor:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            payments.append(InvoicePayment(**doc))
        return payments
    
    async def list_invoices(self, skip: int = 0, limit: int = 100,
                           business_id: str = None, status: InvoiceStatus = None,
                           ward_id: str = None) -> List[Invoice]:
        """List invoices with filters"""
        query = {}
        if business_id:
            query["business_id"] = business_id
        if status:
            query["status"] = status
        if ward_id:
            query["ward_id"] = ward_id
        
        cursor = self.db.invoices.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
        invoices = []
        async for doc in cursor:
            if isinstance(doc.get('due_date'), str):
                doc['due_date'] = date.fromisoformat(doc['due_date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            invoices.append(Invoice(**doc))
        return invoices
    
    async def bulk_generate_invoices(self, business_ids: List[str], 
                                    items: List[dict], due_date: date,
                                    created_by: str) -> List[Invoice]:
        """Generate invoices in bulk for multiple businesses"""
        invoices = []
        for business_id in business_ids:
            # Get business ward
            business = await self.db.businesses.find_one({"id": business_id}, {"_id": 0})
            if not business:
                continue
            
            from app.models.tenant import InvoiceItemBase
            invoice_items = [InvoiceItemBase(**item) for item in items]
            
            invoice_data = InvoiceCreate(
                business_id=business_id,
                ward_id=business.get("ward_id"),
                due_date=due_date,
                items=invoice_items,
            )
            invoice = await self.create_invoice(invoice_data, created_by)
            invoices.append(invoice)
        
        return invoices
    
    async def check_and_mark_overdue(self):
        """Check for overdue invoices and mark them"""
        today = date.today().isoformat()
        
        # Find invoices that are past due date and not paid
        await self.db.invoices.update_many(
            {
                "status": {"$in": [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID]},
                "due_date": {"$lt": today}
            },
            {"$set": {"status": InvoiceStatus.OVERDUE}}
        )
        
        # Create/update defaulter records
        cursor = self.db.invoices.find({"status": InvoiceStatus.OVERDUE}, {"_id": 0})
        async for invoice in cursor:
            due_date = date.fromisoformat(invoice['due_date']) if isinstance(invoice['due_date'], str) else invoice['due_date']
            days_overdue = (date.today() - due_date).days
            
            existing = await self.db.defaulters.find_one({"invoice_id": invoice['id']})
            if existing:
                await self.db.defaulters.update_one(
                    {"invoice_id": invoice['id']},
                    {"$set": {"days_overdue": days_overdue, "amount_owed": invoice['balance']}}
                )
            else:
                defaulter = Defaulter(
                    id=str(uuid.uuid4()),
                    business_id=invoice['business_id'],
                    invoice_id=invoice['id'],
                    amount_owed=invoice['balance'],
                    days_overdue=days_overdue,
                    created_at=datetime.now(timezone.utc),
                )
                defaulter_dict = defaulter.model_dump()
                defaulter_dict['created_at'] = defaulter_dict['created_at'].isoformat()
                await self.db.defaulters.insert_one(defaulter_dict)
    
    async def get_invoice_stats(self) -> dict:
        """Get invoice statistics"""
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total": {"$sum": "$total_amount"},
                "paid": {"$sum": "$amount_paid"},
                "balance": {"$sum": "$balance"}
            }}
        ]
        
        stats = {
            "total_invoices": 0,
            "total_amount": 0,
            "total_paid": 0,
            "total_balance": 0,
            "by_status": {}
        }
        
        async for result in self.db.invoices.aggregate(pipeline):
            status = result['_id']
            stats['by_status'][status] = {
                "count": result['count'],
                "total": result['total'],
                "paid": result['paid'],
                "balance": result['balance']
            }
            stats['total_invoices'] += result['count']
            stats['total_amount'] += result['total']
            stats['total_paid'] += result['paid']
            stats['total_balance'] += result['balance']
        
        return stats
