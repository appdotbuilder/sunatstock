
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category enum for medical items
export const itemCategorySchema = z.enum(['alat', 'obat', 'habis_pakai']);
export type ItemCategory = z.infer<typeof itemCategorySchema>;

// Stock status enum
export const stockStatusSchema = z.enum(['cukup', 'hampir_habis', 'kosong']);
export type StockStatus = z.infer<typeof stockStatusSchema>;

// Medical item schema
export const medicalItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: itemCategorySchema,
  unit: z.string(), // pcs, bungkus, tube, box
  current_stock: z.number().int().nonnegative(),
  minimum_threshold: z.number().int().nonnegative(),
  purchase_price: z.number().nullable(),
  image_path: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MedicalItem = z.infer<typeof medicalItemSchema>;

// Stock transaction schema (for tracking stock changes)
export const stockTransactionSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  transaction_type: z.enum(['purchase', 'usage', 'adjustment']),
  quantity: z.number().int(),
  remaining_stock: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type StockTransaction = z.infer<typeof stockTransactionSchema>;

// Circumcision procedure schema
export const circumcisionProcedureSchema = z.object({
  id: z.number(),
  patient_name: z.string().nullable(),
  procedure_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type CircumcisionProcedure = z.infer<typeof circumcisionProcedureSchema>;

// Procedure item usage schema
export const procedureItemUsageSchema = z.object({
  id: z.number(),
  procedure_id: z.number(),
  item_id: z.number(),
  quantity_used: z.number().int().positive(),
  created_at: z.coerce.date()
});

export type ProcedureItemUsage = z.infer<typeof procedureItemUsageSchema>;

// Input schemas
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const createMedicalItemInputSchema = z.object({
  name: z.string().min(1),
  category: itemCategorySchema,
  unit: z.string().min(1),
  current_stock: z.number().int().nonnegative(),
  minimum_threshold: z.number().int().nonnegative(),
  purchase_price: z.number().positive().nullable(),
  image_path: z.string().nullable()
});

export type CreateMedicalItemInput = z.infer<typeof createMedicalItemInputSchema>;

export const updateMedicalItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  category: itemCategorySchema.optional(),
  unit: z.string().min(1).optional(),
  minimum_threshold: z.number().int().nonnegative().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  image_path: z.string().nullable().optional()
});

export type UpdateMedicalItemInput = z.infer<typeof updateMedicalItemInputSchema>;

export const restockItemInputSchema = z.object({
  item_id: z.number(),
  quantity: z.number().int().positive(),
  purchase_price: z.number().positive().nullable(),
  notes: z.string().nullable()
});

export type RestockItemInput = z.infer<typeof restockItemInputSchema>;

export const createProcedureInputSchema = z.object({
  patient_name: z.string().nullable(),
  procedure_date: z.coerce.date(),
  notes: z.string().nullable(),
  items_used: z.array(z.object({
    item_id: z.number(),
    quantity_used: z.number().int().positive()
  }))
});

export type CreateProcedureInput = z.infer<typeof createProcedureInputSchema>;

export const stockFilterInputSchema = z.object({
  category: itemCategorySchema.optional(),
  status: stockStatusSchema.optional(),
  search: z.string().optional()
});

export type StockFilterInput = z.infer<typeof stockFilterInputSchema>;

export const dateRangeInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type DateRangeInput = z.infer<typeof dateRangeInputSchema>;
