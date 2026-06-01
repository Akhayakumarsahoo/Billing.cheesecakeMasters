"use client";

import { useState } from "react";
import { Search, Receipt, Edit2, XCircle, CreditCard, Save, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SerializedPayment = {
  mode: string;
  amount: string;
};

type SerializedLineItem = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  basePrice: string;
  gstRate: string;
};

type SerializedBill = {
  id: string;
  billNumber: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  grandTotal: string;
  subtotal: string;
  totalCgst: string;
  totalSgst: string;
  totalGst: string;
  payments: SerializedPayment[];
  lineItems: SerializedLineItem[];
  modifiedByName?: string | null;
};

export function AdminOrdersClient({
  initialBills,
  outletName,
  role,
}: {
  initialBills: SerializedBill[];
  outletName: string;
  role: string;
}) {
  const router = useRouter();
  const [bills, setBills] = useState(initialBills);
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<SerializedBill | null>(null);

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(new Date(dateStr));
  };

  // Edit Payment State
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{mode: string, amount: string}[]>([]);

  const filteredBills = bills.filter(bill => 
    bill.billNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleCancel = async (billId: string) => {
    if (!confirm("Are you sure you want to cancel this bill? This action cannot be undone.")) return;
    
    setIsProcessing(billId);
    try {
      const res = await fetch(`/api/bills/${billId}/cancel`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to cancel");
      }
      
      toast.success("Bill cancelled successfully");
      setBills(prev => prev.map(b => b.id === billId ? { ...b, status: "cancelled" } : b));
      setSelectedBill(prev => prev?.id === billId ? { ...prev, status: "cancelled" } : prev);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel bill");
    } finally {
      setIsProcessing(null);
    }
  };

  const startEditPayment = (bill: SerializedBill) => {
    setIsEditingPayment(true);
    // Initialize payment breakdown from bill
    // We provide standard modes if not present
    const modes = ["cash", "upi", "card", "other"];
    const breakdown = modes.map(mode => {
      const existing = bill.payments.find(p => p.mode.toLowerCase() === mode);
      return {
        mode,
        amount: existing ? existing.amount : "0"
      };
    });
    setPaymentBreakdown(breakdown);
  };

  const updatePaymentAmount = (mode: string, val: string) => {
    // Only allow numbers and one decimal
    if (val && !/^\d*\.?\d{0,2}$/.test(val)) return;
    setPaymentBreakdown(prev => prev.map(p => p.mode === mode ? { ...p, amount: val || "0" } : p));
  };

  const savePaymentModes = async () => {
    if (!selectedBill) return;

    const total = paymentBreakdown.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const grandTotal = parseFloat(selectedBill.grandTotal);

    if (Math.abs(total - grandTotal) > 0.01) {
      toast.error(`Total payments (₹${total.toFixed(2)}) must equal Grand Total (₹${grandTotal.toFixed(2)})`);
      return;
    }

    setIsProcessing(selectedBill.id);
    try {
      // Filter out zero amounts
      const payload = paymentBreakdown
        .map(p => ({ mode: p.mode, amount: parseFloat(p.amount) }))
        .filter(p => p.amount > 0);

      const res = await fetch(`/api/bills/${selectedBill.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments: payload })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to edit payments");
      }

      toast.success("Payments updated successfully");
      
      const newPaymentsStr = payload.map(p => ({ mode: p.mode, amount: p.amount.toString() }));

      setBills(prev => prev.map(b => b.id === selectedBill.id ? { ...b, payments: newPaymentsStr } : b));
      setSelectedBill(prev => prev?.id === selectedBill.id ? { ...prev, payments: newPaymentsStr } : prev);
      setIsEditingPayment(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to edit payments");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">All Orders</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Order history for {outletName}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input 
              placeholder="Search bills..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg" 
            />
          </div>
          <DateRangeFilter />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => {
          return (
            <div 
              key={bill.id} 
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[var(--interactive-default)] hover:shadow-md transition-all"
              onClick={() => setSelectedBill(bill)}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{bill.billNumber}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex cursor-help text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5">
                                <Info className="h-4 w-4" strokeWidth={1.5} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-md rounded-lg text-xs space-y-1.5 text-[var(--text-primary)]">
                              <div>
                                <span className="font-medium text-[var(--text-secondary)] mr-1">Created:</span>
                                <span className="font-mono">{formatDateTime(bill.createdAt)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-[var(--text-secondary)] mr-1">Last Modified:</span>
                                <span className="font-mono">{formatDateTime(bill.updatedAt)}</span>
                                {bill.modifiedByName && (
                                  <span className="text-[var(--text-muted)] ml-1">by {bill.modifiedByName}</span>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(bill.createdAt))}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    bill.status === 'printed' ? 'bg-[var(--state-success-bg)] text-[var(--state-success-text)] border border-[var(--state-success-border)]' :
                    bill.status === 'cancelled' ? 'bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)]' :
                    'bg-[var(--state-info-bg)] text-[var(--state-info-text)] border border-[var(--state-info-border)]'
                  }`}>
                    {bill.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="py-3 border-y border-[var(--border-subtle)] my-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Items</span>
                    <span className="font-medium text-[var(--text-primary)]">{bill.lineItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Payment</span>
                    <span className="font-medium text-[var(--text-primary)] capitalize">
                      {bill.payments.length > 0 ? bill.payments.map(p => p.mode).join(", ") : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Total</span>
                  <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                    ₹{bill.grandTotal}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="col-span-full py-12 text-center text-[var(--text-muted)] space-y-3 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl border-dashed">
            <Receipt className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">No orders found.</p>
          </div>
        )}
      </div>

      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={(open) => {
          if (!open) {
            setSelectedBill(null);
            setIsEditingPayment(false);
          }
        }}>
          <DialogContent className="max-w-md bg-[var(--bg-surface)] p-0 gap-0 overflow-hidden rounded-xl border-[var(--border-default)]">
            <DialogHeader className="p-4 border-b border-[var(--border-default)]">
              <div className="flex justify-between items-center pr-6">
                <DialogTitle className="text-xl font-mono text-[var(--text-primary)]">{selectedBill.billNumber}</DialogTitle>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedBill.status === 'printed' ? 'bg-[var(--state-success-bg)] text-[var(--state-success-text)] border border-[var(--state-success-border)]' :
                  selectedBill.status === 'cancelled' ? 'bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)]' :
                  'bg-[var(--state-info-bg)] text-[var(--state-info-text)] border border-[var(--state-info-border)]'
                }`}>
                  {selectedBill.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(selectedBill.createdAt))}
              </div>
            </DialogHeader>
            
            {isEditingPayment ? (
              <div className="p-4 space-y-4 bg-[var(--bg-base)]">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">Edit Payment Modes</h3>
                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4 space-y-4">
                  {paymentBreakdown.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium capitalize text-[var(--text-primary)] w-20">{p.mode}</span>
                      <Input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={p.amount} 
                        onChange={(e) => updatePaymentAmount(p.mode, e.target.value)}
                        className="text-right font-mono"
                      />
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center text-sm">
                    <span className="font-medium text-[var(--text-secondary)]">Allocated:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      ₹{paymentBreakdown.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-[var(--text-secondary)]">Grand Total:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      ₹{parseFloat(selectedBill.grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 overflow-y-auto max-h-[50vh] space-y-4 bg-[var(--bg-base)]">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Items</h3>
                  <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                    {selectedBill.lineItems.map(item => (
                      <div key={item.id} className="p-3 border-b border-[var(--border-subtle)] last:border-0 flex justify-between">
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{item.itemName}</div>
                          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {item.quantity} {item.unit} × ₹{item.basePrice}
                          </div>
                        </div>
                        <div className="text-sm font-mono text-[var(--text-primary)]">
                          ₹{(parseFloat(item.basePrice) * parseFloat(item.quantity)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Payments</h3>
                  <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                    {selectedBill.payments.map((p, i) => (
                      <div key={i} className="p-3 border-b border-[var(--border-subtle)] last:border-0 flex justify-between">
                        <div className="text-sm text-[var(--text-primary)] capitalize">{p.mode}</div>
                        <div className="text-sm font-mono text-[var(--text-primary)]">₹{p.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col gap-3">
              {!isEditingPayment && (
                <>
                  <div className="space-y-1.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">₹{parseFloat(selectedBill.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (CGST + SGST)</span>
                      <span className="font-mono">₹{parseFloat(selectedBill.totalGst).toFixed(2)}</span>
                    </div>
                    {(() => {
                      const sub = parseFloat(selectedBill.subtotal);
                      const gst = parseFloat(selectedBill.totalGst);
                      const grand = parseFloat(selectedBill.grandTotal);
                      const roundOff = grand - (sub + gst);
                      return (
                        <div className="flex justify-between">
                          <span>Round Off</span>
                          <span className="font-mono">{roundOff >= 0 ? "+" : ""}{roundOff.toFixed(2)}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center text-lg font-medium">
                    <span className="text-[var(--text-primary)]">Grand Total</span>
                    <span className="font-mono">₹{parseFloat(selectedBill.grandTotal).toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[var(--border-subtle)]">
                {role === "admin" && selectedBill.status === "printed" && !isEditingPayment && (
                  <>
                    <Button 
                      variant="outline" 
                      className="text-[var(--text-secondary)]"
                      onClick={() => handleCancel(selectedBill.id)}
                      disabled={isProcessing !== null}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Bill
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] border-[var(--accent-primary)] hover:bg-[var(--bg-surface-raised)]"
                      onClick={() => startEditPayment(selectedBill)}
                      disabled={isProcessing !== null}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Edit Payment
                    </Button>
                  </>
                )}

                {isEditingPayment && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingPayment(false)}
                      disabled={isProcessing !== null}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="default" 
                      className="bg-[var(--text-primary)] text-[var(--bg-surface)] hover:bg-[var(--text-secondary)]"
                      onClick={savePaymentModes}
                      disabled={isProcessing !== null}
                    >
                      {isProcessing === selectedBill.id ? "Saving..." : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Payment
                        </>
                      )}
                    </Button>
                  </>
                )}

                {!isEditingPayment && (
                  <Button 
                    variant="default" 
                    className="bg-[var(--text-primary)] text-[var(--bg-surface)] hover:bg-[var(--text-secondary)] ml-auto"
                    onClick={() => setSelectedBill(null)}
                  >
                    Okay
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
