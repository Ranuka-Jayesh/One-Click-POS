import { LogOut, X } from "lucide-react";

interface LogoutConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
}: LogoutConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-300"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Bodoni Moda', serif" }}>
            Confirm Logout
          </h2>
          <p className="text-white/70 text-sm sm:text-base" style={{ fontFamily: "'Caveat', cursive" }}>
            Are you sure you want to logout? You will need to enter cash out amount.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-secondary/50 hover:bg-secondary text-secondary-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 bg-destructive/90 hover:bg-destructive text-destructive-foreground font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-destructive/20"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

