import { useState, useEffect } from "react";
import { DollarSign, X } from "lucide-react";

interface CashOutDialogProps {
  isOpen: boolean;
  onComplete: (amount: number) => void;
  onCancel: () => void;
  suggestedAmount?: number; // Current calculated cash balance
}

export default function CashOutDialog({ isOpen, onComplete, onCancel, suggestedAmount }: CashOutDialogProps) {
  const [cashAmount, setCashAmount] = useState("");
  const [error, setError] = useState("");

  // Pre-fill with suggested amount when dialog opens
  useEffect(() => {
    if (isOpen && suggestedAmount !== undefined) {
      setCashAmount(suggestedAmount.toFixed(2));
    } else if (isOpen) {
      setCashAmount("");
    }
  }, [isOpen, suggestedAmount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashAmount);

    if (!cashAmount.trim()) {
      setError("Please enter cash out amount");
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Bodoni Moda', serif" }}>
            Cash Out
          </h2>
          <p className="text-white/70 text-sm sm:text-base" style={{ fontFamily: "'Caveat', cursive" }}>
            Enter the ending cash amount for your shift
          </p>
          {suggestedAmount !== undefined && (
            <div className="mt-2 p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-xs text-white/60 mb-1" style={{ fontFamily: "'Caveat', cursive" }}>
                Current calculated balance:
              </p>
              <p className="text-lg font-bold text-success" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                Rs. {suggestedAmount.toFixed(2)}
              </p>
            </div>
          )}
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
                className="w-full px-4 py-3.5 bg-[#0f0f0f]/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive/50 transition-all duration-300 text-lg font-semibold"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-destructive text-sm mt-1">{error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 bg-secondary/50 hover:bg-secondary text-secondary-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 bg-destructive/90 hover:bg-destructive text-destructive-foreground font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-destructive/20"
            >
              <DollarSign className="w-5 h-5" />
              <span>Complete Logout</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

