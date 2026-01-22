import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, X, User, Mail, Phone, Lock, Eye, EyeOff, AlertTriangle, Search, LayoutGrid, List, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getCashiers, createCashier, updateCashier, deleteCashier, toggleCashierStatus, Cashier } from "@/utils/api";
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

export default function CashierManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showActiveDialog, setShowActiveDialog] = useState(false);
  const [cashierToToggle, setCashierToToggle] = useState<{ cashier: Cashier; newStatus: boolean } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cashierToDelete, setCashierToDelete] = useState<Cashier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    isActive: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCashiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCashiers = async () => {
    setIsLoading(true);
    try {
      const response = await getCashiers();
      if (response.success && response.data) {
        const cashiersData = response.data.cashiers.map((c) => ({
          ...c,
          id: c.id || c._id || '',
          createdAt: new Date(c.createdAt),
          lastLogin: c.lastLogin ? new Date(c.lastLogin) : undefined,
        }));
        setCashiers(cashiersData);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Cashiers",
          description: response.error || "Could not fetch cashiers from database.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load cashiers. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCashier(null);
    setFormData({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      isActive: true,
    });
    setShowPassword(false);
    setShowAddDialog(true);
  };

  const handleEdit = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setFormData({
      username: cashier.username,
      fullName: cashier.fullName,
      email: cashier.email,
      phone: cashier.phone,
      password: "", // Don't show password
      isActive: cashier.isActive,
    });
    setShowPassword(false);
    setShowAddDialog(true);
  };

  const handleDelete = (id: string) => {
    const cashier = cashiers.find((c) => c.id === id);
    if (cashier) {
      setCashierToDelete(cashier);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!cashierToDelete) return;

    try {
      const response = await deleteCashier(cashierToDelete.id);
      if (response.success) {
        await loadCashiers(); // Reload cashiers from database
        toast({
          title: "Cashier Deleted",
          description: response.data?.message || "Cashier has been removed successfully.",
        });
        setShowDeleteDialog(false);
        setCashierToDelete(null);
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error || "Failed to delete cashier. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete cashier. Please try again.",
      });
    }
  };

  const handleToggleActive = (cashier: Cashier, newStatus: boolean) => {
    setCashierToToggle({ cashier, newStatus });
    setShowActiveDialog(true);
  };

  const confirmToggleActive = async () => {
    if (cashierToToggle) {
      try {
        const response = await toggleCashierStatus(cashierToToggle.cashier.id, cashierToToggle.newStatus);
        if (response.success) {
          await loadCashiers(); // Reload cashiers from database
          toast({
            title: "Status Updated",
            description: response.data?.message || `Cashier ${cashierToToggle.newStatus ? "activated" : "deactivated"}.`,
          });
          setShowActiveDialog(false);
          setCashierToToggle(null);
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update cashier status. Please try again.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update cashier status. Please try again.",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Client-side validation
    if (!formData.username.trim() || !formData.fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username and full name are required.",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate username format (alphanumeric and underscore only, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(formData.username.trim())) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username must be 3-20 characters and contain only letters, numbers, and underscores.",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate email format if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid email address.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingCashier) {
        // Update existing cashier
        interface CashierUpdateData {
          fullName: string;
          email: string;
          phone: string;
          isActive: boolean;
          updatedAt: Date;
          password?: string;
        }

        const updateData: CashierUpdateData = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          isActive: formData.isActive,
        };

        // Only include password if provided
        if (formData.password.trim()) {
          updateData.password = formData.password.trim();
        }

        const response = await updateCashier(editingCashier.id, updateData);
        if (response.success) {
          await loadCashiers(); // Reload cashiers from database
          toast({
            title: "Cashier Updated",
            description: response.data?.message || "Cashier information has been updated successfully.",
          });
          setShowAddDialog(false);
          setFormData({
            username: "",
            fullName: "",
            email: "",
            phone: "",
            password: "",
            isActive: true,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update cashier. Please try again.",
          });
        }
      } else {
        // Add new cashier
        if (!formData.password.trim()) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Password is required for new cashiers.",
          });
          setIsSubmitting(false);
          return;
        }

        // Validate password length
        if (formData.password.trim().length < 6) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Password must be at least 6 characters long.",
          });
          setIsSubmitting(false);
          return;
        }

        const response = await createCashier({
          username: formData.username.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password.trim(),
          isActive: formData.isActive,
        });

        if (response.success) {
          await loadCashiers(); // Reload cashiers from database
          toast({
            title: "Cashier Added",
            description: response.data?.message || "New cashier has been added successfully.",
          });
          setShowAddDialog(false);
          setFormData({
            username: "",
            fullName: "",
            email: "",
            phone: "",
            password: "",
            isActive: true,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Create Failed",
            description: response.error || "Failed to create cashier. Please try again.",
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-sm p-4">
          <AlertDialogHeader className="pb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base font-semibold">
                Delete Cashier?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground pl-[52px]">
              Delete <strong>"{cashierToDelete?.fullName || cashierToDelete?.username}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setCashierToDelete(null);
              }}
              className="h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9 px-4"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Cashier Management</h2>
          <p className="text-muted-foreground font-karla">Manage cashier accounts and permissions</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Cashier
        </button>
      </div>

      {/* Search, Filters and View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cashiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[50px] pl-10 pr-4 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => {
            if (value) setStatusFilter(value as "all" | "active" | "inactive");
          }}
          className="border border-border rounded-lg bg-secondary p-1 h-[50px] flex-shrink-0"
        >
          <ToggleGroupItem
            value="all"
            aria-label="All cashiers"
            className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            title="All cashiers"
          >
            <Search className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="active"
            aria-label="Active cashiers"
            className="data-[state=on]:bg-success data-[state=on]:text-success-foreground"
            title="Active cashiers"
          >
            <CheckCircle className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="inactive"
            aria-label="Inactive cashiers"
            className="data-[state=on]:bg-warning data-[state=on]:text-warning-foreground"
            title="Inactive cashiers"
          >
            <XCircle className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as "grid" | "list");
          }}
          className="border border-border rounded-lg bg-secondary p-1 h-[50px] flex-shrink-0"
        >
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            <LayoutGrid className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-karla">Loading cashiers...</p>
        </div>
      )}

      {/* Filtered Cashiers */}
      {!isLoading && (() => {
        const filtered = cashiers.filter((cashier) => {
          const matchesSearch =
            cashier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cashier.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cashier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cashier.phone?.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && cashier.isActive) ||
            (statusFilter === "inactive" && !cashier.isActive);

          return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
          return (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Cashiers Found</h3>
              <p className="text-muted-foreground font-karla mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by adding your first cashier"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Add Cashier
                </button>
              )}
            </div>
          );
        }

        return (
          <>
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((cashier) => (
                  <div key={cashier.id} className="card-elevated p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                          <User className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{cashier.fullName}</h3>
                          <p className="text-sm text-muted-foreground font-karla">@{cashier.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cashier.isActive}
                          onCheckedChange={(checked) => {
                            handleToggleActive(cashier, checked);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {cashier.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{cashier.email}</span>
                        </div>
                      )}
                      {cashier.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{cashier.phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground font-karla">
                        Created: {new Date(cashier.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(cashier)}
                        className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cashier.id)}
                        className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-3">
                {filtered.map((cashier) => (
                <div key={cashier.id} className="card-elevated p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{cashier.fullName}</h3>
                          <span className="text-sm text-muted-foreground font-karla">@{cashier.username}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {cashier.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{cashier.email}</span>
                            </div>
                          )}
                          {cashier.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{cashier.phone}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground font-karla">
                            Created: {new Date(cashier.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cashier.isActive}
                        onCheckedChange={(checked) => {
                          handleToggleActive(cashier, checked);
                        }}
                      />
                      <button
                        onClick={() => handleEdit(cashier)}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cashier.id)}
                        className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
        );
      })()}

      {/* Add/Edit Dialog */}
      {showAddDialog && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">
                  {editingCashier ? "Edit Cashier" : "Add Cashier"}
                </h3>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    required
                    disabled={!!editingCashier}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    {editingCashier ? "New Password (leave blank to keep current)" : "Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 pr-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      required={!editingCashier}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                    Active (can login)
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddDialog(false)}
                    className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {editingCashier ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      editingCashier ? "Update" : "Add"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Active/Inactive Confirmation Dialog */}
      {showActiveDialog && cashierToToggle && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[101]" />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full pointer-events-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cashierToToggle.newStatus ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">
                    {cashierToToggle.newStatus ? "Activate Cashier?" : "Deactivate Cashier?"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {cashierToToggle.newStatus
                      ? "This cashier will be able to login and access the system."
                      : "This cashier will not be able to login."}
                  </p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-foreground">{cashierToToggle.cashier.fullName}</p>
                <p className="text-xs text-muted-foreground mt-1">@{cashierToToggle.cashier.username}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowActiveDialog(false);
                    setCashierToToggle(null);
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmToggleActive}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${cashierToToggle.newStatus ? "bg-success text-success-foreground hover:bg-success/90" : "bg-warning text-warning-foreground hover:bg-warning/90"}`}
                >
                  {cashierToToggle.newStatus ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

