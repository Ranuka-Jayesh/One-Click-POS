import { useState, useEffect } from "react";
import { useOrderStore } from "@/stores/orderStore";
import KitchenOrderCard from "@/components/KitchenOrderCard";
import { UtensilsCrossed, Clock, History, X, Filter, Table, ShoppingBag, List, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { socketService, type OrderUpdateMessage } from "@/utils/socketService";
import { getOrders, updateOrderStatus as updateOrderStatusAPI, Order } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import bellSound from "@/assets/bell.wav";
import cancelSound from "@/assets/cancel.mp3";

export default function KitchenDisplay() {
  const { toast } = useToast();
  const orders = useOrderStore((state) => state.orders);
  const setOrders = useOrderStore((state) => state.setOrders);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "table" | "takeaway">("all");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [showCancelNotification, setShowCancelNotification] = useState(false);
  const [cancelledOrderId, setCancelledOrderId] = useState<string>("");

  const handleCloseHistory = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowHistoryDialog(false);
      setIsClosing(false);
      setFilterType("all");
      setSelectedTable(null);
    }, 300);
  };

  // Play bell sound for 5 seconds
  const playBellSound = () => {
    try {
      console.log('🔔 Playing bell sound...');
      // Create audio element for bell sound
      const audio = new Audio(bellSound);
      audio.volume = 0.7; // Set volume (0.0 to 1.0)
      
      // Handle audio loading
      const handleCanPlay = () => {
        console.log('🔔 Audio can play, duration:', audio.duration);
        // Play the audio
        audio.play().then(() => {
          console.log('🔔 Bell sound playing');
        }).catch((error) => {
          console.error('Failed to play bell sound:', error);
        });
      };
      
      audio.addEventListener('canplay', handleCanPlay);
      
      // Calculate how many times to loop to reach 5 seconds
      const handleLoadedMetadata = () => {
        const duration = audio.duration;
        console.log('🔔 Audio metadata loaded, duration:', duration);
        if (duration > 0 && duration < 5) {
          // If audio is shorter than 5 seconds, loop it
          const loopsNeeded = Math.ceil(5 / duration);
          let currentLoop = 0;
          
          const loopHandler = () => {
            currentLoop++;
            if (currentLoop < loopsNeeded) {
              audio.currentTime = 0;
              audio.play().catch((error) => {
                console.error('Failed to loop bell sound:', error);
              });
            } else {
              audio.removeEventListener('ended', loopHandler);
            }
          };
          
          audio.addEventListener('ended', loopHandler);
        }
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Load the audio
      audio.load();
      
      // Stop after 5 seconds
      const stopTimer = setTimeout(() => {
        console.log('🔔 Stopping bell sound after 5 seconds');
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }, 5000);
      
      // Clean up on error
      audio.addEventListener('error', (e) => {
        console.error('🔔 Audio error:', e);
        clearTimeout(stopTimer);
      });
    } catch (error) {
      console.error('Failed to initialize bell sound:', error);
    }
  };

  // Show cancellation notification in top right corner
  const showCancellationNotification = (orderId: string) => {
    setCancelledOrderId(orderId);
    setShowCancelNotification(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowCancelNotification(false);
    }, 3000);
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

  // Load orders from database
  const loadOrders = async (checkForNewOrders: boolean = false) => {
    setIsLoadingOrders(true);
    try {
      const response = await getOrders();
      interface OrderFromAPI {
        id?: string;
        orderId?: string;
        _id?: string;
        status: string;
        createdAt: Date | string;
        completedAt?: Date | string;
        [key: string]: unknown;
      }

      if (response.success && response.data) {
        // Transform orders to match Order type
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
        
        // Check for new orders BEFORE updating state
        if (checkForNewOrders) {
          const newOrderCount = dbOrders.filter((o: OrderFromAPI) => o.status === "new").length;
          const currentNewOrderCount = orders.filter((o) => o.status === "new").length;
          
          console.log('🔔 Checking for new orders:', {
            previousCount: previousOrderCount,
            currentCount: currentNewOrderCount,
            newCount: newOrderCount,
            willPlay: newOrderCount > previousOrderCount
          });
          
          if (newOrderCount > previousOrderCount) {
            // New order detected - play bell
            console.log('🔔 New order detected! Playing bell...');
            playBellSound();
          }
          setPreviousOrderCount(newOrderCount);
        }
        
        setOrders(dbOrders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    // Load initial orders and set initial count
    const initializeOrders = async () => {
      try {
        const response = await getOrders();
        if (response.success && response.data) {
          interface OrderFromAPI {
            id?: string;
            orderId?: string;
            _id?: string;
            status: string;
            createdAt: Date | string;
            completedAt?: Date | string;
            [key: string]: unknown;
          }

          // Transform orders to match Order type
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
          
          // Set initial count of new orders
          const initialNewOrderCount = dbOrders.filter((o: OrderFromAPI) => o.status === "new").length;
          setPreviousOrderCount(initialNewOrderCount);
          console.log('🔔 Initial new order count set to:', initialNewOrderCount);
        }
      } catch (error) {
        console.error('Failed to initialize orders:', error);
      }
    };
    
    initializeOrders();

    // Subscribe to order updates via WebSocket
    const unsubscribe = socketService.on('order_update', (message) => {
      // Type guard for OrderUpdateMessage
      if ('type' in message && (message.type === 'order_created' || message.type === 'order_updated' || message.type === 'order_status_changed')) {
        const orderMessage = message as OrderUpdateMessage;
        console.log('📢 Kitchen received order update:', orderMessage.type);
        
        // Handle order cancellation
        if (orderMessage.type === 'order_status_changed' && orderMessage.order?.status === 'cancelled') {
          // Play cancel sound
          playCancelSound();
          
          // Show notification in top right corner (important notification)
          showCancellationNotification(orderMessage.order.id || orderMessage.order._id || '');
          
          // Reload orders to reflect cancellation
          setTimeout(() => {
            loadOrders(false);
          }, 500);
        } else if (orderMessage.type === 'order_created') {
          // Add a small delay to ensure database is updated
          setTimeout(() => {
            loadOrders(true); // Check for new orders and play bell
          }, 500);
        } else {
          loadOrders(false); // Just reload without checking
        }
      }
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newOrders = orders.filter((o) => o.status === "new");
  const cookingOrders = orders.filter((o) => o.status === "cooking");
  const readyOrders = orders.filter((o) => o.status === "ready");
  
  // Get all dispatched orders
  const allDispatchedOrders = orders
    .filter((o) => o.status === "completed")
    .sort(
      (a, b) => {
        const aTime = a.completedAt instanceof Date ? a.completedAt.getTime() : (typeof a.completedAt === 'string' ? new Date(a.completedAt).getTime() : 0);
        const bTime = b.completedAt instanceof Date ? b.completedAt.getTime() : (typeof b.completedAt === 'string' ? new Date(b.completedAt).getTime() : 0);
        return bTime - aTime;
      }
    );

  // Get unique table numbers from dispatched orders
  const availableTables = Array.from(
    new Set(
      allDispatchedOrders
        .filter((o) => o.tableNumber)
        .map((o) => o.tableNumber!)
        .sort((a, b) => a - b)
    )
  );

  // Calculate counts for each filter type
  const allOrdersCount = allDispatchedOrders.length;
  const tableOrdersCount = allDispatchedOrders.filter((o) => o.tableNumber).length;
  const takeawayOrdersCount = allDispatchedOrders.filter((o) => !o.tableNumber).length;

  // Filter dispatched orders based on selected filter
  const dispatchedOrders = (() => {
    let filtered = allDispatchedOrders;

    if (filterType === "table") {
      filtered = filtered.filter((o) => o.tableNumber);
      if (selectedTable !== null) {
        filtered = filtered.filter((o) => o.tableNumber === selectedTable);
      }
    } else if (filterType === "takeaway") {
      filtered = filtered.filter((o) => !o.tableNumber);
    }

    return filtered;
  })();

  const columns = [
    { title: "New Orders", orders: newOrders, color: "bg-accent" },
    { title: "Cooking", orders: cookingOrders, color: "bg-cooking" },
    { title: "Ready for Pickup", orders: readyOrders, color: "bg-success" },
  ];

  return (
    <div className="h-screen bg-foreground overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-foreground border-b border-foreground/20 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-archivo font-bold text-primary-foreground">
                Kitchen Display
              </h1>
              <p className="text-sm text-primary-foreground/60 font-karla">
                One Click Restaurant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-foreground" />
              <span className="text-2xl font-archivo font-bold text-primary-foreground">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <button
              onClick={() => setShowHistoryDialog(true)}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
              title="Order History"
            >
              <History className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Order Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-1 flex-1 overflow-hidden">
        {columns.map((column) => (
          <div
            key={column.title}
            className="bg-background/5 flex flex-col h-full overflow-hidden"
          >
            {/* Column Header */}
            <div className={`${column.color} px-6 py-4 flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-archivo font-bold text-primary-foreground">
                  {column.title}
                </h2>
                <span className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold">
                  {column.orders.length}
                </span>
              </div>
            </div>

            {/* Order Cards */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
              {column.orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-primary-foreground/40 font-karla text-lg">
                    No orders
                  </p>
                </div>
              ) : (
                column.orders.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onStatusUpdate={loadOrders} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Order History Dialog */}
      {showHistoryDialog && (
        <div className={`fixed inset-0 bg-background z-50 flex flex-col transition-all duration-300 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}>
          {/* Dialog Header */}
          <div className={`relative border-b border-border flex-shrink-0 bg-gradient-to-r from-accent/5 to-transparent transition-all duration-300 ${
            isClosing ? "translate-y-[-20px] opacity-0" : "translate-y-0 opacity-100"
          }`}>
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-archivo font-bold text-foreground">
                    Dispatched Orders
                  </h2>
                  <p className="text-sm text-muted-foreground font-karla">
                    Complete order history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-archivo font-bold text-foreground">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-archivo font-semibold text-muted-foreground">
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseHistory}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-all hover:rotate-90 hover:scale-110"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Filter Options */}
            <div className={`px-6 pb-4 flex items-center gap-2 flex-wrap transition-all duration-300 delay-75 ${
              isClosing ? "translate-y-[-20px] opacity-0" : "translate-y-0 opacity-100"
            }`}>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              <button
                onClick={() => {
                  setFilterType("all");
                  setSelectedTable(null);
                }}
                className={`group relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-between gap-3 overflow-hidden min-w-[120px] ${
                  filterType === "all"
                    ? "bg-gradient-to-r from-accent to-accent/90 text-accent-foreground shadow-lg shadow-accent/30 scale-105"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className={`transition-transform duration-300 ${
                    filterType === "all" ? "scale-110" : "group-hover:scale-110"
                  }`}>
                    <List className="w-4 h-4" />
                  </div>
                  <span>All</span>
                </div>
                {allOrdersCount > 0 && (
                  <span className={`relative z-10 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    filterType === "all" ? "ring-2 ring-destructive/30" : ""
                  }`}>
                    {allOrdersCount > 99 ? "99+" : allOrdersCount}
                  </span>
                )}
                {filterType === "all" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                )}
              </button>
              <button
                onClick={() => {
                  setFilterType("table");
                  setSelectedTable(null);
                }}
                className={`group relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-between gap-3 overflow-hidden min-w-[120px] ${
                  filterType === "table" && selectedTable === null
                    ? "bg-gradient-to-r from-accent to-accent/90 text-accent-foreground shadow-lg shadow-accent/30 scale-105"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className={`transition-transform duration-300 ${
                    filterType === "table" && selectedTable === null ? "scale-110" : "group-hover:scale-110"
                  }`}>
                    <Table className="w-4 h-4" />
                  </div>
                  <span>Table</span>
                </div>
                {tableOrdersCount > 0 && (
                  <span className={`relative z-10 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    filterType === "table" && selectedTable === null ? "ring-2 ring-destructive/30" : ""
                  }`}>
                    {tableOrdersCount > 99 ? "99+" : tableOrdersCount}
                  </span>
                )}
                {filterType === "table" && selectedTable === null && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                )}
              </button>
              <button
                onClick={() => {
                  setFilterType("takeaway");
                  setSelectedTable(null);
                }}
                className={`group relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-between gap-3 overflow-hidden min-w-[120px] ${
                  filterType === "takeaway"
                    ? "bg-gradient-to-r from-accent to-accent/90 text-accent-foreground shadow-lg shadow-accent/30 scale-105"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className={`transition-transform duration-300 ${
                    filterType === "takeaway" ? "scale-110" : "group-hover:scale-110"
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>Takeaway</span>
                </div>
                {takeawayOrdersCount > 0 && (
                  <span className={`relative z-10 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    filterType === "takeaway" ? "ring-2 ring-destructive/30" : ""
                  }`}>
                    {takeawayOrdersCount > 99 ? "99+" : takeawayOrdersCount}
                  </span>
                )}
                {filterType === "takeaway" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                )}
              </button>
              
              {/* Table Number Filter - Custom Dropdown */}
              {filterType === "table" && availableTables.length > 0 && (
                <div className="relative ml-2 pl-3 border-l border-border">
                  <button
                    onClick={() => setShowTableDropdown(!showTableDropdown)}
                    className="px-4 py-1.5 bg-secondary border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary/80 transition-all flex items-center gap-2 min-w-[140px] justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      {selectedTable ? `Table ${selectedTable}` : "All Tables"}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        showTableDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showTableDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTableDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-20 min-w-[160px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent animate-scale-in">
                        <button
                          onClick={() => {
                            setSelectedTable(null);
                            setShowTableDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 hover:bg-secondary ${
                            selectedTable === null
                              ? "bg-accent/10 text-accent"
                              : "text-foreground"
                          }`}
                        >
                          <List className="w-4 h-4" />
                          <span>All Tables</span>
                          {selectedTable === null && (
                            <Check className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                        <div className="border-t border-border" />
                        {availableTables.map((tableNum) => (
                          <button
                            key={tableNum}
                            onClick={() => {
                              setSelectedTable(tableNum);
                              setShowTableDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 hover:bg-secondary ${
                              selectedTable === tableNum
                                ? "bg-accent/10 text-accent"
                                : "text-foreground"
                            }`}
                          >
                            <Table className="w-4 h-4" />
                            <span>Table {tableNum}</span>
                            {selectedTable === tableNum && (
                              <Check className="w-4 h-4 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History Cards Grid */}
          <div className={`flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent transition-all duration-300 delay-150 ${
            isClosing ? "translate-y-[-20px] opacity-0" : "translate-y-0 opacity-100"
          }`}>
            {dispatchedOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="w-12 h-12 text-accent/40" />
                </div>
                <h3 className="text-xl font-archivo font-bold text-foreground mb-2">
                  No Dispatched Orders
                </h3>
                <p className="text-muted-foreground font-karla">
                  Completed orders will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {dispatchedOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className="group bg-card rounded-xl border border-border/60 hover:border-border transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden"
                    style={{
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    {/* Order Header - Minimal */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-1">
                            #{order.id.slice(-6)}
                          </p>
                          <h3 className="text-base font-archivo font-semibold text-foreground leading-tight">
                            {order.customerName}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-foreground">
                            {order.completedAt
                              ? (order.completedAt instanceof Date 
                                  ? order.completedAt 
                                  : new Date(order.completedAt)).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-karla mt-0.5">
                            {order.completedAt
                              ? formatDistanceToNow(order.completedAt, {
                                  addSuffix: true,
                                })
                              : ""}
                          </p>
                        </div>
                      </div>
                      {order.tableNumber && (
                        <span className="inline-block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Table {order.tableNumber}
                        </span>
                      )}
                    </div>

                    {/* Order Items - Clean List */}
                    <div className="flex-1 px-4 pb-3">
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div
                            key={item.menuItem.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-muted-foreground font-medium min-w-[18px]">
                              {item.quantity}×
                            </span>
                            <span className="text-foreground font-normal truncate">
                              {item.menuItem.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Footer - Minimal */}
                    {order.paymentMethod && (
                      <div className="px-4 py-3 border-t border-border/40 bg-secondary/20">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          {order.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
