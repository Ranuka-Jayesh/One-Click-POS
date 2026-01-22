import { useState, useEffect } from "react";
import { useOrderStore, useCartStore } from "@/stores/orderStore";
import { MenuItem, Order } from "@/types/order";
import Logo from "@/components/Logo";
import StatusBadge from "@/components/StatusBadge";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import LogoutConfirmationDialog from "@/components/LogoutConfirmationDialog";
import CashOutDialog from "@/components/CashOutDialog";
import CashierOrderHistory from "@/components/CashierOrderHistory";
import CashierOrderNotification from "@/components/CashierOrderNotification";
import CashierBillNotification from "@/components/CashierBillNotification";
import Analytics from "@/components/Analytics";
import Settings from "@/components/Settings";
import { wsService } from "@/utils/websocket";
import { socketService } from "@/utils/socketService";
import { cashOut, getTables, Table as TableType, getMenuItems, getCategories, MenuItem as MenuItemType, Category, createOrder, getOrders, markOrderPaid, updateOrderStatus as updateOrderStatusAPI, settleOrder, markOrderRefunded, getActiveShift } from "@/utils/api";
import {
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  Plus,
  Minus,
  X,
  Trash2,
  CreditCard,
  Check,
  LayoutGrid,
  User,
  Bookmark,
  BookmarkCheck,
  Wallet,
  Receipt,
  Table,
  Search,
  Filter,
  Users,
  Sparkles,
  ShoppingCart,
  Utensils,
  Flame,
  Soup,
  LogOut,
  History,
  BarChart3,
  Settings as SettingsIcon,
  RotateCcw,
  Unlock,
  Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import cancelSound from "@/assets/cancel.mp3";
import bellSound from "@/assets/bell.wav";

import burgerImg from "@/assets/burger.jpg";
import pizzaImg from "@/assets/pizza.jpg";
import pepperoniImg from "@/assets/pepperoni-pizza.jpg";
import saladImg from "@/assets/salad.jpg";
import greekSaladImg from "@/assets/greek-salad.jpg";
import lemonadeImg from "@/assets/lemonade.jpg";
import coffeeImg from "@/assets/coffee.jpg";
import brownieImg from "@/assets/brownie.jpg";
import cheesecakeImg from "@/assets/cheesecake.jpg";

const imageMap: Record<string, string> = {
  "1": burgerImg, "2": burgerImg, "3": burgerImg,
  "4": pizzaImg, "5": pepperoniImg,
  "6": saladImg, "7": greekSaladImg,
  "8": lemonadeImg, "9": coffeeImg,
  "10": brownieImg, "11": cheesecakeImg,
};

export default function CashierDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const orders = useOrderStore((state) => state.orders);
  const addOrder = useOrderStore((state) => state.addOrder);
  const setOrders = useOrderStore((state) => state.setOrders);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const markPaid = useOrderStore((state) => state.markPaid);

  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartTotal = useCartStore((state) => state.total);
  const heldCarts = useCartStore((state) => state.heldCarts);
  const holdCart = useCartStore((state) => state.holdCart);
  const loadHeldCart = useCartStore((state) => state.loadHeldCart);
  const deleteHeldCart = useCartStore((state) => state.deleteHeldCart);

  const [activeCategory, setActiveCategory] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "history" | "analytics" | "settings">("menu");
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [holdCartName, setHoldCartName] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [tableFilter, setTableFilter] = useState<"all" | 2 | 4 | 6>("all");
  const [tableSearch, setTableSearch] = useState("");
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [pendingTableForOrder, setPendingTableForOrder] = useState<number | null>(null);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleTableNumber, setSettleTableNumber] = useState<number | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [showCancelOrderDialog, setShowCancelOrderDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showCashOutDialog, setShowCashOutDialog] = useState(false);
  const [showCancelNotification, setShowCancelNotification] = useState(false);
  const [cancelledOrderId, setCancelledOrderId] = useState<string>("");
  const [showOrderNotification, setShowOrderNotification] = useState(false);
  const [pendingOrderNotification, setPendingOrderNotification] = useState<Order | null>(null);
  const [showBellNotification, setShowBellNotification] = useState(false);
  const [bellRequest, setBellRequest] = useState<{ tableId: number; tableLabel: string } | null>(null);
  const [showBillNotificationPopup, setShowBillNotificationPopup] = useState(false);
  const [billRequest, setBillRequest] = useState<{ tableId: number; tableLabel: string } | null>(null);
  const [blockedTables, setBlockedTables] = useState<Record<number, { label: string; timestamp: number }>>({});
  const [tablesConfig, setTablesConfig] = useState<TableType[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Active orders are those that are not settled (isSettled === false)
  // Cancelled takeaway orders should remain visible until cashier clicks refund
  // Refunded takeaway orders should be excluded from active orders (they go to history)
  const activeOrders = orders.filter((o) => {
    // Exclude settled orders
    if (o.isSettled) return false;
    
    // Exclude refunded takeaway orders (they should go to history)
    if (o.status === 'cancelled' && o.orderType === 'takeaway' && o.refundStatus) {
      return false;
    }
    
    // Include cancelled takeaway orders that are NOT refunded (waiting for cashier refund action)
    if (o.status === 'cancelled' && o.orderType === 'takeaway' && !o.refundStatus) {
      return true; // Keep cancelled takeaway orders visible until cashier clicks refund
    }
    
    // Exclude other cancelled orders (table orders don't need refund)
    if (o.status === 'cancelled') return false;
    
    // Include all other non-cancelled, non-settled orders
    return true;
  });

  // Check if selected table has existing orders (for settle scenario)
  const existingOrdersForSelectedTable = selectedTable
    ? activeOrders.filter((o) => o.tableNumber === selectedTable)
    : [];
  const isSettlingTable = selectedTable !== null && existingOrdersForSelectedTable.length > 0;

  // Get cash in amount and time from localStorage (set during cash in)
  const cashInAmount = parseFloat(localStorage.getItem("cashInAmount") || "0");
  const cashInTime = localStorage.getItem("cashInTime");

  // Calculate current cash balance dynamically:
  // Cash In + Cash Payments Received (during this shift) - Cash Refunds = Current Cash Balance
  const currentCashBalance = (() => {
    let balance = cashInAmount; // Start with cash in amount

    // Get shift start time to filter orders from this shift only
    const shiftStartTime = cashInTime ? new Date(cashInTime) : null;

    // Add cash payments from paid orders (only from current shift)
    const cashPayments = orders
      .filter((o) => {
        // Must be paid with cash
        if (!o.isPaid || o.paymentMethod !== "cash") return false;
        
        // If we have shift start time, only count orders created after shift started
        if (shiftStartTime) {
          const orderTime = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
          return orderTime >= shiftStartTime;
        }
        
        // If no shift start time, count all cash payments (fallback)
        return true;
      })
      .reduce((sum, o) => sum + o.total, 0);
    balance += cashPayments;

    // Subtract cash refunds (if any orders are refunded with cash during this shift)
    const cashRefunds = orders
      .filter((o) => {
        // Must be refunded and paid with cash
        if (!o.refundStatus || o.paymentMethod !== "cash") return false;
        
        // If we have shift start time, only count refunds from orders in this shift
        if (shiftStartTime) {
          const orderTime = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
          return orderTime >= shiftStartTime;
        }
        
        return true;
      })
      .reduce((sum, o) => sum + o.total, 0);
    balance -= cashRefunds;

    return balance;
  })();

  // Keep todaysSales for other uses (if needed)
  const todaysSales = orders
    .filter((o) => o.isPaid)
    .reduce((sum, o) => sum + o.total, 0);

  // Map menu items with images
  const menuWithImages = menuItems.map((item) => ({
    ...item,
    image: imageMap[item.id] || item.image || '/placeholder.svg',
  }));

  const filteredItems = (() => {
    // Get category name if filtering by category ID
    const selectedCategory = activeCategory === "all" 
      ? null 
      : categories.find(c => c.id === activeCategory || c._id === activeCategory);
    
    let items = activeCategory === "all"
      ? menuWithImages
      : menuWithImages.filter((item) => item.category === selectedCategory?.name || item.category === selectedCategory?.id);
    
    // Apply search filter
    if (menuSearch.trim()) {
      const searchLower = menuSearch.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    return items;
  })();

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) return;
    setShowTableDialog(true);
    setSelectedTable(null);
  };

  const handleConfirmPlaceOrder = () => {
    if (cartItems.length === 0 || selectedTable === null) return;

    // Check if table has active orders
    const existingOrdersForTable = activeOrders.filter(
      (o) => o.tableNumber === selectedTable
    );

    if (existingOrdersForTable.length > 0) {
      // Show popup to ask if they want to create a new order
      setPendingTableForOrder(selectedTable);
      setShowNewOrderDialog(true);
      setShowTableDialog(false);
      return;
    }

    // No existing orders, proceed normally
    createNewOrderForTable(selectedTable);
  };

  const createNewOrderForTable = async (tableId: number) => {
    if (cartItems.length === 0) return;

    const table = tablesConfig.find((t) => t.id === tableId);
    const existingOrdersForTable = activeOrders.filter(
      (o) => o.tableNumber === tableId
    );
    const orderNumber = existingOrdersForTable.length + 1;

    const cashierId = localStorage.getItem("cashierId");
    const cashierName = localStorage.getItem("cashierFullName") || localStorage.getItem("username") || "Cashier";

    try {
      const orderRequest = {
        customerName: table
          ? orderNumber === 1
            ? `Table ${table.label}`
            : `Table ${table.label} - Order ${orderNumber}`
          : `Table ${tableId}`,
        items: cartItems.map(item => ({
          menuItem: {
            id: item.menuItem.id || item.menuItem._id || '',
            _id: item.menuItem._id || item.menuItem.id || '',
            name: item.menuItem.name,
            description: item.menuItem.description,
            price: item.menuItem.price,
            category: item.menuItem.category,
            image: item.menuItem.image,
          },
          quantity: item.quantity,
        })),
        total: cartTotal(),
        orderType: 'dining' as const,
        tableNumber: tableId,
        isPaid: false, // Dining orders are not paid at placement
        cashierId: cashierId || undefined,
        cashierName: cashierName,
      };

      const response = await createOrder(orderRequest);
      
      if (response.success && response.data) {
        // Add to local store for immediate UI update
        const order = {
          ...response.data.order,
          id: response.data.order.id || response.data.order.orderId || response.data.order._id,
          createdAt: new Date(response.data.order.createdAt),
          completedAt: response.data.order.completedAt 
            ? (typeof response.data.order.completedAt === 'string' 
                ? new Date(response.data.order.completedAt) 
                : response.data.order.completedAt)
            : undefined,
        };
        addOrder(order);
        // Reload orders from database to ensure consistency
        await loadOrders();
        
        toast({
          title: "Order Placed",
          description: response.data.message || "Dining order has been placed successfully.",
        });
        
        clearCart();
        setShowTableDialog(false);
        setSelectedTable(null);
        setShowNewOrderDialog(false);
        setPendingTableForOrder(null);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Place Order",
          description: response.error || "Could not place order. Please try again.",
        });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place order. Please try again.",
      });
    }
  };

  const handleConfirmNewOrder = () => {
    if (pendingTableForOrder !== null) {
      createNewOrderForTable(pendingTableForOrder);
    }
  };

  // Handle table release by cashier
  const handleReleaseTable = (tableId: number) => {
    const table = tablesConfig.find((t) => t.id === tableId);
    const tableLabel = table?.label || tableId.toString();
    
    // Release the table via WebSocket
    wsService.releaseTable(tableId);
    
    toast({
      title: "Table Released",
      description: `Table ${tableLabel} has been released and is now available.`,
    });
  };

  const handleSettleTable = (tableId: number) => {
    // Get all orders for this table
    const tableOrders = activeOrders.filter(
      (o) => o.tableNumber === tableId
    );
    
    // Clear current cart
    clearCart();
    
    // Add all items from all orders to cart
    tableOrders.forEach((order) => {
      order.items.forEach((item) => {
        // Add each item with its quantity
        for (let i = 0; i < item.quantity; i++) {
          addItem(item.menuItem);
        }
      });
    });
    
    // Set the table as selected
    setSelectedTable(tableId);
    
    // Switch to menu tab to show the cart
    setActiveTab("menu");
    
    // Close settle dialog if open
    setShowSettleDialog(false);
    setSettleTableNumber(null);
  };

  const handleSettleTakeawayOrder = async (orderId: string) => {
    try {
      const response = await settleOrder(orderId);
      if (response.success) {
        // Reload orders from database
        await loadOrders();
        toast({
          title: "Order Settled",
          description: "Takeaway order has been settled successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to settle order. Please try again.",
        });
      }
    } catch (error) {
      console.error('Failed to settle takeaway order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to settle order. Please try again.",
      });
    }
  };

  // Get blocked tables from WebSocket/localStorage
  useEffect(() => {
    // Load initial blocked tables
    setBlockedTables(wsService.getBlockedTables());

    // Ensure we're subscribed to tables room for real-time updates
    const ensureSubscription = () => {
      if (socketService.connected) {
        socketService.emit('subscribe:tables', {});
        console.log('📢 Cashier Dashboard: Subscribed to tables room');
      }
    };

    // Subscribe immediately if connected
    ensureSubscription();

    // Also subscribe when socket connects
    const unsubscribeConnect = socketService.on('connect', () => {
      console.log('📢 Cashier Dashboard: Socket connected, subscribing to tables');
      ensureSubscription();
    });

    // If not connected yet, wait for connection
    if (!socketService.connected) {
      const checkConnection = setInterval(() => {
        if (socketService.connected) {
          ensureSubscription();
          clearInterval(checkConnection);
        }
      }, 100);
      
      // Cleanup interval after 5 seconds
      setTimeout(() => clearInterval(checkConnection), 5000);
    }

    // Listen for table block events from wsService (localStorage fallback)
    const unsubscribeBlock = wsService.on('table_blocked', (data) => {
      console.log('📢 Received table_blocked via wsService:', data);
      setBlockedTables((prev) => ({
        ...prev,
        [data.tableId]: {
          label: data.tableLabel,
          timestamp: data.timestamp,
        },
      }));
    });

    // Listen for table release events from wsService (localStorage fallback)
    const unsubscribeRelease = wsService.on('table_released', (data) => {
      console.log('📢 Received table_released via wsService:', data);
      setBlockedTables((prev) => {
        const updated = { ...prev };
        delete updated[data.tableId];
        return updated;
      });
    });

    // Listen for table block events from Socket.IO (real-time)
    const unsubscribeSocketBlock = socketService.on('table_blocked', (data) => {
      console.log('📢 Cashier Dashboard: Received table_blocked via Socket.IO:', data);
      setBlockedTables((prev) => ({
        ...prev,
        [data.tableId]: {
          label: data.tableLabel,
          timestamp: data.timestamp,
        },
      }));
    });

    // Listen for table release events from Socket.IO (real-time)
    const unsubscribeSocketRelease = socketService.on('table_released', (data) => {
      console.log('📢 Cashier Dashboard: Received table_released via Socket.IO:', data);
      setBlockedTables((prev) => {
        const updated = { ...prev };
        delete updated[data.tableId];
        return updated;
      });
    });

    // Poll for updates (fallback for localStorage)
    const pollInterval = setInterval(() => {
      const current = wsService.getBlockedTables();
      setBlockedTables(current);
    }, 2000);

    return () => {
      unsubscribeBlock();
      unsubscribeRelease();
      unsubscribeSocketBlock();
      unsubscribeSocketRelease();
      clearInterval(pollInterval);
    };
  }, []);

  // Get occupied tables from active orders
  const occupiedTables = activeOrders
    .filter((o) => o.tableNumber)
    .map((o) => o.tableNumber!);
  
  // Get blocked table IDs
  const blockedTableIds = Object.keys(blockedTables).map(Number);

  // Check for active shift on mount and restore session
  useEffect(() => {
    const checkActiveShift = async () => {
      const cashierId = localStorage.getItem("cashierId");
      const hasCashIn = localStorage.getItem("cashInAmount") !== null;
      
      // If we have cash in locally, verify with server
      if (cashierId && hasCashIn) {
        try {
          const response = await getActiveShift(cashierId);
          if (response.success && response.data) {
            if (response.data.activeShift) {
              // Active shift exists - restore session data
              const shift = response.data.activeShift;
              localStorage.setItem("cashInAmount", shift.cashInAmount.toString());
              localStorage.setItem("cashInTime", new Date(shift.cashInTime).toISOString());
              localStorage.setItem("shiftId", shift.id);
              console.log("✅ Active shift restored from server");
            } else {
              // No active shift on server but we have local data - clear it
              localStorage.removeItem("cashInAmount");
              localStorage.removeItem("cashInTime");
              localStorage.removeItem("shiftId");
              toast({
                variant: "destructive",
                title: "Session Expired",
                description: "No active shift found. Please cash in again.",
              });
              navigate("/login", { replace: true });
            }
          }
        } catch (error) {
          console.error("Error checking active shift:", error);
          // On error, keep local session but log warning
        }
      } else if (cashierId && !hasCashIn) {
        // No local cash in - check if there's an active shift on server
        try {
          const response = await getActiveShift(cashierId);
          if (response.success && response.data && response.data.activeShift) {
            // Active shift exists on server - restore it
            const shift = response.data.activeShift;
            localStorage.setItem("cashInAmount", shift.cashInAmount.toString());
            localStorage.setItem("cashInTime", new Date(shift.cashInTime).toISOString());
            localStorage.setItem("shiftId", shift.id);
            toast({
              title: "Session Restored",
              description: "Your active shift has been restored.",
            });
          }
        } catch (error) {
          console.error("Error checking active shift:", error);
        }
      }
    };
    
    checkActiveShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tables from database
  useEffect(() => {
    loadMenuItems();
    loadTables();
    loadOrders();

    // Subscribe to table updates via WebSocket
    const unsubscribeTable = socketService.on('table_update', (message) => {
      console.log('📢 Table update received:', message.type);
      // Reload tables when any update occurs
      loadTables();
    });

    // Subscribe to menu item updates via WebSocket
    const unsubscribeMenu = socketService.on('menu_item_update', (message) => {
      console.log('📢 Menu item update received:', message.type);
      // Silently reload menu items when any update occurs (without showing loading spinner)
      loadMenuItems(false);
    });

    // Subscribe to order updates via WebSocket (for live status updates from kitchen)
    const unsubscribeOrder = socketService.on('order_update', (message) => {
      console.log('📢 Order update received:', message.type);
      
      // Handle new customer order from table - show notification popup
      // Only show for dining orders from customers (not cashier-created orders)
      // Cashier orders have cashierId set, so they are auto-confirmed and don't need popup
      if (
        message.type === 'order_created' && 
        message.order?.orderType === 'dining' && 
        message.order?.tableNumber &&
        !message.order?.cashierId // Only show popup for customer orders (no cashierId)
      ) {
        // Transform order to match Order type
        const newOrder: Order = {
          id: message.order.id || message.order.orderId || message.order._id || '',
          orderId: message.order.orderId || message.order.id,
          _id: message.order._id || message.order.id,
          customerName: message.order.customerName,
          items: message.order.items || [],
          status: message.order.status || 'new',
          total: message.order.total || 0,
          createdAt: message.order.createdAt ? new Date(message.order.createdAt) : new Date(),
          isPaid: message.order.isPaid || false,
          isSettled: message.order.isSettled || false,
          orderType: message.order.orderType || 'dining',
          tableNumber: message.order.tableNumber,
        };
        
        // Play notification sound
        playNotificationSound();
        
        // Show notification popup for cashier to confirm/cancel
        setPendingOrderNotification(newOrder);
        setShowOrderNotification(true);
      }
      
      // Handle order cancellation
      if (message.type === 'order_status_changed' && message.order?.status === 'cancelled') {
        // Play cancel sound
        playCancelSound();
        
        // Show notification in top right corner (important notification)
        const orderId = message.order.id || message.order._id || message.order.orderId || '';
        if (orderId) {
          showCancellationNotification(String(orderId));
        }
        
        // Reload orders to reflect cancellation
        setTimeout(() => {
          loadOrders(false);
        }, 500);
      } else if (message.type !== 'order_created') {
        // Silently reload orders when status changes (without showing loading spinner)
        // But skip if it's a new order (we handle that above)
        loadOrders(false);
      }
    });

    // Subscribe to bell requests from customers
    const unsubscribeBell = socketService.on('bell_request', (message: { tableId: number; tableLabel: string; timestamp: number }) => {
      console.log('🔔 Bell request received from table:', message.tableId);
      // Play notification sound
      playNotificationSound();
      // Show bell notification
      setBellRequest({ tableId: message.tableId, tableLabel: message.tableLabel });
      setShowBellNotification(true);
    });

    // Subscribe to bill requests from customers
    const unsubscribeBill = socketService.on('bill_request', (message: { tableId: number; tableLabel: string; timestamp: number }) => {
      console.log('🧾 CashierDashboard: Bill request received:', message);
      console.log('🧾 Table ID:', message.tableId, 'Table Label:', message.tableLabel);
      
      // Play notification sound immediately
      console.log('🔔 Triggering notification sound for bill request...');
      playNotificationSound();
      
      // Show bill notification popup
      setBillRequest({ tableId: message.tableId, tableLabel: message.tableLabel });
      setShowBillNotificationPopup(true);
      
      console.log('🧾 Bill notification popup state updated - should be visible now');
    });

    return () => {
      unsubscribeTable();
      unsubscribeMenu();
      unsubscribeOrder();
      unsubscribeBell();
      unsubscribeBill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show cancellation notification in top right corner
  const showCancellationNotification = (orderId: string) => {
    setCancelledOrderId(orderId);
    setShowCancelNotification(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowCancelNotification(false);
    }, 3000);
  };

  // Play notification sound for new orders, bell requests, and bill requests
  const playNotificationSound = () => {
    try {
      console.log('🔔 Playing notification sound...');
      const audio = new Audio(bellSound);
      audio.volume = 0.7; // Slightly louder for better visibility
      
      // Preload and play
      audio.preload = 'auto';
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔔 Notification sound played successfully');
          })
          .catch((error) => {
            // Silently handle autoplay policy restrictions (browser requires user interaction first)
            // This is expected behavior and not a critical error
            if (error.name !== 'NotAllowedError') {
              console.warn('⚠️ Failed to play notification sound:', error);
            } else {
              console.log('ℹ️ Notification sound blocked by browser autoplay policy (user interaction required)');
            }
          });
      }
    } catch (error) {
      // Silently handle errors (browser autoplay policy)
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        console.warn('⚠️ Failed to play notification sound:', error);
      }
    }
  };

  // Play cancel sound for 1 second
  const playCancelSound = () => {
    try {
      console.log('🔕 Playing cancel sound...');
      // Create audio element for cancel sound
      const audio = new Audio(cancelSound);
      audio.volume = 0.7; // Set volume (0.0 to 1.0)
      
      // Handle audio loading
      const handleCanPlay = () => {
        console.log('🔕 Cancel audio can play');
        // Play the audio
        audio.play().then(() => {
          console.log('🔕 Cancel sound playing');
        }).catch((error) => {
          console.error('Failed to play cancel sound:', error);
        });
      };
      
      audio.addEventListener('canplay', handleCanPlay);
      
      // Load the audio
      audio.load();
      
      // Stop after 1 second
      const stopTimer = setTimeout(() => {
        console.log('🔕 Stopping cancel sound after 1 second');
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
        audio.removeEventListener('canplay', handleCanPlay);
      }, 1000);
      
      // Clean up on error
      audio.addEventListener('error', (e) => {
        console.error('🔕 Cancel audio error:', e);
        clearTimeout(stopTimer);
      });
    } catch (error) {
      console.error('Failed to initialize cancel sound:', error);
    }
  };

  const loadMenuItems = async (showLoading: boolean = true) => {
    if (showLoading) {
      setIsLoadingMenu(true);
    }
    try {
      const menuResponse = await getMenuItems();
      const categoriesResponse = await getCategories();
      
      if (menuResponse.success && menuResponse.data) {
        // Filter only available items
        const availableItems = menuResponse.data.menuItems.filter(item => item.available !== false);
        setMenuItems(availableItems);
        
        // Show subtle notification on WebSocket update (not on initial load)
        if (!showLoading) {
          console.log('✅ Menu updated in real-time');
        }
      } else {
        if (showLoading) {
          toast({
            variant: "destructive",
            title: "Failed to Load Menu",
            description: menuResponse.error || "Could not fetch menu items from database.",
          });
        }
      }
      
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data.categories);
      } else {
        if (showLoading) {
          toast({
            variant: "destructive",
            title: "Failed to Load Categories",
            description: categoriesResponse.error || "Could not fetch categories from database.",
          });
        }
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
      if (showLoading) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load menu items. Please try again.",
        });
      }
    } finally {
      if (showLoading) {
        setIsLoadingMenu(false);
      }
    }
  };

  // Load unsettled orders from database
  const loadOrders = async (showLoading: boolean = true) => {
    if (showLoading) {
      setIsLoadingOrders(true);
    }
    try {
      const response = await getOrders({ isSettled: false });
      if (response.success && response.data) {
        // Transform orders to match Order type
        interface OrderFromAPI {
          id?: string;
          orderId?: string;
          _id?: string;
          createdAt: Date | string;
          completedAt?: Date | string;
          [key: string]: unknown;
        }

        const dbOrders = response.data.orders.map((order: OrderFromAPI) => ({
          ...order,
          id: order.id || order.orderId || order._id || '',
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt 
            ? (typeof order.completedAt === 'string' 
                ? new Date(order.completedAt) 
                : order.completedAt)
            : undefined,
        }));
        setOrders(dbOrders);
      } else {
        console.error('Failed to load orders:', response.error);
        if (showLoading) {
          toast({
            variant: "destructive",
            title: "Failed to Load Orders",
            description: response.error || "Could not fetch orders from database.",
          });
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      if (showLoading) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load orders. Please try again.",
        });
      }
    } finally {
      if (showLoading) {
        setIsLoadingOrders(false);
      }
    }
  };

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await getTables();
      if (response.success && response.data) {
        // Transform tables to match expected format with numeric IDs
        // Prioritize tableNumber from database, fallback to id or generate from _id
        const transformedTables = response.data.tables.map((table) => ({
          ...table,
          id: table.tableNumber || (typeof table.id === 'number' ? table.id : parseInt(table._id?.slice(-6) || '0', 16) || 0),
        }));
        setTablesConfig(transformedTables);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Tables",
          description: response.error || "Could not fetch tables from database.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tables. Please try again.",
      });
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handlePayAndPlace = () => {
    if (cartItems.length === 0) return;

    // Allow Pay & Place for:
    // 1. Takeaway orders (no table selected)
    // 2. Settle scenario (table selected with existing orders)
    if (selectedTable && !isSettlingTable) {
      toast({
        variant: "destructive",
        title: "Invalid Operation",
        description: "Pay & Place Order is only for takeaway orders. Use 'Place Order' for dining orders.",
      });
      return;
    }

    // Show payment dialog to select payment method (for both takeaway and settle)
    setShowPaymentDialog(true);
    setPaymentMethod(null);
    setCashAmount("");
  };

  const handlePaymentMethodSelect = (method: "card" | "cash") => {
    setPaymentMethod(method);
  };

  const handleCompletePayment = async (method: "card" | "cash") => {
    if (cartItems.length === 0) return;

    const table = selectedTable ? tablesConfig.find((t) => t.id === selectedTable) : null;
    const isTakeaway = !selectedTable;
    
    // Check if table has existing orders (settle scenario)
    const existingOrdersForTable = selectedTable
      ? activeOrders.filter((o) => o.tableNumber === selectedTable)
      : [];

    // If there are existing orders for table, just settle them and release table
    if (existingOrdersForTable.length > 0) {
      // Mark all existing orders as paid and completed in database
      try {
        await Promise.all(
          existingOrdersForTable.map(async (order) => {
            if (!order.isPaid) {
              await markOrderPaid(order.id, method);
            }
            await updateOrderStatusAPI(order.id, "completed");
          })
        );
        // Reload orders from database
        await loadOrders();
        
        toast({
          title: "Orders Settled",
          description: `All orders for table ${table?.label || selectedTable} have been settled successfully.`,
        });
      } catch (error) {
        console.error('Failed to settle orders:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to settle orders. Please try again.",
        });
        return;
      }
      
      // Clear cart and close dialog - table is released
      clearCart();
      setShowPaymentDialog(false);
      setPaymentMethod(null);
      setCashAmount("");
      setSelectedTable(null);
      return;
    }

    // No existing orders - create new order (takeaway only - payment required)
    // "Pay & Place Order" should only create takeaway orders
    if (!isTakeaway) {
      toast({
        variant: "destructive",
        title: "Invalid Operation",
        description: "Pay & Place Order is only for takeaway orders. Use 'Place Order' for dining orders.",
      });
      setShowPaymentDialog(false);
      return;
    }

    const cashierId = localStorage.getItem("cashierId");
    const cashierName = localStorage.getItem("cashierFullName") || localStorage.getItem("username") || "Cashier";

    try {
      const orderRequest = {
        customerName: `Takeaway #${orders.filter((o) => o.orderType === 'takeaway').length + 1}`,
        items: cartItems.map(item => ({
          menuItem: {
            id: item.menuItem.id || item.menuItem._id || '',
            _id: item.menuItem._id || item.menuItem.id || '',
            name: item.menuItem.name,
            description: item.menuItem.description,
            price: item.menuItem.price,
            category: item.menuItem.category,
            image: item.menuItem.image,
          },
          quantity: item.quantity,
        })),
        total: cartTotal(),
        orderType: 'takeaway' as const,
        isPaid: true, // Takeaway orders are paid immediately
        paymentMethod: method,
        cashierId: cashierId || undefined,
        cashierName: cashierName,
      };

      const response = await createOrder(orderRequest);
      
      if (response.success && response.data) {
        // Add to local store for immediate UI update
        const order = {
          ...response.data.order,
          id: response.data.order.id || response.data.order.orderId || response.data.order._id,
          createdAt: new Date(response.data.order.createdAt),
          completedAt: response.data.order.completedAt 
            ? (typeof response.data.order.completedAt === 'string' 
                ? new Date(response.data.order.completedAt) 
                : response.data.order.completedAt)
            : undefined,
        };
        addOrder(order);
        // Reload orders from database to ensure consistency
        await loadOrders();
        
        toast({
          title: "Order Placed & Paid",
          description: response.data.message || "Takeaway order has been placed and payment completed.",
        });
        
        clearCart();
        setShowPaymentDialog(false);
        setPaymentMethod(null);
        setCashAmount("");
        setSelectedTable(null);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Place Order",
          description: response.error || "Could not place order. Please try again.",
        });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place order. Please try again.",
      });
    }
  };

  // Get order total from cart
  const getOrderTotal = () => {
    // If settling table orders, calculate total from existing orders
    if (isSettlingTable && selectedTable) {
      const tableOrders = activeOrders.filter((o) => o.tableNumber === selectedTable);
      return tableOrders.reduce((sum, order) => sum + order.total, 0);
    }
    // Otherwise, use cart total
    return cartTotal();
  };

  const cashBalance = paymentMethod === "cash" && cashAmount
    ? parseFloat(cashAmount) - getOrderTotal()
    : 0;

  const handleHoldCart = () => {
    if (cartItems.length === 0) return;
    holdCart(holdCartName || `Cart ${heldCarts.length + 1}`);
    clearCart();
    setHoldCartName("");
    setShowHoldDialog(false);
  };

  const handleLoadHeldCart = (heldCartId: string) => {
    loadHeldCart(heldCartId);
    setShowSelectDialog(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirmation(false);
    setShowCashOutDialog(true);
  };

  const handleCashOutComplete = async (amount: number) => {
    try {
      const cashierId = localStorage.getItem("cashierId");
      const username = localStorage.getItem("username");

      if (!cashierId || !username) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Cashier information not found. Please login again.",
        });
        return;
      }

      const response = await cashOut({
        cashierId,
        cashierUsername: username,
        cashOutAmount: amount,
      });

      if (response.success && response.data) {
        // Store cash out amount for local reference
        localStorage.setItem("cashOutAmount", amount.toString());
        localStorage.setItem("cashOutTime", new Date().toISOString());
        
        // Calculate and store difference
        if (response.data.shift.difference !== undefined) {
          localStorage.setItem("cashDifference", response.data.shift.difference.toString());
        }
        
        toast({
          title: "Cash Out Recorded",
          description: response.data.message || "Shift completed successfully.",
        });
        
        // Clear all session data
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        localStorage.removeItem("username");
        localStorage.removeItem("cashierId");
        localStorage.removeItem("cashierFullName");
        localStorage.removeItem("cashInAmount");
        localStorage.removeItem("cashInTime");
        localStorage.removeItem("shiftId");
        
        // Navigate to login
        navigate("/login", { replace: true });
      } else {
        toast({
          variant: "destructive",
          title: "Cash Out Failed",
          description: response.error || "Failed to record cash out. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while recording cash out. Please try again.",
      });
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-20 bg-primary items-center py-6">
        <div className="mb-8 scale-[0.65] -mt-8">
          <Logo />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-2">
          <button
            onClick={() => setActiveTab("menu")}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "menu"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/60 hover:bg-primary-foreground/10"
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === "orders"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/60 hover:bg-primary-foreground/10"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-medium">Orders</span>
            {activeOrders.length > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "history"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/60 hover:bg-primary-foreground/10"
            }`}
            title="History"
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "analytics"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/60 hover:bg-primary-foreground/10"
            }`}
            title="Analytics"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "settings"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/60 hover:bg-primary-foreground/10"
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </nav>

        {/* Logout Button - Shows on hover */}
        <div className="mt-auto group relative">
          <button
            onClick={handleLogoutClick}
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-primary-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-all duration-300 relative overflow-hidden"
            title="Logout"
          >
            <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[10px] font-medium">Logout</span>
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          </button>
        </div>

        <div className="mt-4">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
            C1
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Menu / Orders Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <Logo />
              </div>
              <div className="hidden lg:block">
                <h1 className="text-xl font-archivo font-bold text-foreground">
                  {activeTab === "menu" 
                    ? "Point Of Sale" 
                    : activeTab === "orders" 
                    ? "Active Orders" 
                    : activeTab === "history"
                    ? "Order History"
                    : activeTab === "analytics"
                    ? "Analytics"
                    : "Settings"}
                </h1>
                <p className="text-sm text-muted-foreground font-karla">
                  {activeTab === "menu"
                    ? "One Click"
                    : activeTab === "orders"
                    ? `${activeOrders.length} orders in queue`
                    : activeTab === "history"
                    ? "View settled order history"
                    : activeTab === "analytics"
                    ? "Track sales performance and insights"
                    : "Manage your account settings and preferences"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-success/10 rounded-lg">
                <span className="text-sm font-semibold text-success">
                  Rs. {currentCashBalance.toFixed(2)} cash
                </span>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="lg:hidden flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("menu")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "menu"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Menu
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    activeTab === "orders"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Orders
                  {activeOrders.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "history"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "analytics"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "settings"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === "menu" ? (
              <div key="menu" className="absolute inset-0 h-full flex flex-col animate-page-in">
                {/* Category Tabs */}
                <div className="px-6 py-4 border-b border-border bg-card/50">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={`touch-target flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                        activeCategory === "all"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`touch-target flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                          activeCategory === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Grid */}
                {isLoadingMenu ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading menu items...</p>
                    </div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Utensils className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        No menu items found
                      </h3>
                      <p className="text-muted-foreground font-karla">
                        {menuSearch || activeCategory !== "all"
                          ? "Try adjusting your search or filter"
                          : "Menu items will appear here"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredItems.map((item) => (
                        <button
                          key={item.id || item._id}
                          onClick={() => addItem(item)}
                          className="card-interactive p-3 text-left group"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-secondary">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h4 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                              {item.description}
                            </p>
                          )}
                          <p className="text-accent font-bold text-sm">
                            Rs. {item.price.toFixed(2)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "orders" ? (
              /* Orders View */
              <div key="orders" className="absolute inset-0 h-full overflow-y-auto p-4 animate-page-in">
                {activeOrders.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        No active orders
                      </h3>
                      <p className="text-muted-foreground font-karla">
                        Orders will appear here when placed
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeOrders.map((order, index) => {
                      const tableNum = order.tableNumber;
                      const table = tableNum ? tablesConfig.find((t) => t.id === tableNum) : null;
                      const otherOrdersForTable = tableNum
                        ? activeOrders.filter(
                            (o) => o.tableNumber === tableNum && o.id !== order.id
                          )
                        : [];
                      
                      // Check if this is the first order for this table
                      const isFirstOrderForTable = tableNum
                        ? activeOrders.findIndex((o) => o.tableNumber === tableNum) === index
                        : true;
                      
                      // Check if table has multiple orders
                      const hasMultipleOrders = tableNum && otherOrdersForTable.length > 0;

                      return (
                      <div key={order.id} className="card-elevated p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground font-sofia">
                              #{order.id}
                            </p>
                            <h3 className="font-bold text-foreground">
                              {order.customerName}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-karla">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(order.createdAt, {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                          <StatusBadge status={order.status} size="sm" />
                        </div>

                        <div className="space-y-1 mb-3 text-sm">
                          {order.items.map((item) => (
                            <div
                              key={item.menuItem.id}
                              className="flex justify-between"
                            >
                              <span>
                                {item.quantity}x {item.menuItem.name}
                              </span>
                              <span className="text-muted-foreground">
                                  Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Progress Bar */}
                        <div className="mb-3 pt-3 border-t border-border">
                          <div className="relative px-1">
                            {/* Progress Line */}
                            <div className="absolute top-4 left-4 right-4 h-[2px] bg-secondary/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                  order.status === "completed"
                                    ? "bg-gradient-to-r from-success to-success/80 w-full shadow-sm shadow-success/20"
                                    : order.status === "ready"
                                    ? "bg-gradient-to-r from-success to-success/80 w-2/3 shadow-sm shadow-success/20"
                                    : order.status === "cooking"
                                    ? "bg-gradient-to-r from-accent to-accent/80 w-1/3 shadow-sm shadow-accent/20"
                                    : "bg-transparent w-0"
                                }`}
                              />
                            </div>
                            
                            {/* Progress Steps */}
                            <div className="relative flex items-center justify-between">
                              {/* Confirmed */}
                              <div className="flex flex-col items-center gap-1 group cursor-default">
                                <div
                                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    order.status !== "cancelled"
                                      ? "bg-gradient-to-br from-success to-success/90 text-success-foreground shadow-md shadow-success/20 ring-2 ring-success/20 scale-100 group-hover:scale-110"
                                      : "bg-secondary/50 text-muted-foreground scale-100 group-hover:scale-105"
                                  }`}
                                >
                                  <Utensils className="w-3.5 h-3.5" />
                                  {order.status === "new" && (
                                    <div className="absolute inset-0 rounded-full bg-success/20 animate-ping opacity-75" />
                                  )}
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">
                                  Confirmed
                                </span>
                              </div>

                              {/* Start Cooking */}
                              <div className="flex flex-col items-center gap-1 group cursor-default">
                                <div
                                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    order.status === "cooking" ||
                                    order.status === "ready" ||
                                    order.status === "completed"
                                      ? "bg-gradient-to-br from-accent to-accent/90 text-accent-foreground shadow-md shadow-accent/20 ring-2 ring-accent/20 scale-100 group-hover:scale-110"
                                      : "bg-secondary/50 text-muted-foreground scale-100 group-hover:scale-105"
                                  }`}
                                >
                                  <Flame className="w-3.5 h-3.5" />
                                  {order.status === "cooking" && (
                                    <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-75" />
                                  )}
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">
                                  Start Cooking
                                </span>
                              </div>

                              {/* Ready To Serving */}
                              <div className="flex flex-col items-center gap-1 group cursor-default">
                                <div
                                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    order.status === "ready" ||
                                    order.status === "completed"
                                      ? "bg-gradient-to-br from-success to-success/90 text-success-foreground shadow-md shadow-success/20 ring-2 ring-success/20 scale-100 group-hover:scale-110"
                                      : "bg-secondary/50 text-muted-foreground scale-100 group-hover:scale-105"
                                  }`}
                                >
                                  <Soup className="w-3.5 h-3.5" />
                                  {order.status === "ready" && (
                                    <div className="absolute inset-0 rounded-full bg-success/20 animate-ping opacity-75" />
                                  )}
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">
                                  Ready To Serving
                                </span>
                              </div>

                              {/* Served */}
                              <div className="flex flex-col items-center gap-1 group cursor-default">
                                <div
                                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    order.status === "completed"
                                      ? "bg-gradient-to-br from-success to-success/90 text-success-foreground shadow-md shadow-success/20 ring-2 ring-success/20 scale-100 group-hover:scale-110"
                                      : "bg-secondary/50 text-muted-foreground scale-100 group-hover:scale-105"
                                  }`}
                                >
                                  <UtensilsCrossed className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">
                                  Served
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">
                                Rs. {order.total.toFixed(2)}
                            </span>
                            {order.isPaid ? (
                              <span className="text-[10px] font-sofia font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full">
                                PAID
                              </span>
                            ) : (
                              <span className="text-[10px] font-sofia font-semibold text-destructive bg-destructive/15 px-2 py-0.5 rounded-full">
                                UNPAID
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          {order.status === "new" && (
                              <button
                                 onClick={() => {
                                   setOrderToCancel(order.id);
                                   setShowCancelOrderDialog(true);
                                 }}
                                 className="py-2 px-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                               >
                                 <X className="w-4 h-4" />
                              </button>
                          )}
                          {/* Show Refund button for cancelled takeaway orders */}
                          {order.status === "cancelled" && order.orderType === "takeaway" && !order.refundStatus && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await markOrderRefunded(order.id);
                                  if (response.success) {
                                    toast({
                                      title: "Order Refunded",
                                      description: `Order #${order.id} has been marked as refunded.`,
                                    });
                                    // Reload orders to reflect refund status
                                    await loadOrders(false);
                                  } else {
                                    toast({
                                      variant: "destructive",
                                      title: "Failed to Refund Order",
                                      description: response.error || "Could not mark order as refunded. Please try again.",
                                    });
                                  }
                                } catch (error) {
                                  console.error('Failed to refund order:', error);
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to mark order as refunded. Please try again.",
                                  });
                                }
                              }}
                              className="flex-1 py-2 bg-accent text-accent-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-accent/90 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Refund
                            </button>
                          )}
                          {/* Show Refunded badge if already refunded */}
                          {order.status === "cancelled" && order.orderType === "takeaway" && order.refundStatus && (
                            <div className="flex-1 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-1 opacity-60">
                              <RotateCcw className="w-4 h-4" />
                              Refunded
                            </div>
                          )}
                            {/* Show Settle button only when order status is completed (Served) */}
                            {order.status === "completed" && !hasMultipleOrders && (
                              <button
                                onClick={() => {
                                  if (order.tableNumber) {
                                    // Table order - show settle dialog
                                    handleSettleTable(order.tableNumber);
                                  } else {
                                    // Takeaway order - settle it (payment already done when placing order)
                                    handleSettleTakeawayOrder(order.id);
                                  }
                                }}
                              className="flex-1 py-2 bg-success text-success-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-success/90 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                                Settle
                              </button>
                          )}
                          {/* Show disabled Settle button for non-completed orders */}
                          {order.status !== "completed" && order.status !== "cancelled" && !hasMultipleOrders && (
                            <button
                              disabled
                              className="flex-1 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
                            >
                              <CreditCard className="w-4 h-4" />
                              Settle
                            </button>
                          )}
                        </div>

                          {/* Settle All Button - Show only if all orders for table are completed */}
                          {hasMultipleOrders && (() => {
                            const allTableOrders = activeOrders.filter((o) => o.tableNumber === tableNum);
                            const allCompleted = allTableOrders.every((o) => o.status === "completed");
                            return allCompleted ? (
                              <button
                                onClick={() => handleSettleTable(tableNum!)}
                                className="w-full mt-2 py-2 bg-success text-success-foreground font-semibold rounded-lg text-sm hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                              >
                                <CreditCard className="w-4 h-4" />
                                Settle All ({otherOrdersForTable.length + 1} orders)
                              </button>
                            ) : (
                              <button
                                disabled
                                className="w-full mt-2 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg text-sm opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <CreditCard className="w-4 h-4" />
                                Settle All ({otherOrdersForTable.length + 1} orders)
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === "history" ? (
              /* History View */
              <div key="history" className="absolute inset-0 h-full animate-page-in">
                <CashierOrderHistory />
              </div>
            ) : activeTab === "analytics" ? (
              /* Analytics View */
              <div key="analytics" className="absolute inset-0 h-full animate-page-in">
                <Analytics />
              </div>
            ) : (
              /* Settings View */
              <div key="settings" className="absolute inset-0 h-full animate-page-in">
                <Settings />
              </div>
            )}
          </div>
        </div>

        {/* Cart / Order Panel */}
        <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            {/* Search Bar */}
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                {menuSearch && (
                  <button
                    onClick={() => setMenuSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <button
                className="relative px-3 py-2.5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center"
                title={`Cart (${cartItems.length} items)`}
              >
                <ShoppingCart className="w-4 h-4 text-foreground" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
            {cartItems.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-karla">
                    Select items from menu
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.menuItem.id}
                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl"
                  >
                    <img
                      src={imageMap[item.menuItem.id] || item.menuItem.image}
                      alt={item.menuItem.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {item.menuItem.name}
                      </h4>
                      <p className="text-accent font-semibold text-sm">
                        Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity - 1)
                        }
                        className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity + 1)
                        }
                        className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-4 border-t border-border space-y-4">
            {/* Hold/Select/Table/Clear Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowHoldDialog(true)}
                disabled={cartItems.length === 0}
                className="py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Hold Cart"
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSelectDialog(true)}
                disabled={heldCarts.length === 0}
                className="py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative"
                title="Select"
              >
                <BookmarkCheck className="w-4 h-4" />
                {heldCarts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {heldCarts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTableDialog(true)}
                className={`py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                  selectedTable
                    ? "bg-accent/10 text-accent hover:bg-accent/20"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                title={selectedTable ? `Table ${tablesConfig.find((t) => t.id === selectedTable)?.label}` : "Select Table"}
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowClearCartDialog(true)}
                disabled={cartItems.length === 0}
                className="py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear Order"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-karla">Subtotal</span>
              <span className="font-bold text-xl text-foreground">
                Rs. {cartTotal().toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePlaceOrder}
                disabled={
                  cartItems.length === 0 ||
                  (selectedTable &&
                    activeOrders.some(
                      (o) => o.tableNumber === selectedTable && !o.isPaid
                    ))
                }
                className="py-3 bg-primary text-primary-foreground font-semibold rounded-xl transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Place Order
              </button>
              <button
                onClick={handlePayAndPlace}
                disabled={cartItems.length === 0 || (selectedTable !== null && !isSettlingTable)}
                className="py-3 bg-success text-success-foreground font-semibold rounded-xl transition-colors hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title={isSettlingTable ? "Pay & Settle (Complete payment for table orders)" : selectedTable ? "Pay & Place is only for takeaway orders" : "Pay & Place Order (Takeaway)"}
              >
                <CreditCard className="w-4 h-4" />
                {isSettlingTable ? "Pay & Settle" : "Pay & Place"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hold Cart Dialog */}
      {showHoldDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => {
              setShowHoldDialog(false);
              setHoldCartName("");
            }}
          />
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-archivo font-bold text-foreground">
                Hold Cart
              </h3>
              <button
                onClick={() => {
                  setShowHoldDialog(false);
                  setHoldCartName("");
                }}
                className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
    </div>
            <p className="text-sm text-muted-foreground font-karla mb-4">
              Save this cart for later. Give it a name to easily identify it.
            </p>
            <input
              type="text"
              value={holdCartName}
              onChange={(e) => setHoldCartName(e.target.value)}
              placeholder="Cart name (e.g., Table 5, Customer Name)"
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleHoldCart();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowHoldDialog(false);
                  setHoldCartName("");
                }}
                className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg transition-colors hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldCart}
                disabled={cartItems.length === 0}
                className="flex-1 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hold Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Held Cart Dialog */}
      {showSelectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setShowSelectDialog(false)}
          />
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-elevated p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-archivo font-bold text-foreground">
                Select Held Cart
              </h3>
              <button
                onClick={() => setShowSelectDialog(false)}
                className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {heldCarts.length === 0 ? (
                <div className="text-center py-12">
                  <BookmarkCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-karla">
                    No held carts available
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {heldCarts.map((heldCart) => {
                    const heldTotal = heldCart.items.reduce(
                      (sum, item) =>
                        sum + item.menuItem.price * item.quantity,
                      0
                    );
                    return (
                      <div
                        key={heldCart.id}
                        className="p-4 bg-secondary/30 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {heldCart.name}
                            </h4>
                            <p className="text-xs text-muted-foreground font-karla">
                              {heldCart.items.length} item
                              {heldCart.items.length !== 1 ? "s" : ""} •{" "}
                              {formatDistanceToNow(heldCart.createdAt, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteHeldCart(heldCart.id)}
                            className="ml-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground font-karla">
                            {heldCart.items
                              .slice(0, 2)
                              .map((item) => item.menuItem.name)
                              .join(", ")}
                            {heldCart.items.length > 2 &&
                              ` +${heldCart.items.length - 2} more`}
                          </div>
                          <span className="font-bold text-accent">
                            Rs. {heldTotal.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleLoadHeldCart(heldCart.id)}
                          className="w-full mt-3 py-2 bg-accent text-accent-foreground font-semibold rounded-lg transition-colors hover:bg-accent/90 text-sm"
                        >
                          Load Cart
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => {
              setShowPaymentDialog(false);
              setPaymentMethod(null);
              setCashAmount("");
            }}
          />
          <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-elevated p-6 max-h-[90vh] overflow-y-auto">
            {!paymentMethod ? (
              /* Payment Method Selection */
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-archivo font-bold text-foreground">
                    Select Payment Method
                  </h3>
                  <button
                    onClick={() => {
                      setShowPaymentDialog(false);
                      setPaymentMethod(null);
                      setCashAmount("");
                    }}
                    className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePaymentMethodSelect("card")}
                    className="p-6 bg-secondary/50 rounded-xl border-2 border-border hover:border-accent transition-all hover:bg-secondary flex flex-col items-center gap-3"
                  >
                    <CreditCard className="w-12 h-12 text-accent" />
                    <span className="font-semibold text-foreground">Card</span>
                  </button>
                  <button
                    onClick={() => handlePaymentMethodSelect("cash")}
                    className="p-6 bg-secondary/50 rounded-xl border-2 border-border hover:border-accent transition-all hover:bg-secondary flex flex-col items-center gap-3"
                  >
                    <Wallet className="w-12 h-12 text-accent" />
                    <span className="font-semibold text-foreground">Cash</span>
                  </button>
                </div>
              </>
            ) : (
              /* Payment Receipt (Card or Cash) */
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-archivo font-bold text-foreground">
                    {paymentMethod === "card" ? "Card Payment" : "Cash Payment"}
                  </h3>
                  <button
                    onClick={() => {
                      setPaymentMethod(null);
                      setCashAmount("");
                    }}
                    className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Receipt */}
                <div className="bg-secondary/30 rounded-xl p-6 mb-6 border border-border">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                    <Receipt className="w-6 h-6 text-accent" />
                    <h4 className="text-lg font-archivo font-bold text-foreground">
                      Receipt
                    </h4>
                  </div>

                  {/* Customer Name / Table Info */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground font-karla mb-1">
                      {isSettlingTable ? "Table" : "Customer"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {isSettlingTable && selectedTable
                        ? `Table ${tablesConfig.find((t) => t.id === selectedTable)?.label || selectedTable}`
                        : customerName.trim() || `Order #${orders.length + 1}`}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4 space-y-2">
                    {cartItems.map((item) => (
                      <div
                        key={item.menuItem.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="text-muted-foreground font-karla">
                          Rs.{" "}
                          {(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-karla text-muted-foreground">
                        Subtotal
                      </span>
                      <span className="font-bold text-foreground">
                        Rs. {getOrderTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-karla text-muted-foreground">
                        Total
                      </span>
                      <span className="font-bold text-xl text-accent">
                        Rs. {getOrderTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cash Amount Input - Only for Cash Payment */}
                {paymentMethod === "cash" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Amount Received
                      </label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="Enter amount"
                        min={getOrderTotal()}
                        step="0.01"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                        autoFocus
                      />
                    </div>

                    {/* Balance Display */}
                    {cashAmount && parseFloat(cashAmount) >= getOrderTotal() && (
                      <div className="mb-6 p-4 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex justify-between items-center">
                          <span className="font-karla text-muted-foreground">
                            Balance
                          </span>
                          <span className="font-bold text-xl text-success">
                            Rs. {cashBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {cashAmount && parseFloat(cashAmount) < getOrderTotal() && (
                      <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <p className="text-sm text-destructive font-karla">
                          Insufficient amount. Please enter at least Rs.{" "}
                          {getOrderTotal().toFixed(2)}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Pay & Place/Settle Button */}
                <button
                  onClick={() => handleCompletePayment(paymentMethod!)}
                  disabled={
                    paymentMethod === "cash" &&
                    (!cashAmount ||
                      parseFloat(cashAmount) < getOrderTotal() ||
                      isNaN(parseFloat(cashAmount)))
                  }
                  className="w-full py-4 bg-success text-success-foreground font-bold text-lg rounded-xl transition-colors hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {isSettlingTable ? "Pay & Settle" : "Pay & Place Order"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Selection Dialog - Smart Version */}
      {showTableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-md animate-fade-in"
            onClick={() => {
              setShowTableDialog(false);
              setSelectedTable(null);
              setTableFilter("all");
              setTableSearch("");
            }}
          />
          <div className="relative w-full max-w-6xl bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-scale-in max-h-[95vh] flex flex-col">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                    <Table className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-archivo font-bold text-foreground flex items-center gap-2">
                      Select Table
                      <Sparkles className="w-5 h-5 text-accent" />
                    </h3>
                    <p className="text-sm text-muted-foreground font-karla mt-1">
                      Choose the perfect table for your order
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTableDialog(false);
                    setSelectedTable(null);
                    setTableFilter("all");
                    setTableSearch("");
                  }}
                  className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-colors bg-secondary/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Smart Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <div className="bg-card/80 rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Table className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-karla">Total Tables</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{tablesConfig.length}</span>
                </div>
                <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground font-karla">Available</span>
                  </div>
                  <span className="text-xl font-bold text-success">
                    {tablesConfig.filter(t => t.available !== false).length - occupiedTables.length}
                  </span>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-muted-foreground font-karla">Occupied</span>
                  </div>
                  <span className="text-xl font-bold text-destructive">
                    {occupiedTables.length}
                  </span>
                </div>
                <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Table className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground font-karla">Blocked</span>
                  </div>
                  <span className="text-xl font-bold text-warning">
                    {blockedTableIds.length}
                  </span>
                </div>
                <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground font-karla">Cart Items</span>
                  </div>
                  <span className="text-xl font-bold text-accent">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="p-6 border-b border-border bg-card/50">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search by table number..."
                    className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                  />
                </div>
                {/* Capacity Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-muted-foreground" />
                  <div className="flex gap-2 bg-secondary/50 rounded-xl p-1">
                    <button
                      onClick={() => setTableFilter("all")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tableFilter === "all"
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTableFilter(2)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tableFilter === 2
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      2 Seats
                    </button>
                    <button
                      onClick={() => setTableFilter(4)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tableFilter === 4
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      4 Seats
                    </button>
                    <button
                      onClick={() => setTableFilter(6)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tableFilter === 6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      6 Seats
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingTables ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                  <p className="text-muted-foreground font-karla">Loading tables...</p>
                </div>
              ) : (
                <>
                  {/* Filtered Tables */}
                  {(() => {
                    const filteredTables = tablesConfig.filter((table) => {
                      // Only show available tables
                      const isAvailable = table.available !== false;
                      const matchesFilter = tableFilter === "all" || table.capacity === tableFilter;
                      const matchesSearch =
                        !tableSearch ||
                        table.label.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        table.id.toString().includes(tableSearch);
                      return isAvailable && matchesFilter && matchesSearch;
                    });

                    if (filteredTables.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <Table className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-foreground mb-2">
                            No tables found
                          </h4>
                          <p className="text-sm text-muted-foreground font-karla">
                            Try adjusting your filters or search
                          </p>
                        </div>
                      );
                    }

                return (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredTables.map((table) => {
                      const tableId = typeof table.id === 'number' ? table.id : (table.tableNumber || parseInt(String(table.id || table._id || '0'), 10) || 0);
                      const isOccupied = occupiedTables.includes(tableId);
                      const isBlocked = blockedTableIds.includes(tableId);
                      const isSelected = selectedTable === tableId;


                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (isOccupied) {
                        // Allow selecting occupied table to create new order
                        setSelectedTable(tableId);
                      } else {
                        setSelectedTable(tableId);
                      }
                    }}
                    className={`
                      relative transition-all duration-300 ease-out
                      ${isSelected ? "scale-110 z-10" : "hover:scale-105"}
                      ${isOccupied ? "cursor-pointer opacity-80 hover:opacity-100" : isBlocked ? "cursor-pointer opacity-90 hover:opacity-100" : "cursor-pointer"}
                      group
                    `}
                  >
                    {/* Table with Chairs Container */}
                    <div className="relative w-32 h-32 mx-auto">
                      {/* Chairs positioned around table */}
                      {table.capacity === 2 && (
                        <>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                        </>
                      )}
                      {table.capacity === 4 && (
                        <>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-6 bg-foreground/20 rounded-sm" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-6 bg-foreground/20 rounded-sm" />
                        </>
                      )}
                      {table.capacity === 6 && (
                        <>
                          {/* Top row - 3 chairs */}
                          <div className="absolute top-0 left-[20%] -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute top-0 right-[20%] translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          {/* Bottom row - 3 chairs */}
                          <div className="absolute bottom-0 left-[20%] -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                          <div className="absolute bottom-0 right-[20%] translate-x-1/2 w-6 h-4 bg-foreground/20 rounded-sm" />
                        </>
                      )}

                      {/* Table Card */}
                      <div
                        className={`
                          absolute rounded-lg border-2 transition-all duration-300
                          flex flex-col items-center justify-center
                          ${
                            table.capacity === 6
                              ? "inset-y-3 inset-x-2"
                              : "inset-3"
                          }
                          ${
                            isSelected
                              ? "bg-accent border-accent text-accent-foreground shadow-xl ring-4 ring-accent/20"
                              : isOccupied
                              ? "bg-destructive/20 border-destructive/30 text-destructive/50"
                              : isBlocked
                              ? "bg-warning/20 border-warning/40 text-warning-foreground ring-2 ring-warning/30"
                              : "bg-card border-border group-hover:border-accent group-hover:shadow-lg text-foreground"
                          }
                        `}
                      >
                        <span className="font-bold text-sm">
                          Table {table.label}
                        </span>
                        <span className="text-xs font-karla mt-0.5 text-muted-foreground">
                          capacity {table.capacity}
                        </span>
                      </div>
                    </div>

                    {/* Blocked Badge - Customer scanning QR */}
                    {isBlocked && !isOccupied && (
                      <>
                        <div className="absolute top-0 right-0 bg-warning/90 text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-md rotate-12 shadow-md animate-pulse">
                          Scanning
                        </div>
                        {/* Release Button for Cashier */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent table selection
                            handleReleaseTable(tableId);
                          }}
                          className="absolute bottom-0 left-0 bg-success/90 hover:bg-success text-success-foreground p-1.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 z-20"
                          title="Release Table"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    
                    {/* Occupied Badge */}
                    {isOccupied && (
                      <div className="absolute top-0 right-0 bg-destructive/90 text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md rotate-12 shadow-md">
                        Occupied
                      </div>
                    )}

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-foreground rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </button>
                    );
                    })}
                  </div>
                );
              })()}
                </>
              )}
            </div>

            {/* Footer with Action Buttons */}
            <div className="p-6 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                {/* Selected Table Info */}
                {selectedTable ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Check className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-karla">Selected</p>
                      <p className="font-semibold text-foreground">
                        Table{" "}
                        {tablesConfig.find((t) => t.id === selectedTable)?.label} (
                        {tablesConfig.find((t) => t.id === selectedTable)?.capacity} seats)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Table className="w-4 h-4" />
                    <span className="text-sm font-karla">No table selected</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowTableDialog(false);
                      setSelectedTable(null);
                      setTableFilter("all");
                      setTableSearch("");
                    }}
                    className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-xl transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPlaceOrder}
                    disabled={selectedTable === null}
                    className="px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-xl transition-all hover:bg-accent/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Dialog - When selecting occupied table */}
      {showNewOrderDialog && pendingTableForOrder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-md"
            onClick={() => {
              setShowNewOrderDialog(false);
              setPendingTableForOrder(null);
            }}
          />
          <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center animate-pulse">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-archivo font-bold text-foreground">
                  New Order?
                </h3>
                <p className="text-xs text-muted-foreground font-karla">
                  {(() => {
                    const table = tablesConfig.find((t) => t.id === pendingTableForOrder);
                    const existingOrders = activeOrders.filter(
                      (o) => o.tableNumber === pendingTableForOrder
                    );
                    return `Table ${table?.label || pendingTableForOrder} has ${existingOrders.length} order${existingOrders.length !== 1 ? "s" : ""}`;
                  })()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewOrderDialog(false);
                  setPendingTableForOrder(null);
                }}
                className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-xl transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewOrder}
                className="flex-1 py-2.5 bg-accent text-accent-foreground font-semibold rounded-xl transition-all hover:bg-accent/90 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
              >
                <Check className="w-4 h-4" />
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Dialog - Show all orders for a table */}
      {showSettleDialog && settleTableNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-md"
            onClick={() => {
              setShowSettleDialog(false);
              setSettleTableNumber(null);
            }}
          />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-archivo font-bold text-foreground">
                  Settle Table
                </h3>
                <p className="text-sm text-muted-foreground font-karla mt-1">
                  {(() => {
                    const table = tablesConfig.find((t) => t.id === settleTableNumber);
                    return `Table ${table?.label || settleTableNumber}`;
                  })()}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSettleDialog(false);
                  setSettleTableNumber(null);
                }}
                className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const tableOrders = activeOrders.filter(
                (o) => o.tableNumber === settleTableNumber
              );
              const allItems = tableOrders.flatMap((order) =>
                order.items.map((item) => ({
                  ...item,
                  orderId: order.id,
                  orderName: order.customerName,
                }))
              );
              const totalAmount = tableOrders.reduce((sum, o) => sum + o.total, 0);
              const allPaid = tableOrders.every((o) => o.isPaid);

              return (
                <>
                  {/* Combined Items List */}
                  <div className="bg-secondary/30 rounded-xl p-6 mb-6 border border-border">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      All Orders Combined
                    </h4>
                    <div className="space-y-4">
                      {tableOrders.map((order, orderIndex) => (
                        <div key={order.id}>
                          {orderIndex > 0 && (
                            <div className="my-4 border-t-2 border-dashed border-border/50" />
                          )}
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground font-sofia mb-1">
                              #{order.id}
                            </p>
                            <p className="font-semibold text-foreground text-sm">
                              {order.customerName}
                            </p>
                          </div>
                          <div className="space-y-1 text-sm">
                            {order.items.map((item) => (
                              <div
                                key={item.menuItem.id}
                                className="flex justify-between"
                              >
                                <span className="text-foreground">
                                  {item.quantity}x {item.menuItem.name}
                                </span>
                                <span className="text-muted-foreground font-karla">
                                  Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-border/30 flex justify-between text-sm">
                            <span className="text-muted-foreground font-karla">Subtotal</span>
                            <span className="font-semibold text-foreground">
                              Rs. {order.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-karla text-muted-foreground">Total</span>
                        <span className="text-2xl font-bold text-accent">
                          Rs. {totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => {
                      // Clear current cart
                      clearCart();
                      
                      // Add all items from all orders to cart
                      tableOrders.forEach((order) => {
                        order.items.forEach((item) => {
                          // Add each item with its quantity
                          for (let i = 0; i < item.quantity; i++) {
                            addItem(item.menuItem);
                          }
                        });
                      });
                      
                      // Set the table as selected
                      setSelectedTable(settleTableNumber);
                      
                      // Close dialog and switch to menu tab
                      setShowSettleDialog(false);
                      setSettleTableNumber(null);
                      setActiveTab("menu");
                    }}
                    className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-xl transition-all hover:bg-accent/90 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      {showCancelOrderDialog && orderToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Cancel Order?</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCancelOrderDialog(false);
                  setOrderToCancel(null);
                }}
                className="flex-1 py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  if (orderToCancel) {
                    updateOrderStatus(orderToCancel, "cancelled");
                  }
                  setShowCancelOrderDialog(false);
                  setOrderToCancel(null);
                }}
                className="flex-1 py-2.5 px-4 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Dialog */}
      {showClearCartDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Clear Cart?</h3>
                <p className="text-sm text-muted-foreground">
                  Remove all items from cart
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearCartDialog(false)}
                className="flex-1 py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setSelectedTable(null);
                  setShowClearCartDialog(false);
                }}
                className="flex-1 py-2.5 px-4 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirmation}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirmation(false)}
      />

      {/* Cash Out Dialog */}
      <CashOutDialog
        isOpen={showCashOutDialog}
        onComplete={handleCashOutComplete}
        onCancel={() => {
          setShowCashOutDialog(false);
          setShowLogoutConfirmation(false);
        }}
        suggestedAmount={currentCashBalance}
      />

      {/* Cancellation Notification - Top Right Corner */}
      {showCancelNotification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in-0 md:max-w-[420px]">
          <div className="bg-destructive text-destructive-foreground rounded-lg border border-destructive/50 shadow-lg p-4 pr-8 relative">
            <button
              onClick={() => setShowCancelNotification(false)}
              className="absolute right-2 top-2 rounded-md p-1 text-destructive-foreground/70 hover:text-destructive-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="grid gap-1">
              <div className="text-sm font-semibold">Order Cancelled</div>
              <div className="text-sm opacity-90">
                Order #{cancelledOrderId} has been cancelled
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Notification Popup */}
      {showOrderNotification && (
        <CashierOrderNotification
          order={pendingOrderNotification}
          onConfirm={() => {
            // Order is already saved to database, just reload orders
            loadOrders(false);
            setShowOrderNotification(false);
            setPendingOrderNotification(null);
          }}
          onCancel={() => {
            // Order was cancelled, reload orders
            loadOrders(false);
            setShowOrderNotification(false);
            setPendingOrderNotification(null);
          }}
          onClose={() => {
            setShowOrderNotification(false);
            setPendingOrderNotification(null);
          }}
          tableLabel={
            pendingOrderNotification?.tableNumber
              ? tablesConfig.find((t) => t.id === pendingOrderNotification.tableNumber)?.label
              : undefined
          }
        />
      )}

      {/* Bell Request Notification */}
      {showBellNotification && bellRequest && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in-0 md:max-w-[420px]">
          <div className="bg-warning text-warning-foreground rounded-lg border border-warning/50 shadow-lg p-4 pr-8 relative">
            <button
              onClick={() => {
                setShowBellNotification(false);
                setBellRequest(null);
              }}
              className="absolute right-2 top-2 rounded-md p-1 text-warning-foreground/70 hover:text-warning-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="grid gap-1">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 animate-pulse" />
                Bell Request
              </div>
              <div className="text-sm opacity-90">
                Table {bellRequest.tableLabel || bellRequest.tableId} is requesting assistance
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Request Notification Popup */}
      {showBillNotificationPopup && billRequest && (
        <CashierBillNotification
          isOpen={showBillNotificationPopup}
          onClose={() => {
            setShowBillNotificationPopup(false);
            setBillRequest(null);
          }}
          tableId={billRequest.tableId}
          tableLabel={billRequest.tableLabel}
        />
      )}
    </div>
  );
}
