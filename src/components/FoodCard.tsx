import { useState } from "react";
import { MenuItem } from "@/types/order";
import { useCartStore } from "@/stores/orderStore";
import { Plus } from "lucide-react";
import { getImageUrl } from "@/utils/api";

interface FoodCardProps {
  item: MenuItem;
}

export default function FoodCard({ item }: FoodCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = () => {
    setIsAdding(true);
    addItem(item);
    setTimeout(() => setIsAdding(false), 200);
  };

  return (
    <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col h-full transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-1 group cursor-pointer shadow-lg shadow-black/20">
      <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-[#0f0f0f]/50 backdrop-blur-sm border border-white/5">
        <img
          src={getImageUrl(item.image)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-accent transition-colors duration-300" style={{ fontFamily: "'Bodoni Moda', serif" }}>
          {item.name}
        </h3>
        <p className="text-sm text-white/70 line-clamp-2 mb-3 flex-1" style={{ fontFamily: "'Shadows Into Light', cursive" }}>
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            Rs. {item.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className={`touch-target flex items-center justify-center w-10 h-10 rounded-full bg-accent/90 backdrop-blur-sm text-accent-foreground transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-accent/30 active:scale-95 border border-white/20 ${
              isAdding ? "scale-110" : ""
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
