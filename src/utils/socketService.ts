import { io, Socket } from 'socket.io-client';

export interface TableUpdateMessage {
  type: 'table_created' | 'table_updated' | 'table_deleted' | 'table_availability_changed';
  table?: {
    id: string | number;
    _id?: string;
    tableNumber?: number;
    label: string;
    capacity: number;
    available: boolean;
  };
  tableId?: string | number;
  timestamp: number;
}

export interface MenuItemUpdateMessage {
  type: 'menu_item_created' | 'menu_item_updated' | 'menu_item_deleted';
  menuItem?: {
    id: string;
    _id?: string;
    name: string;
    category: string;
    price?: number;
    image?: string;
  };
  timestamp: number;
}

export interface OrderUpdateMessage {
  type: 'order_created' | 'order_updated' | 'order_status_changed';
  order?: {
    id: string;
    orderId?: string;
    _id?: string;
    customerName: string;
    status: string;
    orderType?: string;
    tableNumber?: number;
    items: Array<{
      menuItem: {
        id: string;
        _id?: string;
        name: string;
        price: number;
        category: string;
        image?: string;
      };
      quantity: number;
    }>;
    total: number;
    createdAt: Date | string;
    isPaid: boolean;
    isSettled: boolean;
  };
  orderId?: string;
  status?: string;
  timestamp: number;
}

export interface BellRequestMessage {
  tableId: number;
  tableLabel: string;
  timestamp: number;
}

export interface BillRequestMessage {
  tableId: number;
  tableLabel: string;
  timestamp: number;
}

export interface TableBlockMessage {
  tableId: number;
  tableLabel: string;
  timestamp: number;
  customerId?: string;
}

export type SocketMessage = 
  | TableUpdateMessage 
  | MenuItemUpdateMessage 
  | OrderUpdateMessage 
  | BellRequestMessage 
  | BillRequestMessage 
  | TableBlockMessage 
  | { connected: boolean };

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: SocketMessage) => void>> = new Map();
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    // Use VITE_SERVER_URL if set, otherwise use relative URL for production or localhost for dev
    const envUrl = import.meta.env.VITE_SERVER_URL;
    const serverUrl = envUrl && envUrl.trim() !== '' 
      ? envUrl 
      : (import.meta.env.PROD ? undefined : 'http://localhost:3000');
    
    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', this.socket?.id);
        this.isConnected = true;
        
        // Subscribe to table updates
        this.socket?.emit('subscribe:tables');
        console.log('📢 Subscribed to tables room');
        
        // Subscribe to menu item updates
        this.socket?.emit('subscribe:menu-items');

        // Subscribe to order updates (kitchen display)
        this.socket?.emit('subscribe:orders');

        // Notify listeners that connection is established
        this.notifyListeners('connect', { connected: true });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.warn('⚠️ Socket.IO connection error:', error);
      });

      // Listen for table updates
      this.socket.on('table_update', (message: TableUpdateMessage) => {
        console.log('📢 Received table update:', message.type);
        this.notifyListeners('table_update', message);
      });

      // Listen for menu item updates
      this.socket.on('menu_item_update', (message: MenuItemUpdateMessage) => {
        console.log('📢 Received menu item update:', message.type);
        this.notifyListeners('menu_item_update', message);
      });

      // Listen for order updates
      this.socket.on('order_update', (message: OrderUpdateMessage) => {
        console.log('📢 Received order update:', message.type);
        this.notifyListeners('order_update', message);
      });

      // Listen for bell requests
      this.socket.on('bell_request', (message: BellRequestMessage) => {
        console.log('🔔 Received bell request:', message);
        this.notifyListeners('bell_request', message);
      });

      // Listen for bill requests
      this.socket.on('bill_request', (message: BillRequestMessage) => {
        console.log('🧾 Received bill request:', message);
        this.notifyListeners('bill_request', message);
      });

      // Listen for table blocking/releasing events
      this.socket.on('table_blocked', (message: TableBlockMessage) => {
        console.log('📢 Socket.IO: Received table_blocked event:', message);
        this.notifyListeners('table_blocked', message);
      });

      this.socket.on('table_released', (message: TableBlockMessage) => {
        console.log('📢 Socket.IO: Received table_released event:', message);
        this.notifyListeners('table_released', message);
      });
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
    }
  }

  private notifyListeners(eventType: string, data: SocketMessage) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  public on(eventType: string, callback: (data: SocketMessage) => void) {
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

  public off(eventType: string, callback: (data: SocketMessage) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.emit('unsubscribe:tables');
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.isConnected = false;
  }

  public emit(eventType: string, data: SocketMessage | Record<string, unknown>) {
    if (this.socket && this.isConnected) {
      this.socket.emit(eventType, data);
    } else {
      console.warn(`⚠️ Cannot emit ${eventType}: Socket not connected`);
    }
  }

  public get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// Export singleton instance
export const socketService = new SocketService();
