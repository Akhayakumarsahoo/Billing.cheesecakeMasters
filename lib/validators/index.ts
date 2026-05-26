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
  role: z.enum(["manager"]), // admin is never allowed here
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

export const AddLineItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const UpdateLineItemSchema = z.object({
  quantity: z.number().positive(),
});

export const CompleteBillSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

// ── Payments ──────────────────────────────────────────────
export const AddPaymentSchema = z.object({
  mode: z.enum(["cash", "upi", "card", "other"]),
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
  paymentMode: z.enum(["cash", "upi", "card", "other"]).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billNumber: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
