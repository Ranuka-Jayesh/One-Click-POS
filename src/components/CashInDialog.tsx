import { useState } from "react";
import { DollarSign, X } from "lucide-react";

interface CashInDialogProps {
  isOpen: boolean;
  onComplete: (amount: number) => void;
}

export default function CashInDialog({ isOpen, onComplete }: CashInDialogProps) {
  const [cashAmount, setCashAmount] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashAmount);

    if (!cashAmount.trim()) {
      setError("Please enter cash in amount");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    onComplete(amount);
    setCashAmount("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Bodoni Moda', serif" }}>
            Cash In
          </h2>
          <p className="text-white/70 text-sm sm:text-base" style={{ fontFamily: "'Caveat', cursive" }}>
            Enter the starting cash amount for your shift
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-white/90 text-sm font-medium" style={{ fontFamily: "'Caveat', cursive" }}>
              Cash Amount (Rs.)
            </label>
            <div className="relative">
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => {
                  setCashAmount(e.target.value);
                  setError("");
                }}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3.5 bg-[#0f0f0f]/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300 text-lg font-semibold"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-destructive text-sm mt-1">{error}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-accent/90 hover:bg-accent text-accent-foreground font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
          >
            <DollarSign className="w-5 h-5" />
            <span>Start Shift</span>
          </button>
        </form>
      </div>
    </div>
  );
}

