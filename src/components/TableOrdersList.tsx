import { useEffect, useState, useCallback } from "react";
import { Clock, ChefHat, UtensilsCrossed, CheckCircle2, X } from "lucide-react";
import { getOrders, Order } from "@/utils/api";
import { socketService } from "@/utils/socketService";

interface TableOrdersListProps {
  tableId: number;
  tableLabel: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  new: {
    label: "Order Placed",
    icon: <Clock className="w-4 h-4" />,
    color: "text-accent",
  },
  cooking: {
    label: "Cooking",
    icon: <ChefHat className="w-4 h-4" />,
    color: "text-cooking",
  },
  ready: {
    label: "Ready",
    icon: <UtensilsCrossed className="w-4 h-4" />,
    color: "text-success",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-success",
  },
  cancelled: {
    label: "Cancelled",
    icon: <X className="w-4 h-4" />,
    color: "text-destructive",
  },
};

export default function TableOrdersList({ tableId, tableLabel }: TableOrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getOrders({ 
        tableNumber: tableId,
        isSettled: false 
      });
      
      interface OrderFromAPI {
        id?: string;
        orderId?: string;
        _id?: string;
        createdAt: Date | string;
        [key: string]: unknown;
      }

      if (response.success && response.data?.orders) {
        // Transform orders to match Order type
        const dbOrders = response.data.orders.map((order: OrderFromAPI) => ({
          ...order,
          id: order.id || order.orderId || order._id || '',
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        }));
        
        // Filter out cancelled orders and sort by creation time
        const activeOrders = dbOrders
          .filter((order: Order) => order.status !== 'cancelled')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(activeOrders);
      }
    } catch (error) {
      console.error('Failed to load table orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadOrders();

    // Subscribe to order updates
    const unsubscribe = socketService.on('order_update', (message) => {
      if (message.order?.tableNumber === tableId) {
        loadOrders();
      }
    });

      return () => {
        unsubscribe();
      };
    }, [tableId, loadOrders]);

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a]/60 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
        <p className="text-white/60 text-sm">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return null; // Don't show anything if no orders
  }

  return (
    <div className="bg-[#1a1a1a]/60 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Ongoing Orders for Table {tableLabel}
        </h3>
        <span className="text-sm text-white/60">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>
      
      <div className="space-y-3">
        {orders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.new;
          return (
            <div
              key={order.id || order.orderId}
              className="bg-[#0f0f0f]/60 rounded-lg p-3 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={config.color}>
                    {config.icon}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {config.label}
                  </span>
                </div>
                <span className="text-xs text-white/60">
                  Order #{order.id || order.orderId}
                </span>
              </div>
              
              <div className="text-xs text-white/80 mb-2">
                {order.customerName}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </div>
                <div className="text-sm font-semibold text-accent">
                  Rs. {order.total.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
