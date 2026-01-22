import { Order } from "@/types/order";
import StatusBadge from "./StatusBadge";
import { Clock, DollarSign, Check, X, CreditCard } from "lucide-react";
import { useOrderStore } from "@/stores/orderStore";
import { formatDistanceToNow } from "date-fns";

interface CashierOrderCardProps {
  order: Order;
}

export default function CashierOrderCard({ order }: CashierOrderCardProps) {
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const markPaid = useOrderStore((state) => state.markPaid);

  const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });

  return (
    <div className="card-elevated p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-foreground">{order.customerName}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-karla">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeAgo}</span>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-1.5 mb-4">
        {order.items.map((item) => (
          <div key={item.menuItem.id} className="flex justify-between text-sm">
            <span className="text-foreground">
              {item.quantity}x {item.menuItem.name}
            </span>
            <span className="text-muted-foreground font-karla">
              Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-accent" />
          <span className="text-xl font-bold text-foreground">
            Rs. {order.total.toFixed(2)}
          </span>
          {order.isPaid ? (
            <span className="text-xs font-sofia font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full">
              PAID
            </span>
          ) : (
            <span className="text-xs font-sofia font-semibold text-destructive bg-destructive/15 px-2 py-0.5 rounded-full">
              UNPAID
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {order.status === "new" && (
          <>
            <button
              onClick={() => updateOrderStatus(order.id, "cooking")}
              className="flex-1 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg transition-colors hover:bg-accent/90 touch-target flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm
            </button>
            <button
              onClick={() => updateOrderStatus(order.id, "cancelled")}
              className="py-2.5 px-4 bg-destructive/10 text-destructive font-semibold rounded-lg transition-colors hover:bg-destructive/20 touch-target"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {!order.isPaid && order.status !== "cancelled" && (
          <button
            onClick={() => markPaid(order.id)}
            className="flex-1 py-2.5 bg-success text-success-foreground font-semibold rounded-lg transition-colors hover:bg-success/90 touch-target flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Mark Paid
          </button>
        )}
      </div>
    </div>
  );
}
