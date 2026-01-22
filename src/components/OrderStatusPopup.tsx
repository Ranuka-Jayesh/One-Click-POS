import { useState, useEffect } from "react";
import { X, Receipt, Clock, ChefHat, UtensilsCrossed, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Order, OrderStatus } from "@/types/order";
import { getOrders } from "@/utils/api";
import { socketService } from "@/utils/socketService";
import { useToast } from "@/hooks/use-toast";

interface OrderStatusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  tableLabel: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
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
  payment_pending: {
    label: "Payment Pending",
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-warning",
  },
  payment_complete: {
    label: "Payment Complete",
    icon: <CheckCircle2 className="w-4 h-4" />,
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

export default function OrderStatusPopup({
  isOpen,
  onClose,
  tableId,
  tableLabel,
}: OrderStatusPopupProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await getOrders({
        tableNumber: tableId,
        isSettled: false,
      });

      interface OrderFromAPI {
        id?: string;
        orderId?: string;
        _id?: string;
        createdAt: Date | string;
        [key: string]: unknown;
      }

      if (response.success && response.data?.orders) {
        const dbOrders = response.data.orders.map((order: OrderFromAPI) => ({
          ...order,
          id: order.id || order.orderId || order._id || "",
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        }));

        const activeOrders = dbOrders
          .filter((order: Order) => order.status !== "cancelled")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setOrders(activeOrders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestBill = () => {
    if (isRequestingBill) return;
    
    setIsRequestingBill(true);
    try {
      // Check if socket is connected
      if (!socketService.connected) {
        console.warn('⚠️ Socket not connected, cannot send bill request');
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Not connected to server. Please refresh the page.",
        });
        setIsRequestingBill(false);
        return;
      }

      const billRequestData = {
        tableId,
        tableLabel,
        timestamp: Date.now(),
      };

      console.log('🧾 Sending bill request:', billRequestData);
      
      // Send bill request to cashier via WebSocket
      socketService.emit('bill_request', billRequestData);
      
      toast({
        title: "Bill Requested",
        description: "Cashier has been notified. Your bill will be brought shortly.",
      });
      
      // Reset button state after 2 seconds
      setTimeout(() => {
        setIsRequestingBill(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to request bill:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request bill. Please try again.",
      });
      setIsRequestingBill(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();

      // Subscribe to order updates
      const unsubscribe = socketService.on("order_update", (message) => {
        if (message.order?.tableNumber === tableId) {
          loadOrders();
        }
      });

      return () => {
        unsubscribe();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tableId]);

  if (!isOpen) return null;

  // Calculate total for all orders
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Order Status</h3>
              <p className="text-sm text-white/60 mt-0.5">
                Table {tableLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No active orders</p>
            </div>
          ) : (
            <>
              {/* Orders List */}
              <div className="space-y-3">
                {orders.map((order) => {
                  const config = statusConfig[order.status as OrderStatus] || statusConfig.new;
                  return (
                    <div
                      key={order.id || order.orderId}
                      className="bg-[#0f0f0f]/60 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={config.color}>
                            {config.icon}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {config.label}
                          </span>
                        </div>
                        <span className="text-xs text-white/60">
                          #{order.id || order.orderId}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div
                            key={item.menuItem.id || index}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-white/80">
                              {item.quantity}x {item.menuItem.name}
                            </span>
                            <span className="text-white/60">
                              Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-white/50">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-xs text-white/60">Order Total</span>
                        <span className="text-sm font-semibold text-accent">
                          Rs. {order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Amount */}
              {orders.length > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total Amount</span>
                    <span className="text-lg font-bold text-accent">
                      Rs. {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bill Request Button */}
        {orders.length > 0 && (
          <div className="p-5 border-t border-white/20">
            <button
              onClick={handleRequestBill}
              disabled={isRequestingBill}
              className="w-full py-3 px-4 bg-accent/90 hover:bg-accent text-accent-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Receipt className={`w-5 h-5 ${isRequestingBill ? 'animate-pulse' : ''}`} />
              {isRequestingBill ? "Requesting..." : "Request Bill"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
