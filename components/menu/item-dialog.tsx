"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
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
}

interface ItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MenuItem | null;
  categories: Category[];
  gstSlabs: GstSlab[];
  onSubmit: (data: {
    name: string;
    sku?: string;
    basePrice: number;
    unit: string;
    categoryId: string;
    gstSlabId: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export function ItemDialog({
  isOpen,
  onOpenChange,
  item,
  categories,
  gstSlabs,
  onSubmit,
  isLoading,
}: ItemDialogProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [categoryId, setCategoryId] = useState("");
  const [gstSlabId, setGstSlabId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || "");
      setSku(item?.sku || "");
      setBasePrice(item?.basePrice || "");
      setUnit(item?.unit || "pcs");
      setCategoryId(item?.categoryId || "");
      setGstSlabId(item?.gstSlabId?.toString() || "");
    }
  }, [isOpen, item, categories, gstSlabs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !gstSlabId) return;

    await onSubmit({
      name,
      sku: sku || undefined,
      basePrice: parseFloat(basePrice),
      unit,
      categoryId,
      gstSlabId: parseInt(gstSlabId, 10),
    });
  };

  const isFormValid = name.trim() !== "" && unit.trim() !== "" && basePrice !== "" && categoryId !== "" && gstSlabId !== "";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              {item
                ? "Update the details for this menu item."
                : "Create a new item in your menu. Ensure it is mapped to a category and GST slab."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Name</Label>
              <Input
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Masala Dosa"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. MD-01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs, plate, kg"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (excl. GST)</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(val) => val && setCategoryId(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category">
                    {categoryId ? categories.find((c) => c.id === categoryId)?.name : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>GST Slab</Label>
              <Select value={gstSlabId} onValueChange={(val) => val && setGstSlabId(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a GST slab">
                    {gstSlabId ? gstSlabs.find((g) => g.id.toString() === gstSlabId)?.label : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {gstSlabs.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? "Saving..." : "Save Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
