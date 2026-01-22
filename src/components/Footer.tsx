import { Facebook, Twitter, Instagram, Youtube, Share2, UtensilsCrossed, Sparkles, Coffee } from "lucide-react";
import footerBg from "@/assets/footer.webp";

export default function Footer() {
  return (
    <footer 
      className="w-full border-t border-[#1a1a1a] py-8 sm:py-12 md:py-16 relative"
      style={{
        backgroundImage: `url(${footerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/75" />
      
      <div className="container px-3 sm:px-4 md:px-6 relative z-10">
      <div className="container px-3 sm:px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12 lg:gap-16">
          {/* Left Section - Cafe Information */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase tracking-wide" style={{ fontFamily: "'Bodoni Moda', serif" }}>
              One Click Restaurant
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed max-w-md" style={{ fontFamily: "'Caveat', cursive" }}>
              Our Restaurant is a family-owned establishment that has been proudly serving delicious meals. Located in the heart of the city, we bring you fresh ingredients and authentic flavors.
            </p>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-4 sm:gap-6 pt-4">
              <a
                href="#"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="#"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="#"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="#"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center hover:scale-110"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="#"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center hover:scale-110"
                aria-label="Pinterest"
              >
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
            </div>
          </div>

          {/* Right Section - Navigation Icons */}
          <div className="flex flex-row items-center justify-center md:justify-end gap-4 sm:gap-6 md:gap-8 lg:gap-10 w-full md:w-auto md:ml-auto mt-6 md:mt-0">
            {/* Our Menu */}
            <div className="flex flex-col items-center gap-3 group cursor-pointer">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/20 text-white group-hover:border-accent group-hover:text-accent transition-all duration-300 flex items-center justify-center group-hover:scale-110">
                <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <span className="text-white/90 text-sm sm:text-base font-medium uppercase tracking-wide" style={{ fontFamily: "'Caveat', cursive" }}>
                Our Menu
              </span>
            </div>

            {/* Specials */}
            <div className="flex flex-col items-center gap-3 group cursor-pointer">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/20 text-white group-hover:border-accent group-hover:text-accent transition-all duration-300 flex items-center justify-center group-hover:scale-110">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <span className="text-white/90 text-sm sm:text-base font-medium uppercase tracking-wide" style={{ fontFamily: "'Caveat', cursive" }}>
                Specials
              </span>
            </div>

            {/* Drinks */}
            <div className="flex flex-col items-center gap-3 group cursor-pointer">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/20 text-white group-hover:border-accent group-hover:text-accent transition-all duration-300 flex items-center justify-center group-hover:scale-110">
                <Coffee className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <span className="text-white/90 text-sm sm:text-base font-medium uppercase tracking-wide" style={{ fontFamily: "'Caveat', cursive" }}>
                Drinks
              </span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-[#1a1a1a] text-center">
          <p className="text-white/60 text-xs sm:text-sm" style={{ fontFamily: "'Caveat', cursive" }}>
            © {new Date().getFullYear()} One Click Restaurant. All rights reserved.
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}

