import { OrderStatus } from "@/types/order";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

const statusStyles: Record<OrderStatus, string> = {
  new: "status-new",
  cooking: "status-cooking",
  ready: "status-ready",
  completed: "status-ready",
  cancelled: "status-cancelled",
};

const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  cooking: "Cooking",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge ${statusStyles[status]} ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : ""
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "new"
            ? "bg-accent"
            : status === "cooking"
            ? "bg-cooking"
            : status === "ready" || status === "completed"
            ? "bg-success"
            : "bg-destructive"
        }`}
      />
      {statusLabels[status]}
    </span>
  );
}
