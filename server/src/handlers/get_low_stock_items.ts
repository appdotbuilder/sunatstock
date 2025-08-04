
import { db } from '../db';
import { medicalItemsTable } from '../db/schema';
import { type MedicalItem } from '../schema';
import { lte, or } from 'drizzle-orm';

export const getLowStockItems = async (): Promise<MedicalItem[]> => {
  try {
    const results = await db.select()
      .from(medicalItemsTable)
      .where(
        or(
          lte(medicalItemsTable.current_stock, medicalItemsTable.minimum_threshold),
          lte(medicalItemsTable.current_stock, 0)
        )
      )
      .execute();

    // Convert numeric fields back to numbers
    return results.map(item => ({
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null
    }));
  } catch (error) {
    console.error('Failed to get low stock items:', error);
    throw error;
  }
};
