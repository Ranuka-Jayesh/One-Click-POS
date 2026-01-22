import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  FileText, 
  Utensils, 
  FolderTree, 
  Table as TableIcon,
  LogOut,
  Settings as SettingsIcon,
  TrendingUp,
  Download,
  Menu,
  X,
  Users,
  User,
  Receipt
} from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminReports from "@/components/admin/AdminReports";
import MenuManagement from "@/components/admin/MenuManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import TableManagement from "@/components/admin/TableManagement";
import CashierManagement from "@/components/admin/CashierManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import BillAndInvoices from "@/components/admin/BillAndInvoices";

type AdminTab = "statistics" | "bills" | "reports" | "menu" | "categories" | "tables" | "cashiers" | "settings";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("statistics");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if admin is logged in
    const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
    if (!isAdminLoggedIn) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("adminUsername");
    localStorage.setItem("userRole", "cashier");
    navigate("/admin/login");
  };

  const tabs = [
    { id: "statistics" as AdminTab, label: "Overview", icon: TrendingUp },
    { id: "bills" as AdminTab, label: "Bills & Invoices", icon: Receipt },
    { id: "reports" as AdminTab, label: "Reports", icon: FileText },
    { id: "menu" as AdminTab, label: "Menu Items", icon: Utensils },
    { id: "categories" as AdminTab, label: "Categories", icon: FolderTree },
    { id: "tables" as AdminTab, label: "Tables", icon: TableIcon },
    { id: "cashiers" as AdminTab, label: "Cashiers", icon: Users },
    { id: "settings" as AdminTab, label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-2 flex items-center justify-between sticky top-0 z-20 h-[73px]">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center flex-shrink-0">
            <img 
              src="/logo-removebg.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg sm:text-xl font-archivo font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-karla">Manage your restaurant</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-archivo font-bold text-foreground">Admin</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent/40 transition-colors">
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            w-full sm:w-72 lg:w-64 bg-card border-r border-border flex flex-col fixed left-0 top-[73px] bottom-0 z-40
            transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0
          `}
        >
          <div className="flex flex-col h-full">
            {/* Navigation Section */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                        text-sm font-medium
                        ${
                          isActive
                            ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-accent-foreground" : ""}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Logout Section */}
            <div className="px-4 py-4 border-t border-border bg-secondary/30">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:shadow-sm font-medium text-sm"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:ml-64 min-h-[calc(100vh-73px)] w-full scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto">
            {activeTab === "statistics" && <AdminOverview />}
            {activeTab === "bills" && <BillAndInvoices />}
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "menu" && <MenuManagement />}
            {activeTab === "categories" && <CategoryManagement />}
            {activeTab === "tables" && <TableManagement />}
            {activeTab === "cashiers" && <CashierManagement />}
            {activeTab === "settings" && <AdminSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}

