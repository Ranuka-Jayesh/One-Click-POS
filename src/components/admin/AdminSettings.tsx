import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Clock, RefreshCw, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { getLogIcon, getActionColor } from "@/utils/adminLogs";
import { getAdminLogs, AdminLog, changePassword, getAdminProfile, updateAdminProfile } from "@/utils/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminProfile {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfile>({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    role: "admin",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [activityLogs, setActivityLogs] = useState<AdminLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [showProfileConfirmDialog, setShowProfileConfirmDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    // Load admin profile from database
    loadAdminProfile();
    // Load activity logs
    loadActivityLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAdminProfile = async () => {
    setIsLoadingProfile(true);
    const adminUsername = localStorage.getItem("adminUsername") || "admin";
    
    try {
      const response = await getAdminProfile(adminUsername);
      if (response.success && response.data) {
        setProfile({
          username: response.data.profile.username,
          fullName: response.data.profile.fullName || "Admin User",
          email: response.data.profile.email || "",
          phone: response.data.profile.phone || "",
          role: response.data.profile.role || "admin",
        });
        // Also update localStorage for backward compatibility
        localStorage.setItem("adminProfile", JSON.stringify(response.data.profile));
        localStorage.setItem("adminUsername", response.data.profile.username);
      } else {
        // Fallback to localStorage if API fails
        const savedProfile = localStorage.getItem("adminProfile");
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        } else {
          setProfile({
            username: adminUsername,
            fullName: "Admin User",
            email: "admin@oneclick.com",
            phone: "",
            role: "admin",
          });
        }
      }
    } catch (error) {
      // Fallback to localStorage on error
      const savedProfile = localStorage.getItem("adminProfile");
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        setProfile({
          username: adminUsername,
          fullName: "Admin User",
          email: "admin@oneclick.com",
          phone: "",
          role: "admin",
        });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadActivityLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await getAdminLogs(100, 0);
      if (response.success && response.data) {
        // Transform backend logs to match frontend format
        const transformedLogs = response.data.logs.map((log) => ({
          ...log,
          id: log._id || log.id || Date.now().toString(),
          timestamp: new Date(log.timestamp),
          entity: log.category,
          entityName: log.username,
          details: log.description,
        }));
        setActivityLogs(transformedLogs);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Logs",
          description: response.error || "Could not fetch activity logs.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load activity logs. Please try again.",
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRefreshLogs = () => {
    loadActivityLogs();
    toast({
      title: "Logs Refreshed",
      description: "Activity logs have been refreshed.",
    });
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);

    // Client-side validation
    if (!profile.fullName.trim()) {
      setProfileError("Full name is required");
      return;
    }

    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setProfileError("Please enter a valid email address");
      return;
    }

    // Show confirmation dialog
    setShowProfileConfirmDialog(true);
  };

  const confirmProfileUpdate = async () => {
    setShowProfileConfirmDialog(false);
    setProfileError("");
    setProfileSuccess(false);

    setIsUpdatingProfile(true);
    try {
      const response = await updateAdminProfile({
        username: profile.username.trim(),
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });

      if (response.success && response.data) {
        // Update profile state with response data
        setProfile({
          username: response.data.profile.username,
          fullName: response.data.profile.fullName,
          email: response.data.profile.email || "",
          phone: response.data.profile.phone || "",
          role: response.data.profile.role || "admin",
        });
        
        // Update localStorage
        localStorage.setItem("adminProfile", JSON.stringify(response.data.profile));
        localStorage.setItem("adminUsername", response.data.profile.username);
        
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
        
        toast({
          title: "Profile Updated",
          description: response.data.message || "Your profile has been updated successfully.",
        });
      } else {
        setProfileError(response.error || "Failed to update profile. Please try again.");
        toast({
          variant: "destructive",
          title: "Profile Update Failed",
          description: response.error || "Failed to update profile. Please try again.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again.";
      setProfileError(errorMessage);
      toast({
        variant: "destructive",
        title: "Profile Update Error",
        description: errorMessage,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    // Client-side validation
    if (!passwordData.currentPassword.trim()) {
      setPasswordError("Current password is required");
      return;
    }

    if (!passwordData.newPassword.trim()) {
      setPasswordError("New password is required");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    // Get username from localStorage
    const username = localStorage.getItem("adminUsername") || profile.username;
    
    if (!username) {
      setPasswordError("Username not found. Please log in again.");
      return;
    }

    // Show confirmation dialog
    setShowPasswordConfirmDialog(true);
  };

  const confirmPasswordChange = async () => {
    setShowPasswordConfirmDialog(false);
    setPasswordError("");
    setPasswordSuccess(false);

    // Get username from localStorage
    const username = localStorage.getItem("adminUsername") || profile.username;
    
    if (!username) {
      setPasswordError("Username not found. Please log in again.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changePassword({
        username: username.trim(),
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim(),
      });

      if (response.success) {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setPasswordSuccess(false), 3000);
        
        toast({
          title: "Password Changed",
          description: response.data?.message || "Your password has been changed successfully.",
        });
      } else {
        setPasswordError(response.error || "Failed to change password. Please try again.");
        toast({
          variant: "destructive",
          title: "Password Change Failed",
          description: response.error || "Failed to change password. Please check your current password.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again.";
      setPasswordError(errorMessage);
      toast({
        variant: "destructive",
        title: "Password Change Error",
        description: errorMessage,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      {/* Password Change Confirmation Dialog */}
      <AlertDialog open={showPasswordConfirmDialog} onOpenChange={setShowPasswordConfirmDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20">
              <Shield className="w-8 h-8 text-accent" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">
              Confirm Password Change
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              Are you sure you want to change your password? You will need to use your new password for future logins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel onClick={() => setShowPasswordConfirmDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPasswordChange}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Lock className="w-4 h-4 mr-2" />
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Update Confirmation Dialog */}
      <AlertDialog open={showProfileConfirmDialog} onOpenChange={setShowProfileConfirmDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20">
              <User className="w-8 h-8 text-accent" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">
              Confirm Profile Update
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              Are you sure you want to update your profile information? These changes will be saved to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel onClick={() => setShowProfileConfirmDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmProfileUpdate}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
          <p className="text-muted-foreground font-karla">Manage your admin profile and account settings</p>
        </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2 transition-all duration-200">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2 transition-all duration-200">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2 transition-all duration-200">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Activity Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-0">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Profile Details</h3>
            </div>

            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading profile...</span>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Username</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Role</label>
                  <input
                    type="text"
                    value={profile.role}
                    disabled
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                  />
                </div>

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
                  disabled={isUpdatingProfile}
                  className="w-full py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating Profile...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="mt-0">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
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

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
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

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="mt-0">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Activity Logs</h3>
              </div>
              <button
                onClick={handleRefreshLogs}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent">
              {isLoadingLogs ? (
                <div className="text-center py-8 text-muted-foreground font-karla">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading activity logs...
                </div>
              ) : activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div
                    key={log.id || log._id}
                    className="p-4 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl mt-1">{getLogIcon(log.entity || log.category)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{log.username}</p>
                            <span className="text-muted-foreground">•</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-foreground font-medium">{log.entity || log.category}</span>
                          </div>
                          <p className="text-sm text-foreground mt-1 font-medium">{log.entityName || log.username}</p>
                          {(log.details || log.description) && (
                            <p className="text-xs text-muted-foreground font-karla mt-1">
                              {log.details || log.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-karla mt-2">
                            {format(new Date(log.timestamp), "PPp")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          log.status === "success"
                            ? "bg-green-500/10 text-green-500"
                            : log.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {log.status === "success" ? "Success" : log.status === "failed" ? "Failed" : log.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground font-karla">
                  No activity logs available
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
