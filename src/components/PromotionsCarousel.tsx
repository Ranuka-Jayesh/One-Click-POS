import { useState, useEffect } from "react";
import weekendSpecialImg from "@/assets/WeekendSpecial.jpg";
import familyComboImg from "@/assets/FamilyCombo.jpg";
import happyHourImg from "@/assets/HappyHour.jpg";

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount?: string;
  image?: string;
}

const promotions: Promotion[] = [
  {
    id: "1",
    title: "Weekend Special",
    description: "Get 20% off on all burgers this weekend!",
    discount: "20% OFF",
    image: weekendSpecialImg,
  },
  {
    id: "2",
    title: "Family Combo",
    description: "Order for 4+ people and save 15% on your total bill",
    discount: "15% OFF",
    image: familyComboImg,
  },
  {
    id: "3",
    title: "Happy Hour",
    description: "Enjoy 25% off on drinks from 3 PM to 6 PM daily",
    discount: "25% OFF",
    image: happyHourImg,
  },
];

export default function PromotionsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="container px-3 sm:px-4 md:px-6 pb-16 sm:pb-24 md:pb-32">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Bodoni Moda', serif" }}>
          Promotions & Deals
        </h2>
        <p className="text-white/70 text-sm sm:text-base" style={{ fontFamily: "'Caveat', cursive" }}>
          Don't miss out on these amazing offers
        </p>
      </div>

      <div className="relative">
        {/* Carousel Container */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="min-w-full flex-shrink-0 relative rounded-2xl sm:rounded-3xl overflow-hidden"
                style={{
                  backgroundImage: promo.image ? `url(${promo.image})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Content */}
                <div className="relative z-10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 min-h-[200px] sm:min-h-[250px] md:min-h-[280px] flex items-center">
                  <div className="flex-1 text-center md:text-left">
                    {promo.discount && (
                      <div className="inline-block mb-4 px-4 py-2 bg-accent/90 text-accent-foreground rounded-full text-sm sm:text-base font-bold">
                        {promo.discount}
                      </div>
                    )}
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                      {promo.title}
                    </h3>
                    <p className="text-white/90 text-base sm:text-lg md:text-xl" style={{ fontFamily: "'Caveat', cursive" }}>
                      {promo.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {promotions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-accent w-6 sm:w-8"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

