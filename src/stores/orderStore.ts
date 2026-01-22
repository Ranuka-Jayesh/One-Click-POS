import { create } from "zustand";
import { CartItem, MenuItem, Order, OrderStatus } from "@/types/order";

export interface HeldCart {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: Date;
}

interface CartStore {
  items: CartItem[];
  heldCarts: HeldCart[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  holdCart: (name: string) => void;
  loadHeldCart: (heldCartId: string) => void;
  deleteHeldCart: (heldCartId: string) => void;
}

interface OrderStore {
  orders: Order[];
  customerOrder: Order | null;
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  markPaid: (orderId: string, paymentMethod?: "card" | "cash") => void;
  setCustomerOrder: (order: Order | null) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  heldCarts: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.menuItem.id === item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { menuItem: item, quantity: 1 }] };
    }),
  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.menuItem.id !== itemId),
    })),
  updateQuantity: (itemId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.menuItem.id !== itemId)
          : state.items.map((i) =>
              i.menuItem.id === itemId ? { ...i, quantity } : i
            ),
    })),
  clearCart: () => set({ items: [] }),
  total: () =>
    get().items.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    ),
  holdCart: (name) =>
    set((state) => {
      if (state.items.length === 0) return state;
      const heldCart: HeldCart = {
        id: `HELD-${Date.now().toString()}`,
        name: name.trim() || `Cart ${state.heldCarts.length + 1}`,
        items: [...state.items],
        createdAt: new Date(),
      };
      return {
        heldCarts: [heldCart, ...state.heldCarts],
      };
    }),
  loadHeldCart: (heldCartId) =>
    set((state) => {
      const heldCart = state.heldCarts.find((c) => c.id === heldCartId);
      if (heldCart) {
        return {
          items: [...heldCart.items],
        };
      }
      return state;
    }),
  deleteHeldCart: (heldCartId) =>
    set((state) => ({
      heldCarts: state.heldCarts.filter((c) => c.id !== heldCartId),
    })),
}));

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  customerOrder: null,
  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),
  setOrders: (orders) =>
    set({ orders }),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              completedAt: status === "completed" ? new Date() : o.completedAt,
            }
          : o
      ),
      customerOrder:
        state.customerOrder?.id === orderId
          ? {
              ...state.customerOrder,
              status,
              completedAt:
                status === "completed"
                  ? new Date()
                  : state.customerOrder.completedAt,
            }
          : state.customerOrder,
    })),
  markPaid: (orderId, paymentMethod?: "card" | "cash") =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId 
          ? { ...o, isPaid: true, paymentMethod: paymentMethod || o.paymentMethod } 
          : o
      ),
    })),
  setCustomerOrder: (order) => set({ customerOrder: order }),
}));
