
import { db } from '../db';
import { medicalItemsTable, stockTransactionsTable } from '../db/schema';
import { type CreateMedicalItemInput, type MedicalItem } from '../schema';

export async function createMedicalItem(input: CreateMedicalItemInput): Promise<MedicalItem> {
  try {
    // Start a transaction to ensure both item and stock transaction are created together
    const result = await db.transaction(async (tx) => {
      // Insert medical item record
      const itemResult = await tx.insert(medicalItemsTable)
        .values({
          name: input.name,
          category: input.category,
          unit: input.unit,
          current_stock: input.current_stock,
          minimum_threshold: input.minimum_threshold,
          purchase_price: input.purchase_price ? input.purchase_price.toString() : null,
          image_path: input.image_path
        })
        .returning()
        .execute();

      const createdItem = itemResult[0];

      // Create initial stock transaction record if there's starting stock
      if (input.current_stock > 0) {
        await tx.insert(stockTransactionsTable)
          .values({
            item_id: createdItem.id,
            transaction_type: 'adjustment',
            quantity: input.current_stock,
            remaining_stock: input.current_stock,
            notes: 'Initial stock entry'
          })
          .execute();
      }

      return createdItem;
    });

    // Convert numeric fields back to numbers before returning
    return {
      ...result,
      purchase_price: result.purchase_price ? parseFloat(result.purchase_price) : null
    };
  } catch (error) {
    console.error('Medical item creation failed:', error);
    throw error;
  }
}
