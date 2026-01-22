import { X, AlertTriangle } from "lucide-react";
import { Order } from "@/types/order";

interface OrderCancellationNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  tableLabel?: string;
}

export default function OrderCancellationNotification({
  isOpen,
  onClose,
  order,
  tableLabel,
}: OrderCancellationNotificationProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-2xl border border-destructive/50 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Order Cancelled</h3>
                <p className="text-sm text-white/60 mt-1">
                  {tableLabel ? `Table ${tableLabel}` : "Your order"}
                </p>
              </div>
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
        <div className="p-6 space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-white/80 text-sm mb-2">
              We're sorry, but your order has been cancelled.
            </p>
            <p className="text-white/60 text-xs">
              If you have any questions or concerns, please contact our staff.
            </p>
          </div>

          {/* Order Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/80">
              Cancelled Order Details
            </h4>
            <div className="bg-[#0f0f0f]/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Order ID</span>
                <span className="text-sm font-medium text-white">
                  #{order.id || order.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Customer</span>
                <span className="text-sm font-medium text-white">
                  {order.customerName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Items</span>
                <span className="text-sm font-medium text-white">
                  {order.items.length} item
                  {order.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-lg font-bold text-destructive">
                  Rs. {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={item.menuItem.id || index}
                  className="flex items-center gap-3 p-2 bg-[#0f0f0f]/60 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm text-white/80">
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
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-destructive/30">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-destructive/90 hover:bg-destructive text-destructive-foreground font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
