import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import { logAdminActivity } from '../utils/adminLogs.js';
import { emitOrderUpdate } from '../utils/websocket.js';
const router = express.Router();
// Helper function to get admin/cashier username from request
function getUsername(req) {
    const username = req.headers['x-admin-username'] ||
        req.headers['x-cashier-username'];
    if (username) {
        return username;
    }
    if (req.body && req.body.username) {
        return req.body.username;
    }
    return 'Cashier';
}
// Get all orders
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        const { status, isPaid, isSettled, orderType, tableNumber } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (isPaid !== undefined)
            filter.isPaid = isPaid === 'true';
        if (isSettled !== undefined)
            filter.isSettled = isSettled === 'true';
        if (orderType)
            filter.orderType = orderType;
        if (tableNumber)
            filter.tableNumber = parseInt(tableNumber);
        const orders = await ordersCollection
            .find(filter)
            .sort({ createdAt: -1 })
            .toArray();
        // Transform to match frontend format
        const ordersWithId = orders.map((order) => ({
            id: order.orderId || order._id.toString(),
            orderId: order.orderId || order._id.toString(),
            _id: order._id.toString(),
            customerName: order.customerName,
            items: order.items,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            isPaid: order.isPaid || false,
            isSettled: order.isSettled || false,
            paymentMethod: order.paymentMethod,
            orderType: order.orderType || 'dining', // 'takeaway' or 'dining'
            tableNumber: order.tableNumber,
            completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
            cashierId: order.cashierId,
            cashierName: order.cashierName,
            refundStatus: order.refundStatus || false,
        }));
        res.json({
            success: true,
            orders: ordersWithId
        });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get single order by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        const orderResponse = {
            id: order.orderId || order._id.toString(),
            orderId: order.orderId || order._id.toString(),
            _id: order._id.toString(),
            customerName: order.customerName,
            items: order.items,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            isPaid: order.isPaid || false,
            isSettled: order.isSettled || false,
            paymentMethod: order.paymentMethod,
            orderType: order.orderType || 'dining',
            tableNumber: order.tableNumber,
            completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
            cashierId: order.cashierId,
            cashierName: order.cashierName,
            refundStatus: order.refundStatus || false,
        };
        res.json({
            success: true,
            order: orderResponse
        });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Create new order
