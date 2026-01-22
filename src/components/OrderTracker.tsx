import { useState } from "react";
import { CheckCircle2, Clock, ChefHat, UtensilsCrossed, X, Receipt } from "lucide-react";
import { Order, OrderStatus } from "@/types/order";
import { useOrderStore } from "@/stores/orderStore";
import { settleOrder } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  new: {
    label: "Order Placed",
    icon: <Clock className="w-6 h-6" />,
    color: "text-accent",
  },
  cooking: {
    label: "Cooking",
    icon: <ChefHat className="w-6 h-6" />,
    color: "text-cooking",
  },
  ready: {
    label: "Ready for Pickup",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: "text-success",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-6 h-6" />,
    color: "text-success",
  },
  cancelled: {
    label: "Cancelled",
    icon: <X className="w-6 h-6" />,
    color: "text-destructive",
  },
};

const steps: OrderStatus[] = ["new", "cooking", "ready"];

export default function OrderTracker() {
  const customerOrder = useOrderStore((state) => state.customerOrder);
  const setCustomerOrder = useOrderStore((state) => state.setCustomerOrder);
  const { toast } = useToast();
  const [isSettling, setIsSettling] = useState(false);

  if (!customerOrder) return null;

  const currentStepIndex = steps.indexOf(customerOrder.status);
  const config = statusConfig[customerOrder.status];
  const canSettle = customerOrder.status === "completed" && !customerOrder.isSettled;

  const handleSettle = async () => {
    if (!canSettle || isSettling) return;

    setIsSettling(true);
    try {
      const response = await settleOrder(customerOrder.id);
      if (response.success) {
        toast({
          title: "Order Settled",
          description: "Your order has been settled successfully.",
        });
        // Update the order in the store
        setCustomerOrder({
          ...customerOrder,
          isSettled: true,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to settle order. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to settle order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to settle order. Please try again.",
      });
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setCustomerOrder(null)}
      />

      <div className="relative w-full max-w-md bg-card rounded-3xl shadow-elevated p-8 animate-scale-in">
        <button
          onClick={() => setCustomerOrder(null)}
          className="absolute top-4 right-4 touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Icon */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4 ${config.color}`}
          >
            {config.icon}
          </div>
          <h2 className="text-2xl font-archivo font-bold text-foreground">
            {config.label}
          </h2>
          <p className="text-muted-foreground font-karla mt-1">
            Order #{customerOrder.id}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const isCompleted = currentStepIndex > index;
            const isCurrent = currentStepIndex === index;
            const stepConfig = statusConfig[step];

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted || isCurrent
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {stepConfig.icon}
                  </div>
                  <span
                    className={`text-xs mt-2 font-karla text-center ${
                      isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stepConfig.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStepIndex > index ? "bg-accent" : "bg-secondary"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Order Details */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
          {customerOrder.items.map((item) => (
            <div
              key={item.menuItem.id}
              className="flex justify-between text-sm"
            >
              <span className="text-foreground">
                {item.quantity}x {item.menuItem.name}
              </span>
              <span className="text-muted-foreground font-karla">
                Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-accent">Rs. {customerOrder.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Settle Button - Only show when order is completed and not settled */}
        {canSettle && (
          <div className="mt-6">
            <Button
              onClick={handleSettle}
              disabled={isSettling}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-lg"
            >
              {isSettling ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Settling...
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5 mr-2" />
                  Settle Bill
                </>
              )}
            </Button>
          </div>
        )}

        {/* Show message if already settled */}
        {customerOrder.isSettled && (
          <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Order has been settled</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
