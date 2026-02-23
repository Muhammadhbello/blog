"""
Closing Service - Daily/Weekly revenue reconciliation
"""
from typing import Optional, List
from datetime import datetime, timezone, date
from app.database import db_manager
from app.models.tenant import Closing, ClosingCreate, ClosingStatus, ClosingType
import uuid

class ClosingService:
    def __init__(self, tenant_slug: str):
        self.tenant_slug = tenant_slug
        self.db = db_manager.get_tenant_db(tenant_slug)
    
    async def create_closing(self, data: ClosingCreate, collector_id: str) -> Closing:
        """Create a closing record"""
        # Calculate variance
        variance = data.actual_amount - data.expected_amount
        variance_percentage = 0
        if data.expected_amount > 0:
            variance_percentage = (variance / data.expected_amount) * 100
        
        closing = Closing(
            id=str(uuid.uuid4()),
            collector_id=collector_id,
            closing_type=data.closing_type,
            closing_date=data.closing_date,
            status=ClosingStatus.PENDING,
            expected_amount=data.expected_amount,
            actual_amount=data.actual_amount,
            variance=variance,
            variance_percentage=variance_percentage,
            ticket_count=len(data.ticket_ids),
            invoice_payment_count=len(data.invoice_payment_ids),
            ticket_ids=data.ticket_ids,
            invoice_payment_ids=data.invoice_payment_ids,
            notes=data.notes,
            created_at=datetime.now(timezone.utc),
        )
        
        closing_dict = closing.model_dump()
        closing_dict['created_at'] = closing_dict['created_at'].isoformat()
        closing_dict['closing_date'] = closing_dict['closing_date'].isoformat()
        await self.db.closings.insert_one(closing_dict)
        
        return closing
    
    async def submit_closing(self, closing_id: str) -> Optional[Closing]:
        """Submit a closing for approval"""
        await self.db.closings.update_one(
            {"id": closing_id, "status": ClosingStatus.PENDING},
            {"$set": {
                "status": ClosingStatus.SUBMITTED,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return await self.get_closing(closing_id)
    
    async def approve_closing(self, closing_id: str, approved_by: str) -> Optional[Closing]:
        """Approve a closing"""
        await self.db.closings.update_one(
            {"id": closing_id, "status": ClosingStatus.SUBMITTED},
            {"$set": {
                "status": ClosingStatus.APPROVED,
                "reviewed_by": approved_by,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return await self.get_closing(closing_id)
    
    async def reject_closing(self, closing_id: str, rejected_by: str, reason: str) -> Optional[Closing]:
        """Reject a closing"""
        await self.db.closings.update_one(
            {"id": closing_id, "status": ClosingStatus.SUBMITTED},
            {"$set": {
                "status": ClosingStatus.REJECTED,
                "reviewed_by": rejected_by,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "rejection_reason": reason,
            }}
        )
        return await self.get_closing(closing_id)
    
    async def get_closing(self, closing_id: str) -> Optional[Closing]:
        """Get closing by ID"""
        doc = await self.db.closings.find_one({"id": closing_id}, {"_id": 0})
        if doc:
            if isinstance(doc.get('closing_date'), str):
                doc['closing_date'] = date.fromisoformat(doc['closing_date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            return Closing(**doc)
        return None
    
    async def list_closings(self, skip: int = 0, limit: int = 100,
                           collector_id: str = None, status: ClosingStatus = None,
                           closing_type: ClosingType = None) -> List[Closing]:
        """List closings"""
        query = {}
        if collector_id:
            query["collector_id"] = collector_id
        if status:
            query["status"] = status
        if closing_type:
            query["closing_type"] = closing_type
        
        cursor = self.db.closings.find(query, {"_id": 0}).skip(skip).limit(limit).sort("closing_date", -1)
        closings = []
        async for doc in cursor:
            if isinstance(doc.get('closing_date'), str):
                doc['closing_date'] = date.fromisoformat(doc['closing_date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            closings.append(Closing(**doc))
        return closings
    
    async def get_pending_closings(self) -> List[Closing]:
        """Get closings pending approval"""
        return await self.list_closings(status=ClosingStatus.SUBMITTED)
    
    async def get_flagged_closings(self, variance_threshold: float = 5.0) -> List[Closing]:
        """Get closings with variance exceeding threshold"""
        cursor = self.db.closings.find({
            "$or": [
                {"variance_percentage": {"$gt": variance_threshold}},
                {"variance_percentage": {"$lt": -variance_threshold}}
            ]
        }, {"_id": 0})
        
        closings = []
        async for doc in cursor:
            if isinstance(doc.get('closing_date'), str):
                doc['closing_date'] = date.fromisoformat(doc['closing_date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            closings.append(Closing(**doc))
        return closings
    
    async def get_collector_summary(self, collector_id: str, start_date: date, end_date: date) -> dict:
        """Get summary of collector's closings for a period"""
        cursor = self.db.closings.find({
            "collector_id": collector_id,
            "closing_date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }, {"_id": 0})
        
        summary = {
            "total_closings": 0,
            "approved": 0,
            "rejected": 0,
            "pending": 0,
            "total_expected": 0,
            "total_actual": 0,
            "total_variance": 0,
        }
        
        async for doc in cursor:
            summary["total_closings"] += 1
            summary["total_expected"] += doc.get("expected_amount", 0)
            summary["total_actual"] += doc.get("actual_amount", 0)
            summary["total_variance"] += doc.get("variance", 0)
            
            status = doc.get("status")
            if status == ClosingStatus.APPROVED:
                summary["approved"] += 1
            elif status == ClosingStatus.REJECTED:
                summary["rejected"] += 1
            else:
                summary["pending"] += 1
        
        return summary
    
    async def get_closing_stats(self) -> dict:
        """Get overall closing statistics"""
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "expected": {"$sum": "$expected_amount"},
                "actual": {"$sum": "$actual_amount"},
                "variance": {"$sum": "$variance"}
            }}
        ]
        
        stats = {
            "total_closings": 0,
            "total_expected": 0,
            "total_actual": 0,
            "total_variance": 0,
            "by_status": {}
        }
        
        async for result in self.db.closings.aggregate(pipeline):
            status = result['_id']
            stats['by_status'][status] = {
                "count": result['count'],
                "expected": result['expected'],
                "actual": result['actual'],
                "variance": result['variance']
            }
            stats['total_closings'] += result['count']
            stats['total_expected'] += result['expected']
            stats['total_actual'] += result['actual']
            stats['total_variance'] += result['variance']
        
        return stats
