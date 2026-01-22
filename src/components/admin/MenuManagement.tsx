import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, Search, X, LayoutGrid, List, Upload, Image as ImageIcon, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability, MenuItem as MenuItemType, getImageUrl } from "@/utils/api";
import { getCategories } from "@/utils/api";
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

export default function MenuManagement() {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [itemToToggle, setItemToToggle] = useState<{ item: MenuItemType; newStatus: boolean } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItemType | null>(null);

  useEffect(() => {
    loadMenuItems();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMenuItems = async () => {
    setIsLoading(true);
    try {
      const response = await getMenuItems();
      if (response.success && response.data) {
        const itemsWithAvailability = response.data.menuItems.map((item) => ({
          ...item,
          available: item.available !== undefined ? item.available : true,
        }));
        setMenuItems(itemsWithAvailability);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Menu Items",
          description: response.error || "Could not fetch menu items from database.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load menu items. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "", price: "", category: "", image: "" });
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowAddDialog(true);
  };

  const handleEdit = (item: MenuItemType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image,
    });
    setImagePreview(item.image);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowAddDialog(true);
  };

  const handleDelete = (id: string) => {
    const item = menuItems.find((item) => item.id === id || item._id === id);
    if (item) {
      setItemToDelete(item);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const itemId = itemToDelete._id || itemToDelete.id;
      const response = await deleteMenuItem(itemId);
      if (response.success) {
        await loadMenuItems(); // Reload menu items from database
        toast({
          title: "Menu Item Deleted",
          description: response.data?.message || "Menu item has been removed successfully.",
        });
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error || "Failed to delete menu item. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete menu item. Please try again.",
      });
    }
  };

  const handleAvailabilityToggle = (item: MenuItemType, newStatus: boolean) => {
    setItemToToggle({ item, newStatus });
    setShowAvailabilityDialog(true);
  };

  const confirmAvailabilityToggle = async () => {
    if (itemToToggle) {
      try {
        const itemId = itemToToggle.item._id || itemToToggle.item.id;
        const response = await toggleMenuItemAvailability(itemId, itemToToggle.newStatus);
        
        if (response.success) {
          await loadMenuItems(); // Reload menu items from database
          toast({
            title: "Status Updated",
            description: response.data?.message || `Menu item ${itemToToggle.newStatus ? "made available" : "made unavailable"}.`,
          });
          setShowAvailabilityDialog(false);
          setItemToToggle(null);
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update menu item status. Please try again.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update menu item status. Please try again.",
        });
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please select an image file",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Image size should be less than 5MB",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Upload image to server
      try {
        const formDataToSend = new FormData();
        formDataToSend.append('image', file);

        const response = await fetch('/api/admin/menu-items/upload-image', {
          method: 'POST',
          body: formDataToSend,
        });

        const data = await response.json();

        if (data.success && data.imageUrl) {
          setFormData({ ...formData, image: data.imageUrl });
          setImagePreview(data.imageUrl);
          toast({
            title: "Image Uploaded",
            description: "Image has been uploaded successfully.",
          });
        } else {
          throw new Error(data.error || 'Failed to upload image');
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload image",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Menu item name is required.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Menu item description is required.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid price (must be >= 0).",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.category.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a category.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingItem) {
        // Update existing menu item
        const itemId = editingItem._id || editingItem.id;
        const response = await updateMenuItem(itemId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: formData.category.trim(),
          image: formData.image || editingItem.image || "/placeholder.svg",
          available: editingItem.available !== false,
        });

        if (response.success) {
          await loadMenuItems(); // Reload menu items from database
          toast({
            title: "Menu Item Updated",
            description: response.data?.message || "Menu item information has been updated successfully.",
          });
          setShowAddDialog(false);
          setFormData({ name: "", description: "", price: "", category: "", image: "" });
          setImagePreview("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update menu item. Please try again.",
          });
        }
      } else {
        // Add new menu item
        const response = await createMenuItem({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: formData.category.trim(),
          image: formData.image || "/placeholder.svg",
          available: true,
        });

        if (response.success) {
          await loadMenuItems(); // Reload menu items from database
          toast({
            title: "Menu Item Added",
            description: response.data?.message || "New menu item has been added successfully.",
          });
          setShowAddDialog(false);
          setFormData({ name: "", description: "", price: "", category: "", image: "" });
          setImagePreview("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          toast({
            variant: "destructive",
            title: "Create Failed",
            description: response.error || "Failed to create menu item. Please try again.",
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

  // Get unique categories from menu items for filtering
  const availableCategories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(menuItems.map((item) => item.category)));
    return uniqueCategories.sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search filter
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      // Availability filter
      const isAvailable = item.available !== false;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && isAvailable) ||
        (availabilityFilter === "unavailable" && !isAvailable);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [menuItems, searchTerm, categoryFilter, availabilityFilter]);

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
                Delete Menu Item?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground pl-[52px]">
              Delete <strong>"{itemToDelete?.name}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setItemToDelete(null);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Menu Management</h2>
          <p className="text-muted-foreground font-karla">Add, edit, or remove menu items</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[50px] pl-10 pr-4 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full lg:w-[200px] h-[50px] bg-secondary border border-border rounded-lg hover:bg-secondary/80 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border rounded-lg shadow-xl">
            <SelectItem value="all">All Categories</SelectItem>
            {availableCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
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
            aria-label="All items"
            className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            title="All items"
          >
            <Search className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="available"
            aria-label="Available items"
            className="data-[state=on]:bg-success data-[state=on]:text-success-foreground"
            title="Available items"
          >
            <CheckCircle className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="unavailable"
            aria-label="Unavailable items"
            className="data-[state=on]:bg-warning data-[state=on]:text-warning-foreground"
            title="Unavailable items"
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

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-karla">Loading menu items...</p>
        </div>
      )}

      {/* Menu Items - Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item._id || item.id} className="card-elevated p-4">
              <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-secondary">
                <img 
                  src={getImageUrl(item.image)} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.available !== false ? "Available" : "Unavailable"}
                  </span>
                  <Switch
                    checked={item.available !== false}
                    onCheckedChange={(checked) => {
                      handleAvailabilityToggle(item, checked);
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-accent">Rs. {item.price.toFixed(2)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id || item.id)}
                    className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menu Items - List View */}
      {!isLoading && viewMode === "list" && (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item._id || item.id} className="card-elevated p-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  <img 
                    src={getImageUrl(item.image)} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.available !== false ? "Available" : "Unavailable"}
                          </span>
                          <Switch
                            checked={item.available !== false}
                            onCheckedChange={(checked) => {
                              handleAvailabilityToggle(item, checked);
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground font-karla">Category: {item.category}</span>
                        <span className="text-lg font-bold text-accent">Rs. {item.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-karla">
          <p className="text-lg font-semibold mb-2">No menu items found</p>
          <p className="text-sm">
            {searchTerm || categoryFilter !== "all" || availabilityFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by adding your first menu item"}
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showAddDialog && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setImagePreview("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="w-full h-10 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border rounded-lg shadow-xl z-[110]">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-secondary border border-border">
                      <img
                        src={getImageUrl(imagePreview)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview("");
                          setFormData({ ...formData, image: "" });
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="absolute top-2 right-2 p-2 bg-destructive/80 hover:bg-destructive rounded-lg transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 rounded-lg border-2 border-dashed border-border bg-secondary hover:border-accent/50 hover:bg-secondary/80 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-accent" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Click to upload image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setImagePreview("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
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
                      {editingItem ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    editingItem ? "Update" : "Add"
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Availability Confirmation Dialog */}
      {showAvailabilityDialog && itemToToggle && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full pointer-events-auto animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  itemToToggle.newStatus ? "bg-success/10" : "bg-warning/10"
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    itemToToggle.newStatus ? "text-success" : "text-warning"
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    {itemToToggle.newStatus ? "Make Item Available?" : "Make Item Unavailable?"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {itemToToggle.newStatus
                      ? "This item will be visible to customers."
                      : "This item will be hidden from customers."}
                  </p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-foreground">{itemToToggle.item.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAvailabilityDialog(false);
                    setItemToToggle(null);
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAvailabilityToggle}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    itemToToggle.newStatus
                      ? "bg-success text-success-foreground hover:bg-success/90"
                      : "bg-warning text-warning-foreground hover:bg-warning/90"
                  }`}
                >
                  {itemToToggle.newStatus ? "Make Available" : "Make Unavailable"}
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

