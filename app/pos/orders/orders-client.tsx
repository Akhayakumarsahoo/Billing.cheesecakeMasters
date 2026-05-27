"use client";

import { useState } from "react";
import { Search, Receipt, Edit2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type SerializedMenuItem = {
  id: string;
  name: string;
  sku: string | null;
  basePrice: string;
  unit: string;
  categoryId: string;
  gstSlab: { rate: string };
  isCustom?: boolean;
};

type SerializedBill = {
  id: string;
  billNumber: string;
  createdAt: string;
  status: string;
  grandTotal: string;
  payments: any[];
  lineItems: any[];
};

export function OrdersClient({
  initialBills,
  outletName,
}: {
  initialBills: SerializedBill[];
  outletName: string;
}) {
  const router = useRouter();
  const [bills, setBills] = useState(initialBills);
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<SerializedBill | null>(null);

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

  const handleEdit = async (bill: SerializedBill) => {
    if (!confirm("Editing this bill will replace its current contents but keep the same bill number. Proceed?")) return;
    
    setIsProcessing(bill.id);
    try {
      // 1. Serialize items for the cart
      const cartItems = bill.lineItems.map(li => {
        let menuItem: SerializedMenuItem;
        
        if (li.menuItem) {
          menuItem = {
            id: li.menuItem.id,
            name: li.menuItem.name,
            sku: li.menuItem.sku,
            basePrice: li.menuItem.basePrice,
            unit: li.menuItem.unit,
            categoryId: li.menuItem.categoryId,
            gstSlab: { rate: li.menuItem.gstSlab.rate },
            isCustom: false
          };
        } else {
          // Custom item from the "Open Item" feature
          menuItem = {
            id: `custom-${li.id}`,
            name: li.itemName,
            sku: null,
            basePrice: li.basePrice,
            unit: li.unit || "custom",
            categoryId: "custom",
            gstSlab: { rate: li.gstRate },
            isCustom: true
          };
        }

        return {
          menuItem,
          quantity: parseFloat(li.quantity)
        };
      });

      // 2. Save to localStorage
      localStorage.setItem("pos-edit-cart", JSON.stringify(cartItems));
      localStorage.setItem("pos-edit-bill-id", bill.id);

      // 3. Redirect to POS
      toast.success("Loading bill into POS...");
      router.push("/pos");
      
    } catch (err: any) {
      toast.error(err.message || "Failed to edit bill");
      setIsProcessing(null);
    }
  };

  const isSameDay = (dateStr: string) => {
    const billDate = new Date(dateStr);
    const today = new Date();
    return billDate.getFullYear() === today.getFullYear() &&
           billDate.getMonth() === today.getMonth() &&
           billDate.getDate() === today.getDate();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">Order History</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Recent bills for {outletName}</p>
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
          const isEditable = bill.status !== "cancelled" && isSameDay(bill.createdAt);
          const isProcessingThis = isProcessing === bill.id;

          return (
            <div 
              key={bill.id} 
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[var(--interactive-default)] hover:shadow-md transition-all"
              onClick={() => setSelectedBill(bill)}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{bill.billNumber}</div>
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
        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
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
            
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col gap-4">
              <div className="flex justify-between items-center text-lg font-medium">
                <span className="text-[var(--text-primary)]">Grand Total</span>
                <span className="font-mono">₹{selectedBill.grandTotal}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[var(--border-subtle)]">
                {selectedBill.status !== "cancelled" && isSameDay(selectedBill.createdAt) && (
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
                      onClick={() => handleEdit(selectedBill)}
                      disabled={isProcessing !== null}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Bill
                    </Button>
                  </>
                )}
                <Button 
                  variant="default" 
                  className="bg-[var(--text-primary)] text-[var(--bg-surface)] hover:bg-[var(--text-secondary)] ml-auto"
                  onClick={() => setSelectedBill(null)}
                >
                  Okay
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