router.post('/', async (req, res) => {
    try {
        const { customerName, items, total, orderType, tableNumber, isPaid, paymentMethod, cashierId, cashierName } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order must contain at least one item'
            });
        }
        if (!total || total < 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid total amount is required'
            });
        }
        if (!orderType || !['takeaway', 'dining'].includes(orderType)) {
            return res.status(400).json({
                success: false,
                error: 'Order type must be either "takeaway" or "dining"'
            });
        }
        // For dining orders, tableNumber is required
        if (orderType === 'dining' && !tableNumber) {
            return res.status(400).json({
                success: false,
                error: 'Table number is required for dining orders'
            });
        }
        // For takeaway orders, payment must be completed
        if (orderType === 'takeaway' && !isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Takeaway orders must be paid at placement'
            });
        }
        if (orderType === 'takeaway' && !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Payment method is required for takeaway orders'
            });
        }
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Generate order ID
        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
        // Determine settlement status
        // All orders (both takeaway and dining) are not settled until cashier explicitly settles them
        // Even though takeaway orders are paid at placement, they still need to be settled by cashier
        const isSettled = false;
        // Create new order
        const newOrder = {
            orderId,
            customerName: customerName || (orderType === 'takeaway' ? `Takeaway #${orderId.slice(-4)}` : `Table ${tableNumber}`),
            items: items.map((item) => ({
                menuItem: {
                    id: item.menuItem.id || item.menuItem._id || '',
                    _id: item.menuItem._id || item.menuItem.id || '',
                    name: item.menuItem.name,
                    description: item.menuItem.description,
                    price: item.menuItem.price,
                    category: item.menuItem.category,
                    image: item.menuItem.image,
                },
                quantity: item.quantity,
            })),
            status: 'new',
            total: total,
            orderType: orderType,
            tableNumber: orderType === 'dining' ? tableNumber : undefined,
            isPaid: orderType === 'takeaway' ? true : (isPaid || false),
            isSettled: isSettled,
            paymentMethod: orderType === 'takeaway' ? paymentMethod : undefined,
            cashierId: cashierId || null,
            cashierName: cashierName || getUsername(req),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await ordersCollection.insertOne(newOrder);
        // Log activity
        await logAdminActivity(db, 'Order', 'Created', getUsername(req), `New ${orderType} order created: ${newOrder.customerName} (Total: Rs. ${total.toFixed(2)})`, 'success');
        const createdOrder = {
            ...newOrder,
            id: orderId,
            _id: result.insertedId.toString(),
        };
        // Emit WebSocket event for new order (kitchen display)
        emitOrderUpdate({
            type: 'order_created',
            order: {
                id: createdOrder.id,
                orderId: createdOrder.orderId,
                _id: createdOrder._id,
                customerName: createdOrder.customerName,
                status: createdOrder.status,
                orderType: createdOrder.orderType,
                tableNumber: createdOrder.tableNumber,
                items: createdOrder.items,
                total: createdOrder.total,
                createdAt: createdOrder.createdAt,
                isPaid: createdOrder.isPaid,
                isSettled: createdOrder.isSettled,
                cashierId: createdOrder.cashierId || null,
                cashierName: createdOrder.cashierName || null,
            },
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: `${orderType === 'takeaway' ? 'Takeaway' : 'Dining'} order created successfully`,
            order: createdOrder
        });
    }
    catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['new', 'cooking', 'ready', 'payment_pending', 'payment_complete', 'completed', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        if (status === 'completed') {
            updateData.completedAt = new Date();
        }
        const result = await ordersCollection.updateOne({ _id: order._id }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Get updated order
        const updatedOrder = await ordersCollection.findOne({ _id: order._id });
        // Log activity
        await logAdminActivity(db, 'Order', 'Status Updated', getUsername(req), `Order ${order.orderId} status changed to: ${status}`, 'success');
        // Emit WebSocket event for order status update (kitchen display)
        if (updatedOrder) {
            emitOrderUpdate({
                type: 'order_status_changed',
                order: {
                    id: updatedOrder.orderId || updatedOrder._id.toString(),
                    orderId: updatedOrder.orderId,
                    _id: updatedOrder._id.toString(),
                    customerName: updatedOrder.customerName,
                    status: updatedOrder.status,
                    orderType: updatedOrder.orderType,
                    tableNumber: updatedOrder.tableNumber,
                    items: updatedOrder.items,
                    total: updatedOrder.total,
                    createdAt: updatedOrder.createdAt,
                    isPaid: updatedOrder.isPaid || false,
                    isSettled: updatedOrder.isSettled || false,
                },
                orderId: updatedOrder.orderId || updatedOrder._id.toString(),
                status: updatedOrder.status,
                timestamp: Date.now(),
            });
        }
        res.json({
            success: true,
            message: `Order status updated to ${status}`
        });
    }
    catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Mark order as paid (for dining orders)
router.patch('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body;
        if (!paymentMethod || !['card', 'cash'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                error: 'Payment method must be either "card" or "cash"'
            });
        }
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        if (order.isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Order is already paid'
            });
        }
        const result = await ordersCollection.updateOne({ _id: order._id }, {
            $set: {
                isPaid: true,
                isSettled: true, // When payment is made, order is settled
                paymentMethod: paymentMethod,
                updatedAt: new Date(),
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Order', 'Payment Completed', getUsername(req), `Order ${order.orderId} marked as paid (${paymentMethod})`, 'success');
        res.json({
            success: true,
            message: 'Order marked as paid successfully'
        });
    }
    catch (error) {
        console.error('Mark order as paid error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Settle order (mark as settled - for takeaway orders that are already paid)
router.patch('/:id/settle', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        if (order.isSettled) {
            return res.status(400).json({
                success: false,
                error: 'Order is already settled'
            });
        }
        const result = await ordersCollection.updateOne({ _id: order._id }, {
            $set: {
                isSettled: true,
                updatedAt: new Date(),
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Order', 'Order Settled', getUsername(req), `Order ${order.orderId} settled by cashier`, 'success');
        res.json({
            success: true,
            message: 'Order settled successfully'
        });
    }
    catch (error) {
        console.error('Settle order error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update order
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, items, total, tableNumber } = req.body;
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        const updateData = {
            updatedAt: new Date(),
        };
        if (customerName)
            updateData.customerName = customerName;
        if (items)
            updateData.items = items;
        if (total !== undefined)
            updateData.total = total;
        if (tableNumber !== undefined)
            updateData.tableNumber = tableNumber;
        const result = await ordersCollection.updateOne({ _id: order._id }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Order', 'Updated', getUsername(req), `Order ${order.orderId} updated`, 'success');
        res.json({
            success: true,
            message: 'Order updated successfully'
        });
    }
    catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Mark order as refunded
router.patch('/:id/refund', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Only allow refund for cancelled orders
        if (order.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Only cancelled orders can be refunded'
            });
        }
        // Update refund status and mark as settled (so it moves to history)
        const result = await ordersCollection.updateOne({ _id: order._id }, {
            $set: {
                refundStatus: true,
                isSettled: true, // Mark as settled so it moves to order history
                updatedAt: new Date(),
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Order', 'Refunded', getUsername(req), `Order ${order.orderId} marked as refunded`, 'success');
        // Emit WebSocket event for order update
        emitOrderUpdate({
            type: 'order_updated',
            order: {
                id: order.orderId || order._id.toString(),
                _id: order._id.toString(),
                customerName: order.customerName,
                status: order.status,
                items: order.items || [],
                total: order.total || 0,
                createdAt: order.createdAt || new Date(),
                isPaid: order.isPaid || false,
                isSettled: order.isSettled || false,
                orderType: order.orderType,
                tableNumber: order.tableNumber,
            },
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: 'Order marked as refunded successfully'
        });
    }
    catch (error) {
        console.error('Mark order as refunded error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        // Find order by _id or orderId
        let order;
        if (ObjectId.isValid(id)) {
            order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            order = await ordersCollection.findOne({ orderId: id });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        const result = await ordersCollection.deleteOne({ _id: order._id });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Order', 'Deleted', getUsername(req), `Order ${order.orderId} deleted`, 'success');
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
export default router;
//# sourceMappingURL=orders.js.map