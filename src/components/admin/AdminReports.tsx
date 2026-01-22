import { useState, useMemo, useEffect } from "react";
import { getOrders, Order } from "@/utils/api";
import { Download, FileText, Calendar, Filter, Table as TableIcon, ShoppingBag, Loader2, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ReportType = "today" | "week" | "month" | "custom";
type OrderTypeFilter = "all" | "table" | "takeaway";
type ExportFormat = "csv" | "json" | "pdf";

export default function AdminReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("today");
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>("all");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Build query params based on order type filter
        const params: {
          isPaid?: boolean;
          status?: string;
          orderType?: string;
        } = {
          isPaid: true,
          status: "completed",
        };

        // Apply order type filter at API level if not "all"
        if (orderTypeFilter === "table") {
          params.orderType = "dining";
        } else if (orderTypeFilter === "takeaway") {
          params.orderType = "takeaway";
        }

        const response = await getOrders(params);
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
  }, [orderTypeFilter, toast]);

  const reportData = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (reportType) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "custom":
        start = startOfDay(new Date(startDate));
        end = endOfDay(new Date(endDate));
        break;
    }

    let filteredOrders = orders.filter((o) => {
      if (!o.isPaid || o.status !== "completed") return false;
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= start && orderDate <= end;
    });

    // Order type filter is already applied at API level, but we keep this for safety
    if (orderTypeFilter === "table") {
      filteredOrders = filteredOrders.filter((o) => o.tableNumber !== undefined);
    } else if (orderTypeFilter === "takeaway") {
      filteredOrders = filteredOrders.filter((o) => o.tableNumber === undefined);
    }

    const revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const cardPayments = filteredOrders.filter((o) => o.paymentMethod === "card").reduce((sum, o) => sum + o.total, 0);
    const cashPayments = filteredOrders.filter((o) => o.paymentMethod === "cash").reduce((sum, o) => sum + o.total, 0);
    const tableOrders = filteredOrders.filter((o) => o.tableNumber).length;
    const takeawayOrders = filteredOrders.filter((o) => !o.tableNumber).length;

    return {
      orders: filteredOrders,
      summary: {
        totalRevenue: revenue,
        totalOrders: filteredOrders.length,
        cardPayments,
        cashPayments,
        tableOrders,
        takeawayOrders,
        averageOrderValue: filteredOrders.length > 0 ? revenue / filteredOrders.length : 0,
      },
      dateRange: { start, end },
    };
  }, [orders, reportType, orderTypeFilter, startDate, endDate]);

  const exportToCSV = () => {
    const headers = ["Order ID", "Customer", "Table", "Items", "Total", "Payment Method", "Date"];
    const rows = reportData.orders.map((order) => [
      order.id,
      order.customerName,
      order.tableNumber || "Takeaway",
      order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", "),
      order.total.toFixed(2),
      order.paymentMethod || "N/A",
      format(order.completedAt || order.createdAt, "yyyy-MM-dd HH:mm"),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      dateRange: {
        start: format(reportData.dateRange.start, "yyyy-MM-dd"),
        end: format(reportData.dateRange.end, "yyyy-MM-dd"),
      },
      summary: reportData.summary,
      orders: reportData.orders.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        items: order.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
        total: order.total,
        paymentMethod: order.paymentMethod,
        completedAt: order.completedAt || order.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Simple PDF export using window.print() - in production, use a library like jsPDF
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground font-karla">Loading sales reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Failed to Load Reports</p>
          <p className="text-muted-foreground font-karla">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sales Reports</h2>
        <p className="text-muted-foreground font-karla">Generate and export detailed sales reports</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">Rs. {reportData.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-foreground">{reportData.summary.totalOrders}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-foreground">Rs. {reportData.summary.averageOrderValue.toFixed(2)}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">Date Range</p>
          <p className="text-sm font-semibold text-foreground">
            {format(reportData.dateRange.start, "MMM d")} - {format(reportData.dateRange.end, "MMM d")}
          </p>
        </div>
      </div>

      {/* Export Options */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Export Report</h3>
        </div>
        
        {/* Report Filters and Export Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Report Filters */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Report Period</label>
                <Select
                  value={reportType}
                  onValueChange={(value) => setReportType(value as ReportType)}
                >
                  <SelectTrigger className="w-full h-11 bg-secondary border border-border rounded-lg hover:bg-secondary/80 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border rounded-lg shadow-xl p-1">
                    <SelectItem 
                      value="today"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Today</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="week"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">This Week</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="month"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">This Month</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="custom"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Custom Range</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Order Type</label>
                <Select
                  value={orderTypeFilter}
                  onValueChange={(value) => setOrderTypeFilter(value as OrderTypeFilter)}
                >
                  <SelectTrigger className="w-full h-11 bg-secondary border border-border rounded-lg hover:bg-secondary/80 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border rounded-lg shadow-xl p-1">
                    <SelectItem 
                      value="all"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">All</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="table"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4" />
                        <span className="font-medium">Table Orders</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="takeaway"
                      className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-accent/20 hover:text-accent focus:bg-accent/20 focus:text-accent data-[highlighted]:bg-accent/20 data-[highlighted]:text-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="font-medium">Takeaway</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reportType === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportToJSON}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Order Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Order Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Items</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Payment</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {reportData.orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found for the selected period
                  </td>
                </tr>
              ) : (
                reportData.orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/50">
                    <td className="py-3 px-4 text-sm text-foreground">{order.id}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{order.customerName}</td>
                    <td className="py-3 px-4 text-sm">
                      {order.tableNumber ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">
                          <TableIcon className="w-3.5 h-3.5" />
                          Table {order.tableNumber}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning/10 text-warning font-medium">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Takeaway
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {order.items.length} item(s)
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">Rs. {order.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground capitalize">
                      {order.paymentMethod || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {format(order.completedAt || order.createdAt, "MMM d, h:mm a")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

