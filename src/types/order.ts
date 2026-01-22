export type OrderStatus = "new" | "cooking" | "ready" | "completed" | "cancelled" | "payment_pending" | "payment_complete";

export interface MenuItem {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  orderId?: string;
  _id?: string;
  customerName: string;
  items: CartItem[];
  status: OrderStatus;
  total: number;
  createdAt: Date;
  isPaid: boolean;
  isSettled: boolean;
  paymentMethod?: "card" | "cash";
  orderType?: "takeaway" | "dining";
  tableNumber?: number;
  completedAt?: Date | string;
  cashierId?: string;
  cashierName?: string;
  refundStatus?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
