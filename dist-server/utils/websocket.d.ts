import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
export interface TableBlockMessage {
    type: 'table_blocked' | 'table_released';
    tableId: number;
    tableLabel: string;
    timestamp: number;
}
export interface MenuItemUpdateMessage {
    type: 'menu_item_created' | 'menu_item_updated' | 'menu_item_deleted' | 'menu_item_availability_changed';
    menuItem?: {
        id: string;
        _id?: string;
        name: string;
        category: string;
    };
    menuItemId?: string;
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
        cashierId?: string | null;
        cashierName?: string | null;
    };
    orderId?: string;
    status?: string;
    timestamp: number;
}
export declare function initializeWebSocket(server: HTTPServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function emitTableUpdate(message: TableUpdateMessage): void;
export declare function emitMenuItemUpdate(message: MenuItemUpdateMessage): void;
export declare function emitOrderUpdate(message: OrderUpdateMessage): void;
export declare function emitTableBlock(message: TableBlockMessage): void;
export declare function emitTableRelease(message: TableBlockMessage): void;
export declare function getIO(): SocketIOServer | null;
//# sourceMappingURL=websocket.d.ts.map