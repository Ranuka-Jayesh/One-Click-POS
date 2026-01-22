import { Order } from "@/types/order";
import { ChefHat, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { updateOrderStatus as updateOrderStatusAPI } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KitchenOrderCardProps {
  order: Order;
  onStatusUpdate?: () => void;
}

export default function KitchenOrderCard({ order, onStatusUpdate }: KitchenOrderCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });

  const handleAction = async () => {
    if (isUpdating) return;

    let newStatus: "cooking" | "ready" | "completed";
    if (order.status === "new") {
      newStatus = "cooking";
    } else if (order.status === "cooking") {
      newStatus = "ready";
    } else {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await updateOrderStatusAPI(order.id, newStatus);
      if (response.success) {
        toast({
          title: "Status Updated",
          description: `Order status updated to ${newStatus}`,
        });
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to update order status",
        });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await updateOrderStatusAPI(order.id, "completed");
      if (response.success) {
        toast({
          title: "Order Dispatched",
          description: "Order has been marked as completed",
        });
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to complete order",
        });
      }
    } catch (error) {
      console.error('Failed to complete order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete order. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await updateOrderStatusAPI(order.id, "cancelled");
      if (response.success) {
        toast({
          title: "Order Cancelled",
          description: "Order has been cancelled successfully",
        });
        setShowCancelDialog(false);
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to cancel order",
        });
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel order. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-border p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-sofia text-muted-foreground">
            #{order.id}
          </span>
          <h3 className="text-2xl font-archivo font-bold text-foreground">
            {order.customerName}
          </h3>
        </div>
        <span className="text-sm font-karla text-muted-foreground">{timeAgo}</span>
      </div>

      <div className="space-y-3 mb-6">
        {order.items.map((item) => (
          <div
            key={item.menuItem.id}
            className="flex items-center gap-3 text-lg"
          >
            <span className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-bold text-foreground">
              {item.quantity}
            </span>
            <span className="text-foreground font-medium">{item.menuItem.name}</span>
          </div>
        ))}
      </div>

      {order.status === "new" && (
        <div className="flex gap-3">
          <button
            onClick={handleAction}
            disabled={isUpdating}
            className="flex-1 py-4 bg-accent text-accent-foreground font-bold text-lg rounded-xl transition-all duration-200 hover:bg-accent/90 active:scale-[0.98] touch-target flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChefHat className="w-6 h-6" />
            {isUpdating ? "Updating..." : "Start Cooking"}
          </button>
          <button
            onClick={() => setShowCancelDialog(true)}
            disabled={isUpdating}
            className="px-4 py-4 bg-destructive text-destructive-foreground font-bold text-lg rounded-xl transition-all duration-200 hover:bg-destructive/90 active:scale-[0.98] touch-target flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancel Order"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {order.status === "cooking" && (
        <button
          onClick={handleAction}
          disabled={isUpdating}
          className="w-full py-4 bg-success text-success-foreground font-bold text-lg rounded-xl transition-all duration-200 hover:bg-success/90 active:scale-[0.98] touch-target flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-6 h-6" />
          {isUpdating ? "Updating..." : "Mark Ready"}
        </button>
      )}

      {order.status === "ready" && (
        <button
          onClick={handleComplete}
          disabled={isUpdating}
          className="w-full py-4 bg-success text-success-foreground font-bold text-lg rounded-xl transition-all duration-200 hover:bg-success/90 active:scale-[0.98] touch-target flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-6 h-6" />
          {isUpdating ? "Updating..." : "Dispatched"}
        </button>
      )}

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order #{order.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
