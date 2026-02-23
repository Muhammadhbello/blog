"""
Ticket Service - Manages ticket batches, sales, and verification
"""
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from app.database import db_manager
from app.models.tenant import (
    TicketBatch, TicketBatchCreate, TicketBatchStatus,
    Ticket, TicketStatus, TicketSellRequest, TicketPayment
)
import uuid

class TicketService:
    def __init__(self, tenant_slug: str):
        self.tenant_slug = tenant_slug
        self.db = db_manager.get_tenant_db(tenant_slug)
    
    async def generate_batch_number(self) -> str:
        """Generate unique batch number"""
        year = datetime.now().year
        month = datetime.now().month
        count = await self.db.ticket_batches.count_documents({
            "batch_number": {"$regex": f"^BATCH-{year}{str(month).zfill(2)}-"}
        })
        return f"BATCH-{year}{str(month).zfill(2)}-{str(count + 1).zfill(4)}"
    
    async def create_batch(self, data: TicketBatchCreate, created_by: str) -> TicketBatch:
        """Create a new ticket batch and generate tickets"""
        batch_number = await self.generate_batch_number()
        total_tickets = data.end_number - data.start_number + 1
        total_value = total_tickets * data.unit_price
        
        status = TicketBatchStatus.CREATED
        if data.assigned_to:
            status = TicketBatchStatus.ASSIGNED
        
        batch = TicketBatch(
            id=str(uuid.uuid4()),
            batch_number=batch_number,
            revenue_point_id=data.revenue_point_id,
            revenue_item_id=data.revenue_item_id,
            start_number=data.start_number,
            end_number=data.end_number,
            unit_price=data.unit_price,
            validity_days=data.validity_days,
            status=status,
            assigned_to=data.assigned_to,
            total_tickets=total_tickets,
            tickets_sold=0,
            tickets_cancelled=0,
            total_value=total_value,
            amount_collected=0,
            created_at=datetime.now(timezone.utc),
            created_by=created_by,
        )
        
        batch_dict = batch.model_dump()
        batch_dict['created_at'] = batch_dict['created_at'].isoformat()
        await self.db.ticket_batches.insert_one(batch_dict)
        
        # Generate individual tickets
        tickets_to_insert = []
        for num in range(data.start_number, data.end_number + 1):
            ticket_number = f"{batch_number}-{str(num).zfill(6)}"
            ticket = Ticket(
                id=str(uuid.uuid4()),
                ticket_number=ticket_number,
                batch_id=batch.id,
                revenue_point_id=data.revenue_point_id,
                revenue_item_id=data.revenue_item_id,
                amount=data.unit_price,
                status=TicketStatus.AVAILABLE,
                created_at=datetime.now(timezone.utc),
            )
            ticket_dict = ticket.model_dump()
            ticket_dict['created_at'] = ticket_dict['created_at'].isoformat()
            tickets_to_insert.append(ticket_dict)
        
        if tickets_to_insert:
            await self.db.tickets.insert_many(tickets_to_insert)
        
        return batch
    
    async def assign_batch(self, batch_id: str, collector_id: str) -> Optional[TicketBatch]:
        """Assign a batch to a collector"""
        await self.db.ticket_batches.update_one(
            {"id": batch_id, "status": TicketBatchStatus.CREATED},
            {"$set": {
                "assigned_to": collector_id,
                "status": TicketBatchStatus.ASSIGNED
            }}
        )
        return await self.get_batch(batch_id)
    
    async def sell_ticket(self, data: TicketSellRequest, sold_by: str) -> Optional[Ticket]:
        """Sell a ticket"""
        ticket = await self.get_ticket(data.ticket_id)
        if not ticket or ticket.status != TicketStatus.AVAILABLE:
            return None
        
        # Get batch to check assignment and validity
        batch = await self.get_batch(ticket.batch_id)
        if not batch:
            return None
        
        # Verify seller is assigned to this batch
        if batch.assigned_to and batch.assigned_to != sold_by:
            raise ValueError("You are not assigned to this ticket batch")
        
        # Calculate validity
        valid_until = datetime.now(timezone.utc) + timedelta(days=batch.validity_days)
        
        # Update ticket
        await self.db.tickets.update_one(
            {"id": data.ticket_id},
            {"$set": {
                "status": TicketStatus.SOLD,
                "sold_at": datetime.now(timezone.utc).isoformat(),
                "sold_by": sold_by,
                "valid_until": valid_until.isoformat(),
            }}
        )
        
        # Create payment record
        payment = TicketPayment(
            id=str(uuid.uuid4()),
            ticket_id=data.ticket_id,
            amount=ticket.amount,
            payment_method=data.payment_method,
            payer_name=data.payer_name,
            payer_phone=data.payer_phone,
            collected_by=sold_by,
            created_at=datetime.now(timezone.utc),
        )
        payment_dict = payment.model_dump()
        payment_dict['created_at'] = payment_dict['created_at'].isoformat()
        await self.db.ticket_payments.insert_one(payment_dict)
        
        # Update batch counters
        await self.db.ticket_batches.update_one(
            {"id": ticket.batch_id},
            {"$inc": {"tickets_sold": 1, "amount_collected": ticket.amount}}
        )
        
        # Check if batch should be marked as in_use
        if batch.status == TicketBatchStatus.ASSIGNED:
            await self.db.ticket_batches.update_one(
                {"id": ticket.batch_id},
                {"$set": {"status": TicketBatchStatus.IN_USE}}
            )
        
        return await self.get_ticket(data.ticket_id)
    
    async def cancel_ticket(self, ticket_id: str, reason: str, cancelled_by: str) -> Optional[Ticket]:
        """Cancel a ticket"""
        ticket = await self.get_ticket(ticket_id)
        if not ticket or ticket.status != TicketStatus.AVAILABLE:
            return None
        
        await self.db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {
                "status": TicketStatus.CANCELLED,
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancelled_by": cancelled_by,
                "cancellation_reason": reason,
            }}
        )
        
        # Update batch counter
        await self.db.ticket_batches.update_one(
            {"id": ticket.batch_id},
            {"$inc": {"tickets_cancelled": 1}}
        )
        
        return await self.get_ticket(ticket_id)
    
    async def verify_ticket(self, ticket_number: str) -> dict:
        """Verify a ticket is valid"""
        ticket = await self.db.tickets.find_one({"ticket_number": ticket_number}, {"_id": 0})
        if not ticket:
            return {"valid": False, "reason": "Ticket not found"}
        
        if ticket['status'] == TicketStatus.AVAILABLE:
            return {"valid": False, "reason": "Ticket not sold"}
        
        if ticket['status'] == TicketStatus.CANCELLED:
            return {"valid": False, "reason": "Ticket has been cancelled"}
        
        if ticket['status'] == TicketStatus.EXPIRED:
            return {"valid": False, "reason": "Ticket has expired"}
        
        # Check validity period
        if ticket.get('valid_until'):
            valid_until = datetime.fromisoformat(ticket['valid_until'])
            if datetime.now(timezone.utc) > valid_until:
                await self.db.tickets.update_one(
                    {"id": ticket['id']},
                    {"$set": {"status": TicketStatus.EXPIRED}}
                )
                return {"valid": False, "reason": "Ticket has expired"}
        
        return {
            "valid": True,
            "ticket_number": ticket['ticket_number'],
            "amount": ticket['amount'],
            "sold_at": ticket.get('sold_at'),
            "valid_until": ticket.get('valid_until'),
        }
    
    async def get_batch(self, batch_id: str) -> Optional[TicketBatch]:
        """Get batch by ID"""
        doc = await self.db.ticket_batches.find_one({"id": batch_id}, {"_id": 0})
        if doc:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            return TicketBatch(**doc)
        return None
    
    async def get_ticket(self, ticket_id: str) -> Optional[Ticket]:
        """Get ticket by ID"""
        doc = await self.db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        if doc:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            return Ticket(**doc)
        return None
    
    async def list_batches(self, skip: int = 0, limit: int = 100,
                          status: TicketBatchStatus = None,
                          assigned_to: str = None) -> List[TicketBatch]:
        """List ticket batches"""
        query = {}
        if status:
            query["status"] = status
        if assigned_to:
            query["assigned_to"] = assigned_to
        
        cursor = self.db.ticket_batches.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
        batches = []
        async for doc in cursor:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            batches.append(TicketBatch(**doc))
        return batches
    
    async def list_tickets(self, batch_id: str = None, status: TicketStatus = None,
                          skip: int = 0, limit: int = 100) -> List[Ticket]:
        """List tickets"""
        query = {}
        if batch_id:
            query["batch_id"] = batch_id
        if status:
            query["status"] = status
        
        cursor = self.db.tickets.find(query, {"_id": 0}).skip(skip).limit(limit)
        tickets = []
        async for doc in cursor:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            tickets.append(Ticket(**doc))
        return tickets
    
    async def get_collector_tickets(self, collector_id: str, include_sold: bool = False) -> List[Ticket]:
        """Get tickets assigned to a collector"""
        # Get batches assigned to collector
        batch_ids = []
        async for batch in self.db.ticket_batches.find({"assigned_to": collector_id}, {"id": 1}):
            batch_ids.append(batch['id'])
        
        if not batch_ids:
            return []
        
        query = {"batch_id": {"$in": batch_ids}}
        if not include_sold:
            query["status"] = TicketStatus.AVAILABLE
        
        cursor = self.db.tickets.find(query, {"_id": 0})
        tickets = []
        async for doc in cursor:
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            tickets.append(Ticket(**doc))
        return tickets
    
    async def get_ticket_stats(self) -> dict:
        """Get ticket statistics"""
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_value": {"$sum": "$amount"}
            }}
        ]
        
        stats = {
            "total_tickets": 0,
            "total_value": 0,
            "by_status": {}
        }
        
        async for result in self.db.tickets.aggregate(pipeline):
            status = result['_id']
            stats['by_status'][status] = {
                "count": result['count'],
                "value": result['total_value']
            }
            stats['total_tickets'] += result['count']
            if status == TicketStatus.SOLD:
                stats['total_value'] += result['total_value']
        
        return stats
