"use client";

import React, { useState, useEffect } from "react";
import { Search, Save, Trash2, Plus, X, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
}

interface RecipeLine {
  rawMaterialId: string;
  materialName: string;
  unit: string;
  quantityPerUnit: number;
}

interface Recipe {
  id: string;
  menuItemId: string;
  inventoryId: string;
  isActive: boolean;
  lines: {
    id: string;
    rawMaterialId: string;
    materialName: string;
    unit: string;
    quantityPerUnit: string;
  }[];
}

interface RecipesTabProps {
  inventoryId: string;
  menuItems: MenuItem[];
  userRole: string;
}

export function RecipesTab({ inventoryId, menuItems, userRole }: RecipesTabProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  
  // Editor State
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search filter for menu items
  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => {
    fetchRecipesAndMaterials();
  }, [inventoryId]);

  const fetchRecipesAndMaterials = async () => {
    try {
      setLoading(true);
      // Fetch existing recipes
      const recipesRes = await fetch(`/api/recipes?inventoryId=${inventoryId}`);
      if (!recipesRes.ok) throw new Error("Failed to load recipes");
      const recipesBody = await recipesRes.json();
      setRecipes(recipesBody.data);

      // Fetch active raw materials for dropdown selection
      const materialsRes = await fetch(`/api/raw-materials?inventoryId=${inventoryId}`);
      if (!materialsRes.ok) throw new Error("Failed to load raw materials");
      const materialsBody = await materialsRes.json();
      setRawMaterials((materialsBody.data as RawMaterial[]).filter(m => m.isActive));
    } catch (err: any) {
      toast.error(err.message || "Failed to load recipe information.");
    } finally {
      setLoading(false);
    }
  };

  // Handle menu item selection
  const handleSelectMenuItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    
    // Find if a recipe already exists for this item
    const existingRecipe = recipes.find(r => r.menuItemId === item.id);
    if (existingRecipe) {
      setRecipeLines(existingRecipe.lines.map(line => ({
        rawMaterialId: line.rawMaterialId,
        materialName: line.materialName,
        unit: line.unit,
        quantityPerUnit: Number(line.quantityPerUnit)
      })));
    } else {
      setRecipeLines([]);
    }
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  };

  const handleAddMaterial = (m: RawMaterial) => {
    if (recipeLines.some(l => l.rawMaterialId === m.id)) {
      toast.info(`${m.name} is already in the recipe.`);
      setShowMaterialDropdown(false);
      setMaterialSearch("");
      return;
    }

    const newLine: RecipeLine = {
      rawMaterialId: m.id,
      materialName: m.name,
      unit: m.unit,
      quantityPerUnit: 1
    };

    setRecipeLines(prev => [...prev, newLine]);
    setShowMaterialDropdown(false);
    setMaterialSearch("");
  };

  const handleRemoveLine = (idx: number) => {
    setRecipeLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuantityChange = (idx: number, val: number) => {
    setRecipeLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const quantityPerUnit = val < 0 ? 0 : val;
      return { ...line, quantityPerUnit };
    }));
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuItem) return;

    if (recipeLines.length === 0) {
      toast.error("Please add at least one raw material to the recipe.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        menuItemId: selectedMenuItem.id,
        inventoryId,
        lines: recipeLines.map(l => ({
          rawMaterialId: l.rawMaterialId,
          quantityPerUnit: l.quantityPerUnit
        }))
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save recipe");

      toast.success(`Recipe saved for ${selectedMenuItem.name}`);
      await fetchRecipesAndMaterials();
    } catch (err: any) {
      toast.error(err.message || "Failed to save recipe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearRecipe = async () => {
    if (!selectedMenuItem) return;
    if (!confirm(`Are you sure you want to clear the recipe for ${selectedMenuItem.name}?`)) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/recipes?menuItemId=${selectedMenuItem.id}&inventoryId=${inventoryId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to clear recipe");
      }

      toast.success(`Recipe cleared for ${selectedMenuItem.name}`);
      setRecipeLines([]);
      await fetchRecipesAndMaterials();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear recipe.");
    } finally {
      setIsSaving(false);
    }
  };

  const isAllowed = userRole === "admin" || userRole === "storeroom";

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    item.categoryName.toLowerCase().includes(menuSearch.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(menuSearch.toLowerCase()))
  );

  const filteredMaterials = rawMaterials.filter(m =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recipe Configuration</h2>
        <p className="text-xs text-[var(--text-muted)]">Configure raw material quantities consumed per unit of sold menu items.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
        {/* Left Column: Menu Item List */}
        <div className="md:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search menu items..."
              className="pl-9 h-10 border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
            />
          </div>

          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No matching menu items found.
                </div>
              ) : (
                filteredMenuItems.map(item => {
                  const hasRecipe = recipes.some(r => r.menuItemId === item.id);
                  const isSelected = selectedMenuItem?.id === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMenuItem(item)}
                      className={`w-full text-left p-3 flex items-center justify-between text-sm transition-colors ${
                        isSelected
                          ? "bg-[var(--bg-active)]"
                          : "hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                          {item.categoryName} • {item.outletName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                          ₹{Number(item.basePrice).toFixed(2)}
                        </span>
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            hasRecipe ? "bg-green-500" : "bg-gray-300"
                          }`}
                          title={hasRecipe ? "Recipe Configured" : "No Recipe"}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Recipe Editor */}
        <div className="md:col-span-3">
          {selectedMenuItem ? (
            <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] py-4 px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">
                    Recipe for {selectedMenuItem.name}
                  </CardTitle>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Outlet: {selectedMenuItem.outletName} • Base Unit: {selectedMenuItem.unit || "pcs"}
                  </p>
                </div>
                {recipes.some(r => r.menuItemId === selectedMenuItem.id) && (
                  <Badge className="bg-green-100 text-green-800 border border-green-300">
                    Configured
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Search / Add Raw Material */}
                {isAllowed && (
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-semibold text-[var(--text-secondary)]">Add Ingredient (Raw Material)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                      <Input
                        value={materialSearch}
                        onChange={(e) => {
                          setMaterialSearch(e.target.value);
                          setShowMaterialDropdown(true);
                        }}
                        onFocus={() => setShowMaterialDropdown(true)}
                        placeholder="Search raw material in this inventory..."
                        className="pl-9 h-10 border-[var(--border-default)] bg-white text-sm"
                      />
                    </div>

                    {showMaterialDropdown && materialSearch && (
                      <div className="absolute top-[68px] left-0 right-0 z-50 max-h-40 overflow-y-auto bg-white border border-[var(--border-default)] rounded-md shadow-lg p-1 space-y-0.5">
                        {filteredMaterials.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleAddMaterial(m)}
                            className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded text-xs"
                          >
                            {m.name} ({m.unit})
                          </button>
                        ))}
                        {filteredMaterials.length === 0 && (
                          <p className="text-xs text-[var(--text-muted)] p-2">No active raw materials found.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Recipe Line Items Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Recipe Ingredients</h3>
                  
                  <Card className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                    {recipeLines.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No ingredients added yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[var(--bg-surface-raised)] border-b border-[var(--border-subtle)]">
                            <TableHead className="text-xs font-medium text-[var(--text-secondary)]">Ingredient</TableHead>
                            <TableHead className="text-xs font-medium text-[var(--text-secondary)] w-24">Unit</TableHead>
                            <TableHead className="text-xs font-medium text-[var(--text-secondary)] text-right w-40">Qty per unit of sale</TableHead>
                            {isAllowed && <TableHead className="w-12"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recipeLines.map((line, idx) => (
                            <TableRow key={line.rawMaterialId} className="border-b border-[var(--border-subtle)]">
                              <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                                {line.materialName}
                              </TableCell>
                              <TableCell className="text-xs text-[var(--text-secondary)]">
                                {line.unit}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.0001"
                                  value={line.quantityPerUnit || ""}
                                  onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                  disabled={!isAllowed}
                                  className="h-8 w-32 text-right font-mono text-xs border-[var(--border-default)] bg-white ml-auto"
                                  required
                                />
                              </TableCell>
                              {isAllowed && (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleRemoveLine(idx)}
                                    className="h-8 w-8 p-0 text-[var(--text-secondary)] hover:text-red-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                </div>

                {/* Editor Action Buttons */}
                {isAllowed && (
                  <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-subtle)]">
                    {recipes.some(r => r.menuItemId === selectedMenuItem.id) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearRecipe}
                        disabled={isSaving}
                        className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-10 px-4 rounded-md flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear Recipe
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSaveRecipe}
                      disabled={isSaving}
                      className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Recipe"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl py-16 text-center text-xs text-[var(--text-muted)]">
              <div className="flex flex-col items-center gap-3">
                <BookOpen className="h-8 w-8 text-[var(--text-secondary)]" />
                <span>Select a menu item from the left pane to view or manage its recipe.</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
