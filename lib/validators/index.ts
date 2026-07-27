import { z } from "zod";

// ── Outlets ───────────────────────────────────────────────
export const CreateOutletSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  address: z.string().max(300).optional(),
  stateCode: z.string().length(2),
  gstin: z.string().max(15).optional(),
});

export const UpdateOutletSchema = CreateOutletSchema.partial();

// ── Users ─────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["manager", "admin"]),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ── Menu Categories ───────────────────────────────────────
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
  outletId: z.string().uuid(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Menu Items ────────────────────────────────────────────
export const CreateMenuItemSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().max(50).optional(),
  basePrice: z.number().positive(),
  gstSlabId: z.number().refine((v) => [0, 5, 18, 28].includes(v), {
    message: "gstSlabId must be one of 0, 5, 18, 28",
  }),
  unit: z.string().max(20).optional(),
  categoryId: z.string().uuid(),
  outletId: z.string().uuid(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Bills ─────────────────────────────────────────────────
export const CreateBillSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

const CheckoutLineItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  itemName: z.string().min(1).max(150).optional(),
  basePrice: z.number().nonnegative().optional(),
  gstRate: z.number().refine((v) => [0, 5, 18, 28].includes(v)).optional(),
  quantity: z.number().positive(),
}).refine(data => {
  if (data.menuItemId) return true;
  return data.itemName !== undefined && data.basePrice !== undefined && data.gstRate !== undefined;
}, { message: "Must provide either menuItemId or (itemName, basePrice, gstRate) for custom items." });

export const CheckoutBillSchema = z.object({
  editingBillId: z.string().uuid().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
  lineItems: z.array(CheckoutLineItemSchema).min(1),
  payments: z.array(
    z.object({
      mode: z.enum(["cash", "upi", "card", "online"]),
      amount: z.number().nonnegative(),
    })
  ).min(1),
  discountType: z.enum(["percentage", "fixed"]).optional().nullable(),
  discountValue: z.number().nonnegative().optional().nullable(),
  discountReason: z.string().max(300).optional().nullable(),
});

export const AddLineItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  itemName: z.string().min(1).max(150).optional(),
  basePrice: z.number().nonnegative().optional(),
  gstRate: z.number().refine((v) => [0, 5, 18, 28].includes(v)).optional(),
  quantity: z.number().positive(),
}).refine(data => {
  if (data.menuItemId) return true;
  return data.itemName !== undefined && data.basePrice !== undefined && data.gstRate !== undefined;
}, { message: "Must provide either menuItemId or (itemName, basePrice, gstRate) for custom items." });

export const UpdateLineItemSchema = z.object({
  quantity: z.number().positive().optional(),
  itemName: z.string().min(1).max(150).optional(),
  basePrice: z.number().nonnegative().optional(),
  payments: z.array(
    z.object({
      mode: z.enum(["cash", "upi", "card", "online"]),
      amount: z.number().nonnegative(),
    })
  ).optional(),
});

export const CompleteBillSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

// ── Payments ──────────────────────────────────────────────
export const AddPaymentSchema = z.object({
  mode: z.enum(["cash", "upi", "card", "online"]),
  amount: z.number().positive(),
});

// ── Dashboard ─────────────────────────────────────────────
export const DashboardQuerySchema = z.object({
  outletId: z.string().uuid().optional(),
  dateFrom: z.string().optional(), // ISO date string YYYY-MM-DD
  dateTo: z.string().optional(),
});

export const BillHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["draft", "printed", "cancelled"]).optional(),
  paymentMode: z.enum(["cash", "upi", "card", "online"]).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billNumber: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ── Daily Settlements ──────────────────────────────────────
export const CreateSettlementSchema = z.object({
  settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }),
  actualCash: z.number().nonnegative(),
  actualUpi: z.number().nonnegative(),
  actualCard: z.number().nonnegative(),
  cashExpense: z.number().nonnegative(),
  cashWithdraw: z.number().nonnegative(),
  expenseReason: z.string().max(500).optional().nullable(),
  withdrawBy: z.string().max(100).optional().nullable(),
});

export const UpdateSettlementSchema = CreateSettlementSchema.partial();

// ── Walkaways ──────────────────────────────────────────────
export const CreateWalkawaySchema = z.object({
  reason: z.string().min(1).max(200),
  customReason: z.string().max(500).optional().nullable(),
});

// ── Inventory & Warehousing ───────────────────────────────
export const CreateInventorySchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(300).optional().nullable(),
  outletIds: z.array(z.string().uuid()).optional(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(8).optional().nullable(),
});

export const UpdateInventorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(300).optional().nullable(),
  outletIds: z.array(z.string().uuid()).optional(),
});

export const CreateRawMaterialSchema = z.object({
  inventoryId: z.string().uuid(),
  name: z.string().min(1).max(150),
  unit: z.string().min(1).max(50),
  purchasePrice: z.number().nonnegative(),
  transferPrice: z.number().nonnegative(),
  gstSlabId: z.number().refine((v) => [0, 5, 18, 28].includes(v), {
    message: "gstSlabId must be one of 0, 5, 18, 28",
  }),
  lowStockAlert: z.number().nonnegative().optional().nullable(),
});

export const UpdateRawMaterialSchema = CreateRawMaterialSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  gstin: z.string().max(15).optional().nullable(),
});

export const CreatePurchaseInvoiceSchema = z.object({
  inventoryId: z.string().uuid(),
  supplierId: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(100),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }),
  notes: z.string().max(500).optional().nullable(),
  otherCharges: z.number().nonnegative().optional(),
  otherChargesGst: z.number().nonnegative().optional(),
  lines: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
    })
  ).min(1),
  status: z.enum(["draft", "confirmed"]).optional(),
});

export const CreateStockTransferSchema = z.object({
  fromInventoryId: z.string().uuid(),
  toInventoryId: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
  otherCharges: z.number().nonnegative().optional(),
  otherChargesGst: z.number().nonnegative().optional(),
  lines: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
    })
  ).min(1),
  status: z.enum(["draft", "pending"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }).optional(),
});

export const CreateWastageRecordSchema = z.object({
  inventoryId: z.string().uuid(),
  wastageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }),
  reason: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  lines: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      quantity: z.number().positive(),
    })
  ).min(1),
  status: z.enum(["draft", "confirmed"]).optional(),
});

export const SaveRecipeSchema = z.object({
  menuItemId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  lines: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      quantityPerUnit: z.number().positive(),
    })
  ),
});


