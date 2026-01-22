import { useEffect, useState } from "react";
import { getAdminOverview, AdminOverviewStats } from "@/utils/api";
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  CreditCard,
  Wallet,
  Table as TableIcon,
  Package,
  Clock,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getAdminOverview();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error || "Failed to load overview statistics");
          toast({
            variant: "destructive",
            title: "Error",
            description: response.error || "Failed to load overview statistics",
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

    fetchOverview();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground font-karla">Loading overview statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Failed to Load Statistics</p>
          <p className="text-muted-foreground font-karla">{error || "Unable to load overview statistics"}</p>
        </div>
      </div>
    );
  }

  // Legacy stats calculation removed - now using API data directly

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

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
        <h2 className="text-2xl font-bold text-foreground mb-2">Overview</h2>
        <p className="text-muted-foreground font-karla">Comprehensive sales and performance insights</p>
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

      {/* Trends Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              Revenue Trend (Last 7 Days)
            </h3>
            <div className="flex items-center gap-2">
              {stats.trends.revenue >= 0 ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-semibold ${stats.trends.revenue >= 0 ? "text-success" : "text-red-500"}`}>
                {Math.abs(stats.trends.revenue).toFixed(1)}% vs Previous 7 Days
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={stats.dailyRevenue}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px", fontFamily: "var(--font-karla)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px", fontFamily: "var(--font-karla)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `Rs.${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontFamily: "var(--font-karla)",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                  fontFamily: "var(--font-karla)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`Rs. ${value.toFixed(2)}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                fill="url(#revenueGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--accent))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: "hsl(var(--accent))", strokeWidth: 2 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Orders Trend (Last 7 Days)
            </h3>
            <div className="flex items-center gap-2">
              {stats.trends.orders >= 0 ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-semibold ${stats.trends.orders >= 0 ? "text-success" : "text-red-500"}`}>
                {Math.abs(stats.trends.orders).toFixed(1)}% vs Previous 7 Days
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={stats.dailyRevenue}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px", fontFamily: "var(--font-karla)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px", fontFamily: "var(--font-karla)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontFamily: "var(--font-karla)",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                  fontFamily: "var(--font-karla)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value} orders`, "Orders"]}
              />
              <Area
                type="monotone"
                dataKey="orders"
                fill="url(#ordersGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 3 Items & Peak Times */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Items */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Top 3 Items (Last 7 Days)
          </h3>
          <div className="space-y-4">
            {stats.top3Items.length > 0 ? (
              stats.top3Items.map((itemData, index) => {
                const itemImage = itemData.item.image;
                return (
                  <div key={itemData.item.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={itemImage}
                        alt={itemData.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{itemData.item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-karla">
                          {itemData.quantity} sold
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-foreground">
                          Rs. {itemData.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        index === 1 ? "bg-gray-400/20 text-gray-400" :
                        "bg-orange-500/20 text-orange-500"
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground font-karla text-sm">
                No items sold in the last 7 days
              </div>
            )}
          </div>
        </div>

        {/* Peak Days */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Peak Days (Last 30 Days)
          </h3>
          <div className="space-y-4">
            {stats.peakDays.length > 0 ? (
              stats.peakDays.map((dayData, index) => {
                const maxOrders = Math.max(...stats.peakDays.map(d => d.orders), 1);
                const percentage = (dayData.orders / maxOrders) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{dayData.day}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-karla">{dayData.orders} orders</span>
                        <span className="text-sm font-semibold text-foreground">Rs. {dayData.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-success h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground font-karla text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Peak Hours (All Time)
          </h3>
          <div className="space-y-4">
            {stats.peakHours.length > 0 ? (
              stats.peakHours.map((hourData, index) => {
                const maxOrders = Math.max(...stats.peakHours.map(h => h.orders), 1);
                const percentage = (hourData.orders / maxOrders) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{formatHour(hourData.hour)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-karla">{hourData.orders} orders</span>
                        <span className="text-sm font-semibold text-foreground">Rs. {hourData.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground font-karla text-sm">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risky Items Section */}
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Risky Items (Low/No Sales in Last 7 Days)
        </h3>
        {stats.riskyItems.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
            <div className="flex gap-4 min-w-max pb-2">
              {stats.riskyItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-secondary/50 rounded-lg border border-orange-500/20 hover:bg-secondary transition-colors min-w-[180px] flex-shrink-0 overflow-hidden"
                >
                  <div className="w-full h-32 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                    <div className="space-y-1">
                      {item.quantity === 0 ? (
                        <div className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>No sales</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground font-karla">
                          <span className="text-orange-500 font-semibold">{item.quantity}</span> sold
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground font-karla">
                        {item.daysSinceLastSale === 7 ? (
                          <span className="text-orange-500">No sales in 7 days</span>
                        ) : (
                          <span className="text-orange-500">{item.daysSinceLastSale} days ago</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-accent mt-2">Rs. {item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground font-karla">
            No risky items found
          </div>
        )}
      </div>

      {/* Payment Methods & Order Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            Payment Methods
          </h3>
          {stats.allTime.revenue > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Card", value: stats.paymentMethods.card },
                        { name: "Cash", value: stats.paymentMethods.cash },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--accent))" />
                      <Cell fill="hsl(var(--success))" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        padding: "8px 12px",
                      }}
                      formatter={(value: number) => [`Rs. ${value.toFixed(2)}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: "Card", value: stats.paymentMethods.card, color: "hsl(var(--accent))" },
                  { name: "Cash", value: stats.paymentMethods.cash, color: "hsl(var(--success))" },
                ].map((item, index) => {
                  const total = stats.allTime.revenue;
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground font-karla">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-karla">
                          {percentage.toFixed(0)}%
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          Rs. {item.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground font-karla">
              No payment data
            </div>
          )}
        </div>

        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-muted-foreground" />
            Order Types
          </h3>
          {stats.allTime.orders > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Table Orders", value: stats.orderTypes.table },
                        { name: "Takeaway Orders", value: stats.orderTypes.takeaway },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--warning))" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        padding: "8px 12px",
                      }}
                      formatter={(value: number) => [`${value} orders`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: "Table Orders", value: stats.orderTypes.table, color: "hsl(var(--primary))" },
                  { name: "Takeaway Orders", value: stats.orderTypes.takeaway, color: "hsl(var(--warning))" },
                ].map((item, index) => {
                  const total = stats.allTime.orders;
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground font-karla">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-karla">
                          {percentage.toFixed(0)}%
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {item.value} orders
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground font-karla">
              No order data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

