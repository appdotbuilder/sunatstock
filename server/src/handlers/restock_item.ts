
import { db } from '../db';
import { medicalItemsTable, stockTransactionsTable } from '../db/schema';
import { type RestockItemInput, type MedicalItem } from '../schema';
import { eq } from 'drizzle-orm';

export const restockItem = async (input: RestockItemInput): Promise<MedicalItem | null> => {
  try {
    // First, verify the item exists and get current stock
    const existingItems = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, input.item_id))
      .execute();

    if (existingItems.length === 0) {
      return null;
    }

    const currentItem = existingItems[0];
    const newStock = currentItem.current_stock + input.quantity;

    // Update the item's stock and purchase price (if provided)
    const updateData: any = {
      current_stock: newStock,
      updated_at: new Date()
    };

    if (input.purchase_price !== null && input.purchase_price !== undefined) {
      updateData.purchase_price = input.purchase_price.toString();
    }

    const updatedItems = await db.update(medicalItemsTable)
      .set(updateData)
      .where(eq(medicalItemsTable.id, input.item_id))
      .returning()
      .execute();

    // Create a stock transaction record
    await db.insert(stockTransactionsTable)
      .values({
        item_id: input.item_id,
        transaction_type: 'purchase',
        quantity: input.quantity,
        remaining_stock: newStock,
        notes: input.notes,
        transaction_date: new Date()
      })
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedItem = updatedItems[0];
    return {
      ...updatedItem,
      purchase_price: updatedItem.purchase_price ? parseFloat(updatedItem.purchase_price) : null
    };
  } catch (error) {
    console.error('Item restock failed:', error);
    throw error;
  }
};
