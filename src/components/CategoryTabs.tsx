import { Category } from "@/types/order";

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 md:mx-0 md:px-0 scroll-smooth">
      <button
        onClick={() => onSelect("all")}
        className={`touch-target flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-300 backdrop-blur-xl border flex-shrink-0 ${
          activeCategory === "all"
            ? "bg-accent/90 text-accent-foreground border-accent/50 shadow-lg shadow-accent/20"
            : "bg-[#1a1a1a]/80 text-white/90 border-white/10 hover:bg-[#1a1a1a]/90 hover:border-white/20 shadow-md shadow-black/20"
        }`}
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        <span className="text-base sm:text-lg">🍽️</span>
        <span>All</span>
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`touch-target flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-300 backdrop-blur-xl border flex-shrink-0 ${
            activeCategory === category.id
              ? "bg-accent/90 text-accent-foreground border-accent/50 shadow-lg shadow-accent/20"
              : "bg-[#1a1a1a]/80 text-white/90 border-white/10 hover:bg-[#1a1a1a]/90 hover:border-white/20 shadow-md shadow-black/20"
          }`}
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          <span className="text-base sm:text-lg">{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
