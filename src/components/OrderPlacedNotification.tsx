import { CheckCircle2 } from "lucide-react";

interface OrderPlacedNotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderPlacedNotification({
  isOpen,
  onClose,
}: OrderPlacedNotificationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#1a1a1a]/95 backdrop-blur-2xl border border-success/50 rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Order Requested!</h3>
              <p className="text-white/70 text-sm">
                Your order has been placed successfully and is being processed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
