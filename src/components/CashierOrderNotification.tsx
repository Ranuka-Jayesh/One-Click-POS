import { useState } from "react";
import { Order } from "@/types/order";
import { X, Check, Table as TableIcon, User, ShoppingBag } from "lucide-react";
import { updateOrderStatus as updateOrderStatusAPI } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

interface CashierOrderNotificationProps {
  order: Order | null;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  tableLabel?: string;
}

export default function CashierOrderNotification({
  order,
  onConfirm,
  onCancel,
  onClose,
  tableLabel,
}: CashierOrderNotificationProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!order) return null;

  // Prevent closing by clicking outside when processing
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!isProcessing && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // Order is already created, just confirm it (no status change needed)
      // The order is already in "new" status which is correct
      toast({
        title: "Order Confirmed",
        description: `Order from ${order.customerName} has been confirmed.`,
      });
      onConfirm();
    } catch (error) {
      console.error("Failed to confirm order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to confirm order. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      // Cancel the order by updating status
      const response = await updateOrderStatusAPI(order.id, "cancelled");
      
      if (response.success) {
        toast({
          title: "Order Cancelled",
          description: `Order from ${order.customerName} has been cancelled.`,
        });
        onCancel();
      } else {
        throw new Error(response.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel order. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />
      
      <div className="relative w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center animate-pulse">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">New Order Received!</h3>
                <p className="text-sm text-white/60">Customer order requires confirmation</p>
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

        {/* Order Details */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Customer & Table Info */}
          <div className="flex items-center gap-4 p-4 bg-[#0f0f0f]/60 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 flex-1">
              <User className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-xs text-white/60 mb-1">Customer</p>
                <p className="text-white font-semibold">{order.customerName}</p>
              </div>
            </div>
            {order.tableNumber && (
              <div className="flex items-center gap-2 flex-1">
                <TableIcon className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-white/60 mb-1">Table</p>
                  <p className="text-accent font-semibold">
                    {tableLabel || `Table ${order.tableNumber}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white/80 mb-2">Order Items:</h4>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={item.menuItem.id || index}
                  className="flex items-center gap-3 p-3 bg-[#0f0f0f]/60 rounded-lg border border-white/10"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={item.menuItem.image || '/placeholder.svg'}
                      alt={item.menuItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {item.quantity}x {item.menuItem.name}
                    </p>
                    <p className="text-white/60 text-sm">
                      Rs. {item.menuItem.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-accent font-bold">
                      Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/20 rounded-xl">
            <span className="text-lg font-semibold text-white">Total Amount</span>
            <span className="text-2xl font-bold text-accent">
              Rs. {order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-white/20 flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-destructive/90 hover:bg-destructive text-destructive-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel Order
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-success/90 hover:bg-success text-success-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {isProcessing ? "Processing..." : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
