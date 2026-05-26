"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface EditOutletModalProps {
  outlet: any;
}

export function EditOutletModal({ outlet }: EditOutletModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState(outlet.name);
  const [address, setAddress] = useState(outlet.address || "");
  const [stateCode, setStateCode] = useState(outlet.stateCode);
  const [gstin, setGstin] = useState(outlet.gstin || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !stateCode.trim()) {
      toast.error("Name and State Code are required.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/outlets/${outlet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          stateCode,
          gstin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update outlet");
      }

      toast.success("Outlet updated successfully!");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        // Reset form to props
        setName(outlet.name);
        setAddress(outlet.address || "");
        setStateCode(outlet.stateCode);
        setGstin(outlet.gstin || "");
      }
    }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B6B68]" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Outlet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Outlet Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stateCode">State Code (2 chars) *</Label>
            <Input
              id="stateCode"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              maxLength={2}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
