import { useState, useMemo, useEffect, useCallback } from "react";
import { Order } from "@/types/order";
import { getOrders } from "@/utils/api";
import StatusBadge from "@/components/StatusBadge";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Table,
  ShoppingBag,
  CreditCard,
  Clock,
  Calendar,
  X,
  Wallet,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subDays,
  subWeeks,
  format,
  isSameMonth,
  isSameYear,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export default function CashierOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [orderType, setOrderType] = useState<"all" | "table" | "takeaway" | "cancelled">("all");
  // Set default date range to "today"
  const [dateRange, setDateRange] = useState<"all" | "today" | "yesterday" | "thisWeek" | "lastWeek">("today");
  // Set default month to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Load settled and cancelled orders from database
  const loadSettledOrders = async () => {
    setIsLoading(true);
    try {
      // Fetch both settled orders and cancelled orders
      const [settledResponse, cancelledResponse] = await Promise.all([
        getOrders({ isSettled: true }),
        getOrders({ status: 'cancelled' })
      ]);
      
      // Combine both responses
      interface OrderFromAPI {
        id?: string;
        orderId?: string;
        _id?: string;
        createdAt: Date | string;
        completedAt?: Date | string;
        [key: string]: unknown;
      }

      const allOrders: OrderFromAPI[] = [];
      
      if (settledResponse.success && settledResponse.data) {
        allOrders.push(...settledResponse.data.orders as OrderFromAPI[]);
      }
      
      if (cancelledResponse.success && cancelledResponse.data) {
        // Add cancelled orders that aren't already in the list
        const settledIds = new Set(allOrders.map(o => o.id || o.orderId || o._id));
        cancelledResponse.data.orders.forEach((order: OrderFromAPI) => {
          const orderId = order.id || order.orderId || order._id;
          if (!settledIds.has(orderId)) {
            allOrders.push(order);
          }
        });
      }
      
      // Transform orders to match Order type
      const dbOrders = allOrders.map((order: OrderFromAPI) => ({
        ...order,
        id: order.id || order.orderId || order._id || '',
        createdAt: new Date(order.createdAt),
        completedAt: order.completedAt 
          ? (typeof order.completedAt === 'string' 
              ? new Date(order.completedAt) 
              : order.completedAt)
          : undefined,
      }));
      setOrders(dbOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettledOrders();
  }, []);

  // Get all settled, cancelled, and refunded orders
  const allHistoryOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Include completed settled orders OR cancelled orders (including refunded takeaway orders)
        return (o.isPaid && o.status === "completed") || o.status === "cancelled";
      })
      .sort((a, b) => {
        // For cancelled orders, use createdAt; for completed orders, use completedAt
        const aTime = a.status === "cancelled"
          ? a.createdAt.getTime()
          : (a.completedAt instanceof Date 
              ? a.completedAt.getTime() 
              : (typeof a.completedAt === 'string' ? new Date(a.completedAt).getTime() : a.createdAt.getTime()));
        const bTime = b.status === "cancelled"
          ? b.createdAt.getTime()
          : (b.completedAt instanceof Date 
              ? b.completedAt.getTime() 
              : (typeof b.completedAt === 'string' ? new Date(b.completedAt).getTime() : b.createdAt.getTime()));
        return bTime - aTime;
      });
  }, [orders]);

  // Get available tables
  const availableTables = useMemo(() => {
    const tableSet = new Set<number>();
    allHistoryOrders.forEach((order) => {
      if (order.tableNumber) {
        tableSet.add(order.tableNumber);
      }
    });
    return Array.from(tableSet).sort((a, b) => a - b);
  }, [allHistoryOrders]);

  // Get months list
  const monthsList = useMemo(() => {
    const now = new Date();
    const months: { value: string; label: string }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${date.getMonth()}`,
        label: format(date, "MMMM"),
      });
    }
    
    return months;
  }, []);

  // Date filter helper
  const getDateFilter = (order: Order) => {
    const now = new Date();
    const orderDate = order.completedAt || order.createdAt;
    
    if (dateRange === "all") return true;
    if (dateRange === "today") {
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      return orderDate >= todayStart && orderDate <= todayEnd;
    }
    if (dateRange === "yesterday") {
      const yesterday = subDays(now, 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      return orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
    }
    if (dateRange === "thisWeek") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfDay(now);
      return orderDate >= weekStart && orderDate <= weekEnd;
    }
    if (dateRange === "lastWeek") {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return orderDate >= lastWeekStart && orderDate <= lastWeekEnd;
    }
    return true;
  };

  // Month filter helper
  const getMonthFilter = (order: Order) => {
    if (selectedMonth === "all") return true;
    const [year, month] = selectedMonth.split("-").map(Number);
    const orderDate = order.completedAt || order.createdAt;
    const orderDateObj = orderDate instanceof Date ? orderDate : new Date(orderDate);
    const orderMonth = new Date(orderDateObj.getFullYear(), orderDateObj.getMonth(), 1);
    const filterMonth = new Date(year, month, 1);
    return isSameMonth(orderMonth, filterMonth) && isSameYear(orderMonth, filterMonth);
  };

  // Search filter helper
  const getSearchFilter = (order: Order) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      (order.tableNumber && `table ${order.tableNumber}`.includes(searchLower)) ||
      (order.paymentMethod && order.paymentMethod.toLowerCase().includes(searchLower)) ||
      order.items.some((item) => item.menuItem.name.toLowerCase().includes(searchLower))
    );
  };

  // Filter orders based on all criteria
  const historyOrders = useMemo(() => {
    return allHistoryOrders.filter((order) => {
      // Table filter
      if (selectedTable !== "all") {
        if (order.tableNumber !== parseInt(selectedTable)) return false;
      }

      // Order type filter
      if (orderType === "table" && !order.tableNumber) return false;
      if (orderType === "takeaway" && order.tableNumber) return false;
      if (orderType === "cancelled" && order.status !== "cancelled") return false;

      // Date range filter
      if (!getDateFilter(order)) return false;

      // Month filter
      if (!getMonthFilter(order)) return false;

      // Search filter
      if (!getSearchFilter(order)) return false;

      return true;
    });
  }, [allHistoryOrders, selectedTable, orderType, getDateFilter, getMonthFilter, getSearchFilter]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, customer, table, payment method, or items..."
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Table Filter */}
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  <SelectValue placeholder="All Tables" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {availableTables.map((table) => (
                  <SelectItem key={table} value={table.toString()}>
                    Table {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Order Type Filter */}
            <Select
              value={orderType}
              onValueChange={(value) => setOrderType(value as "all" | "table" | "takeaway" | "cancelled")}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Order Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as typeof dateRange)}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <SelectValue placeholder="Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <SelectValue placeholder="Month" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthsList.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as "grid" | "list");
              }}
              className="justify-end"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground font-karla">
          {isLoading ? (
            "Loading orders..."
          ) : (
            `Showing ${historyOrders.length} ${historyOrders.length === 1 ? "order" : "orders"}`
          )}
        </div>

        {/* Orders Display */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 animate-pulse">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-karla">Loading order history...</p>
          </div>
        ) : historyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-karla">
              No orders found matching your filters
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {(() => {
              const takeawayOrders: Order[] = [];
              const groupedTableOrders = new Map<string, Order[]>();

              historyOrders.forEach((order) => {
                if (!order.tableNumber) {
                  takeawayOrders.push(order);
                } else {
                  // For cancelled orders, use createdAt; for completed orders, use completedAt
                  const orderTime = order.status === "cancelled"
                    ? order.createdAt
                    : (order.completedAt instanceof Date 
                        ? order.completedAt 
                        : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                  const orderTimestamp = orderTime.getTime();
                  const roundedTimestamp = Math.floor(orderTimestamp / 2000) * 2000;
                  const groupKey = `${order.tableNumber}-${roundedTimestamp}`;

                  if (!groupedTableOrders.has(groupKey)) {
                    groupedTableOrders.set(groupKey, []);
                  }
                  groupedTableOrders.get(groupKey)!.push(order);
                }
              });

              // Create table card items with timestamp for sorting
              const tableCardItems = Array.from(groupedTableOrders.entries())
                .map(([groupKey, orders]) => {
                  // For cancelled orders, use createdAt; for completed orders, use completedAt
                  const firstOrder = orders[0];
                  const orderTime = firstOrder.status === "cancelled"
                    ? firstOrder.createdAt
                    : (firstOrder.completedAt instanceof Date 
                        ? firstOrder.completedAt 
                        : (firstOrder.completedAt ? new Date(firstOrder.completedAt) : firstOrder.createdAt));
                  const timestamp = orderTime.getTime();
                  
                  return {
                    type: 'table' as const,
                    timestamp,
                    groupKey,
                    orders,
                    orderTime,
                  };
                });

              // Create takeaway card items with timestamp for sorting
              const takeawayCardItems = takeawayOrders.map((order) => {
                // For cancelled orders, use createdAt; for completed orders, use completedAt
                const orderTime = order.status === "cancelled"
                  ? order.createdAt
                  : (order.completedAt instanceof Date 
                      ? order.completedAt 
                      : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                const timestamp = orderTime.getTime();
                
                return {
                  type: 'takeaway' as const,
                  timestamp,
                  order,
                  orderTime,
                };
              });

              // Combine and sort all items by timestamp (descending - most recent first)
              const allCardItems = [...tableCardItems, ...takeawayCardItems].sort((a, b) => {
                return b.timestamp - a.timestamp; // Descending order
              });

              // Render the mixed cards
              return allCardItems.map((item) => {
                if (item.type === 'table') {
                  const { groupKey, orders, orderTime } = item;
                  const total = orders.reduce((sum, o) => sum + o.total, 0);
                  // Get payment method from first order that has one, or first order
                  const paymentMethod = orders.find((o) => o.paymentMethod)?.paymentMethod || orders[0].paymentMethod;

                  return (
                    <div
                      key={groupKey}
                      className="card-elevated p-3 sm:p-4 space-y-3 sm:space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Table className="w-5 h-5 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">Table {orders[0].tableNumber}</h3>
                              {orders.every((o) => o.status === "cancelled") && (
                                <span className="text-[10px] font-sofia font-semibold text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                  <X className="w-3 h-3" />
                                  CANCELLED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-karla">
                              {orders.length} {orders.length === 1 ? "order" : "orders"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 sm:ml-2">
                          <p className="text-lg font-bold text-accent">Rs. {total.toFixed(2)}</p>
                          {paymentMethod && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {paymentMethod === "card" ? (
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground font-karla capitalize">
                                {paymentMethod}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground font-karla mt-1">
                            {format(orderTime, "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      
                      {/* Each order separately */}
                      <div className="space-y-4 pt-3 border-t border-border">
                        {orders.map((order, orderIdx) => {
                          // For cancelled orders, use createdAt; for completed orders, use completedAt
                          const orderTime = order.status === "cancelled"
                            ? order.createdAt
                            : (order.completedAt instanceof Date 
                                ? order.completedAt 
                                : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                          return (
                            <div key={order.id} className={orderIdx > 0 ? "pt-4 border-t border-border/50" : ""}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-karla">
                                  <span className="truncate">Order ID: {order.id}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="whitespace-nowrap">{format(orderTime, "MMM d, h:mm a")}</span>
                                  {order.status !== "completed" && (
                                    <StatusBadge status={order.status} size="sm" />
                                  )}
                                  {order.refundStatus && (
                                    <span className="text-[10px] font-sofia font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                      <RotateCcw className="w-3 h-3" />
                                      REFUNDED
                                    </span>
                                  )}
                                </div>
                                <div className="text-left sm:text-right flex-shrink-0">
                                  <div className="text-xs font-semibold text-foreground">
                                    Rs. {order.total.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {order.items.map((item) => (
                                  <div key={item.menuItem.id} className="flex justify-between text-sm gap-2">
                                    <span className="text-foreground truncate">
                                      {item.quantity}x {item.menuItem.name}
                                    </span>
                                    <span className="text-muted-foreground font-karla whitespace-nowrap flex-shrink-0">
                                      Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  // Takeaway order
                  const { order, orderTime } = item;
                  return (
                    <div key={order.id} className="card-elevated p-3 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-5 h-5 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">{order.customerName}</h3>
                              {order.status !== "completed" && (
                                <StatusBadge status={order.status} size="sm" />
                              )}
                              {order.refundStatus && (
                                <span className="text-[10px] font-sofia font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                  <RotateCcw className="w-3 h-3" />
                                  REFUNDED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-karla truncate">
                              {order.id} • {format(orderTime, "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 sm:ml-2">
                          <p className="text-lg font-bold text-accent">Rs. {order.total.toFixed(2)}</p>
                          {order.paymentMethod && (
                            <div className="flex items-center gap-1 mt-1 sm:justify-end">
                              {order.paymentMethod === "card" ? (
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground font-karla capitalize">
                                {order.paymentMethod}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 pt-3 border-t border-border">
                        {order.items.map((item) => (
                          <div key={item.menuItem.id} className="flex justify-between text-sm gap-2">
                            <span className="text-foreground truncate">
                              {item.quantity}x {item.menuItem.name}
                            </span>
                            <span className="text-muted-foreground font-karla whitespace-nowrap flex-shrink-0">
                              Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              });
            })()}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {(() => {
              const takeawayOrders: Order[] = [];
              const groupedTableOrders = new Map<string, Order[]>();

              historyOrders.forEach((order) => {
                if (!order.tableNumber) {
                  takeawayOrders.push(order);
                } else {
                  // For cancelled orders, use createdAt; for completed orders, use completedAt
                  const orderTime = order.status === "cancelled"
                    ? order.createdAt
                    : (order.completedAt instanceof Date 
                        ? order.completedAt 
                        : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                  const orderTimestamp = orderTime.getTime();
                  const roundedTimestamp = Math.floor(orderTimestamp / 2000) * 2000;
                  const groupKey = `${order.tableNumber}-${roundedTimestamp}`;

                  if (!groupedTableOrders.has(groupKey)) {
                    groupedTableOrders.set(groupKey, []);
                  }
                  groupedTableOrders.get(groupKey)!.push(order);
                }
              });

              // Create table accordion items with timestamp for sorting
              const tableAccordionItems = Array.from(groupedTableOrders.entries())
                .map(([groupKey, orders]) => {
                  // For cancelled orders, use createdAt; for completed orders, use completedAt
                  const firstOrder = orders[0];
                  const orderTime = firstOrder.status === "cancelled"
                    ? firstOrder.createdAt
                    : (firstOrder.completedAt instanceof Date 
                        ? firstOrder.completedAt 
                        : (firstOrder.completedAt ? new Date(firstOrder.completedAt) : firstOrder.createdAt));
                  const timestamp = orderTime.getTime();
                  
                  return {
                    type: 'table' as const,
                    timestamp,
                    groupKey,
                    orders,
                    orderTime,
                  };
                });

              // Create takeaway accordion items with timestamp for sorting
              const takeawayAccordionItems = takeawayOrders.map((order) => {
                // For cancelled orders, use createdAt; for completed orders, use completedAt
                const orderTime = order.status === "cancelled"
                  ? order.createdAt
                  : (order.completedAt instanceof Date 
                      ? order.completedAt 
                      : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                const timestamp = orderTime.getTime();
                
                return {
                  type: 'takeaway' as const,
                  timestamp,
                  order,
                  orderTime,
                };
              });

              // Combine and sort all items by timestamp (descending - most recent first)
              const allAccordionItems = [...tableAccordionItems, ...takeawayAccordionItems].sort((a, b) => {
                return b.timestamp - a.timestamp; // Descending order
              });

              // Render the mixed accordion items
              return allAccordionItems.map((item) => {
                if (item.type === 'table') {
                  const { groupKey, orders, orderTime } = item;
                  const total = orders.reduce((sum, o) => sum + o.total, 0);
                  // Get payment method from first order that has one, or first order
                  const paymentMethod = orders.find((o) => o.paymentMethod)?.paymentMethod || orders[0].paymentMethod;

                  return (
                    <AccordionItem key={groupKey} value={groupKey} className="card-elevated border-border">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                              <Table className="w-5 h-5 text-accent" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">Table {orders[0].tableNumber}</h3>
                                {orders.every((o) => o.status === "cancelled") && (
                                  <span className="text-[10px] font-sofia font-semibold text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <X className="w-3 h-3" />
                                    CANCELLED
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground font-karla">
                                  ({orders.length} {orders.length === 1 ? "order" : "orders"})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-karla">
                                <span>{orders.map((o) => o.id).join(", ")}</span>
                                <span>{format(orderTime, "MMM d, h:mm a")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-accent">Rs. {total.toFixed(2)}</p>
                            {paymentMethod && (
                              <div className="flex items-center justify-end gap-1 mt-1">
                                {paymentMethod === "card" ? (
                                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <span className="text-xs text-muted-foreground font-karla capitalize">
                                  {paymentMethod}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 pt-2">
                          {orders.map((order, orderIdx) => {
                            // For cancelled orders, use createdAt; for completed orders, use completedAt
                            const orderTime = order.status === "cancelled"
                              ? order.createdAt
                              : (order.completedAt instanceof Date 
                                  ? order.completedAt 
                                  : (order.completedAt ? new Date(order.completedAt) : order.createdAt));
                            return (
                              <div key={order.id} className={orderIdx > 0 ? "pt-4 border-t border-border/50" : ""}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-karla">
                                    <span>Order ID: {order.id}</span>
                                    <span>•</span>
                                    <span>{format(orderTime, "MMM d, h:mm a")}</span>
                                    {order.status !== "completed" && (
                                      <StatusBadge status={order.status} size="sm" />
                                    )}
                                    {order.refundStatus && (
                                      <span className="text-[10px] font-sofia font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <RotateCcw className="w-3 h-3" />
                                        REFUNDED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-semibold text-foreground">
                                      Rs. {order.total.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  {order.items.map((item) => (
                                    <div key={item.menuItem.id} className="flex justify-between text-sm py-1">
                                      <span className="text-foreground">
                                        {item.quantity}x {item.menuItem.name}
                                      </span>
                                      <span className="text-muted-foreground font-karla">
                                        Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                } else {
                  // Takeaway order
                  const { order, orderTime } = item;
                  return (
                    <AccordionItem key={order.id} value={order.id} className="card-elevated border-border">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-accent" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{order.customerName}</h3>
                              {order.status !== "completed" && (
                                <StatusBadge status={order.status} size="sm" />
                              )}
                              {order.refundStatus && (
                                <span className="text-[10px] font-sofia font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <RotateCcw className="w-3 h-3" />
                                  REFUNDED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-karla">
                              <span>{order.id}</span>
                              <span>{format(orderTime, "MMM d, h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-accent">Rs. {order.total.toFixed(2)}</p>
                          {order.paymentMethod && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {order.paymentMethod === "card" ? (
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground font-karla capitalize">
                                {order.paymentMethod}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 pt-2">
                        {order.items.map((item) => (
                          <div
                            key={item.menuItem.id}
                            className="flex justify-between text-sm py-1"
                          >
                            <span className="text-foreground">
                              {item.quantity}x {item.menuItem.name}
                            </span>
                            <span className="text-muted-foreground font-karla">
                              Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  );
                }
              });
            })()}
          </Accordion>
        )}
      </div>
    </div>
  );
}
