
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const itemCategoryEnum = pgEnum('item_category', ['alat', 'obat', 'habis_pakai']);
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'usage', 'adjustment']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Medical items table
export const medicalItemsTable = pgTable('medical_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: itemCategoryEnum('category').notNull(),
  unit: text('unit').notNull(), // pcs, bungkus, tube, box
  current_stock: integer('current_stock').notNull().default(0),
  minimum_threshold: integer('minimum_threshold').notNull().default(0),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }),
  image_path: text('image_path'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Stock transactions table (for tracking all stock changes)
export const stockTransactionsTable = pgTable('stock_transactions', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull().references(() => medicalItemsTable.id),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  quantity: integer('quantity').notNull(), // positive for purchase/adjustment in, negative for usage/adjustment out
  remaining_stock: integer('remaining_stock').notNull(),
  notes: text('notes'),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Circumcision procedures table
export const circumcisionProceduresTable = pgTable('circumcision_procedures', {
  id: serial('id').primaryKey(),
  patient_name: text('patient_name'),
  procedure_date: timestamp('procedure_date').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Procedure item usage table (many-to-many between procedures and items)
export const procedureItemUsageTable = pgTable('procedure_item_usage', {
  id: serial('id').primaryKey(),
  procedure_id: integer('procedure_id').notNull().references(() => circumcisionProceduresTable.id),
  item_id: integer('item_id').notNull().references(() => medicalItemsTable.id),
  quantity_used: integer('quantity_used').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const medicalItemsRelations = relations(medicalItemsTable, ({ many }) => ({
  stockTransactions: many(stockTransactionsTable),
  procedureUsages: many(procedureItemUsageTable),
}));

export const stockTransactionsRelations = relations(stockTransactionsTable, ({ one }) => ({
  item: one(medicalItemsTable, {
    fields: [stockTransactionsTable.item_id],
    references: [medicalItemsTable.id],
  }),
}));

export const circumcisionProceduresRelations = relations(circumcisionProceduresTable, ({ many }) => ({
  itemUsages: many(procedureItemUsageTable),
}));

export const procedureItemUsageRelations = relations(procedureItemUsageTable, ({ one }) => ({
  procedure: one(circumcisionProceduresTable, {
    fields: [procedureItemUsageTable.procedure_id],
    references: [circumcisionProceduresTable.id],
  }),
  item: one(medicalItemsTable, {
    fields: [procedureItemUsageTable.item_id],
    references: [medicalItemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type MedicalItem = typeof medicalItemsTable.$inferSelect;
export type NewMedicalItem = typeof medicalItemsTable.$inferInsert;

export type StockTransaction = typeof stockTransactionsTable.$inferSelect;
export type NewStockTransaction = typeof stockTransactionsTable.$inferInsert;

export type CircumcisionProcedure = typeof circumcisionProceduresTable.$inferSelect;
export type NewCircumcisionProcedure = typeof circumcisionProceduresTable.$inferInsert;

export type ProcedureItemUsage = typeof procedureItemUsageTable.$inferSelect;
export type NewProcedureItemUsage = typeof procedureItemUsageTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  medicalItems: medicalItemsTable,
  stockTransactions: stockTransactionsTable,
  circumcisionProcedures: circumcisionProceduresTable,
  procedureItemUsage: procedureItemUsageTable,
};
