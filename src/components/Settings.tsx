import { useState, useEffect } from "react";
import {
  Lock,
  User,
  Clock,
  Printer,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  cashierChangePassword,
  getCashierProfile,
  updateCashierProfile,
  getCashierLoginLogs,
  getCashierPrinters,
  saveCashierPrinters,
  type CashierLoginLog,
  type PrinterConfig as ApiPrinterConfig,
} from "@/utils/api";

interface PrinterConfig {
  id: string;
  name: string;
  type: "receipt" | "kitchen" | "label";
  enabled: boolean;
  printerName: string;
  paperSize: "58mm" | "80mm";
  copies: number;
}

export default function Settings() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    role: "cashier",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Login logs state
  const [loginLogs, setLoginLogs] = useState<CashierLoginLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingPrinters, setIsSavingPrinters] = useState(false);

  // Printer config state
  const [printers, setPrinters] = useState<PrinterConfig[]>([
    {
      id: "1",
      name: "Receipt Printer",
      type: "receipt",
      enabled: true,
      printerName: "",
      paperSize: "58mm",
      copies: 1,
    },
    {
      id: "2",
      name: "Kitchen Printer",
      type: "kitchen",
      enabled: false,
      printerName: "",
      paperSize: "80mm",
      copies: 1,
    },
    {
      id: "3",
      name: "Label Printer",
      type: "label",
      enabled: false,
      printerName: "",
      paperSize: "58mm",
      copies: 1,
    },
  ]);
  const [printerError, setPrinterError] = useState("");
  const [printerSuccess, setPrinterSuccess] = useState(false);

  // Load initial data
  useEffect(() => {
    const username = localStorage.getItem("username") || localStorage.getItem("cashierUsername") || "";
    
    if (username) {
      loadProfile(username);
      loadLoginLogs(username);
      loadPrinters(username);
    }
  }, []);

  const loadProfile = async (username: string) => {
    setIsLoadingProfile(true);
    try {
      const response = await getCashierProfile(username);
      if (response.success && response.data) {
        setProfileData({
          username: response.data.profile.username,
          fullName: response.data.profile.fullName,
          email: response.data.profile.email,
          phone: response.data.profile.phone,
          role: response.data.profile.role,
        });
      } else {
        // Fallback to localStorage if API fails
        const savedProfile = localStorage.getItem("userProfile");
        if (savedProfile) {
          setProfileData(JSON.parse(savedProfile));
        } else {
          setProfileData({
            username,
            fullName: "",
            email: "",
            phone: "",
            role: "cashier",
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to localStorage
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadLoginLogs = async (username: string) => {
    setIsLoadingLogs(true);
    try {
      const response = await getCashierLoginLogs(username, 100);
      if (response.success && response.data) {
        const logs = response.data.logs.map((log) => ({
          ...log,
          timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp,
        }));
        setLoginLogs(logs);
      } else {
        // Fallback to localStorage
        const savedLogs = localStorage.getItem("loginLogs");
        if (savedLogs) {
          interface LoginLog {
            timestamp: string | Date;
            [key: string]: unknown;
          }

          const logs = JSON.parse(savedLogs).map((log: LoginLog) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
          setLoginLogs(logs);
        }
      }
    } catch (error) {
      console.error("Error loading login logs:", error);
      // Fallback to localStorage
      const savedLogs = localStorage.getItem("loginLogs");
      if (savedLogs) {
        interface LoginLog {
          timestamp: string | Date;
          [key: string]: unknown;
        }

        const logs = JSON.parse(savedLogs).map((log: LoginLog) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
        setLoginLogs(logs);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadPrinters = async (username: string) => {
    try {
      const response = await getCashierPrinters(username);
      if (response.success && response.data) {
        const dbPrinters = response.data.printers;
        if (dbPrinters.length > 0) {
          // Use database printers
          setPrinters(dbPrinters.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            enabled: p.enabled,
            printerName: p.printerName,
            paperSize: p.paperSize,
            copies: p.copies,
          })));
        } else {
          // Initialize with default printers if none exist
          const defaultPrinters: PrinterConfig[] = [
            {
              id: "1",
              name: "Receipt Printer",
              type: "receipt",
              enabled: true,
              printerName: "",
              paperSize: "58mm",
              copies: 1,
            },
            {
              id: "2",
              name: "Kitchen Printer",
              type: "kitchen",
              enabled: false,
              printerName: "",
              paperSize: "80mm",
              copies: 1,
            },
            {
              id: "3",
              name: "Label Printer",
              type: "label",
              enabled: false,
              printerName: "",
              paperSize: "58mm",
              copies: 1,
            },
          ];
          setPrinters(defaultPrinters);
        }
      } else {
        // Fallback to localStorage
        const savedPrinters = localStorage.getItem("printerConfigs");
        if (savedPrinters) {
          setPrinters(JSON.parse(savedPrinters));
        }
      }
    } catch (error) {
      console.error("Error loading printers:", error);
      // Fallback to localStorage
      const savedPrinters = localStorage.getItem("printerConfigs");
      if (savedPrinters) {
        setPrinters(JSON.parse(savedPrinters));
      }
    }
  };

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const username = profileData.username || localStorage.getItem("username") || localStorage.getItem("cashierUsername") || "";
      const response = await cashierChangePassword({
        username,
        currentPassword,
        newPassword,
      });

      if (response.success) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(response.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("An error occurred while changing password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);

    // Validation
    if (!profileData.fullName.trim()) {
      setProfileError("Full name is required");
      return;
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      setProfileError("Invalid email address");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const response = await updateCashierProfile({
        username: profileData.username,
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
      });

      if (response.success) {
        setProfileSuccess(true);
        // Update localStorage as backup
        localStorage.setItem("userProfile", JSON.stringify(profileData));
        localStorage.setItem("username", profileData.username);
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        setProfileError(response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileError("An error occurred while updating profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Printer config update handler
  const handlePrinterUpdate = (printerId: string, updates: Partial<PrinterConfig>) => {
    setPrinters((prev) =>
      prev.map((p) => (p.id === printerId ? { ...p, ...updates } : p))
    );
  };

  const handleSavePrinters = async () => {
    setIsSavingPrinters(true);
    setPrinterError("");
    setPrinterSuccess(false);
    
    try {
      const username = profileData.username || localStorage.getItem("username") || localStorage.getItem("cashierUsername") || "";
      const response = await saveCashierPrinters(username, printers);

      if (response.success) {
        setPrinterSuccess(true);
        // Update localStorage as backup
        localStorage.setItem("printerConfigs", JSON.stringify(printers));
        setTimeout(() => setPrinterSuccess(false), 3000);
      } else {
        setPrinterError(response.error || "Failed to save printer configurations");
      }
    } catch (error) {
      console.error("Error saving printers:", error);
      setPrinterError("An error occurred while saving printer configurations");
    } finally {
      setIsSavingPrinters(false);
    }
  };

  const handleTestPrint = (printerId: string) => {
    const printer = printers.find((p) => p.id === printerId);
    if (!printer || !printer.enabled) {
      setPrinterError("Please enable and configure the printer first");
      return;
    }
    
    // Simulate test print
    alert(`Test print sent to ${printer.name}`);
  };

  const handleRefreshLogs = async () => {
    const username = profileData.username || localStorage.getItem("username") || localStorage.getItem("cashierUsername") || "";
    if (username) {
      await loadLoginLogs(username);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="password" className="flex items-center gap-2 transition-all duration-200">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 transition-all duration-200">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 transition-all duration-200">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Login Logs</span>
            </TabsTrigger>
            <TabsTrigger value="printers" className="flex items-center gap-2 transition-all duration-200">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Printers</span>
            </TabsTrigger>
          </TabsList>

          {/* Password Change Tab */}
          <TabsContent value="password" className="mt-0">
            <div className="card-elevated p-6">

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Enter new password (min. 6 characters)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {passwordError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password changed successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isChangingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </form>
            </div>
          </TabsContent>

          {/* Profile Details Tab */}
          <TabsContent value="profile" className="mt-0">
            <div className="card-elevated p-6">

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                  placeholder="Username"
                  disabled
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Full Name"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            {/* Role (Read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <input
                type="text"
                value={profileData.role}
                className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                disabled
              />
            </div>

            {/* Error/Success Messages */}
            {profileError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingProfile || isLoadingProfile}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isUpdatingProfile ? "Saving Profile..." : isLoadingProfile ? "Loading..." : "Save Profile"}
            </button>
          </form>
            </div>
          </TabsContent>

          {/* Login Logs Tab */}
          <TabsContent value="logs" className="mt-0">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Login Logs</h2>
                <button
                  onClick={handleRefreshLogs}
                  disabled={isLoadingLogs}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh logs"
                >
                  <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>

          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
            {isLoadingLogs ? (
              <div className="text-center py-8 text-muted-foreground font-karla">
                Loading login logs...
              </div>
            ) : loginLogs.length > 0 ? (
              loginLogs
                .sort((a, b) => {
                  const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                  const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                  return bTime - aTime;
                })
                .map((log) => {
                  const logId = log.id || log._id || `log-${Date.now()}`;
                  const timestamp = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
                  return (
                    <div
                      key={logId}
                      className="p-4 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              log.status === "success" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-foreground">{log.username}</p>
                            <p className="text-xs text-muted-foreground font-karla">
                              {format(timestamp, "PPp")}
                            </p>
                            {log.ip && (
                              <p className="text-xs text-muted-foreground font-karla mt-1">
                                IP: {log.ip}
                              </p>
                            )}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.status === "success"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {log.status === "success" ? "Success" : "Failed"}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground font-karla">
                No login logs available
              </div>
            )}
          </div>
            </div>
          </TabsContent>

          {/* Printer Configurations Tab */}
          <TabsContent value="printers" className="mt-0">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Printer Configurations</h2>

          <Accordion type="multiple" className="space-y-3">
            {printers.map((printer) => (
              <AccordionItem
                key={printer.id}
                value={printer.id}
                className="bg-secondary/50 rounded-lg border border-border px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{printer.name}</h3>
                      <p className="text-xs text-muted-foreground font-karla capitalize">{printer.type} Printer</p>
                    </div>
                    <label 
                      className="relative inline-flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={printer.enabled}
                        onChange={(e) =>
                          handlePrinterUpdate(printer.id, { enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Printer Name</label>
                      <input
                        type="text"
                        value={printer.printerName}
                        onChange={(e) =>
                          handlePrinterUpdate(printer.id, { printerName: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        placeholder="Enter printer name or IP address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Paper Size</label>
                        <select
                          value={printer.paperSize}
                          onChange={(e) =>
                            handlePrinterUpdate(printer.id, {
                              paperSize: e.target.value as "58mm" | "80mm",
                            })
                          }
                          className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                          <option value="58mm">58mm</option>
                          <option value="80mm">80mm</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Copies</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={printer.copies}
                          onChange={(e) =>
                            handlePrinterUpdate(printer.id, {
                              copies: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleTestPrint(printer.id)}
                      className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
                    >
                      Test Print
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Error/Success Messages */}
          {printerError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{printerError}</span>
            </div>
          )}
          {printerSuccess && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Printer configurations saved successfully!</span>
            </div>
          )}

          <button
            onClick={handleSavePrinters}
            disabled={isSavingPrinters}
            className="w-full mt-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSavingPrinters ? "Saving..." : "Save Printer Configurations"}
          </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

