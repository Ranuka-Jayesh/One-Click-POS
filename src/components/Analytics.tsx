import { useMemo, useState, useEffect } from "react";
import { getOrders, getMenuItems, type Order, type MenuItem } from "@/utils/api";
import burgerImg from "@/assets/burger.jpg";
import pizzaImg from "@/assets/pizza.jpg";
import pepperoniImg from "@/assets/pepperoni-pizza.jpg";
import saladImg from "@/assets/salad.jpg";
import greekSaladImg from "@/assets/greek-salad.jpg";
import lemonadeImg from "@/assets/lemonade.jpg";
import coffeeImg from "@/assets/coffee.jpg";
import brownieImg from "@/assets/brownie.jpg";
import cheesecakeImg from "@/assets/cheesecake.jpg";
import bannerImg from "@/assets/banner.jpg";
import familyComboImg from "@/assets/FamilyCombo.jpg";
import happyHourImg from "@/assets/HappyHour.jpg";
import weekendSpecialImg from "@/assets/WeekendSpecial.jpg";

const imageMap: Record<string, string> = {
  "1": burgerImg, "2": burgerImg, "3": burgerImg,
  "4": pizzaImg, "5": pepperoniImg,
  "6": saladImg, "7": greekSaladImg,
  "8": lemonadeImg, "9": coffeeImg,
  "10": brownieImg, "11": cheesecakeImg,
};
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Clock,
  Calendar,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  subDays,
  format,
  isSameDay,
  isSameWeek,
  isSameMonth
} from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export default function Analytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dbMenuItems, setDbMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders and menu items from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all orders (we'll filter settled ones in useMemo)
        const ordersResponse = await getOrders();
        if (ordersResponse.success && ordersResponse.data) {
          // Convert date strings to Date objects
          const ordersWithDates = ordersResponse.data.orders.map((order) => ({
            ...order,
            createdAt: typeof order.createdAt === 'string' ? new Date(order.createdAt) : order.createdAt,
            completedAt: order.completedAt 
              ? (typeof order.completedAt === 'string' ? new Date(order.completedAt) : order.completedAt)
              : undefined,
          }));
          setOrders(ordersWithDates);
        } else {
          setError(ordersResponse.error || 'Failed to fetch orders');
        }

        // Fetch menu items from database
        const menuResponse = await getMenuItems();
        if (menuResponse.success && menuResponse.data) {
          setDbMenuItems(menuResponse.data.menuItems);
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get all settled orders (paid and completed)
  const settledOrders = useMemo(() => {
    return orders.filter((o) => o.isPaid && o.status === "completed");
  }, [orders]);

  // Use ONLY database menu items (no fallback to local data)
  const menuItemsToUse = useMemo(() => {
    return dbMenuItems; // Only use database items
  }, [dbMenuItems]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    // Today's stats
    const todayOrders = settledOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= today && orderDate <= todayEnd;
    });
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayCount = todayOrders.length;

    // This week's stats
    const weekOrders = settledOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= thisWeekStart && orderDate <= thisWeekEnd;
    });
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
    const weekCount = weekOrders.length;

    // This month's stats
    const monthOrders = settledOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= thisMonthStart && orderDate <= thisMonthEnd;
    });
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const monthCount = monthOrders.length;

    // All time stats
    const allTimeRevenue = settledOrders.reduce((sum, o) => sum + o.total, 0);
    const allTimeCount = settledOrders.length;

    // Payment method breakdown
    const cardOrders = settledOrders.filter((o) => o.paymentMethod === "card");
    const cashOrders = settledOrders.filter((o) => o.paymentMethod === "cash");
    const cardRevenue = cardOrders.reduce((sum, o) => sum + o.total, 0);
    const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);

    // Order type breakdown
    const tableOrders = settledOrders.filter((o) => o.tableNumber);
    const takeawayOrders = settledOrders.filter((o) => !o.tableNumber);
    const tableRevenue = tableOrders.reduce((sum, o) => sum + o.total, 0);
    const takeawayRevenue = takeawayOrders.reduce((sum, o) => sum + o.total, 0);

    // Last 7 days revenue data for chart
    const last7DaysStart = subDays(now, 6);
    const last7DaysEnd = todayEnd;
    const last7DaysOrders = settledOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= startOfDay(last7DaysStart) && orderDate <= last7DaysEnd;
    });
    const last7DaysRevenue = last7DaysOrders.reduce((sum, o) => sum + o.total, 0);
    const last7DaysCount = last7DaysOrders.length;
    const last7DaysAverage = last7DaysCount > 0 ? last7DaysRevenue / last7DaysCount : 0;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayOrders = settledOrders.filter((o) => {
        const orderDate = o.completedAt || o.createdAt;
        return orderDate >= dayStart && orderDate <= dayEnd;
      });
      return {
        date: format(date, "EEE"),
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      };
    });

    // Last 12 months revenue data for chart
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthOrders = settledOrders.filter((o) => {
        const orderDate = o.completedAt || o.createdAt;
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      return {
        month: format(date, "MMM"),
        revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
        orders: monthOrders.length,
      };
    });

    // Calculate top trending meals (last 7 days) - ONLY from database menu items
    const mealCounts = new Map<string, { quantity: number; revenue: number; name: string; image: string }>();
    last7DaysOrders.forEach((order) => {
      order.items.forEach((item) => {
        const menuItemId = item.menuItem.id || item.menuItem._id;
        // Only process if this menu item exists in database
        const dbMenuItem = menuItemsToUse.find(m => (m.id === menuItemId || m._id === menuItemId));
        if (!dbMenuItem) return; // Skip if not in database
        
        const existing = mealCounts.get(menuItemId) || { 
          quantity: 0, 
          revenue: 0, 
          name: dbMenuItem.name,
          image: dbMenuItem.image && dbMenuItem.image !== '/placeholder.svg' 
            ? dbMenuItem.image 
            : (imageMap[menuItemId] || dbMenuItem.image || '/placeholder.svg'),
        };
        mealCounts.set(menuItemId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.menuItem.price * item.quantity),
          name: existing.name,
          image: existing.image,
        });
      });
    });

    const topTrendingMeals = Array.from(mealCounts.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
        image: data.image,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3); // Top 3

    // Calculate risky items (items with low or no sales in last 7 days)
    const riskyItemsDays = 7;
    const riskyItemsStart = subDays(now, riskyItemsDays - 1);
    const riskyItemsOrders = settledOrders.filter((o) => {
      const orderDate = o.completedAt || o.createdAt;
      return orderDate >= startOfDay(riskyItemsStart) && orderDate <= todayEnd;
    });

    // Get all menu items from database ONLY and their sales data
    const allMenuItems = menuItemsToUse.map((item) => ({
      ...item,
      // Use item's own image if it exists and is not a placeholder, otherwise try imageMap, then fallback
      image: item.image && item.image !== '/placeholder.svg' 
        ? item.image 
        : (imageMap[item.id] || item.image || '/placeholder.svg'),
    }));

    const itemSalesMap = new Map<string, { quantity: number; lastSaleDate: Date | null }>();
    
    // Initialize all database items with zero sales
    allMenuItems.forEach((item) => {
      const itemId = item.id || item._id;
      if (itemId) {
        itemSalesMap.set(itemId, { quantity: 0, lastSaleDate: null });
      }
    });

    // Calculate sales for each item in the last 7 days - ONLY for database items
    riskyItemsOrders.forEach((order) => {
      const orderDate = order.completedAt || order.createdAt;
      order.items.forEach((item) => {
        const menuItemId = item.menuItem.id || item.menuItem._id;
        // Only process if this menu item exists in database
        const dbMenuItem = menuItemsToUse.find(m => (m.id === menuItemId || m._id === menuItemId));
        if (!dbMenuItem) return; // Skip if not in database
        
        const existing = itemSalesMap.get(menuItemId) || { quantity: 0, lastSaleDate: null };
        itemSalesMap.set(menuItemId, {
          quantity: existing.quantity + item.quantity,
          lastSaleDate: orderDate > (existing.lastSaleDate || new Date(0)) ? orderDate : existing.lastSaleDate,
        });
      });
    });

    // Find items with no sales or very low sales (less than 3 items sold) - ONLY from database
    const riskyItems = Array.from(itemSalesMap.entries())
      .map(([id, data]) => {
        // Only find items that exist in database
        const menuItem = allMenuItems.find((item) => (item.id === id || item._id === id));
        if (!menuItem) return null;
        
        const daysSinceLastSale = data.lastSaleDate
          ? Math.floor((now.getTime() - data.lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
          : riskyItemsDays;

        return {
          id: menuItem.id || menuItem._id || id,
          name: menuItem.name,
          quantity: data.quantity,
          daysSinceLastSale,
          image: menuItem.image,
          price: menuItem.price,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.quantity === 0 || item.quantity < 3) // No sales or less than 3 items
      .sort((a, b) => {
        // Sort by: no sales first, then by days since last sale, then by quantity
        if (a.quantity === 0 && b.quantity > 0) return -1;
        if (a.quantity > 0 && b.quantity === 0) return 1;
        if (a.quantity === 0 && b.quantity === 0) return b.daysSinceLastSale - a.daysSinceLastSale;
        return b.daysSinceLastSale - a.daysSinceLastSale;
      }); // Show all risky items

    return {
      today: { revenue: todayRevenue, count: todayCount },
      week: { revenue: weekRevenue, count: weekCount },
      month: { revenue: monthRevenue, count: monthCount },
      allTime: { revenue: allTimeRevenue, count: allTimeCount },
      paymentMethods: { card: cardRevenue, cash: cashRevenue },
      orderTypes: { table: tableRevenue, takeaway: takeawayRevenue },
      last7Days,
      last12Months,
      topTrendingMeals,
      riskyItems,
      last7DaysStats: { revenue: last7DaysRevenue, count: last7DaysCount, average: last7DaysAverage },
    };
  }, [settledOrders, menuItemsToUse]);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--accent))",
    },
    orders: {
      label: "Orders",
      color: "hsl(var(--muted-foreground))",
    },
  };

  // Payment methods data for pie chart
  const paymentMethodsData = [
    { name: "Card", value: stats.paymentMethods.card },
    { name: "Cash", value: stats.paymentMethods.cash },
  ].filter((item) => item.value > 0);

  // Order types data for pie chart
  const orderTypesData = [
    { name: "Table", value: stats.orderTypes.table },
    { name: "Takeaway", value: stats.orderTypes.takeaway },
  ].filter((item) => item.value > 0);

  const PIE_COLORS = ["hsl(var(--accent))", "hsl(var(--success))"];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-karla">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Error loading analytics</p>
          <p className="text-muted-foreground font-karla">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Revenue */}
        <div 
          className="card-elevated p-4 relative overflow-hidden"
          style={{
            backgroundImage: `url(${burgerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 -m-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-accent/30 rounded-lg backdrop-blur-sm border border-accent/20">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-white/90 font-karla">Today</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                Rs. {stats.today.revenue.toFixed(2)}
              </p>
              <p className="text-sm text-white/90 font-karla">
                {stats.today.count} orders
              </p>
            </div>
          </div>
        </div>

        {/* This Week's Revenue */}
        <div 
          className="card-elevated p-4 relative overflow-hidden"
          style={{
            backgroundImage: `url(${pizzaImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 -m-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-accent/30 rounded-lg backdrop-blur-sm border border-accent/20">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-white/90 font-karla">This Week</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                Rs. {stats.week.revenue.toFixed(2)}
              </p>
              <p className="text-sm text-white/90 font-karla">
                {stats.week.count} orders
              </p>
            </div>
          </div>
        </div>

        {/* This Month's Revenue */}
        <div 
          className="card-elevated p-4 relative overflow-hidden"
          style={{
            backgroundImage: `url(${familyComboImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 -m-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-accent/30 rounded-lg backdrop-blur-sm border border-accent/20">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-white/90 font-karla">This Month</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                Rs. {stats.month.revenue.toFixed(2)}
              </p>
              <p className="text-sm text-white/90 font-karla">
                {stats.month.count} orders
              </p>
            </div>
          </div>
        </div>

        {/* All Time Revenue */}
        <div 
          className="card-elevated p-4 relative overflow-hidden"
          style={{
            backgroundImage: `url(${bannerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 -m-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-accent/30 rounded-lg backdrop-blur-sm border border-accent/20">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-white/90 font-karla">All Time</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                Rs. {stats.allTime.revenue.toFixed(2)}
              </p>
              <p className="text-sm text-white/90 font-karla">
                {stats.allTime.count} orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Trending Meals */}
        <div className="card-elevated p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Last 7 Days Top Trending Meals
          </h3>
          <div className="space-y-3">
            {stats.topTrendingMeals.length > 0 ? (
              stats.topTrendingMeals.map((meal, index) => (
                <div key={meal.id} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20">
                    <span className="text-lg font-bold text-accent">#{index + 1}</span>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                    <img 
                      src={meal.image} 
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate mb-1">{meal.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-karla">
                        {meal.quantity} orders
                      </span>
                      <span className="text-xs font-semibold text-accent">
                        Rs. {meal.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{
                          width: `${stats.topTrendingMeals[0].quantity > 0 ? (meal.quantity / stats.topTrendingMeals[0].quantity) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground font-karla">
                No orders yet
              </div>
            )}
          </div>
        </div>

        {/* Last 7 Days Orders Chart */}
        <div className="card-elevated p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Last 7 Days Orders</h3>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={stats.last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--accent))", r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Payment Methods */}
        <div className="card-elevated p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            Payment Methods
          </h3>
          {paymentMethodsData.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[250px]">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-semibold text-foreground">
                                {payload[0].name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rs. {payload[0].value?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="mt-4 space-y-2">
                {paymentMethodsData.map((item, index) => {
                  const total = paymentMethodsData.reduce((sum, i) => sum + i.value, 0);
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
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

        {/* Order Types */}
        <div className="card-elevated p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            Order Types
          </h3>
          {orderTypesData.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[250px]">
                  <PieChart>
                    <Pie
                      data={orderTypesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-semibold text-foreground">
                                {payload[0].name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rs. {payload[0].value?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="mt-4 space-y-2">
                {orderTypesData.map((item, index) => {
                  const total = orderTypesData.reduce((sum, i) => sum + i.value, 0);
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
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
              No order data
            </div>
          )}
        </div>

        {/* Average Order Value & Total Orders */}
        <div className="card-elevated p-4">
          {/* Average Order Value */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Average Order Value
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  Rs. {stats.last7DaysStats.average.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground font-karla mt-1">Last 7 Days</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-lg font-semibold text-foreground">
                  Rs. {stats.today.count > 0 ? (stats.today.revenue / stats.today.count).toFixed(2) : "0.00"}
                </p>
                <p className="text-xs text-muted-foreground font-karla">Today</p>
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Total Orders
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.last7DaysStats.count}
                </p>
                <p className="text-xs text-muted-foreground font-karla mt-1">Last 7 Days</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-lg font-semibold text-foreground">
                  {stats.today.count}
                </p>
                <p className="text-xs text-muted-foreground font-karla">Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risky Items Section */}
      <div className="card-elevated p-4 mb-6">
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
                  <div className="p-4 flex flex-col items-center text-center space-y-2">
                    <p className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{item.name}</p>
                    <div className="space-y-1 w-full">
                      {item.quantity === 0 ? (
                        <div className="flex items-center justify-center gap-1 text-xs text-orange-500 font-semibold">
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
                          <span>{item.daysSinceLastSale} day{item.daysSinceLastSale !== 1 ? 's' : ''} ago</span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-foreground mt-1">
                        Rs. {item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground font-karla">
            All items have good sales performance
          </div>
        )}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="card-elevated p-4 w-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Last 12 Months Revenue</h3>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart data={stats.last12Months}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--accent))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

