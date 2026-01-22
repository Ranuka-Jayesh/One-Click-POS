import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import FoodCard from "@/components/FoodCard";
import CategoryTabs from "@/components/CategoryTabs";
import FloatingCartButton from "@/components/FloatingCartButton";
import CartModal from "@/components/CartModal";
import Logo from "@/components/Logo";
import PromotionsCarousel from "@/components/PromotionsCarousel";
import Footer from "@/components/Footer";
import { Table as TableIcon, Loader2, Clock, ChefHat, UtensilsCrossed, CheckCircle2, X, CreditCard, Info as InfoIcon } from "lucide-react";
import { wsService } from "@/utils/websocket";
import { socketService } from "@/utils/socketService";
import { getMenuItems, getCategories, MenuItem as MenuItemType, Category, getOrders, Order, OrderStatus, getImageUrl } from "@/utils/api";
import { useOrderStore } from "@/stores/orderStore";
import OrderCancellationNotification from "@/components/OrderCancellationNotification";
import OrderStatusPopup from "@/components/OrderStatusPopup";

import bannerImg from "@/assets/banner.jpg";
import burgerImg from "@/assets/burger.jpg";
import pizzaImg from "@/assets/pizza.jpg";
import pepperoniImg from "@/assets/pepperoni-pizza.jpg";
import saladImg from "@/assets/salad.jpg";
import greekSaladImg from "@/assets/greek-salad.jpg";
import lemonadeImg from "@/assets/lemonade.jpg";
import coffeeImg from "@/assets/coffee.jpg";
import brownieImg from "@/assets/brownie.jpg";
import cheesecakeImg from "@/assets/cheesecake.jpg";

// Map images to menu items
const imageMap: Record<string, string> = {
  "1": burgerImg,
  "2": burgerImg,
  "3": burgerImg,
  "4": pizzaImg,
  "5": pepperoniImg,
  "6": saladImg,
  "7": greekSaladImg,
  "8": lemonadeImg,
  "9": coffeeImg,
  "10": brownieImg,
  "11": cheesecakeImg,
};

