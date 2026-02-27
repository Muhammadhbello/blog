'use client';

/**
 * IndexedDB Service for Offline-First Ticketing
 * Handles local storage of tickets, sync queue, and offline sales
 */

const DB_NAME = 'FlexCloudOffline';
const DB_VERSION = 1;

interface OfflineTicket {
  id: number;
  ticket_number: string;
  batch_id: number;
  batch_number: string;
  revenue_point: string;
  revenue_item: string;
  unit_price: number;
  validity_days: number;
  status: 'available' | 'sold' | 'synced';
  downloaded_at: string;
}

interface PendingSale {
  id?: number;
  offline_reference: string;
  ticket_id: number;
  ticket_number: string;
  amount: number;
  payment_method: string;
  payer_name: string;
  payer_phone: string;
  sold_at: string;
  synced: boolean;
  sync_attempts: number;
  last_sync_error?: string;
}

interface SyncLog {
  id?: number;
  type: 'download' | 'upload';
  entity_type: string;
  entity_count: number;
  status: 'success' | 'failed' | 'partial';
  message?: string;
  timestamp: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Offline Tickets Store
        if (!db.objectStoreNames.contains('tickets')) {
          const ticketStore = db.createObjectStore('tickets', { keyPath: 'id' });
          ticketStore.createIndex('batch_id', 'batch_id', { unique: false });
          ticketStore.createIndex('status', 'status', { unique: false });
          ticketStore.createIndex('ticket_number', 'ticket_number', { unique: true });
        }

        // Pending Sales Queue
        if (!db.objectStoreNames.contains('pending_sales')) {
          const salesStore = db.createObjectStore('pending_sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('offline_reference', 'offline_reference', { unique: true });
          salesStore.createIndex('synced', 'synced', { unique: false });
          salesStore.createIndex('ticket_id', 'ticket_id', { unique: false });
        }

        // Sync Logs
        if (!db.objectStoreNames.contains('sync_logs')) {
          const logStore = db.createObjectStore('sync_logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('type', 'type', { unique: false });
        }

        // Device Info
        if (!db.objectStoreNames.contains('device_info')) {
          db.createObjectStore('device_info', { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  // ==================== TICKETS ====================

  async saveTickets(tickets: OfflineTicket[]): Promise<void> {
    const db = await this.init();
    const tx = db.transaction('tickets', 'readwrite');
    const store = tx.objectStore('tickets');

    for (const ticket of tickets) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          ...ticket,
          status: 'available',
          downloaded_at: new Date().toISOString(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Log the download
    await this.addSyncLog({
      type: 'download',
      entity_type: 'tickets',
      entity_count: tickets.length,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
  }

  async getAvailableTickets(): Promise<OfflineTicket[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tickets', 'readonly');
      const store = tx.objectStore('tickets');
      const index = store.index('status');
      const request = index.getAll('available');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketsByBatch(batchId: number): Promise<OfflineTicket[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tickets', 'readonly');
      const store = tx.objectStore('tickets');
      const index = store.index('batch_id');
      const request = index.getAll(batchId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketByNumber(ticketNumber: string): Promise<OfflineTicket | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tickets', 'readonly');
      const store = tx.objectStore('tickets');
      const index = store.index('ticket_number');
      const request = index.get(ticketNumber);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async markTicketAsSold(ticketId: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tickets', 'readwrite');
      const store = tx.objectStore('tickets');
      const getRequest = store.get(ticketId);

      getRequest.onsuccess = () => {
        const ticket = getRequest.result;
        if (ticket) {
          ticket.status = 'sold';
          const putRequest = store.put(ticket);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Ticket not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncedTickets(): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tickets', 'readwrite');
      const store = tx.objectStore('tickets');
      const index = store.index('status');
      const request = index.openCursor('synced');
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== PENDING SALES ====================

  async addPendingSale(sale: Omit<PendingSale, 'id'>): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_sales', 'readwrite');
      const store = tx.objectStore('pending_sales');
      const request = store.add({
        ...sale,
        synced: false,
        sync_attempts: 0,
      });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSales(): Promise<PendingSale[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_sales', 'readonly');
      const store = tx.objectStore('pending_sales');
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSalesCount(): Promise<number> {
    const sales = await this.getPendingSales();
    return sales.length;
  }

  async markSaleAsSynced(offlineReference: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pending_sales', 'tickets'], 'readwrite');
      const salesStore = tx.objectStore('pending_sales');
      const ticketsStore = tx.objectStore('tickets');

      const index = salesStore.index('offline_reference');
      const request = index.get(offlineReference);

      request.onsuccess = () => {
        const sale = request.result;
        if (sale) {
          // Mark sale as synced
          sale.synced = true;
          salesStore.put(sale);

          // Mark ticket as synced
          const ticketRequest = ticketsStore.get(sale.ticket_id);
          ticketRequest.onsuccess = () => {
            const ticket = ticketRequest.result;
            if (ticket) {
              ticket.status = 'synced';
              ticketsStore.put(ticket);
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async incrementSyncAttempt(offlineReference: string, error?: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_sales', 'readwrite');
      const store = tx.objectStore('pending_sales');
      const index = store.index('offline_reference');
      const request = index.get(offlineReference);

      request.onsuccess = () => {
        const sale = request.result;
        if (sale) {
          sale.sync_attempts++;
          sale.last_sync_error = error;
          store.put(sale);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deletePendingSale(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_sales', 'readwrite');
      const store = tx.objectStore('pending_sales');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncedSales(): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_sales', 'readwrite');
      const store = tx.objectStore('pending_sales');
      const index = store.index('synced');
      const request = index.openCursor(true);
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== SYNC LOGS ====================

  async addSyncLog(log: Omit<SyncLog, 'id'>): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_logs', 'readwrite');
      const store = tx.objectStore('sync_logs');
      const request = store.add(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncLogs(limit = 50): Promise<SyncLog[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_logs', 'readonly');
      const store = tx.objectStore('sync_logs');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const logs: SyncLog[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && logs.length < limit) {
          logs.push(cursor.value);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(logs);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== DEVICE INFO ====================

  async saveDeviceInfo(key: string, value: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('device_info', 'readwrite');
      const store = tx.objectStore('device_info');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDeviceInfo(key: string): Promise<any> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('device_info', 'readonly');
      const store = tx.objectStore('device_info');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== STATS ====================

  async getStats(): Promise<{
    availableTickets: number;
    soldTickets: number;
    syncedTickets: number;
    pendingSales: number;
    totalOfflineRevenue: number;
  }> {
    const db = await this.init();
    
    const tickets = await new Promise<OfflineTicket[]>((resolve, reject) => {
      const tx = db.transaction('tickets', 'readonly');
      const request = tx.objectStore('tickets').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const sales = await this.getPendingSales();
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);

    return {
      availableTickets: tickets.filter(t => t.status === 'available').length,
      soldTickets: tickets.filter(t => t.status === 'sold').length,
      syncedTickets: tickets.filter(t => t.status === 'synced').length,
      pendingSales: sales.length,
      totalOfflineRevenue: totalRevenue,
    };
  }

  // ==================== CLEAR ALL ====================

  async clearAll(): Promise<void> {
    const db = await this.init();
    const stores = ['tickets', 'pending_sales', 'sync_logs'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();

// Hook for using offline DB
export function useOfflineDB() {
  return offlineDB;
}

export type { OfflineTicket, PendingSale, SyncLog };
