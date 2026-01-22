import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Lock, User, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import adminBgImg from "@/assets/WeekendSpecial.jpg";
import { adminLogin } from "@/utils/api";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await adminLogin({
        username: username.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        // Store admin login state
        localStorage.setItem("isAdminLoggedIn", "true");
        localStorage.setItem("adminUsername", response.data.user.username);
        localStorage.setItem("userRole", response.data.user.role);
        
        toast({
          title: "Login Successful",
          description: "Welcome back! Redirecting to admin dashboard...",
        });
        
        navigate("/admin");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: response.error || "Invalid admin credentials. Please check your username and password.",
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

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${adminBgImg})`,
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
                Admin Login
              </h1>
              <p className="text-white/70 text-xs sm:text-sm" style={{ fontFamily: "'Caveat', cursive" }}>
                Sign in to access the admin dashboard
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
                  placeholder="Enter admin username"
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
                  placeholder="Enter admin password"
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
            Admin access only
          </p>
        </div>
      </div>
    </div>
  );
}

