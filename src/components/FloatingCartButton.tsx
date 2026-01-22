import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/orderStore";

interface FloatingCartButtonProps {
  onClick: () => void;
}

export default function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-primary text-primary-foreground px-6 py-4 rounded-2xl shadow-elevated transition-all duration-500 ease-out hover:scale-105 active:scale-95 z-50 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="relative">
        <ShoppingBag className="w-6 h-6 transition-transform duration-300 hover:scale-110" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
          {itemCount}
        </span>
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-xs text-primary-foreground/70 font-karla">View Cart</span>
        <span className="font-bold">Rs. {total().toFixed(2)}</span>
      </div>
    </button>
  );
}
