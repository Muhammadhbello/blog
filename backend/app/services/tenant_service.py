"""
Tenant Service - Manages tenant lifecycle
"""
from typing import Optional, List
from datetime import datetime, timezone
from app.database import db_manager
from app.models.platform import Tenant, TenantCreate, TenantUpdate, TenantStatus, PlatformAuditLog
from app.models.tenant import TenantUser, TenantUserRole
from app.services.auth_service import hash_password
import uuid

class TenantService:
    def __init__(self):
        self.platform_db = db_manager.get_platform_db()
    
    async def create_tenant(self, data: TenantCreate, created_by: str) -> Tenant:
        """Create a new tenant with its database and initial admin user"""
        # Check if slug already exists
        existing = await self.platform_db.tenants.find_one({"slug": data.slug})
        if existing:
            raise ValueError(f"Tenant with slug '{data.slug}' already exists")
        
        # Create tenant record
        db_name = f"flexcloud_tenant_{data.slug}"
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=data.name,
            slug=data.slug,
            db_name=db_name,
            domain=data.domain,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            address=data.address,
            state=data.state,
            country=data.country,
            status=TenantStatus.ACTIVE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        
        # Save to platform database
        tenant_dict = tenant.model_dump()
        tenant_dict['created_at'] = tenant_dict['created_at'].isoformat()
        tenant_dict['updated_at'] = tenant_dict['updated_at'].isoformat()
        await self.platform_db.tenants.insert_one(tenant_dict)
        
        # Create tenant database and collections
        tenant_db = await db_manager.create_tenant_database(data.slug)
        
        # Create initial admin user for the tenant
        admin_user = TenantUser(
            id=str(uuid.uuid4()),
            email=data.admin_email,
            name=data.admin_name,
            hashed_password=hash_password(data.admin_password),
            role=TenantUserRole.CHAIRMAN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        admin_dict = admin_user.model_dump()
        admin_dict['created_at'] = admin_dict['created_at'].isoformat()
        await tenant_db.users.insert_one(admin_dict)
        
        # Create default roles
        default_roles = [
            {"name": "chairman", "permissions": ["*"], "is_system": True},
            {"name": "treasurer", "permissions": ["invoices.*", "payments.*", "closings.*", "reports.*"], "is_system": True},
            {"name": "hod", "permissions": ["department.*"], "is_system": True},
            {"name": "collector", "permissions": ["tickets.sell", "closings.submit"], "is_system": True},
            {"name": "consultant_admin", "permissions": ["consultants.*"], "is_system": True},
            {"name": "auditor", "permissions": ["*.read"], "is_system": True},
        ]
        for role in default_roles:
            role['id'] = str(uuid.uuid4())
            role['created_at'] = datetime.now(timezone.utc).isoformat()
            await tenant_db.roles.insert_one(role)
        
        # Log the action
        await self.log_audit(
            user_id=created_by,
            user_email="system",
            action="tenant_created",
            resource_type="tenant",
            resource_id=tenant.id,
            details={"tenant_name": data.name, "slug": data.slug}
        )
        
        return tenant
    
    async def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID"""
        doc = await self.platform_db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        if doc:
            return Tenant(**doc)
        return None
    
    async def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        doc = await self.platform_db.tenants.find_one({"slug": slug}, {"_id": 0})
        if doc:
            return Tenant(**doc)
        return None
    
    async def list_tenants(self, skip: int = 0, limit: int = 100, status: Optional[TenantStatus] = None) -> List[Tenant]:
        """List all tenants"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = self.platform_db.tenants.find(query, {"_id": 0}).skip(skip).limit(limit)
        tenants = []
        async for doc in cursor:
            tenants.append(Tenant(**doc))
        return tenants
    
    async def update_tenant(self, tenant_id: str, data: TenantUpdate) -> Optional[Tenant]:
        """Update tenant details"""
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_data:
            return await self.get_tenant(tenant_id)
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.platform_db.tenants.update_one(
            {"id": tenant_id},
            {"$set": update_data}
        )
        return await self.get_tenant(tenant_id)
    
    async def suspend_tenant(self, tenant_id: str, suspended_by: str) -> Optional[Tenant]:
        """Suspend a tenant"""
        await self.platform_db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {
                "status": TenantStatus.SUSPENDED,
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        tenant = await self.get_tenant(tenant_id)
        if tenant:
            await self.log_audit(
                user_id=suspended_by,
                user_email="system",
                action="tenant_suspended",
                resource_type="tenant",
                resource_id=tenant_id,
                details={"tenant_name": tenant.name}
            )
        return tenant
    
    async def activate_tenant(self, tenant_id: str, activated_by: str) -> Optional[Tenant]:
        """Activate a suspended tenant"""
        await self.platform_db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {
                "status": TenantStatus.ACTIVE,
                "suspended_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        tenant = await self.get_tenant(tenant_id)
        if tenant:
            await self.log_audit(
                user_id=activated_by,
                user_email="system",
                action="tenant_activated",
                resource_type="tenant",
                resource_id=tenant_id,
                details={"tenant_name": tenant.name}
            )
        return tenant
    
    async def delete_tenant(self, tenant_id: str, deleted_by: str) -> bool:
        """Delete a tenant and its database"""
        tenant = await self.get_tenant(tenant_id)
        if not tenant:
            return False
        
        # Delete tenant database
        await db_manager.delete_tenant_database(tenant.slug)
        
        # Delete tenant record
        await self.platform_db.tenants.delete_one({"id": tenant_id})
        
        await self.log_audit(
            user_id=deleted_by,
            user_email="system",
            action="tenant_deleted",
            resource_type="tenant",
            resource_id=tenant_id,
            details={"tenant_name": tenant.name}
        )
        
        return True
    
    async def get_tenant_stats(self) -> dict:
        """Get platform-level statistics"""
        total = await self.platform_db.tenants.count_documents({})
        active = await self.platform_db.tenants.count_documents({"status": TenantStatus.ACTIVE})
        suspended = await self.platform_db.tenants.count_documents({"status": TenantStatus.SUSPENDED})
        
        return {
            "total_tenants": total,
            "active_tenants": active,
            "suspended_tenants": suspended,
        }
    
    async def log_audit(self, user_id: str, user_email: str, action: str, 
                       resource_type: str, resource_id: str = None, 
                       details: dict = None, ip_address: str = None):
        """Log platform audit action"""
        log = PlatformAuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        log_dict = log.model_dump()
        log_dict['created_at'] = log_dict['created_at'].isoformat()
        await self.platform_db.audit_logs.insert_one(log_dict)

tenant_service = TenantService()
