
import { db } from '../db';
import { medicalItemsTable, circumcisionProceduresTable, procedureItemUsageTable, stockTransactionsTable } from '../db/schema';
import { type CreateProcedureInput, type CircumcisionProcedure } from '../schema';
import { eq } from 'drizzle-orm';

export const createProcedure = async (input: CreateProcedureInput): Promise<CircumcisionProcedure> => {
  try {
    // Start a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Create the procedure record
      const procedureResult = await tx.insert(circumcisionProceduresTable)
        .values({
          patient_name: input.patient_name,
          procedure_date: input.procedure_date,
          notes: input.notes
        })
        .returning()
        .execute();

      const procedure = procedureResult[0];

      // Process each item used in the procedure
      for (const itemUsage of input.items_used) {
        // Get current item data
        const items = await tx.select()
          .from(medicalItemsTable)
          .where(eq(medicalItemsTable.id, itemUsage.item_id))
          .execute();

        if (items.length === 0) {
          throw new Error(`Medical item with ID ${itemUsage.item_id} not found`);
        }

        const item = items[0];

        // Check if there's enough stock
        if (item.current_stock < itemUsage.quantity_used) {
          throw new Error(`Insufficient stock for item ${item.name}. Available: ${item.current_stock}, Required: ${itemUsage.quantity_used}`);
        }

        // Calculate new stock level
        const newStockLevel = item.current_stock - itemUsage.quantity_used;

        // Update item stock
        await tx.update(medicalItemsTable)
          .set({ 
            current_stock: newStockLevel,
            updated_at: new Date()
          })
          .where(eq(medicalItemsTable.id, itemUsage.item_id))
          .execute();

        // Create procedure item usage record
        await tx.insert(procedureItemUsageTable)
          .values({
            procedure_id: procedure.id,
            item_id: itemUsage.item_id,
            quantity_used: itemUsage.quantity_used
          })
          .execute();

        // Create stock transaction record for usage
        await tx.insert(stockTransactionsTable)
          .values({
            item_id: itemUsage.item_id,
            transaction_type: 'usage',
            quantity: -itemUsage.quantity_used, // Negative for usage
            remaining_stock: newStockLevel,
            notes: `Used in procedure for patient: ${input.patient_name || 'Unknown'}`,
            transaction_date: input.procedure_date
          })
          .execute();
      }

      return procedure;
    });

    return result;
  } catch (error) {
    console.error('Procedure creation failed:', error);
    throw error;
  }
};
