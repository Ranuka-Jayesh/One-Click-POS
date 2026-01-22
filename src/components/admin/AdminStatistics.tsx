import { useMemo } from "react";
import { useOrderStore } from "@/stores/orderStore";
import { menuItems, categories } from "@/data/menuData";
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  CreditCard,
  Wallet,
  Table as TableIcon,
  Package
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function AdminStatistics() {
  const orders = useOrderStore((state) => state.orders);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const allOrders = orders.filter((o) => o.isPaid && o.status === "completed");
    
    const todayOrders = allOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= todayStart && orderDate <= todayEnd;
    });

    const weekOrders = allOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= weekStart && orderDate <= weekEnd;
    });

    const monthOrders = allOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= monthStart && orderDate <= monthEnd;
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const allTimeRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);

    const cardPayments = allOrders.filter((o) => o.paymentMethod === "card").reduce((sum, o) => sum + o.total, 0);
    const cashPayments = allOrders.filter((o) => o.paymentMethod === "cash").reduce((sum, o) => sum + o.total, 0);

    const tableOrders = allOrders.filter((o) => o.tableNumber).length;
    const takeawayOrders = allOrders.filter((o) => !o.tableNumber).length;

    return {
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
      },
      week: {
        revenue: weekRevenue,
        orders: weekOrders.length,
      },
      month: {
        revenue: monthRevenue,
        orders: monthOrders.length,
      },
      allTime: {
        revenue: allTimeRevenue,
        orders: allOrders.length,
      },
      paymentMethods: {
        card: cardPayments,
        cash: cashPayments,
      },
      orderTypes: {
        table: tableOrders,
        takeaway: takeawayOrders,
      },
    };
  }, [orders]);

  const statCards = [
    {
      title: "Today's Revenue",
      value: `Rs. ${stats.today.revenue.toFixed(2)}`,
      subtitle: `${stats.today.orders} orders`,
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "This Week",
      value: `Rs. ${stats.week.revenue.toFixed(2)}`,
      subtitle: `${stats.week.orders} orders`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "This Month",
      value: `Rs. ${stats.month.revenue.toFixed(2)}`,
      subtitle: `${stats.month.orders} orders`,
      icon: ShoppingBag,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "All Time",
      value: `Rs. ${stats.allTime.revenue.toFixed(2)}`,
      subtitle: `${stats.allTime.orders} orders`,
      icon: Package,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Statistics Overview</h2>
        <p className="text-muted-foreground font-karla">View comprehensive sales and performance metrics</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-foreground mb-1">{card.value}</p>
              <p className="text-xs text-muted-foreground font-karla">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Payment Methods & Order Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            Payment Methods
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-karla">Card</span>
                <span className="text-sm font-semibold text-foreground">
                  Rs. {stats.paymentMethods.card.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full"
                  style={{
                    width: `${stats.allTime.revenue > 0 ? (stats.paymentMethods.card / stats.allTime.revenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-karla">Cash</span>
                <span className="text-sm font-semibold text-foreground">
                  Rs. {stats.paymentMethods.cash.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full"
                  style={{
                    width: `${stats.allTime.revenue > 0 ? (stats.paymentMethods.cash / stats.allTime.revenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-muted-foreground" />
            Order Types
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-karla">Table Orders</span>
                <span className="text-sm font-semibold text-foreground">{stats.orderTypes.table}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${stats.allTime.orders > 0 ? (stats.orderTypes.table / stats.allTime.orders) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-karla">Takeaway Orders</span>
                <span className="text-sm font-semibold text-foreground">{stats.orderTypes.takeaway}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-warning h-2 rounded-full"
                  style={{
                    width: `${stats.allTime.orders > 0 ? (stats.orderTypes.takeaway / stats.allTime.orders) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

