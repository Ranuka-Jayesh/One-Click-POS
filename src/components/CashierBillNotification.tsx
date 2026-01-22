import { Receipt, X, Table as TableIcon } from "lucide-react";

interface CashierBillNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  tableLabel: string;
}

export default function CashierBillNotification({
  isOpen,
  onClose,
  tableId,
  tableLabel,
}: CashierBillNotificationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-[#1a1a1a]/95 backdrop-blur-2xl border border-accent/50 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-accent/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center animate-pulse">
                <Receipt className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Bill Request</h3>
                <p className="text-sm text-white/60 mt-1">
                  Customer is requesting the bill
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <TableIcon className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-white/60 mb-1">Table</p>
                <p className="text-lg font-semibold text-white">
                  {tableLabel || `Table ${tableId}`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0f0f]/60 rounded-xl p-4 border border-white/10">
            <p className="text-sm text-white/80 text-center">
              Please prepare and bring the bill to the table.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-accent/30">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-accent/90 hover:bg-accent text-accent-foreground font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            Acknowledged
          </button>
        </div>
      </div>
    </div>
  );
}
