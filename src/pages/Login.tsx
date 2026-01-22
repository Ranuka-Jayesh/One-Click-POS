import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Lock, User, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import CashInDialog from "@/components/CashInDialog";
import bannerImg from "@/assets/banner.jpg";
import { cashierLogin, cashIn } from "@/utils/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCashIn, setShowCashIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check if user is already logged in and restore session
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const hasCashIn = localStorage.getItem("cashInAmount") !== null;
    const cashierId = localStorage.getItem("cashierId");
    const username = localStorage.getItem("username");
    
    // If logged in with cash in, redirect to dashboard
    if (isLoggedIn && hasCashIn && cashierId && username) {
      navigate("/cashier", { replace: true });
      return;
    }
    
    // If logged in but no cash in, show cash in dialog
    if (isLoggedIn && !hasCashIn) {
      setShowCashIn(true);
    }
  }, [location, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter both username and password.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await cashierLogin({
        username: username.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        // Store login state (without password)
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", "cashier");
        localStorage.setItem("username", response.data.user.username);
        localStorage.setItem("cashierId", response.data.user.id);
        localStorage.setItem("cashierFullName", response.data.user.fullName);
        
        // Check if there's an active shift - restore session if exists
        if (response.data.activeShift) {
          const shift = response.data.activeShift;
          // Restore shift data
          localStorage.setItem("cashInAmount", shift.cashInAmount.toString());
          localStorage.setItem("cashInTime", new Date(shift.cashInTime).toISOString());
          localStorage.setItem("shiftId", shift.id);
          
          toast({
            title: "Session Restored",
            description: "Your active shift has been restored. Continuing where you left off.",
          });
          
          // Navigate directly to dashboard
          navigate("/cashier");
        } else {
          // No active shift - show cash in dialog
          setShowCashIn(true);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: response.error || "Invalid credentials. Please check your username and password.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An error occurred. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashInComplete = async (amount: number) => {
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

      const response = await cashIn({
        cashierId,
        cashierUsername: username,
        cashInAmount: amount,
      });

      if (response.success) {
        // Store cash in amount for local reference
        localStorage.setItem("cashInAmount", amount.toString());
        localStorage.setItem("cashInTime", new Date().toISOString());
        localStorage.setItem("shiftId", response.data?.shift.id || "");
        
        toast({
          title: "Cash In Recorded",
          description: response.data?.message || "Shift started successfully.",
        });
        
        setShowCashIn(false);
        navigate("/cashier");
      } else {
        toast({
          variant: "destructive",
          title: "Cash In Failed",
          description: response.error || "Failed to record cash in. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while recording cash in. Please try again.",
      });
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${bannerImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-shrink-0">
              <Logo />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                Cashier Login
              </h1>
              <p className="text-white/70 text-xs sm:text-sm" style={{ fontFamily: "'Caveat', cursive" }}>
                Sign in to access the cashier dashboard
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-white/90 text-sm font-medium flex items-center gap-2" style={{ fontFamily: "'Caveat', cursive" }}>
                <User className="w-4 h-4" />
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3.5 bg-[#0f0f0f]/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-white/90 text-sm font-medium flex items-center gap-2" style={{ fontFamily: "'Caveat', cursive" }}>
                <Lock className="w-4 h-4" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 pr-12 bg-[#0f0f0f]/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-300"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full py-3.5 bg-accent/90 hover:bg-accent text-accent-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p className="mt-6 text-center text-white/50 text-xs" style={{ fontFamily: "'Caveat', cursive" }}>
            Secure cashier access only
          </p>
        </div>
      </div>

      {/* Cash In Dialog */}
      <CashInDialog isOpen={showCashIn} onComplete={handleCashInComplete} />
    </div>
  );
}

