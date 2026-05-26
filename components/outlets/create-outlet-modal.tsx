"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CreateOutletModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleNext = () => {
    if (!name.trim() || !stateCode.trim()) {
      toast.error("Name and State Code are required.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and Password are required.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          stateCode,
          gstin,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create outlet");
      }

      toast.success("Outlet created successfully!");
      setOpen(false);
      
      // Reset form
      setStep(1);
      setName("");
      setAddress("");
      setStateCode("");
      setGstin("");
      setEmail("");
      setPassword("");
      
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
      if (!val) setStep(1); // Reset on close
    }}>
      <DialogTrigger render={<Button />}>Create Outlet</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Basic Details" : "Outlet Credentials"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="grid gap-4 py-4">
          {step === 1 ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="name">Outlet Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Outlet 1 - MG Road"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full physical address"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stateCode">State Code (2 chars) *</Label>
                <Input
                  id="stateCode"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g. 21"
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
                  placeholder="Optional"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                These credentials will be used to log into the POS terminal for this specific outlet.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="email">Outlet Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. outlet1@billflow.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-4">
            {step === 2 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : step === 1 ? "Next" : "Create Outlet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
