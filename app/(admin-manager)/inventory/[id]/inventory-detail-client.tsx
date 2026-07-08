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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart, 
  Package, 
  Boxes, 
  ShoppingCart, 
  ArrowLeftRight, 
  Trash2, 
  BookOpen,
  Settings,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder
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

  const reportsSubTabs = [
    { id: "current-stock", label: "Current Stock", icon: Boxes },
    { id: "stock-summary", label: "Stock Summary", icon: ClipboardList },
    { id: "other-reports", label: "Other Reports", icon: FileText }
  ];

  const managementSubTabs = [
    { id: "raw-materials", label: "Raw Materials", icon: Package },
    ...(hasOutlets ? [{ id: "recipes", label: "Recipes", icon: BookOpen }] : []),
    ...(user.role === "admin" ? [{ id: "management", label: "Settings", icon: Settings }] : [])
  ];

  const mainTabs = [
    { id: "overview", label: "Overview", icon: BarChart },
    { id: "purchases", label: "Purchases", icon: ShoppingCart },
    { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
    { id: "wastage", label: "Wastage", icon: Trash2 },
  ];

  const [isReportsOpen, setIsReportsOpen] = useState(() => 
    reportsSubTabs.some(t => t.id === activeTab)
  );

  const [isManagementOpen, setIsManagementOpen] = useState(() => 
    managementSubTabs.some(t => t.id === activeTab)
  );

  // Auto-expand folder when activeTab changes to a reports tab
  useEffect(() => {
    if (reportsSubTabs.some(t => t.id === activeTab)) {
      setIsReportsOpen(true);
    }
  }, [activeTab]);

  // Auto-expand folder when activeTab changes to a management tab
  useEffect(() => {
    if (managementSubTabs.some(t => t.id === activeTab)) {
      setIsManagementOpen(true);
    }
  }, [activeTab]);

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
        {/* Desktop sub-navigation */}
        <div className="hidden md:flex md:w-56 shrink-0 flex-col gap-1 border-r border-[var(--border-default)] pr-4">
          {mainTabs.map((tab) => {
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

          {/* Reports collapsible folder */}
          <div>
            <button
              onClick={() => setIsReportsOpen(prev => !prev)}
              className="flex items-center justify-between w-full h-10 px-3 rounded-lg text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="h-4 w-4" />
                <span>Reports</span>
              </div>
              {isReportsOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            
            {isReportsOpen && (
              <div className="flex flex-col gap-1 pl-4 mt-1 border-l border-[var(--border-default)] ml-5">
                {reportsSubTabs.map((subTab) => {
                  const Icon = subTab.icon;
                  const isActive = activeTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveTab(subTab.id)}
                      className={`flex items-center gap-2.5 h-9 px-3 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{subTab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Management collapsible folder */}
          {(() => {
            const visibleMgtSub = managementSubTabs.filter(tab => {
              if (tab.id === "recipes") return hasOutlets;
              if (tab.id === "management") return user.role === "admin";
              return true;
            });
            if (visibleMgtSub.length === 0) return null;
            return (
              <div>
                <button
                  onClick={() => setIsManagementOpen(prev => !prev)}
                  className="flex items-center justify-between w-full h-10 px-3 rounded-lg text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] animate-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="h-4 w-4" />
                    <span>Management</span>
                  </div>
                  {isManagementOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                
                {isManagementOpen && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 border-l border-[var(--border-default)] ml-5 animate-none">
                    {visibleMgtSub.map((subTab) => {
                      const Icon = subTab.icon;
                      const isActive = activeTab === subTab.id;
                      return (
                        <button
                          key={subTab.id}
                          onClick={() => setActiveTab(subTab.id)}
                          className={`flex items-center gap-2.5 h-9 px-3 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{subTab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Mobile sub-navigation */}
        <div className="flex md:hidden w-full gap-1 border-b border-[var(--border-default)] pb-4 overflow-x-auto whitespace-nowrap items-center">
          {mainTabs.map((tab) => {
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

          {/* Reports Dropdown Menu for Mobile */}
          {(() => {
            const activeReport = reportsSubTabs.find(t => t.id === activeTab);
            const isReportActive = !!activeReport;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors border border-[var(--border-default)] ${
                    isReportActive
                      ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>{isReportActive ? activeReport.label : "Reports"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-[var(--border-default)]">
                  {reportsSubTabs.map((subTab) => (
                    <DropdownMenuItem
                      key={subTab.id}
                      onClick={() => setActiveTab(subTab.id)}
                      className={`text-xs font-medium cursor-pointer ${
                        activeTab === subTab.id ? "bg-[var(--bg-active)]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <subTab.icon className="h-3.5 w-3.5" />
                        <span>{subTab.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}

          {/* Management Dropdown Menu for Mobile */}
          {(() => {
            const visibleMgtSub = managementSubTabs.filter(tab => {
              if (tab.id === "recipes") return hasOutlets;
              if (tab.id === "management") return user.role === "admin";
              return true;
            });
            const activeMgt = visibleMgtSub.find(t => t.id === activeTab);
            const isMgtActive = !!activeMgt;
            if (visibleMgtSub.length === 0) return null;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors border border-[var(--border-default)] ${
                    isMgtActive
                      ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span>{isMgtActive ? activeMgt.label : "Management"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-[var(--border-default)]">
                  {visibleMgtSub.map((subTab) => (
                    <DropdownMenuItem
                      key={subTab.id}
                      onClick={() => setActiveTab(subTab.id)}
                      className={`text-xs font-medium cursor-pointer ${
                        activeTab === subTab.id ? "bg-[var(--bg-active)]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <subTab.icon className="h-3.5 w-3.5" />
                        <span>{subTab.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
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
          {activeTab === "other-reports" && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-8 shadow-sm">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-[var(--text-secondary)] mb-3" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Other Reports</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                  This reports dashboard will be defined and developed in a future update.
                </p>
              </div>
            </div>
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
