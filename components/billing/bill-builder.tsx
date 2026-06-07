"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
  SplitSquareHorizontal,
  Tag,
  Edit2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "./payment-dialog";
import { OpenItemDialog } from "./open-item-dialog";
import { DiscountDialog } from "./discount-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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

export type SerializedCategory = {
  id: string;
  name: string;
  sortOrder: number | null;
};

type CartItem = {
  menuItem: SerializedMenuItem;
  quantity: number;
};

const paymentModes = [
  { id: "cash", name: "Cash", icon: Banknote },
  { id: "upi", name: "UPI", icon: Smartphone },
  { id: "card", name: "Card", icon: CreditCard },
  { id: "online", name: "Online", icon: Receipt },
  { id: "part_payment", name: "Part Payment", icon: SplitSquareHorizontal },
];

export function BillBuilder({
  categories,
  menuItems,
}: {
  categories: SerializedCategory[];
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
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isTotalsExpanded, setIsTotalsExpanded] = useState(false);
  const [isCustomerDetailsExpanded, setIsCustomerDetailsExpanded] =
    useState(false);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | null>(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("cash");
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: "",
    upi: "",
    card: "",
    online: "",
  });

  const splitTotal = useMemo(() => {
    return Object.values(splitAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [splitAmounts]);

  useEffect(() => {
    const editCart = localStorage.getItem("pos-edit-cart");
    const editBillId = localStorage.getItem("pos-edit-bill-id");
    const editDiscountType = localStorage.getItem("pos-edit-discount-type");
    const editDiscountValue = localStorage.getItem("pos-edit-discount-value");
    const editDiscountReason = localStorage.getItem("pos-edit-discount-reason");

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

    if (editDiscountType) {
      setDiscountType(editDiscountType as "percentage" | "fixed");
      setDiscountValue(parseFloat(editDiscountValue || "0"));
      setDiscountReason(editDiscountReason || "");

      localStorage.removeItem("pos-edit-discount-type");
      localStorage.removeItem("pos-edit-discount-value");
      localStorage.removeItem("pos-edit-discount-reason");
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && cart.length === 0) {
      setDiscountType(null);
      setDiscountValue(0);
      setDiscountReason("");
    }
  }, [cart.length, isLoaded]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory =
        activeCategory === "all" || item.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, search, activeCategory]);

  const groupedItems = useMemo(() => {
    const groups: {
      categoryName: string;
      categoryId: string;
      items: SerializedMenuItem[];
    }[] = [];
    const catMap = new Map<string, SerializedMenuItem[]>();

    filteredItems.forEach((item) => {
      if (!catMap.has(item.categoryId)) {
        catMap.set(item.categoryId, []);
      }
      catMap.get(item.categoryId)!.push(item);
    });

    categories.forEach((cat) => {
      const itemsForCat = catMap.get(cat.id);
      if (itemsForCat && itemsForCat.length > 0) {
        groups.push({
          categoryName: cat.name,
          categoryId: cat.id,
          items: itemsForCat,
        });
      }
    });

    return groups;
  }, [filteredItems, categories]);

  // Client-side visual calculation ONLY
  const totals = useMemo(() => {
    let subtotal = 0;
    cart.forEach((item) => {
      const price = parseFloat(item.menuItem.basePrice);
      const qty = item.quantity;
      subtotal += price * qty;
    });

    let discountAmount = 0;
    if (discountType && discountValue > 0) {
      if (discountType === "percentage") {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = discountValue;
      }
    }

    const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

    let gstAmount = 0;
    cart.forEach((item) => {
      const price = parseFloat(item.menuItem.basePrice);
      const qty = item.quantity;
      const rate = parseFloat(item.menuItem.gstSlab.rate);

      const lineBaseTotal = price * qty;
      const discountedLineBaseTotal = lineBaseTotal * (1 - discountRatio);
      const lineGst = discountedLineBaseTotal * (rate / 100);

      gstAmount += lineGst;
    });

    const rawTotal = (subtotal - discountAmount) + gstAmount;
    const grandTotal = Math.max(0, Math.round(rawTotal));
    const roundOff = grandTotal - rawTotal;

    return {
      subtotal,
      gstAmount,
      discountAmount,
      roundOff,
      grandTotal,
    };
  }, [cart, discountType, discountValue]);

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (menuItem: SerializedMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItem.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
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

  const handleOpenItemClose = () => {
    setIsOpenItemOpen(false);
    setEditingCartItem(null);
  };

  const handleOpenItemAddOrEdit = (name: string, price: number, gstRate: number) => {
    if (editingCartItem) {
      setCart((prev) =>
        prev.map((item) =>
          item.menuItem.id === editingCartItem.menuItem.id
            ? {
                ...item,
                menuItem: {
                  ...item.menuItem,
                  name,
                  basePrice: price.toString(),
                  gstSlab: { rate: gstRate.toString() },
                },
              }
            : item
        )
      );
      setEditingCartItem(null);
    } else {
      handleAddOpenItem(name, price, gstRate);
    }
  };

  const handleComplete = async (
    payments: { mode: string; amount: number }[],
  ) => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const payload = {
        editingBillId: editingBillId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        lineItems: cart.map((item) => {
          return item.menuItem.isCustom
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
        }),
        payments: payments.filter((p) => p.amount > 0),
        discountType: discountType || undefined,
        discountValue: discountValue > 0 ? discountValue : undefined,
        discountReason: discountReason || undefined,
      };

      const res = await fetch("/api/bills/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || "Checkout failed");
      }

      toast.success("Bill completed successfully");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setEditingBillId(null);
      setIsPaymentOpen(false);
      setSelectedPaymentMode("cash");
      setSplitAmounts({ cash: "", upi: "", card: "", online: "" });
      setDiscountType(null);
      setDiscountValue(0);
      setDiscountReason("");
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Something went wrong while saving");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentModeChange = (modeId: string) => {
    setSelectedPaymentMode(modeId);
    if (modeId === "part_payment") {
      setIsCartDrawerOpen(false);
      setTimeout(() => {
        setIsPaymentOpen(true);
      }, 100);
    }
  };

  const handleSaveBill = async () => {
    if (cart.length === 0) return;

    if (selectedPaymentMode === "part_payment") {
      const splitTotalCents = Math.round(splitTotal * 100);
      const grandTotalCents = Math.round(totals.grandTotal * 100);

      if (splitTotalCents >= grandTotalCents) {
        // Already fully entered and valid, proceed directly
        const payments: { mode: string; amount: number }[] = [];
        let remainingCents = grandTotalCents;

        const nonCashModes = ["upi", "card", "online"];
        for (const mode of nonCashModes) {
          const valCents = Math.round((parseFloat(splitAmounts[mode]) || 0) * 100);
          if (valCents > 0) {
            const allocatedCents = Math.min(valCents, remainingCents);
            if (allocatedCents > 0) {
              payments.push({ mode, amount: allocatedCents / 100 });
              remainingCents -= allocatedCents;
            }
          }
        }

        const cashValCents = Math.round((parseFloat(splitAmounts["cash"]) || 0) * 100);
        if (cashValCents > 0 && remainingCents > 0) {
          const allocatedCents = Math.min(cashValCents, remainingCents);
          if (allocatedCents > 0) {
            payments.push({ mode: "cash", amount: allocatedCents / 100 });
            remainingCents -= allocatedCents;
          }
        }

        await handleComplete(payments);
      } else {
        // Trigger dialog to fill split
        setIsCartDrawerOpen(false);
        setIsPaymentOpen(true);
      }
    } else {
      // Single payment checkout directly
      await handleComplete([{ mode: selectedPaymentMode, amount: totals.grandTotal }]);
    }
  };

  const CartContent = (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="p-4 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Current Bill</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {!isCustomerDetailsExpanded && !customerName && !customerPhone && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title="Add Customer Details"
                onClick={() => setIsCustomerDetailsExpanded(true)}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant={discountType ? "default" : "outline"}
              size="sm"
              className={discountType ? "bg-[var(--state-success-border)] hover:bg-[var(--state-success-border)]/90 text-white border-0" : ""}
              onClick={() => {
                setIsCartDrawerOpen(false);
                setTimeout(() => setIsDiscountOpen(true), 50);
              }}
              disabled={cart.length === 0}
            >
              <Tag className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
              {discountType ? `Discount (-₹${totals.discountAmount.toFixed(0)})` : "Discount"}
            </Button>
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
        </div>

        {(isCustomerDetailsExpanded || customerName || customerPhone) && (
          <div className="mt-4 space-y-3 bg-[var(--bg-surface-raised)] p-3 rounded-lg border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Customer Details
              </span>
              {!customerName && !customerPhone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setIsCustomerDetailsExpanded(false)}
                >
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
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-surface-raised)]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.menuItem.id}
              className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-default)] flex items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                  <span className="truncate">{item.menuItem.name}</span>
                  {item.menuItem.isCustom && (
                    <button
                      onClick={() => {
                        setEditingCartItem(item);
                        setIsOpenItemOpen(true);
                      }}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded hover:bg-[var(--bg-hover)] flex-shrink-0"
                      title="Edit open item name and price"
                    >
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                  ₹{parseFloat(item.menuItem.basePrice).toFixed(2)} ×{" "}
                  {item.quantity} {item.menuItem.unit}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-sm font-mono font-medium">
                  ₹
                  {(
                    parseFloat(item.menuItem.basePrice) * item.quantity
                  ).toFixed(2)}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-surface-raised)] rounded border border-[var(--border-default)]">
                  <button
                    onClick={() => updateQuantity(item.menuItem.id, -1)}
                    className="p-1 text-[var(--interactive-default)] hover:text-[var(--text-primary)]"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-sm font-mono w-6 text-center">
                    {item.quantity}
                  </span>
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

      <div className="p-3 pb-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mb-2.5">
          <div
            className="flex justify-between items-center text-lg font-medium cursor-pointer hover:bg-[var(--bg-surface-raised)] py-1.5 px-3 -mx-3 rounded-lg transition-colors select-none"
            onClick={() => setIsTotalsExpanded(!isTotalsExpanded)}
          >
            <div className="flex items-center gap-1.5">
              <span>Total</span>
              {isTotalsExpanded ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </div>
            <span className="font-mono text-xl">₹{totals.grandTotal.toFixed(2)}</span>
          </div>

          {isTotalsExpanded && (
            <div className="pt-2 pb-0.5 px-1 mt-1 border-t border-border-subtle space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-[var(--state-error-text)] font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-₹{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-text-secondary">
                <span>GST Amount</span>
                <span className="font-mono">
                  ₹{totals.gstAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Round Off</span>
                <span className="font-mono">
                  {totals.roundOff >= 0 ? "+" : ""}
                  {totals.roundOff.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="mb-3 space-y-1">
          <label className="text-xs font-medium text-text-secondary">Payment Method</label>
          
          {/* Desktop View: DropdownMenu */}
          <div className="hidden lg:block">
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={cart.length === 0}
                className="w-full h-10 flex items-center justify-between px-3 bg-bg-surface hover:bg-bg-hover border border-border-default hover:border-border-strong rounded-lg text-sm text-text-primary font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2">
                  {(() => {
                    const activeMode = paymentModes.find(m => m.id === selectedPaymentMode) || paymentModes[0];
                    const SelectedIcon = activeMode.icon;
                    return (
                      <>
                        <SelectedIcon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                        <span>
                          {activeMode.name}
                          {selectedPaymentMode === "part_payment" && splitTotal > 0 && ` (₹${splitTotal.toFixed(2)})`}
                        </span>
                      </>
                    );
                  })()}
                </span>
                <ChevronDown className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[368px] max-w-[calc(100vw-32px)] bg-bg-surface border-border-default shadow-md rounded-lg p-1" align="end">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedPaymentMode === mode.id;
                  return (
                    <DropdownMenuItem
                      key={mode.id}
                      onClick={() => handlePaymentModeChange(mode.id)}
                      className={`flex items-center gap-3 p-2.5 text-sm font-medium cursor-pointer rounded-md transition-colors ${
                        isSelected 
                          ? "bg-bg-active text-text-primary font-semibold" 
                          : "hover:bg-bg-hover text-text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                      <span className="flex-1">{mode.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile/Tablet View: Inline Touch-friendly Grid */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            {paymentModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedPaymentMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => handlePaymentModeChange(mode.id)}
                  className={`flex items-center gap-2 px-3 h-10 border rounded-lg text-xs font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none ${
                    isSelected
                      ? "bg-accent-primary text-white border-accent-primary hover:bg-accent-primary-hover"
                      : "bg-bg-surface text-text-primary border-border-default hover:bg-bg-hover hover:border-strong"
                  } ${mode.id === "part_payment" ? "col-span-2 justify-center" : ""}`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-text-secondary"}`} strokeWidth={1.5} />
                  <span>
                    {mode.name}
                    {mode.id === "part_payment" && splitTotal > 0 && ` (₹${splitTotal.toFixed(2)})`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          className="w-full h-11 text-sm bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium"
          disabled={cart.length === 0 || isProcessing}
          onClick={handleSaveBill}
        >
          {isProcessing ? "Saving..." : "Save Bill"}
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
            <div className="flex-1 overflow-hidden">{CartContent}</div>
          </DrawerContent>
        </Drawer>
      </div>

      <PaymentDialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={totals.grandTotal}
        onConfirm={handleComplete}
        isProcessing={isProcessing}
        splitAmounts={splitAmounts}
        setSplitAmounts={setSplitAmounts}
      />

      <OpenItemDialog
        isOpen={isOpenItemOpen}
        onClose={handleOpenItemClose}
        onAdd={handleOpenItemAddOrEdit}
        initialName={editingCartItem?.menuItem.name}
        initialPrice={editingCartItem ? parseFloat(editingCartItem.menuItem.basePrice) : undefined}
        initialGstRate={editingCartItem ? parseFloat(editingCartItem.menuItem.gstSlab.rate) : undefined}
        isEditing={!!editingCartItem}
      />

      <DiscountDialog
        isOpen={isDiscountOpen}
        onClose={() => setIsDiscountOpen(false)}
        subtotal={totals.subtotal}
        initialDiscountType={discountType}
        initialDiscountValue={discountValue}
        initialDiscountReason={discountReason}
        onConfirm={(type, val, reason) => {
          setDiscountType(type);
          setDiscountValue(val);
          setDiscountReason(reason);
        }}
      />
    </div>
  );
}
