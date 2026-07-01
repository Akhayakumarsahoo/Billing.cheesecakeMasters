"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface LinkedOutlet {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedOutlets: LinkedOutlet[];
  activeMaterialsCount: number;
}

interface InventoryClientProps {
  initialInventories: InventoryItem[];
  activeOutlets: { id: string; name: string }[];
  userRole: string;
}

export function InventoryClient({ initialInventories, activeOutlets, userRole }: InventoryClientProps) {
  const router = useRouter();
  const [inventories, setInventories] = useState<InventoryItem[]>(initialInventories);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = inventories.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOutletToggle = (outletId: string) => {
    setSelectedOutlets((prev) =>
      prev.includes(outletId)
        ? prev.filter((id) => id !== outletId)
        : [...prev, outletId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for the inventory.");
      return;
    }

    const isStandalone = selectedOutlets.length === 0;
    if (isStandalone && (!email || !password)) {
      toast.error("Standalone storerooms require email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          outletIds: selectedOutlets,
          email: isStandalone ? email.trim() : null,
          password: isStandalone ? password : null,
        }),
      });

      const resBody = await response.json();
      if (!response.ok) {
        throw new Error(resBody.error?.message || "Failed to create inventory");
      }

      toast.success("Inventory created successfully.");
      setIsCreateOpen(false);

      // Reset Form
      setName("");
      setAddress("");
      setSelectedOutlets([]);
      setEmail("");
      setPassword("");

      // Refresh list
      router.refresh();
      
      // Update local state temporarily
      const newInv: InventoryItem = {
        id: resBody.data.id,
        name: resBody.data.name,
        address: resBody.data.address,
        isActive: resBody.data.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        linkedOutlets: activeOutlets.filter(o => selectedOutlets.includes(o.id)),
        activeMaterialsCount: 0
      };
      setInventories(prev => [newInv, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      toast.error(err.message || "Failed to create inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            placeholder="Search inventories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[var(--bg-surface)] border-[var(--border-default)] focus:border-[var(--border-strong)] h-10 rounded-md"
          />
        </div>

        {userRole === "admin" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2" />}>
              <Plus className="h-4 w-4" />
              New Inventory
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-medium text-[var(--text-primary)]">Create Inventory</DialogTitle>
                <DialogDescription className="text-sm text-[var(--text-secondary)]">
                  Add a new warehouse, kitchen, or outlet storeroom.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)]">Inventory Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Central Store"
                    required
                    className="border-[var(--border-default)] h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium text-[var(--text-primary)]">Address / Description</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Basement Block C"
                    className="border-[var(--border-default)] h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--text-primary)]">Link Outlets (optional)</Label>
                  <p className="text-xs text-[var(--text-muted)] -mt-1 mb-2">
                    Link to one or more outlets. Uncheck all to configure as standalone storeroom.
                  </p>
                  <div className="max-h-28 overflow-y-auto border border-[var(--border-default)] rounded-lg p-3 space-y-2.5 bg-[var(--bg-surface-raised)]">
                    {activeOutlets.map((outlet) => (
                      <label key={outlet.id} className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={selectedOutlets.includes(outlet.id)}
                          onChange={() => handleOutletToggle(outlet.id)}
                          className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] h-4 w-4"
                        />
                        <span>{outlet.name}</span>
                      </label>
                    ))}
                    {activeOutlets.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)]">No active outlets found.</p>
                    )}
                  </div>
                </div>

                {/* Standalone Storeroom User Info */}
                {selectedOutlets.length === 0 && (
                  <div className="border border-[var(--state-info-border)] bg-[var(--state-info-bg)] rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-[var(--state-info-text)]">
                      Standalone Storeroom: Create a login account for this warehouse.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium text-[var(--text-primary)]">Clerk Login Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="storeroom@cheesecake.com"
                        required
                        className="bg-white border-[var(--border-default)] h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pass" className="text-xs font-medium text-[var(--text-primary)]">Password (min 8 chars) *</Label>
                      <Input
                        id="pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="bg-white border-[var(--border-default)] h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Grid of Inventories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((inv) => (
          <Card key={inv.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                  {inv.name}
                </CardTitle>
                <CardDescription className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
                  {inv.address || "No address provided"}
                </CardDescription>
              </div>
              <div className="p-2 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] shrink-0">
                <Warehouse className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-3 text-xs">
                <div>
                  <p className="text-[var(--text-muted)] font-medium">Link Scope</p>
                  <p className="text-[var(--text-primary)] font-semibold mt-0.5 truncate">
                    {inv.linkedOutlets.length > 0
                      ? `${inv.linkedOutlets.length} Outlet${inv.linkedOutlets.length > 1 ? "s" : ""}`
                      : "Standalone storeroom"}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] font-medium">Raw Materials</p>
                  <p className="text-[var(--text-primary)] font-semibold mt-0.5">
                    {inv.activeMaterialsCount} active
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <Button
                  onClick={() => router.push(`/inventory/${inv.id}`)}
                  className="flex-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-medium h-9 rounded-md"
                >
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-surface-raised)]">
            <Warehouse className="h-8 w-8 text-[var(--text-muted)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No inventories found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Try adjusting your search terms or create a new inventory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
