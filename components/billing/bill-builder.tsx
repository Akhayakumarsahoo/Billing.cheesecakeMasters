"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "./payment-dialog";
import { OpenItemDialog } from "./open-item-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export type SerializedMenuItem = {
  id: string;
  name: string;
  sku: string | null;
  basePrice: string;
  unit: string;
  categoryId: string;
  gstSlab: { rate: string };
  isCustom?: boolean;
};

type CartItem = {
  menuItem: SerializedMenuItem;
  quantity: number;
};

export function BillBuilder({
  categories,
  menuItems,
}: {
  categories: any[];
  menuItems: SerializedMenuItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isOpenItemOpen, setIsOpenItemOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [isTotalsExpanded, setIsTotalsExpanded] = useState(false);
  const [isCustomerDetailsExpanded, setIsCustomerDetailsExpanded] = useState(false);

  useEffect(() => {
    const editCart = localStorage.getItem("pos-edit-cart");
    const editBillId = localStorage.getItem("pos-edit-bill-id");
    
    if (editCart) {
      try {
        const parsed = JSON.parse(editCart);
        setCart(parsed);
      } catch (e) {
        console.error("Failed to parse edit cart", e);
      }
      localStorage.removeItem("pos-edit-cart");
    }
    
    if (editBillId) {
      setEditingBillId(editBillId);
      localStorage.removeItem("pos-edit-bill-id");
    }
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = activeCategory === "all" || item.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, search, activeCategory]);

  const groupedItems = useMemo(() => {
    const groups: { categoryName: string; categoryId: string; items: SerializedMenuItem[] }[] = [];
    const catMap = new Map<string, SerializedMenuItem[]>();
    
    filteredItems.forEach(item => {
      if (!catMap.has(item.categoryId)) {
        catMap.set(item.categoryId, []);
      }
      catMap.get(item.categoryId)!.push(item);
    });

    categories.forEach(cat => {
      const itemsForCat = catMap.get(cat.id);
      if (itemsForCat && itemsForCat.length > 0) {
        groups.push({
          categoryName: cat.name,
          categoryId: cat.id,
          items: itemsForCat
        });
      }
    });

    return groups;
  }, [filteredItems, categories]);

  // Client-side visual calculation ONLY
  const totals = useMemo(() => {
    let subtotal = 0;
    let gstAmount = 0;
    cart.forEach(item => {
      const price = parseFloat(item.menuItem.basePrice);
      const qty = item.quantity;
      const rate = parseFloat(item.menuItem.gstSlab.rate);
      
      const lineBaseTotal = price * qty;
      const lineGst = lineBaseTotal * (rate / 100);
      
      subtotal += lineBaseTotal;
      gstAmount += lineGst;
    });
    
    return {
      subtotal,
      gstAmount,
      grandTotal: subtotal + gstAmount
    };
  }, [cart]);

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (menuItem: SerializedMenuItem) => {
    setCart((prev) => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item => item.menuItem.id === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.menuItem.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleAddOpenItem = (name: string, price: number, gstRate: number) => {
    const customItem: SerializedMenuItem = {
      id: `custom-${Date.now()}`,
      name,
      sku: null,
      basePrice: price.toString(),
      unit: "custom",
      categoryId: "custom",
      gstSlab: { rate: gstRate.toString() },
      isCustom: true,
    };
    addToCart(customItem);
  };

  const handleComplete = async (payments: { mode: string, amount: number }[]) => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    let billId = editingBillId;
    try {

      if (billId) {
        // 1a. Reset existing bill
        const resetRes = await fetch(`/api/bills/${billId}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
          }),
        });
        if (!resetRes.ok) throw new Error("Failed to reset existing bill");
      } else {
        // 1b. Create draft bill
        const createRes = await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
          }),
        });
        
        if (!createRes.ok) throw new Error("Failed to create bill");
        const { data: draftBill } = await createRes.json();
        billId = draftBill.id;
      }

      // 2. Add line items
      for (const item of cart) {
        const payload = item.menuItem.isCustom
          ? {
              itemName: item.menuItem.name,
              basePrice: parseFloat(item.menuItem.basePrice),
              gstRate: parseFloat(item.menuItem.gstSlab.rate),
              quantity: item.quantity,
            }
          : {
              menuItemId: item.menuItem.id,
              quantity: item.quantity,
            };

        const itemRes = await fetch(`/api/bills/${billId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!itemRes.ok) throw new Error("Failed to add line item");
      }

      // 3. Add payments
      for (const p of payments) {
        if (p.amount > 0) {
          const payRes = await fetch(`/api/bills/${billId}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: p.mode,
              amount: p.amount,
            }),
          });
          if (!payRes.ok) throw new Error("Failed to add payment");
        }
      }

      // 4. Complete bill
      const completeRes = await fetch(`/api/bills/${billId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!completeRes.ok) throw new Error("Failed to complete bill");

      toast.success("Bill completed successfully");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setEditingBillId(null);
      setIsPaymentOpen(false);
      
    } catch (err: unknown) {
      if (billId) {
        try {
          await fetch(`/api/bills/${billId}/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        } catch (cleanupErr) {
          console.error("Failed to rollback bill:", cleanupErr);
        }
      }
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Something went wrong while saving");
    } finally {
      setIsProcessing(false);
    }
  };

  const CartContent = (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="p-4 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Current Bill</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsCartDrawerOpen(false);
              // Small delay to ensure the drawer's focus trap is fully released before dialog mounts
              setTimeout(() => setIsOpenItemOpen(true), 50);
            }}
          >
            Open Item
          </Button>
        </div>
        <div className="mt-4">
          {isCustomerDetailsExpanded || customerName || customerPhone ? (
            <div className="space-y-3 bg-[var(--bg-surface-raised)] p-3 rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Customer Details</span>
                {(!customerName && !customerPhone) && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setIsCustomerDetailsExpanded(false)}>
                    Hide
                  </Button>
                )}
              </div>
              <Input 
                placeholder="Customer Name (Optional)" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 bg-[var(--bg-surface)]"
              />
              <Input 
                placeholder="Phone Number (Optional)" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-10 bg-[var(--bg-surface)]"
              />
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full text-[var(--text-secondary)] border-dashed h-10"
              onClick={() => setIsCustomerDetailsExpanded(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Customer Details
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-surface-raised)]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.menuItem.id} className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-default)] flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.menuItem.name}</div>
                <div className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                  ₹{parseFloat(item.menuItem.basePrice).toFixed(2)} × {item.quantity} {item.menuItem.unit}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-sm font-mono font-medium">
                  ₹{(parseFloat(item.menuItem.basePrice) * item.quantity).toFixed(2)}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-surface-raised)] rounded border border-[var(--border-default)]">
                  <button 
                    onClick={() => updateQuantity(item.menuItem.id, -1)}
                    className="p-1 text-[var(--interactive-default)] hover:text-[var(--text-primary)]"
                  >
                    {item.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </button>
                  <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.menuItem.id, 1)}
                    className="p-1 text-[var(--interactive-default)] hover:text-[var(--text-primary)]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mb-4">
          <div 
            className="flex justify-between items-center text-xl font-medium cursor-pointer hover:bg-[var(--bg-surface-raised)] p-3 -mx-3 rounded-lg transition-colors select-none"
            onClick={() => setIsTotalsExpanded(!isTotalsExpanded)}
          >
            <div className="flex items-center gap-2">
              <span>Total</span>
              {isTotalsExpanded ? (
                <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
            <span className="font-mono">₹{totals.grandTotal.toFixed(2)}</span>
          </div>

          {isTotalsExpanded && (
            <div className="pt-3 pb-1 px-1 mt-1 border-t border-[var(--border-subtle)] space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>GST Amount</span>
                <span className="font-mono">₹{totals.gstAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        <Button 
          className="w-full h-14 text-base bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg"
          disabled={cart.length === 0}
          onClick={() => {
            setIsCartDrawerOpen(false);
            setIsPaymentOpen(true);
          }}
        >
          Proceed to Pay
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Column: Menu Items */}
      <div className="flex-1 flex flex-col min-w-0 lg:border-r border-[var(--border-default)] relative">
        <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input 
              placeholder="Search items by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-12 rounded-lg bg-[var(--bg-surface)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-base)]">
          {groupedItems.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-sm">
              No menu items found.
            </div>
          ) : (
            <div className="space-y-6 pb-24 lg:pb-0">
              {groupedItems.map((group) => (
                <div key={group.categoryId} className="space-y-3">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] sticky top-0 bg-[var(--bg-base)] z-10 py-1">
                    {group.categoryName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.items.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3 hover:border-[var(--border-strong)] hover:shadow-sm transition-all cursor-pointer select-none active:bg-[var(--bg-active)] flex flex-col justify-between min-h-[100px]"
                      >
                        <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                          {item.name}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm font-mono text-[var(--text-secondary)]">
                            ₹{parseFloat(item.basePrice).toFixed(2)}
                          </div>
                          <div className="h-8 w-8 rounded-full bg-[var(--bg-surface-raised)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-default)] shrink-0">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cart (Desktop only) */}
      <div className="hidden lg:flex w-[400px] flex-col bg-[var(--bg-surface)] shrink-0 h-[calc(100vh-64px)] overflow-hidden">
        {CartContent}
      </div>

      {/* FAB for Mobile/Tablet (Right aligned per preference) */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <Drawer open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
          <DrawerTrigger asChild>
            <Button className="h-16 w-16 rounded-full bg-[var(--accent-primary)] text-white shadow-lg flex flex-col items-center justify-center relative hover:bg-[var(--accent-primary-hover)] border border-[var(--border-subtle)]">
              <ShoppingBag className="h-6 w-6" />
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white border-2 border-white">
                  {totalQuantity}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] p-0 flex flex-col focus-visible:outline-none">
            <DrawerHeader className="hidden">
              <DrawerTitle>Cart</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              {CartContent}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <PaymentDialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={totals.grandTotal}
        onConfirm={handleComplete}
        isProcessing={isProcessing}
      />

      <OpenItemDialog
        isOpen={isOpenItemOpen}
        onClose={() => setIsOpenItemOpen(false)}
        onAdd={handleAddOpenItem}
      />
    </div>
  );
}
