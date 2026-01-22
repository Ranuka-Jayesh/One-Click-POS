import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, X, Search, LayoutGrid, List, RefreshCw, AlertTriangle } from "lucide-react";
import { Category } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getCategories, createCategory, updateCategory, deleteCategory, Category as CategoryType } from "@/utils/api";
import { socketService } from "@/utils/socketService";
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

export default function CategoryManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "" });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | null>(null);

  useEffect(() => {
    loadCategories();

    // Subscribe to menu item updates to refresh category counts
    const unsubscribe = socketService.on('menu_item_update', (message) => {
      console.log('📢 Menu item update received, refreshing categories:', message.type);
      // Reload categories to update item counts
      loadCategories();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        setCategories(response.data.categories);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Categories",
          description: response.error || "Could not fetch categories from database.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "", icon: "" });
    setShowAddDialog(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, icon: category.icon });
    setShowAddDialog(true);
  };

  const handleDelete = (id: string) => {
    const category = categories.find((cat) => cat.id === id || cat._id === id);
    if (category) {
      setCategoryToDelete(category);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const id = categoryToDelete._id || categoryToDelete.id;
    try {
      const response = await deleteCategory(id);
      if (response.success) {
        await loadCategories(); // Reload categories from database
        toast({
          title: "Category Deleted",
          description: response.data?.message || "Category has been removed successfully.",
        });
        setShowDeleteDialog(false);
        setCategoryToDelete(null);
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error || "Failed to delete category. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Category name is required.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.icon.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Category icon is required.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const categoryId = editingCategory._id || editingCategory.id;
        const response = await updateCategory(categoryId, {
          name: formData.name.trim(),
          icon: formData.icon.trim(),
        });

        if (response.success) {
          await loadCategories(); // Reload categories from database
          toast({
            title: "Category Updated",
            description: response.data?.message || "Category information has been updated successfully.",
          });
          setShowAddDialog(false);
          setFormData({ name: "", icon: "" });
        } else {
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: response.error || "Failed to update category. Please try again.",
          });
        }
      } else {
        // Add new category
        const response = await createCategory({
          name: formData.name.trim(),
          icon: formData.icon.trim(),
        });

        if (response.success) {
          await loadCategories(); // Reload categories from database
          toast({
            title: "Category Added",
            description: response.data?.message || "New category has been added successfully.",
          });
          setShowAddDialog(false);
          setFormData({ name: "", icon: "" });
        } else {
          toast({
            variant: "destructive",
            title: "Create Failed",
            description: response.error || "Failed to create category. Please try again.",
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

  // Get item count for a category (from the category data)
  const getItemCount = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId || cat._id === categoryId);
    return category?.itemCount || 0;
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

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
                Delete Category?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground pl-[52px]">
              {categoryToDelete && categoryToDelete.itemCount && categoryToDelete.itemCount > 0 ? (
                <span className="text-destructive">
                  Cannot delete. <strong>"{categoryToDelete.name}"</strong> has {categoryToDelete.itemCount} item(s).
                </span>
              ) : (
                <>
                  Delete <strong>"{categoryToDelete?.name}"</strong>? This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setCategoryToDelete(null);
              }}
              className="h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={categoryToDelete?.itemCount && categoryToDelete.itemCount > 0}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9 px-4"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Category Management</h2>
          <p className="text-muted-foreground font-karla">Manage menu categories</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[50px] pl-10 pr-4 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
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
          <p className="text-muted-foreground font-karla">Loading categories...</p>
        </div>
      )}

      {/* Categories - Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div key={category._id || category.id} className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-4xl">{category.icon}</span>
                    {getItemCount(category.id) > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {getItemCount(category.id)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground font-karla">ID: {category.id}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category._id || category.id)}
                  className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categories - List View */}
      {!isLoading && viewMode === "list" && (
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <div key={category._id || category.id} className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="text-3xl">{category.icon}</span>
                    {getItemCount(category.id) > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {getItemCount(category.id)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground font-karla">ID: {category.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
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

      {!isLoading && filteredCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-karla">
          <p className="text-lg font-semibold mb-2">No categories found</p>
          <p className="text-sm">
            {searchTerm
              ? "Try adjusting your search criteria"
              : "Get started by adding your first category"}
          </p>
        </div>
      )}

      {showAddDialog && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[100]" />
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">
                  {editingCategory ? "Edit Category" : "Add Category"}
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
                  <label className="text-sm font-medium text-foreground mb-2 block">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🍔"
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    required
                  />
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
                      {editingCategory ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    editingCategory ? "Update" : "Add"
                  )}
                </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

