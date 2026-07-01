"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit3, MapPin, Store, Building } from "lucide-react";

interface LinkedOutlet {
  id: string;
  name: string;
  isActive: boolean;
}

interface Inventory {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  linkedOutlets: LinkedOutlet[];
}

interface ActiveOutlet {
  id: string;
  name: string;
}

interface ManagementTabProps {
  inventory: Inventory;
  activeOutlets: ActiveOutlet[];
  onUpdateInventory: (inv: Inventory) => void;
}

export function ManagementTab({
  inventory,
  activeOutlets,
  onUpdateInventory
}: ManagementTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(inventory.name);
  const [address, setAddress] = useState(inventory.address || "");
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>(
    inventory.linkedOutlets.map((o) => o.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLinkToggle = (outletId: string) => {
    setSelectedOutlets((prev) =>
      prev.includes(outletId)
        ? prev.filter((id) => id !== outletId)
        : [...prev, outletId]
    );
  };

  const handleCancel = () => {
    setName(inventory.name);
    setAddress(inventory.address || "");
    setSelectedOutlets(inventory.linkedOutlets.map((o) => o.id));
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Inventory name is required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${inventory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          outletIds: selectedOutlets
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update inventory settings");

      toast.success("Inventory settings updated successfully.");

      // Construct updated linked outlets from selections
      const updatedLinks = activeOutlets
        .filter((o) => selectedOutlets.includes(o.id))
        .map((o) => ({ id: o.id, name: o.name, isActive: true }));

      onUpdateInventory({
        ...inventory,
        name: name.trim(),
        address: address.trim() || null,
        linkedOutlets: updatedLinks
      });
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
        <CardHeader className="border-b border-[var(--border-subtle)] pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
              Inventory Settings
            </CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Manage physical details and outlet mappings for this inventory store.
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="text-xs h-8 px-3 border-[var(--border-default)] flex items-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Settings
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {!isEditing ? (
            /* Read-Only Mode */
            <div className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Inventory Name
                    </h4>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                      {inventory.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Physical Address
                    </h4>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                      {inventory.address || "No address provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Store className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Linked Outlets
                    </h4>
                    {inventory.linkedOutlets.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] italic mt-0.5">
                        Standalone warehouse (not linked to any outlet)
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {inventory.linkedOutlets.map((o) => (
                          <span
                            key={o.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                          >
                            {o.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Editing Mode */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Inventory Name */}
              <div className="space-y-1.5">
                <Label htmlFor="inv-name" className="text-sm font-medium text-[var(--text-primary)]">
                  Inventory Name *
                </Label>
                <Input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Central Store"
                  className="h-10 border-[var(--border-default)] bg-white text-sm"
                  required
                />
              </div>

              {/* Inventory Address */}
              <div className="space-y-1.5">
                <Label htmlFor="inv-address" className="text-sm font-medium text-[var(--text-primary)]">
                  Address
                </Label>
                <Textarea
                  id="inv-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Physical location description (optional)"
                  className="min-h-[80px] border-[var(--border-default)] bg-white text-sm"
                />
              </div>

              {/* Outlet Mapping Checkbox List */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  Linked Outlets
                </Label>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  Associate this inventory with outlets to enable automatic menu recipe deduction during billing.
                </p>
                
                {activeOutlets.length === 0 ? (
                  <div className="text-xs text-[var(--text-muted)] italic py-2">
                    No active outlets found to link.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-[var(--border-default)] rounded-lg p-3 space-y-2.5 bg-[var(--bg-surface-raised)]">
                    {activeOutlets.map((outlet) => (
                      <label key={outlet.id} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={selectedOutlets.includes(outlet.id)}
                          onChange={() => handleLinkToggle(outlet.id)}
                          className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] h-4 w-4 cursor-pointer"
                        />
                        <span>{outlet.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full h-10 text-sm font-semibold rounded-lg border-[var(--border-default)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white w-full h-10 text-sm font-semibold rounded-lg shadow-sm"
                >
                  {isSubmitting ? "Saving Changes..." : "Save Settings"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
