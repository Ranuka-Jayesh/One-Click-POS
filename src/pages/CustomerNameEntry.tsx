import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { ArrowRight, User } from "lucide-react";
import bannerImg from "@/assets/banner.jpg";

export default function CustomerNameEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table");
  const tableLabel = searchParams.get("label");
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if name already exists (for 2nd order)
  useEffect(() => {
    if (tableId) {
      const storedCustomerName = localStorage.getItem(`customerName_${tableId}`);
      if (storedCustomerName) {
        // Name exists, auto-redirect to menu
        const params = new URLSearchParams();
        params.set("table", tableId);
        if (tableLabel) params.set("label", tableLabel);
        navigate(`/menu?${params.toString()}`);
      }
    }
  }, [tableId, tableLabel, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      return;
    }

    setIsSubmitting(true);

    // Store customer name in localStorage with table ID as key
    if (tableId) {
      localStorage.setItem(`customerName_${tableId}`, customerName.trim());
    }

    // Small delay for better UX
    setTimeout(() => {
      // Navigate to menu with same table params
      const params = new URLSearchParams();
      if (tableId) params.set("table", tableId);
      if (tableLabel) params.set("label", tableLabel);
      navigate(`/menu?${params.toString()}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background with banner image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${bannerImg})`,
        }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/50 p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "'Bodoni Moda', serif" }}
            >
              Welcome!
            </h1>
            <p className="text-white/80 text-lg" style={{ fontFamily: "'Caveat', cursive" }}>
              Please enter your name to continue
            </p>
            {tableLabel && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg backdrop-blur-sm mt-2">
                <span className="text-sm font-semibold text-accent">Table {tableLabel}</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="customerName" 
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Your Good Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-12 pr-4 py-4 bg-[#0f0f0f]/60 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300 shadow-lg shadow-black/20"
                  autoFocus
                  required
                  minLength={1}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!customerName.trim() || isSubmitting}
              className="w-full py-4 bg-accent/90 backdrop-blur-sm text-accent-foreground font-bold rounded-xl border border-white/20 hover:bg-accent hover:shadow-lg hover:shadow-accent/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                "Loading..."
              ) : (
                <>
                  Continue to Menu
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
