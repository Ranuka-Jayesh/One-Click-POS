import { Server as SocketIOServer } from 'socket.io';
let io = null;
export function initializeWebSocket(server) {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
        // Join room for table updates
        socket.on('subscribe:tables', () => {
            socket.join('tables');
            console.log(`📢 Client ${socket.id} subscribed to table updates`);
        });
        socket.on('unsubscribe:tables', () => {
            socket.leave('tables');
            console.log(`📢 Client ${socket.id} unsubscribed from table updates`);
        });
        // Join room for menu item updates
        socket.on('subscribe:menu-items', () => {
            socket.join('menu-items');
            console.log(`📢 Client ${socket.id} subscribed to menu item updates`);
        });
        socket.on('unsubscribe:menu-items', () => {
            socket.leave('menu-items');
            console.log(`📢 Client ${socket.id} unsubscribed from menu item updates`);
        });
        // Join room for order updates (kitchen display)
        socket.on('subscribe:orders', () => {
            socket.join('orders');
            console.log(`📢 Client ${socket.id} subscribed to order updates`);
        });
        socket.on('unsubscribe:orders', () => {
            socket.leave('orders');
            console.log(`📢 Client ${socket.id} unsubscribed from order updates`);
        });
        // Handle table blocking/releasing events from clients
        socket.on('table_blocked', (message) => {
            console.log(`📢 Table blocked: ${message.tableId} (${message.tableLabel})`);
            // Broadcast to all clients in tables room
            if (io) {
                io.to('tables').emit('table_blocked', message);
            }
        });
        socket.on('table_released', (message) => {
            console.log(`📢 Table released: ${message.tableId}`);
            // Broadcast to all clients in tables room
            if (io) {
                io.to('tables').emit('table_released', message);
            }
        });
        // Handle bell requests from customers
        socket.on('bell_request', (message) => {
            console.log(`🔔 Bell request from table ${message.tableId} (${message.tableLabel})`);
            // Broadcast to all clients in tables room (cashier dashboard)
            if (io) {
                io.to('tables').emit('bell_request', message);
            }
        });
        // Handle bill requests from customers
        socket.on('bill_request', (message) => {
            console.log(`🧾 Bill request from table ${message.tableId} (${message.tableLabel})`);
            // Broadcast to all clients in tables room (cashier dashboard)
            if (io) {
                io.to('tables').emit('bill_request', message);
            }
        });
    });
    return io;
}
export function emitTableUpdate(message) {
    if (io) {
        io.to('tables').emit('table_update', message);
        console.log(`📢 Emitted table update: ${message.type}`, message.tableId || message.table?._id);
    }
    else {
        console.warn('⚠️ WebSocket server not initialized, cannot emit table update');
    }
}
export function emitMenuItemUpdate(message) {
    if (io) {
        io.to('menu-items').emit('menu_item_update', message);
        console.log(`📢 Emitted menu item update: ${message.type}`, message.menuItemId || message.menuItem?._id);
    }
    else {
        console.warn('⚠️ WebSocket server not initialized, cannot emit menu item update');
    }
}
export function emitOrderUpdate(message) {
    if (io) {
        io.to('orders').emit('order_update', message);
        console.log(`📢 Emitted order update: ${message.type}`, message.orderId || message.order?._id);
    }
    else {
        console.warn('⚠️ WebSocket server not initialized, cannot emit order update');
    }
}
export function emitTableBlock(message) {
    if (io) {
        io.to('tables').emit('table_blocked', message);
        console.log(`📢 Emitted table block: ${message.tableId} (${message.tableLabel})`);
    }
    else {
        console.warn('⚠️ WebSocket server not initialized, cannot emit table block');
    }
}
export function emitTableRelease(message) {
    if (io) {
        io.to('tables').emit('table_released', message);
        console.log(`📢 Emitted table release: ${message.tableId}`);
    }
    else {
        console.warn('⚠️ WebSocket server not initialized, cannot emit table release');
    }
}
export function getIO() {
    return io;
}
//# sourceMappingURL=websocket.js.map