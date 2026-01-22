import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCartStore, useOrderStore } from "@/stores/orderStore";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { createOrder, getImageUrl } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder = useOrderStore((state) => state.addOrder);
  const setCustomerOrder = useOrderStore((state) => state.setCustomerOrder);
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("table");
  const { toast } = useToast();
  
  const [customerName, setCustomerName] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [isNamePreFilled, setIsNamePreFilled] = useState(false);

  // Load customer name from localStorage when modal opens
  useEffect(() => {
    if (isOpen && tableId) {
      const storedName = localStorage.getItem(`customerName_${tableId}`);
      if (storedName) {
        setCustomerName(storedName);
        setIsNamePreFilled(true); // Mark as pre-filled
      } else {
        setIsNamePreFilled(false);
      }
    } else if (!tableId) {
      // For takeaway orders, allow name entry
      setIsNamePreFilled(false);
    }
  }, [isOpen, tableId]);

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || items.length === 0) return;
    
    setIsOrdering(true);
    
    try {
      const tableIdNum = tableId ? parseInt(tableId) : undefined;
      
      // Prepare order request
      const orderRequest = {
        customerName: customerName.trim(),
        items: items.map(item => ({
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
        total: total(),
        orderType: tableIdNum ? 'dining' as const : 'takeaway' as const,
        tableNumber: tableIdNum,
        isPaid: false,
      };

      // Create order via API
      const response = await createOrder(orderRequest);
      
      if (response.success && response.data?.order) {
        const createdOrder = {
          ...response.data.order,
          id: response.data.order.id || response.data.order.orderId || response.data.order._id,
          createdAt: new Date(response.data.order.createdAt),
        };
        
        // Add to local store
        addOrder(createdOrder);
        setCustomerOrder(createdOrder);
        
        // Mark order as placed in localStorage
        if (tableIdNum) {
          localStorage.setItem(`order_placed_${tableIdNum}`, 'true');
        }
        
        // Show success message
        toast({
          title: "Order Placed!",
          description: "Your order has been placed successfully.",
        });
        
        // Clear cart and close modal
        clearCart();
        setIsOrdering(false);
        onClose();
      } else {
        throw new Error(response.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: "destructive",
        title: "Failed to Place Order",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setIsOrdering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#1a1a1a]/70 backdrop-blur-2xl border border-white/20 rounded-t-3xl md:rounded-3xl shadow-2xl shadow-black/50 max-h-[85vh] flex flex-col animate-slide-up before:absolute before:inset-0 before:rounded-t-3xl before:md:rounded-3xl before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-transparent before:pointer-events-none">
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Your Cart</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => {
                  clearCart();
                  setCustomerName("");
                }}
                className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-110 active:scale-95"
                title="Clear Cart"
              >
                <Trash2 className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
              </button>
            )}
            <button
              onClick={onClose}
              className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-300"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/70 font-karla">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#0f0f0f]/60 backdrop-blur-md border border-white/20 hover:border-white/30 transition-all duration-300 hover:bg-[#0f0f0f]/70 shadow-lg shadow-black/20"
              >
                <img
                  src={getImageUrl(item.menuItem.image)}
                  alt={item.menuItem.name}
                  className="w-16 h-16 rounded-lg object-cover border border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate mb-1">
                    {item.menuItem.name}
                  </h4>
                  <p className="text-accent font-bold">
                    Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                    className="touch-target w-8 h-8 flex items-center justify-center rounded-full bg-[#0f0f0f]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-[#0f0f0f] transition-all duration-300 hover:scale-110 active:scale-95"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="w-8 text-center font-semibold text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity + 1)
                    }
                    className="touch-target w-8 h-8 flex items-center justify-center rounded-full bg-[#0f0f0f]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-[#0f0f0f] transition-all duration-300 hover:scale-110 active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        {items.length > 0 && (
          <div className="relative p-6 border-t border-white/20 backdrop-blur-sm space-y-4">
            {isNamePreFilled ? (
              <div className="w-full px-4 py-3 bg-[#0f0f0f]/60 backdrop-blur-md border border-success/30 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Customer Name</p>
                    <p className="text-white font-medium">{customerName}</p>
                  </div>
                  <div className="text-xs text-success/80 bg-success/10 px-2 py-1 rounded">
                    Pre-filled
                  </div>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your Good Name"
                className="w-full px-4 py-3 bg-[#0f0f0f]/60 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300 shadow-lg shadow-black/20"
              />
            )}
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-karla text-white/80">Total</span>
              <span className="text-2xl font-bold text-white">
                Rs. {total().toFixed(2)}
              </span>
            </div>
            
            <button
              onClick={handlePlaceOrder}
              disabled={!customerName.trim() || isOrdering}
              className="w-full py-4 bg-accent/90 backdrop-blur-sm text-accent-foreground font-bold rounded-xl border border-white/20 hover:bg-accent hover:shadow-lg hover:shadow-accent/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-target disabled:hover:shadow-none"
            >
              {isOrdering ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
