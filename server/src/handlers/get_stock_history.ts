
import { db } from '../db';
import { stockTransactionsTable } from '../db/schema';
import { type StockTransaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getStockHistory(itemId: number): Promise<StockTransaction[]> {
  try {
    const results = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, itemId))
      .orderBy(desc(stockTransactionsTable.transaction_date))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      // No numeric conversions needed - all fields are already integers or strings
    }));
  } catch (error) {
    console.error('Get stock history failed:', error);
    throw error;
  }
}
