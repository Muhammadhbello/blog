"""
Multi-Tenant Database Management
Handles dynamic database connections for platform and tenant databases
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Optional
import os

class DatabaseManager:
    _instance: Optional['DatabaseManager'] = None
    _client: Optional[AsyncIOMotorClient] = None
    _tenant_connections: Dict[str, any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @property
    def client(self) -> AsyncIOMotorClient:
        if self._client is None:
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            self._client = AsyncIOMotorClient(mongo_url)
        return self._client
    
    def get_platform_db(self):
        """Get the platform database for managing tenants"""
        return self.client['flexcloud_platform']
    
    def get_tenant_db(self, tenant_slug: str):
        """Get a tenant-specific database"""
        db_name = f"flexcloud_tenant_{tenant_slug}"
        if tenant_slug not in self._tenant_connections:
            self._tenant_connections[tenant_slug] = self.client[db_name]
        return self._tenant_connections[tenant_slug]
    
    async def create_tenant_database(self, tenant_slug: str):
        """Create and initialize a new tenant database with required collections"""
        db = self.get_tenant_db(tenant_slug)
        
        # Create collections with indexes
        collections_config = {
            'users': [
                ('email', {'unique': True}),
                ('role', {}),
            ],
            'wards': [
                ('name', {}),
                ('code', {'unique': True}),
            ],
            'departments': [
                ('name', {}),
                ('code', {'unique': True}),
            ],
            'revenue_categories': [
                ('name', {}),
            ],
            'revenue_items': [
                ('name', {}),
                ('category_id', {}),
            ],
            'revenue_points': [
                ('name', {}),
                ('code', {'unique': True}),
            ],
            'businesses': [
                ('business_name', {}),
                ('registration_number', {'unique': True}),
                ('ward_id', {}),
            ],
            'consultants': [
                ('name', {}),
                ('email', {'unique': True}),
            ],
            'consultant_assignments': [
                ('consultant_id', {}),
                ('revenue_point_id', {}),
            ],
            'invoices': [
                ('invoice_number', {'unique': True}),
                ('business_id', {}),
                ('status', {}),
                ('due_date', {}),
            ],
            'invoice_items': [
                ('invoice_id', {}),
            ],
            'invoice_payments': [
                ('invoice_id', {}),
                ('reference', {'unique': True}),
            ],
            'ticket_batches': [
                ('batch_number', {'unique': True}),
                ('status', {}),
            ],
            'tickets': [
                ('ticket_number', {'unique': True}),
                ('batch_id', {}),
                ('status', {}),
            ],
            'ticket_payments': [
                ('ticket_id', {}),
            ],
            'closings': [
                ('collector_id', {}),
                ('closing_date', {}),
                ('status', {}),
            ],
            'defaulters': [
                ('business_id', {}),
                ('invoice_id', {}),
            ],
            'payment_settings': [],
            'sms_settings': [],
            'notification_templates': [
                ('type', {}),
            ],
            'tenant_settings': [],
            'audit_logs': [
                ('user_id', {}),
                ('action', {}),
                ('created_at', {}),
            ],
            'roles': [
                ('name', {'unique': True}),
            ],
        }
        
        for collection_name, indexes in collections_config.items():
            collection = db[collection_name]
            # Ensure collection exists by inserting and deleting a temp doc
            try:
                await collection.insert_one({'_temp': True})
                await collection.delete_one({'_temp': True})
            except:
                pass
            
            # Create indexes
            for index_field, index_options in indexes:
                try:
                    await collection.create_index(index_field, **index_options)
                except Exception as e:
                    print(f"Index creation note for {collection_name}.{index_field}: {e}")
        
        return db
    
    async def delete_tenant_database(self, tenant_slug: str):
        """Delete a tenant database"""
        db_name = f"flexcloud_tenant_{tenant_slug}"
        await self.client.drop_database(db_name)
        if tenant_slug in self._tenant_connections:
            del self._tenant_connections[tenant_slug]
    
    async def close(self):
        """Close all database connections"""
        if self._client:
            self._client.close()
            self._client = None
        self._tenant_connections.clear()

# Singleton instance
db_manager = DatabaseManager()