export default function CustomerMenu() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table");
  const tableLabel = searchParams.get("label");
  const customerOrder = useOrderStore((state) => state.customerOrder);
  const [latestOrderStatus, setLatestOrderStatus] = useState<OrderStatus | null>(null);
  const [showCancellationNotification, setShowCancellationNotification] = useState(false);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);
  const [showOrderStatusPopup, setShowOrderStatusPopup] = useState(false);
  
  // Refs for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hiddenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load menu items and categories from database
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
      }
      
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data.categories);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      if (showLoading) {
        setIsLoadingMenu(false);
      }
    }
  };

  // Load latest order status for the table
  const loadLatestOrderStatus = useCallback(async () => {
    if (!tableId) return;
    
    try {
      const tableIdNum = parseInt(tableId);
      if (isNaN(tableIdNum)) return;
      
      const response = await getOrders({ 
        tableNumber: tableIdNum,
        isSettled: false 
      });
      
      if (response.success && response.data?.orders) {
        // Transform orders to match Order type
        interface OrderFromAPI {
          id?: string;
          orderId?: string;
          _id?: string;
          createdAt: Date | string;
          [key: string]: unknown;
        }

        const dbOrders = response.data.orders.map((order: OrderFromAPI) => ({
          ...order,
          id: order.id || order.orderId || order._id || '',
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        }));
        
        // Filter out cancelled orders and get the most recent one
        const activeOrders = dbOrders
          .filter((order: Order) => order.status !== 'cancelled')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Set the status of the most recent order
        if (activeOrders.length > 0) {
          setLatestOrderStatus(activeOrders[0].status);
        } else {
          setLatestOrderStatus(null);
        }
      }
    } catch (error) {
      console.error('Failed to load order status:', error);
    }
  }, [tableId]);

  // Check for customer name and redirect if missing (only when table is provided)
  useEffect(() => {
    if (tableId) {
      const storedCustomerName = localStorage.getItem(`customerName_${tableId}`);
      if (!storedCustomerName) {
        // Redirect to name entry page with table params
        const params = new URLSearchParams();
        params.set("table", tableId);
        if (tableLabel) params.set("label", tableLabel);
        navigate(`/customer-name?${params.toString()}`);
      }
    }
  }, [tableId, tableLabel, navigate]);

  // Load menu items on component mount
  useEffect(() => {
    loadMenuItems();

    // Subscribe to menu item updates via WebSocket
    const unsubscribeMenu = socketService.on('menu_item_update', (message) => {
      console.log('📢 Menu item update received:', message.type);
      // Silently reload menu items when any update occurs (without showing loading spinner)
      loadMenuItems(false);
    });

    return () => {
      unsubscribeMenu();
    };
  }, []);

  // Load order status and subscribe to order updates when tableId is available
  useEffect(() => {
    if (!tableId) return;

    // Load initial order status
    loadLatestOrderStatus();

    // Subscribe to order updates via WebSocket to track order status
    const unsubscribeOrder = socketService.on('order_update', (message) => {
      const tableIdNum = parseInt(tableId);
      if (!isNaN(tableIdNum) && message.order?.tableNumber === tableIdNum) {
        console.log('📢 Order status update received for table:', message.order.status);
        
        // Handle order cancellation - show notification popup
        if (message.type === 'order_status_changed' && message.order?.status === 'cancelled') {
          // Transform order to match Order type
          const cancelledOrderData: Order = {
            id: message.order.id || message.order.orderId || message.order._id || '',
            orderId: message.order.orderId || message.order.id,
            _id: message.order._id || message.order.id,
            customerName: message.order.customerName || '',
            items: message.order.items || [],
            status: 'cancelled',
            total: message.order.total || 0,
            createdAt: message.order.createdAt ? new Date(message.order.createdAt) : new Date(),
            isPaid: message.order.isPaid || false,
            isSettled: message.order.isSettled || false,
            orderType: message.order.orderType || 'dining',
            tableNumber: message.order.tableNumber,
          };
          
          // Show cancellation notification
          setCancelledOrder(cancelledOrderData);
          setShowCancellationNotification(true);
        }
        
        // Update the latest order status
        if (message.order.status) {
          setLatestOrderStatus(message.order.status as OrderStatus);
        }
        // Also reload to get the latest status
        loadLatestOrderStatus();
      }
    });

      return () => {
        unsubscribeOrder();
      };
    }, [tableId, loadLatestOrderStatus]);

  // Function to check if order was placed and release table if needed
  const checkAndReleaseTable = (tableIdNum: number, reason: string) => {
    // Don't release if an order was placed
    if (customerOrder) {
      console.log(`Table ${tableIdNum} has an order, not releasing (reason: ${reason})`);
      return;
    }
    
    // Check if order exists in localStorage (backup check)
    const hasOrder = localStorage.getItem(`order_placed_${tableIdNum}`);
    if (hasOrder === 'true') {
      console.log(`Table ${tableIdNum} has order in localStorage, not releasing (reason: ${reason})`);
      return;
    }
    
    console.log(`Releasing table ${tableIdNum} - ${reason}`);
    wsService.releaseTable(tableIdNum);
  };

  // Block table when customer scans QR code and set up auto-release mechanisms
  useEffect(() => {
    if (tableId && tableLabel) {
      const tableIdNum = parseInt(tableId);
      if (!isNaN(tableIdNum)) {
        // Block the table when customer accesses menu
        wsService.blockTable(tableIdNum, tableLabel);
        lastActivityRef.current = Date.now();
        
        // Set up 30-minute timeout to auto-release if no order placed
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        timeoutRef.current = setTimeout(() => {
          checkAndReleaseTable(tableIdNum, '30-minute inactivity timeout');
        }, INACTIVITY_TIMEOUT);
        
        // Heartbeat: Update activity timestamp every 30 seconds
        heartbeatRef.current = setInterval(() => {
          lastActivityRef.current = Date.now();
        }, 30 * 1000);
        
        // Track user activity (mouse movement, clicks, scrolls)
        const updateActivity = () => {
          lastActivityRef.current = Date.now();
        };
        
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('touchstart', updateActivity);
        
        // Handle page visibility changes (tab switch, minimize, etc.)
        const handleVisibilityChange = () => {
          if (document.hidden) {
            // Tab is hidden - check if we should release after a delay
            hiddenTimeoutRef.current = setTimeout(() => {
              if (document.hidden) {
                // Still hidden after 5 minutes - release table
                checkAndReleaseTable(tableIdNum, 'tab hidden for 5 minutes');
              }
            }, 5 * 60 * 1000); // 5 minutes
          } else {
            // Tab is visible again - clear the release timeout
            if (hiddenTimeoutRef.current) {
              clearTimeout(hiddenTimeoutRef.current);
              hiddenTimeoutRef.current = null;
            }
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Handle page unload (browser close, navigation away)
        const handleBeforeUnload = () => {
          checkAndReleaseTable(tableIdNum, 'page unload');
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Cleanup function
        return () => {
          // Clear timeouts
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
          }
          if (hiddenTimeoutRef.current) {
            clearTimeout(hiddenTimeoutRef.current);
          }
          
          // Remove event listeners
          window.removeEventListener('mousemove', updateActivity);
          window.removeEventListener('click', updateActivity);
          window.removeEventListener('scroll', updateActivity);
          window.removeEventListener('keydown', updateActivity);
          window.removeEventListener('touchstart', updateActivity);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          
          // Release table on component unmount if no order placed
          checkAndReleaseTable(tableIdNum, 'component unmount');
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, tableLabel, customerOrder]);
  
  // Monitor order placement - if order is placed, mark it and prevent auto-release
  useEffect(() => {
    if (customerOrder && tableId) {
      const tableIdNum = parseInt(tableId);
      if (!isNaN(tableIdNum)) {
        // Mark that an order was placed for this table
        localStorage.setItem(`order_placed_${tableIdNum}`, 'true');
        
        // Update the latest order status
        if (customerOrder.status) {
          setLatestOrderStatus(customerOrder.status);
        }
        
        // Clear the auto-release timeout since order was placed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        console.log(`Order placed for table ${tableIdNum}, table will remain blocked`);
      }
    }
  }, [customerOrder, tableId]);

  // Map menu items with images - use database image if available, otherwise fallback
  const menuWithImages = menuItems.map((item) => ({
    ...item,
    // Use database image if available, otherwise use local imageMap, finally placeholder
    image: item.image && item.image !== '/placeholder.svg' 
      ? getImageUrl(item.image) 
      : (imageMap[item.id] || '/placeholder.svg'),
  }));

  // Filter items based on active category
  const filteredItems = (() => {
    // Get category name if filtering by category ID
    const selectedCategory = activeCategory === "all" 
      ? null 
      : categories.find(c => c.id === activeCategory || c._id === activeCategory || c.name === activeCategory);
    
    return activeCategory === "all"
      ? menuWithImages
      : menuWithImages.filter((item) => 
          item.category === selectedCategory?.name || 
          item.category === selectedCategory?.id ||
          item.category === activeCategory
        );
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1a1a1a]">
        <div className="container px-3 sm:px-4 md:px-6 py-1 sm:py-1">
          <div className="flex items-center justify-between">
            <Logo />
            {tableLabel && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-lg backdrop-blur-sm">
                <TableIcon className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold text-accent">Table {tableLabel}</span>
                {latestOrderStatus && latestOrderStatus !== 'cancelled' && (
                  <button
                    onClick={() => setShowOrderStatusPopup(true)}
                    className="flex items-center gap-2 ml-2 pl-3 pr-2 py-1.5 border-l border-accent/20 hover:bg-accent/10 rounded-lg transition-colors group"
                    title="View Order Details"
                  >
                    {/* Progress Bar */}
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const steps: OrderStatus[] = ["new", "cooking", "ready", "payment_pending", "payment_complete"];
                        const currentStepIndex = steps.indexOf(latestOrderStatus as OrderStatus);
                        const progressPercentage = currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
                        
                        return (
                          <div className="flex items-center gap-1.5">
                            {/* Progress Bar */}
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-accent to-success transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                            {/* Current Status Icon */}
                            {latestOrderStatus === 'new' && <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />}
                            {latestOrderStatus === 'cooking' && <ChefHat className="w-3.5 h-3.5 text-cooking animate-pulse" />}
                            {latestOrderStatus === 'ready' && <UtensilsCrossed className="w-3.5 h-3.5 text-success animate-pulse" />}
                            {latestOrderStatus === 'payment_pending' && <CreditCard className="w-3.5 h-3.5 text-warning animate-pulse" />}
                            {latestOrderStatus === 'payment_complete' && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                            {latestOrderStatus === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                          </div>
                        );
                      })()}
                    </div>
                    <InfoIcon className="w-3.5 h-3.5 text-accent/60 group-hover:text-accent transition-colors" />
                  </button>
                )}
                {latestOrderStatus === 'cancelled' && (
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-accent/20">
                    <X className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-destructive/80">Cancelled</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Rounded Container */}
      <section 
        className="w-full pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-12 md:pb-16 mb-6 sm:mb-8 relative"
        style={{
          backgroundImage: `url(${bannerImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <div className="w-full max-w-[95%] sm:max-w-[98%] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
          {/* Large Rounded Container with Background Image */}
          <div 
            className="relative rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] lg:rounded-[5rem] xl:rounded-[6rem] p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 overflow-hidden min-h-[250px] sm:min-h-[300px] md:min-h-[350px] lg:min-h-[400px] xl:min-h-[500px] flex items-center border border-white/10 backdrop-blur-sm"
            style={{
              backgroundImage: `url(${bannerImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Dark Overlay with Glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/50 backdrop-blur-[2px]" />
            
            {/* Content */}
            <div className="relative z-10 max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight drop-shadow-lg px-2 sm:px-0" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                    What's on your mind?
                  </h1>
                  <p className="text-white/80 text-base sm:text-lg md:text-xl lg:text-2xl px-2 sm:px-0" style={{ fontFamily: "'Caveat', cursive" }}>
                    Fresh ingredients, made with love.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
        {isLoadingMenu ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <CategoryTabs
            categories={categories.map(cat => ({
              id: cat.id || cat._id || '',
              name: cat.name,
              icon: cat.icon || '🍽️',
            }))}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
        )}
      </section>

      {/* Menu Grid */}
      <section className="container px-3 sm:px-4 md:px-6 pb-16 sm:pb-24 md:pb-32">
        {isLoadingMenu ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
            <p className="text-muted-foreground">Loading menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg">No menu items available</p>
            <p className="text-muted-foreground/60 text-sm mt-2">Please check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredItems.map((item, index) => (
              <div
                key={item.id || item._id}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: '400ms',
                  animationFillMode: 'both'
                }}
              >
                <FoodCard item={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Promotions & Deals Carousel */}
      <PromotionsCarousel />

      {/* Floating Cart */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />

      {/* Cart Modal */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Order Status Popup */}
      {tableId && tableLabel && (
        <OrderStatusPopup
          isOpen={showOrderStatusPopup}
          onClose={() => setShowOrderStatusPopup(false)}
          tableId={parseInt(tableId)}
          tableLabel={tableLabel}
        />
      )}

      {/* Order Cancellation Notification */}
      <OrderCancellationNotification
        isOpen={showCancellationNotification}
        onClose={() => {
          setShowCancellationNotification(false);
          setCancelledOrder(null);
        }}
        order={cancelledOrder}
        tableLabel={tableLabel || undefined}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
