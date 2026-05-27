"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OpenItemDialog({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, price: number, gstRate: number) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [gstRate, setGstRate] = useState("0");

  const handleAdd = () => {
    if (!name.trim()) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return;
    
    onAdd(name.trim(), priceNum, parseFloat(gstRate));
    setName("");
    setPrice("");
    setGstRate("0");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--bg-surface)]">
        <DialogHeader>
          <DialogTitle>Add Open Item</DialogTitle>
          <DialogDescription className="hidden">Add a custom item to the bill.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input 
              placeholder="e.g. Special Cake" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Price (₹)</Label>
            <Input 
              type="number"
              placeholder="0.00" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>GST Slab</Label>
            <Select value={gstRate} onValueChange={setGstRate}>
              <SelectTrigger>
                <SelectValue placeholder="Select GST" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% GST</SelectItem>
                <SelectItem value="5">5% GST</SelectItem>
                <SelectItem value="18">18% GST</SelectItem>
                <SelectItem value="28">28% GST</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]" disabled={!name.trim() || !price}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
