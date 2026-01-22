import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, X, Table as TableIcon, Search, LayoutGrid, List, AlertTriangle, CheckCircle, XCircle, QrCode, Download, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getTables, createTable, updateTable, deleteTable, toggleTableAvailability, Table } from "@/utils/api";
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

export default function TableManagement() {
  const { toast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [capacityFilter, setCapacityFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({ label: "", capacity: "" });
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [tableToToggle, setTableToToggle] = useState<{ table: Table; newStatus: boolean } | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Generate QR code URL for a table (always uses current domain)
  const generateQrUrl = (tableId: string | number, tableLabel: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/customer-name?table=${tableId}&label=${encodeURIComponent(tableLabel)}`;
  };

  // Get QR code URL for a table (always uses current domain, even if stored URL exists)
  const getQrCodeUrl = (table: Table) => {
    // Always generate fresh URL based on current domain to ensure it works after deployment
    return generateQrUrl(table.id, table.label);
  };

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const response = await getTables();
      if (response.success && response.data) {
        const tablesData = response.data.tables.map((table) => ({
          ...table,
          id: table.id || table._id || table.tableNumber || '',
          available: table.available !== undefined ? table.available : true,
        }));
        setTables(tablesData);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Tables",
          description: response.error || "Could not fetch tables from database.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tables. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTable(null);
    setFormData({ label: "", capacity: "" });
    setShowAddDialog(true);
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({ label: table.label, capacity: table.capacity.toString() });
    setShowAddDialog(true);
  };

  const handleDelete = (id: string | number) => {
    const table = tables.find((t) => t.id === id || t._id === id);
    if (table) {
      setTableToDelete(table);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!tableToDelete) return;

    const id = tableToDelete._id || tableToDelete.id || tableToDelete.tableNumber || '';
    try {
      const response = await deleteTable(id);
      if (response.success) {
        await loadTables(); // Reload tables from database
        toast({
          title: "Table Deleted",
          description: response.data?.message || "Table has been removed successfully.",
        });
        setShowDeleteDialog(false);
        setTableToDelete(null);
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error || "Failed to delete table. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete table. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.label.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Table label is required.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.capacity || isNaN(parseInt(formData.capacity)) || parseInt(formData.capacity) < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid capacity (minimum 1).",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingTable) {
        // Update existing table
        const response = await updateTable(editingTable.id || editingTable._id || '', {
          label: formData.label.trim(),
          capacity: parseInt(formData.capacity),
        });

        if (response.success) {
          await loadTables(); // Reload tables from database
          toast({
            title: "Table Updated",
            description: response.data?.message || "Table information has been updated successfully.",
          });
          setShowAddDialog(false);
          setFormData({ label: "", capacity: "" });
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update table. Please try again.",
          });
        }
      } else {
        // Add new table
        const response = await createTable({
          label: formData.label.trim(),
          capacity: parseInt(formData.capacity),
        });

        if (response.success) {
          await loadTables(); // Reload tables from database
          toast({
            title: "Table Added",
            description: response.data?.message || "New table has been added successfully.",
          });
          setShowAddDialog(false);
          setFormData({ label: "", capacity: "" });
        } else {
          toast({
            variant: "destructive",
            title: "Create Failed",
            description: response.error || "Failed to create table. Please try again.",
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

  const handleAvailabilityToggle = (table: Table, newStatus: boolean) => {
    setTableToToggle({ table, newStatus });
    setShowAvailabilityDialog(true);
  };

  const confirmAvailabilityToggle = async () => {
    if (tableToToggle) {
      try {
        const tableId = tableToToggle.table.id || tableToToggle.table._id || '';
        const response = await toggleTableAvailability(tableId, tableToToggle.newStatus);
        
        if (response.success) {
          await loadTables(); // Reload tables from database
          toast({
            title: "Status Updated",
            description: response.data?.message || `Table ${tableToToggle.newStatus ? "made available" : "made unavailable"}.`,
          });
          setShowAvailabilityDialog(false);
          setTableToToggle(null);
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update table status. Please try again.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update table status. Please try again.",
        });
      }
    }
  };

  // Get unique capacities
  const capacities = useMemo(() => {
    const uniqueCapacities = Array.from(new Set(tables.map((table) => table.capacity)));
    return uniqueCapacities.sort((a, b) => a - b);
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Search filter
      const matchesSearch =
        table.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.capacity.toString().includes(searchTerm);

      // Capacity filter
      const matchesCapacity = capacityFilter === "all" || table.capacity.toString() === capacityFilter;

      // Availability filter
      const isAvailable = table.available !== false;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && isAvailable) ||
        (availabilityFilter === "unavailable" && !isAvailable);

      return matchesSearch && matchesCapacity && matchesAvailability;
    });
  }, [tables, searchTerm, capacityFilter, availabilityFilter]);

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
                Delete Table?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground pl-[52px]">
              Delete <strong>"{tableToDelete?.label}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setTableToDelete(null);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Table Management</h2>
          <p className="text-muted-foreground font-karla">Manage restaurant tables</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[50px] pl-10 pr-4 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <Select value={capacityFilter} onValueChange={setCapacityFilter}>
          <SelectTrigger className="w-full lg:w-[200px] h-[50px] bg-secondary border border-border rounded-lg hover:bg-secondary/80 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200">
            <SelectValue placeholder="Filter by capacity" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border rounded-lg shadow-xl">
            <SelectItem value="all">All Capacities</SelectItem>
            {capacities.map((capacity) => (
              <SelectItem key={capacity} value={capacity.toString()}>
                {capacity} {capacity === 1 ? "person" : "people"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={availabilityFilter}
          onValueChange={(value) => {
            if (value) setAvailabilityFilter(value as "all" | "available" | "unavailable");
          }}
          className="border border-border rounded-lg bg-secondary p-1 h-[50px]"
        >
          <ToggleGroupItem
            value="all"
            aria-label="All tables"
            className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            title="All tables"
          >
            <Search className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="available"
            aria-label="Available tables"
            className="data-[state=on]:bg-success data-[state=on]:text-success-foreground"
            title="Available tables"
          >
            <CheckCircle className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="unavailable"
            aria-label="Unavailable tables"
            className="data-[state=on]:bg-warning data-[state=on]:text-warning-foreground"
            title="Unavailable tables"
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
          className="border border-border rounded-lg bg-secondary p-1 h-[50px]"
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

      {/* Tables - Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div key={table._id || table.id || table.tableNumber} className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <TableIcon className="w-6 h-6 text-accent" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                      {table.capacity}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Table {table.label}</h3>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setShowQrDialog(true);
                  }}
                  className="px-4 py-2 bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="View QR Code"
                >
                  <QrCode className="w-4 h-4 text-accent" />
                </button>
                <button
                  onClick={() => handleEdit(table)}
                  className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <div className="flex items-center gap-2 px-2">
                  <Switch
                    checked={table.available !== false}
                    onCheckedChange={(checked) => {
                      handleAvailabilityToggle(table, checked);
                    }}
                  />
                </div>
                <button
                  onClick={() => handleDelete(table._id || table.id || table.tableNumber || '')}
                  className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tables - List View */}
      {!isLoading && viewMode === "list" && (
        <div className="space-y-3">
          {filteredTables.map((table) => (
            <div key={table._id || table.id || table.tableNumber} className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TableIcon className="w-6 h-6 text-accent" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                      {table.capacity}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Table {table.label}</h3>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setShowQrDialog(true);
                    }}
                    className="px-4 py-2 bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors flex items-center gap-2"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4 text-accent" />
                  </button>
                  <button
                    onClick={() => handleEdit(table)}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <Switch
                    checked={table.available !== false}
                    onCheckedChange={(checked) => {
                      handleAvailabilityToggle(table, checked);
                    }}
                  />
                  <button
                    onClick={() => handleDelete(table.id)}
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

      {!isLoading && filteredTables.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-karla">
          <TableIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No tables found</p>
          <p className="text-sm">
            {searchTerm || capacityFilter !== "all" || availabilityFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by adding your first table"}
          </p>
        </div>
      )}

      {/* Availability Confirmation Dialog */}
      {showAvailabilityDialog && tableToToggle && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full pointer-events-auto animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  tableToToggle.newStatus ? "bg-success/10" : "bg-warning/10"
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    tableToToggle.newStatus ? "text-success" : "text-warning"
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    {tableToToggle.newStatus ? "Make Table Available?" : "Make Table Unavailable?"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tableToToggle.newStatus
                      ? "This table will be visible for selection."
                      : "This table will be hidden from selection."}
                  </p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-foreground">Table {tableToToggle.table.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Capacity: {tableToToggle.table.capacity} {tableToToggle.table.capacity === 1 ? "person" : "people"}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAvailabilityDialog(false);
                    setTableToToggle(null);
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAvailabilityToggle}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    tableToToggle.newStatus
                      ? "bg-success text-success-foreground hover:bg-success/90"
                      : "bg-warning text-warning-foreground hover:bg-warning/90"
                  }`}
                >
                  {tableToToggle.newStatus ? "Make Available" : "Make Unavailable"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showAddDialog && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                {editingTable ? "Edit Table" : "Add Table"}
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
                <label className="text-sm font-medium text-foreground mb-2 block">Table Label</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., 1A, 2B"
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
              </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Capacity</label>
                    <Select
                      value={formData.capacity}
                      onValueChange={(value) => setFormData({ ...formData, capacity: value })}
                    >
                      <SelectTrigger className="w-full h-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                        <SelectValue placeholder="Select capacity" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border rounded-lg shadow-xl z-[110]">
                        <SelectItem value="2">2 people</SelectItem>
                        <SelectItem value="4">4 people</SelectItem>
                        <SelectItem value="6">6 people</SelectItem>
                      </SelectContent>
                    </Select>
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
                      {editingTable ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    editingTable ? "Update" : "Add"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </>,
        document.body
      )}

      {/* QR Code Dialog */}
      {showQrDialog && selectedTable && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Table {selectedTable.label} QR Code</h3>
                <button
                  onClick={() => {
                    setShowQrDialog(false);
                    setSelectedTable(null);
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-6">
                <div className="relative p-6 bg-white rounded-2xl shadow-2xl" ref={qrCodeRef}>
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 rounded-2xl" />
                  <div className="relative">
                    <QRCodeSVG
                      value={getQrCodeUrl(selectedTable)}
                      size={256}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <img 
                      src="/logo-removebg.png" 
                      alt="One" 
                      className="h-6 w-auto object-contain"
                    />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground font-karla">Scan to view menu for Table {selectedTable.label}</p>
                  <button
                    onClick={() => {
                      if (qrCodeRef.current) {
                        const svg = qrCodeRef.current.querySelector('svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            canvas.toBlob((blob) => {
                              if (blob) {
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `table-${selectedTable.label}-qr.png`;
                                link.click();
                                URL.revokeObjectURL(url);
                              }
                            });
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        }
                      }
                    }}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

