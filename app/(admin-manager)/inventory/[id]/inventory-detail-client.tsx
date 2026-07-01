"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  Package, 
  Boxes, 
  ShoppingCart, 
  ArrowLeftRight, 
  Trash2, 
  BookOpen,
  Settings,
  ClipboardList
} from "lucide-react";
import { OverviewTab } from "./overview-tab";
import { RawMaterialsTab } from "./raw-materials-tab";
import { CurrentStockTab } from "./current-stock-tab";
import { PurchasesTab } from "./purchases-tab";
import { TransfersTab } from "./transfers-tab";
import { WastageTab } from "./wastage-tab";
import { RecipesTab } from "./recipes-tab";
import { ManagementTab } from "./management-tab";
import { StockSummaryTab } from "./stock-summary-tab";

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

interface GstSlab {
  id: number;
  rate: string;
  label: string;
}

interface MenuItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  basePrice: string;
  outletId: string;
  outletName: string;
  categoryName: string;
}

interface SelectorInventory {
  id: string;
  name: string;
  isActive: boolean;
}

interface InventoryDetailClientProps {
  inventory: Inventory;
  allInventories: SelectorInventory[];
  activeOutlets: ActiveOutlet[];
  gstSlabs: GstSlab[];
  menuItems: MenuItem[];
  user: {
    id: string;
    role: string;
    email: string;
  };
}

export function InventoryDetailClient({
  inventory,
  allInventories,
  activeOutlets,
  gstSlabs,
  menuItems,
  user
}: InventoryDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [currentInventory, setCurrentInventory] = useState<Inventory>(inventory);

  const hasOutlets = currentInventory.linkedOutlets.length > 0;

  // Tabs definitions
  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart },
    { id: "current-stock", label: "Current Stock", icon: Boxes },
    { id: "purchases", label: "Purchases", icon: ShoppingCart },
    { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
    { id: "wastage", label: "Wastage", icon: Trash2 },
    { id: "stock-summary", label: "Stock Summary", icon: ClipboardList },
    { id: "raw-materials", label: "Raw Materials", icon: Package },
    ...(hasOutlets ? [{ id: "recipes", label: "Recipes", icon: BookOpen }] : []),
    ...(user.role === "admin" ? [{ id: "management", label: "Management", icon: Settings }] : [])
  ];

  const handleInventoryChange = (value: string | null) => {
    if (!value) return;
    router.push(`/inventory/${value}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        {allInventories.length > 1 ? (
          <Select value={currentInventory.id} onValueChange={handleInventoryChange}>
            <SelectTrigger className="w-fit h-9 gap-2 border-none bg-transparent hover:bg-[var(--bg-hover)] text-xl font-semibold px-2 -ml-2 text-[var(--text-primary)] focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select Inventory">
                {currentInventory.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allInventories.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.name} {!inv.isActive && "(Inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {currentInventory.name}
          </h1>
        )}
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {currentInventory.address || "No address provided"}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar sub-navigation */}
        <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-[var(--border-default)] pb-4 md:pb-0 md:pr-4 overflow-x-auto md:overflow-x-visible whitespace-nowrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Tab Content */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === "overview" && (
            <OverviewTab
              inventory={currentInventory}
              activeOutlets={activeOutlets}
              userRole={user.role}
              onUpdateInventory={setCurrentInventory}
            />
          )}
          {activeTab === "raw-materials" && (
            <RawMaterialsTab
              inventoryId={currentInventory.id}
              gstSlabs={gstSlabs}
              userRole={user.role}
            />
          )}
          {activeTab === "current-stock" && (
            <CurrentStockTab
              inventoryId={currentInventory.id}
              userRole={user.role}
            />
          )}
          {activeTab === "purchases" && (
            <PurchasesTab
              inventoryId={currentInventory.id}
              userRole={user.role}
              gstSlabs={gstSlabs}
            />
          )}
          {activeTab === "transfers" && (
            <TransfersTab
              inventoryId={currentInventory.id}
              userRole={user.role}
            />
          )}
          {activeTab === "wastage" && (
            <WastageTab
              inventoryId={currentInventory.id}
              userRole={user.role}
            />
          )}
          {activeTab === "stock-summary" && (
            <StockSummaryTab
              inventoryId={currentInventory.id}
              userRole={user.role}
            />
          )}
          {activeTab === "recipes" && hasOutlets && (
            <RecipesTab
              inventoryId={currentInventory.id}
              menuItems={menuItems}
              userRole={user.role}
            />
          )}
          {activeTab === "management" && user.role === "admin" && (
            <ManagementTab
              inventory={currentInventory}
              activeOutlets={activeOutlets}
              onUpdateInventory={setCurrentInventory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
