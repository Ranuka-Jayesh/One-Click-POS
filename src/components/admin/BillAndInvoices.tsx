import { useState, useMemo, useEffect } from "react";
import { getOrders, Order } from "@/utils/api";
import { Search, Download, Printer, Eye, Calendar as CalendarIcon, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function BillAndInvoices() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getOrders({
          isPaid: true,
          status: "completed",
        });
        if (response.success && response.data) {
          // Transform dates from strings to Date objects
          const ordersWithDates = response.data.orders.map((order) => ({
            ...order,
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
          }));
          setOrders(ordersWithDates);
        } else {
          setError(response.error || "Failed to load orders");
          toast({
            variant: "destructive",
            title: "Error",
            description: response.error || "Failed to load orders",
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [toast]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((o) => o.isPaid && o.status === "completed");

    // Apply date filter
    const now = new Date();
    switch (dateFilter) {
      case "today": {
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        filtered = filtered.filter((o) => {
          const orderDate = o.completedAt || o.createdAt;
          return orderDate >= todayStart && orderDate <= todayEnd;
        });
        break;
      }
      case "week": {
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        filtered = filtered.filter((o) => {
          const orderDate = o.completedAt || o.createdAt;
          return orderDate >= weekStart && orderDate <= weekEnd;
        });
        break;
      }
      case "month": {
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filtered = filtered.filter((o) => {
          const orderDate = o.completedAt || o.createdAt;
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        break;
      }
      case "last30": {
        const last30Start = startOfDay(subDays(now, 30));
        filtered = filtered.filter((o) => {
          const orderDate = o.completedAt || o.createdAt;
          return orderDate >= last30Start;
        });
        break;
      }
      case "custom":
        if (selectedDate) {
          const customStart = startOfDay(selectedDate);
          const customEnd = endOfDay(selectedDate);
          filtered = filtered.filter((o) => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= customStart && orderDate <= customEnd;
          });
        }
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          (o.tableNumber && o.tableNumber.toString().includes(term))
      );
    }

    return filtered.sort((a, b) => {
      const dateA = (a.completedAt || a.createdAt).getTime();
      const dateB = (b.completedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [orders, searchTerm, dateFilter, selectedDate]);

  const handlePrint = (orderId: string) => {
    setSelectedOrder(orderId);
    // In a real app, this would trigger a print dialog
    setTimeout(() => {
      window.print();
      setSelectedOrder(null);
    }, 100);
  };

  const handleDownload = (orderId: string) => {
    const order = filteredOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Create invoice content
    const invoiceContent = `
INVOICE
${"=".repeat(50)}
Order ID: ${order.id}
Date: ${format(order.completedAt || order.createdAt, "PPp")}
Customer: ${order.customerName}
${order.tableNumber ? `Table: ${order.tableNumber}` : "Type: Takeaway"}
${"=".repeat(50)}

ITEMS:
${order.items.map((item, idx) => 
  `${idx + 1}. ${item.menuItem.name} x${item.quantity} - Rs. ${(item.menuItem.price * item.quantity).toFixed(2)}`
).join("\n")}

${"=".repeat(50)}
Subtotal: Rs. ${order.total.toFixed(2)}
Payment Method: ${order.paymentMethod === "card" ? "Card" : "Cash"}
${"=".repeat(50)}
TOTAL: Rs. ${order.total.toFixed(2)}
${"=".repeat(50)}

Thank you for your business!
    `.trim();

    // Create and download file
    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      return;
    }

    // Prepare data for Excel
    const excelData = filteredOrders.map((order) => {
      const orderDate = order.completedAt || order.createdAt;
      const itemsList = order.items
        .map((item) => `${item.menuItem.name} (x${item.quantity})`)
        .join("; ");

      return {
        "Order ID": order.id,
        "Date": format(orderDate, "yyyy-MM-dd HH:mm:ss"),
        "Customer Name": order.customerName,
        "Table Number": order.tableNumber || "Takeaway",
        "Order Type": order.tableNumber ? "Table" : "Takeaway",
        "Payment Method": order.paymentMethod === "card" ? "Card" : "Cash",
        "Items": itemsList,
        "Item Count": order.items.length,
        "Total Amount (Rs.)": order.total.toFixed(2),
        "Status": order.status,
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Order ID
      { wch: 20 }, // Date
      { wch: 20 }, // Customer Name
      { wch: 12 }, // Table Number
      { wch: 12 }, // Order Type
      { wch: 15 }, // Payment Method
      { wch: 50 }, // Items
      { wch: 12 }, // Item Count
      { wch: 18 }, // Total Amount
      { wch: 12 }, // Status
    ];
    worksheet["!cols"] = columnWidths;

    // Generate filename with date range
    let filename = "Invoices";
    if (dateFilter === "custom" && selectedDate) {
      filename = `Invoices_${format(selectedDate, "yyyy-MM-dd")}`;
    } else if (dateFilter !== "all") {
      filename = `Invoices_${dateFilter}`;
    }
    filename += `_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.xlsx`;

    // Export to Excel
    XLSX.writeFile(workbook, filename);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground font-karla">Loading bills and invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Failed to Load Orders</p>
          <p className="text-muted-foreground font-karla">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Bills & Invoices</h2>
          <p className="text-muted-foreground font-karla">View and manage all bills and invoices</p>
        </div>
        {filteredOrders.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={(value) => {
              setDateFilter(value);
              if (value !== "custom") {
                setSelectedDate(null);
              }
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
            
            {dateFilter === "custom" && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select Date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
                  <CustomDatePicker
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setCalendarOpen(false);
                      }
                    }}
                    onClose={() => setCalendarOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card-elevated p-6">
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const orderDate = order.completedAt || order.createdAt;
              return (
                <div
                  key={order.id}
                  className="p-4 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{order.id}</h3>
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-semibold rounded">
                          {order.paymentMethod === "card" ? "Card" : "Cash"}
                        </span>
                        {order.tableNumber && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded">
                            Table {order.tableNumber}
                          </span>
                        )}
                        {!order.tableNumber && (
                          <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs font-semibold rounded">
                            Takeaway
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-karla mb-1">
                        Customer: {order.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground font-karla mb-2">
                        Date: {format(orderDate, "PPp")}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground font-karla">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </span>
                        <span className="font-semibold text-foreground">
                          Total: Rs. {order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(order.id)}
                        className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDownload(order.id)}
                        className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                        className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Order Details */}
                  {selectedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-3">Order Items:</h4>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="font-medium text-foreground">{item.menuItem.name}</p>
                              <p className="text-xs text-muted-foreground font-karla">
                                {item.menuItem.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">
                                {item.quantity} x Rs. {item.menuItem.price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground font-karla">
                                Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground font-karla">
              <Printer className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

