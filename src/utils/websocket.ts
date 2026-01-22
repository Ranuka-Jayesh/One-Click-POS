// WebSocket utility for real-time table blocking
// Falls back to localStorage-based polling if WebSocket server is not available
import { socketService } from './socketService';

interface TableBlockMessage {
  type: 'table_blocked' | 'table_released' | 'table_status';
  tableId: number;
  tableLabel: string;
  timestamp: number;
  customerId?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<(data: TableBlockMessage | Record<string, unknown>) => void>> = new Map();
  private useLocalStorage = false;
  private pollingInterval: number | null = null;

  constructor() {
    // Disable automatic connection - using Socket.IO for real-time updates instead
    // This service now only handles table blocking via localStorage
    // If you need WebSocket connection, uncomment the line below and configure VITE_WS_URL
    // this.connect();
    this.fallbackToLocalStorage();
  }

  private connect() {
    // Try to connect to WebSocket server
    // In production, replace with your WebSocket server URL
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081';
    
    // Skip connection if no URL is configured
    if (!wsUrl || wsUrl === 'ws://localhost:8081') {
      this.fallbackToLocalStorage();
      return;
    }
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.useLocalStorage = false;
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TableBlockMessage = JSON.parse(event.data);
          this.notifyListeners(message.type, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Silently fall back to localStorage - no need to log errors
        this.fallbackToLocalStorage();
      };

      this.ws.onclose = () => {
        this.fallbackToLocalStorage();
        this.attemptReconnect();
      };
    } catch (error) {
      // Silently fall back to localStorage
      this.fallbackToLocalStorage();
    }
  }

  private fallbackToLocalStorage() {
    if (this.useLocalStorage) return;
    
    this.useLocalStorage = true;
    this.ws = null;
    
    // Start polling localStorage for changes
    this.pollingInterval = window.setInterval(() => {
      this.checkLocalStorageChanges();
    }, 1000); // Poll every second
  }

  private checkLocalStorageChanges() {
    try {
      const blockedTables = localStorage.getItem('blockedTables');
      if (blockedTables) {
        const tables = JSON.parse(blockedTables);
        const lastCheck = localStorage.getItem('lastBlockCheck') || '0';
        const currentTime = Date.now();
        
        // Check for new blocks
        Object.keys(tables).forEach((tableId) => {
          const table = tables[tableId];
          if (table.timestamp > parseInt(lastCheck)) {
            this.notifyListeners('table_blocked', {
              type: 'table_blocked',
              tableId: parseInt(tableId),
              tableLabel: table.label,
              timestamp: table.timestamp,
            });
          }
        });
        
        localStorage.setItem('lastBlockCheck', currentTime.toString());
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, using localStorage fallback');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  private notifyListeners(eventType: string, data: TableBlockMessage | Record<string, unknown>) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  public on(eventType: string, callback: (data: TableBlockMessage | Record<string, unknown>) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  public blockTable(tableId: number, tableLabel: string) {
    const message: TableBlockMessage = {
      type: 'table_blocked',
      tableId,
      tableLabel,
      timestamp: Date.now(),
    };

    console.log(`🔒 Blocking table ${tableId} (${tableLabel})`);

    // Use Socket.IO for real-time updates
    if (socketService.connected) {
      console.log('📡 Emitting table_blocked via Socket.IO');
      socketService.emit('table_blocked', message);
    } else {
      console.warn('⚠️ Socket.IO not connected, using localStorage only');
    }

    // Always update localStorage as fallback
    const blockedTables = JSON.parse(localStorage.getItem('blockedTables') || '{}');
    blockedTables[tableId] = {
      label: tableLabel,
      timestamp: Date.now(),
    };
    localStorage.setItem('blockedTables', JSON.stringify(blockedTables));
    
    // Notify local listeners
    this.notifyListeners('table_blocked', message);
  }

  public releaseTable(tableId: number) {
    const message: TableBlockMessage = {
      type: 'table_released',
      tableId,
      tableLabel: '',
      timestamp: Date.now(),
    };

    console.log(`🔓 Releasing table ${tableId}`);

    // Use Socket.IO for real-time updates
    if (socketService.connected) {
      console.log('📡 Emitting table_released via Socket.IO');
      socketService.emit('table_released', message);
    } else {
      console.warn('⚠️ Socket.IO not connected, using localStorage only');
    }

    // Always update localStorage as fallback
    const blockedTables = JSON.parse(localStorage.getItem('blockedTables') || '{}');
    delete blockedTables[tableId];
    localStorage.setItem('blockedTables', JSON.stringify(blockedTables));
    
    // Notify local listeners
    this.notifyListeners('table_released', message);
  }

  public getBlockedTables(): Record<number, { label: string; timestamp: number }> {
    if (this.useLocalStorage || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return JSON.parse(localStorage.getItem('blockedTables') || '{}');
    }
    return {};
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

