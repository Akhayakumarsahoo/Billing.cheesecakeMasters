"use client";

import { useState } from "react";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryDialog } from "./category-dialog";
import { ItemDialog } from "./item-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface GstSlab {
  id: number;
  label: string;
}

interface MenuItem {
  id: string;
  name: string;
  sku: string | null;
  basePrice: string;
  unit: string;
  categoryId: string;
  gstSlabId: number;
  category: { id: string; name: string; sortOrder: number };
  gstSlab: { id: number; rate: string; label: string };
}

interface MenuManagementClientProps {
  outletId: string;
  initialCategories: Category[];
  initialItems: MenuItem[];
  gstSlabs: GstSlab[];
}

export function MenuManagementClient({
  outletId,
  initialCategories,
  initialItems,
  gstSlabs,
}: MenuManagementClientProps) {
  const router = useRouter();
  
  // State for data (we can also just use React state here for simplicity, 
  // though typically we'd re-fetch or use SWR. We'll update state locally 
  // for immediate feedback and call router.refresh() to sync with server).
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<"category" | "item" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Helper to refresh data
  const refreshData = () => {
    router.refresh();
  };

  // --- Category Handlers ---
  const handleOpenCategoryDialog = (category?: Category) => {
    setEditingCategory(category || null);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (data: { name: string; sortOrder?: number }) => {
    setIsLoading(true);
    try {
      const url = editingCategory
        ? `/api/menu/categories/${editingCategory.id}`
        : `/api/menu/categories`;
      const method = editingCategory ? "PATCH" : "POST";
      
      const payload = { ...data, outletId }; // Ensure outletId is passed

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to save category");
      }
      
      const responseData = await res.json();
      
      if (editingCategory) {
        setCategories((prev) => prev.map((c) => (c.id === responseData.data.id ? responseData.data : c)));
      } else {
        setCategories((prev) => [...prev, responseData.data].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      
      toast.success(`Category ${editingCategory ? "updated" : "created"} successfully`);
      setIsCategoryDialogOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Item Handlers ---
  const handleOpenItemDialog = (item?: MenuItem) => {
    if (categories.length === 0 && !item) {
      toast.error("Please create a category first before adding items.");
      return;
    }
    setEditingItem(item || null);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async (data: {
    name: string;
    sku?: string;
    basePrice: number;
    unit: string;
    categoryId: string;
    gstSlabId: number;
  }) => {
    setIsLoading(true);
    try {
      const url = editingItem
        ? `/api/menu/items/${editingItem.id}`
        : `/api/menu/items`;
      const method = editingItem ? "PATCH" : "POST";
      
      const payload = { ...data, outletId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to save item");
      }
      
      toast.success(`Item ${editingItem ? "updated" : "created"} successfully`);
      setIsItemDialogOpen(false);
      // Let server fetch handle the new state to ensure relations are populated
      setTimeout(() => {
        window.location.reload(); 
      }, 500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (type: "category" | "item", id: string) => {
    setDeletingType(type);
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingType || !deletingId) return;
    setIsLoading(true);
    try {
      const url = `/api/menu/${deletingType === "category" ? "categories" : "items"}/${deletingId}`;
      const res = await fetch(url, { method: "DELETE" });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || `Failed to delete ${deletingType}`);
      }
      
      if (deletingType === "category") {
        setCategories((prev) => prev.filter((c) => c.id !== deletingId));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== deletingId));
      }
      
      toast.success(`${deletingType === "category" ? "Category" : "Item"} deleted successfully`);
      setIsDeleteDialogOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Menu Management</h2>
          <p className="text-sm text-text-muted">
            Manage categories and items for this outlet.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenCategoryDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
          <Button onClick={() => handleOpenItemDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-default rounded-lg">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            No categories found. Create a category to get started.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {categories.map((category) => {
              const categoryItems = items.filter((item) => item.categoryId === category.id);
              return (
                <AccordionItem key={category.id} value={category.id} className="border-border-default px-4">
                  <div className="flex items-center w-full">
                    <div className="flex-1 min-w-0">
                      <AccordionTrigger className="hover:no-underline py-4 pr-4">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-text-primary">
                            {category.name}
                          </span>
                          <div className="flex items-center gap-4 text-sm text-text-muted font-normal">
                            <span>{categoryItems.length} items</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <div className="ml-2 z-10 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenCategoryDialog(category); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={(e) => { 
                              e.stopPropagation();
                              if (categoryItems.length > 0) return;
                              handleDeleteClick("category", category.id); 
                            }}
                            disabled={categoryItems.length > 0}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {categoryItems.length > 0 ? "Cannot delete (has items)" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <AccordionContent className="pb-4">
                    {categoryItems.length === 0 ? (
                      <div className="text-sm text-text-muted italic py-2">
                        No items in this category.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-md"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-text-muted">
                                ₹{item.basePrice} /{item.unit} • {item.gstSlab.label} GST
                                {item.sku && ` • SKU: ${item.sku}`}
                              </span>
                            </div>
                            <div>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenItemDialog(item)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => handleDeleteClick("item", item.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={editingCategory}
        onSubmit={handleSaveCategory}
        isLoading={isLoading}
      />

      <ItemDialog
        isOpen={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        item={editingItem}
        categories={categories}
        gstSlabs={gstSlabs}
        onSubmit={handleSaveItem}
        isLoading={isLoading}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete ${deletingType === "category" ? "Category" : "Item"}`}
        description={`Are you sure you want to delete this ${deletingType}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isDeleting={isLoading}
      />
    </div>
  );
}
