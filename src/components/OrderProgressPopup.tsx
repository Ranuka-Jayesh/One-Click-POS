import { useState, useEffect } from "react";
import { X, Clock, ChefHat, UtensilsCrossed, CheckCircle2, CreditCard, Bell, AlertTriangle } from "lucide-react";
import { Order, OrderStatus } from "@/types/order";
import { getOrders } from "@/utils/api";
import { socketService } from "@/utils/socketService";
import { useToast } from "@/hooks/use-toast";
import OrderCancellationNotification from "@/components/OrderCancellationNotification";

interface OrderProgressPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  tableLabel: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; color: string; step: number }
> = {
  new: {
    label: "Order Placed",
    icon: <Clock className="w-5 h-5" />,
    color: "text-accent",
    step: 0,
  },
  cooking: {
    label: "Cooking",
    icon: <ChefHat className="w-5 h-5" />,
    color: "text-cooking",
    step: 1,
  },
  ready: {
    label: "Ready",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    color: "text-success",
    step: 2,
  },
  payment_pending: {
    label: "Payment Pending",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-warning",
    step: 3,
  },
  payment_complete: {
    label: "Payment Complete",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-success",
    step: 4,
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-success",
    step: 5,
  },
  cancelled: {
    label: "Cancelled",
    icon: <X className="w-5 h-5" />,
    color: "text-destructive",
    step: -1,
  },
};

const steps: OrderStatus[] = ["new", "cooking", "ready", "payment_pending", "payment_complete"];

export default function OrderProgressPopup({
  isOpen,
  onClose,
  tableId,
  tableLabel,
}: OrderProgressPopupProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingBell, setIsRequestingBell] = useState(false);
  const [showCancellationNotification, setShowCancellationNotification] = useState(false);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);

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

  const handleRequestBell = () => {
    if (isRequestingBell) return;
    
    setIsRequestingBell(true);
    try {
      // Send bell request to cashier via WebSocket
      socketService.emit('bell_request', {
        tableId,
        tableLabel,
        timestamp: Date.now(),
      });
      
      toast({
        title: "Bell Requested",
        description: "Cashier has been notified. They will be with you shortly.",
      });
      
      // Reset button state after 2 seconds
      setTimeout(() => {
        setIsRequestingBell(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to request bell:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request bell. Please try again.",
      });
      setIsRequestingBell(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();

      // Subscribe to order updates
      const unsubscribe = socketService.on("order_update", (message) => {
        if (message.order?.tableNumber === tableId) {
          // Handle order cancellation - show notification popup
          if (message.type === 'order_status_changed' && message.order?.status === 'cancelled') {
            // Transform order to match Order type
            const cancelledOrderData: Order = {
              id: message.order.id || message.order.orderId || message.order._id || '',
              orderId: message.order.orderId || message.order.id,
              _id: message.order._id || message.order.id,
              customerName: message.order.customerName || '',
              items: message.order.items || [],
              status: 'cancelled',
              total: message.order.total || 0,
              createdAt: message.order.createdAt ? new Date(message.order.createdAt) : new Date(),
              isPaid: message.order.isPaid || false,
              isSettled: message.order.isSettled || false,
              orderType: message.order.orderType || 'dining',
              tableNumber: message.order.tableNumber,
            };
            
            // Show cancellation notification
            setCancelledOrder(cancelledOrderData);
            setShowCancellationNotification(true);
          }
          
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

  // Get the most recent order
  const latestOrder = orders.length > 0 ? orders[0] : null;
  const currentStatus = latestOrder?.status || "new";
  const currentStepIndex = steps.indexOf(currentStatus as OrderStatus);
  const progressPercentage =
    currentStepIndex >= 0
      ? ((currentStepIndex + 1) / steps.length) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Order Progress</h3>
              <p className="text-sm text-white/60 mt-1">
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
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !latestOrder ? (
            <div className="text-center py-8">
              <p className="text-white/60">No active orders</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="space-y-4">
                <div className="relative">
                  {/* Background Progress Bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-success transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => {
                    const isCompleted = currentStepIndex > index;
                    const isCurrent = currentStepIndex === index;
                    const stepConfig = statusConfig[step];

                    return (
                      <div key={step} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted
                              ? "bg-success text-success-foreground"
                              : isCurrent
                              ? "bg-accent text-accent-foreground animate-pulse"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {stepConfig.icon}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center font-medium ${
                            isCurrent
                              ? "text-white"
                              : isCompleted
                              ? "text-success"
                              : "text-white/40"
                          }`}
                        >
                          {stepConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`${statusConfig[currentStatus as OrderStatus]?.color}`}>
                    {statusConfig[currentStatus as OrderStatus]?.icon}
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Current Status</p>
                    <p className="text-lg font-semibold text-white">
                      {statusConfig[currentStatus as OrderStatus]?.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white/80">
                  Order Details
                </h4>
                <div className="bg-[#0f0f0f]/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Order ID</span>
                    <span className="text-sm font-medium text-white">
                      #{latestOrder.id || latestOrder.orderId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Customer</span>
                    <span className="text-sm font-medium text-white">
                      {latestOrder.customerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Items</span>
                    <span className="text-sm font-medium text-white">
                      {latestOrder.items.length} item
                      {latestOrder.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-lg font-bold text-accent">
                      Rs. {latestOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  {latestOrder.items.map((item, index) => (
                    <div
                      key={item.menuItem.id || index}
                      className="flex items-center gap-3 p-2 bg-[#0f0f0f]/60 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {item.quantity}x {item.menuItem.name}
                        </p>
                      </div>
                      <div className="text-sm text-white/60">
                        Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bell Request Button */}
              {latestOrder && latestOrder.status !== 'cancelled' && (
                <div className="pt-4 border-t border-white/20">
                  <button
                    onClick={handleRequestBell}
                    disabled={isRequestingBell}
                    className="w-full py-3 px-4 bg-accent/90 hover:bg-accent text-accent-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Bell className={`w-5 h-5 ${isRequestingBell ? 'animate-pulse' : ''}`} />
                    {isRequestingBell ? "Requesting..." : "Request Cashier"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Cancellation Notification */}
      <OrderCancellationNotification
        isOpen={showCancellationNotification}
        onClose={() => {
          setShowCancellationNotification(false);
          setCancelledOrder(null);
          onClose(); // Also close the progress popup
        }}
        order={cancelledOrder}
        tableLabel={tableLabel}
      />
    </div>
  );
}
