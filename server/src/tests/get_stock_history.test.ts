
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, stockTransactionsTable } from '../db/schema';
import { type CreateMedicalItemInput } from '../schema';
import { getStockHistory } from '../handlers/get_stock_history';

const testItem: CreateMedicalItemInput = {
  name: 'Test Item',
  category: 'alat',
  unit: 'pcs',
  current_stock: 100,
  minimum_threshold: 10,
  purchase_price: 15.50,
  image_path: null
};

describe('getStockHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for item with no transactions', async () => {
    // Create item without transactions
    const itemResult = await db.insert(medicalItemsTable)
      .values({
        ...testItem,
        purchase_price: testItem.purchase_price?.toString() || null
      })
      .returning()
      .execute();

    const history = await getStockHistory(itemResult[0].id);
    expect(history).toEqual([]);
  });

  it('should return stock transactions for an item', async () => {
    // Create item
    const itemResult = await db.insert(medicalItemsTable)
      .values({
        ...testItem,
        purchase_price: testItem.purchase_price?.toString() || null
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Create transactions
    await db.insert(stockTransactionsTable)
      .values([
        {
          item_id: itemId,
          transaction_type: 'purchase',
          quantity: 50,
          remaining_stock: 150,
          notes: 'Initial purchase',
          transaction_date: new Date('2024-01-01')
        },
        {
          item_id: itemId,
          transaction_type: 'usage',
          quantity: -10,
          remaining_stock: 140,
          notes: 'Used in procedure',
          transaction_date: new Date('2024-01-02')
        },
        {
          item_id: itemId,
          transaction_type: 'adjustment',
          quantity: 5,
          remaining_stock: 145,
          notes: 'Stock correction',
          transaction_date: new Date('2024-01-03')
        }
      ])
      .execute();

    const history = await getStockHistory(itemId);

    expect(history).toHaveLength(3);

    // Should be ordered by transaction_date descending (newest first)
    expect(history[0].transaction_type).toEqual('adjustment');
    expect(history[0].quantity).toEqual(5);
    expect(history[0].remaining_stock).toEqual(145);
    expect(history[0].notes).toEqual('Stock correction');

    expect(history[1].transaction_type).toEqual('usage');
    expect(history[1].quantity).toEqual(-10);
    expect(history[1].remaining_stock).toEqual(140);
    expect(history[1].notes).toEqual('Used in procedure');

    expect(history[2].transaction_type).toEqual('purchase');
    expect(history[2].quantity).toEqual(50);
    expect(history[2].remaining_stock).toEqual(150);
    expect(history[2].notes).toEqual('Initial purchase');

    // Verify all transactions have required fields
    history.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.item_id).toEqual(itemId);
      expect(transaction.transaction_date).toBeInstanceOf(Date);
      expect(transaction.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return transactions for specified item', async () => {
    // Create two items
    const item1Result = await db.insert(medicalItemsTable)
      .values({
        ...testItem,
        name: 'Item 1',
        purchase_price: testItem.purchase_price?.toString() || null
      })
      .returning()
      .execute();

    const item2Result = await db.insert(medicalItemsTable)
      .values({
        ...testItem,
        name: 'Item 2',
        purchase_price: testItem.purchase_price?.toString() || null
      })
      .returning()
      .execute();

    const item1Id = item1Result[0].id;
    const item2Id = item2Result[0].id;

    // Create transactions for both items
    await db.insert(stockTransactionsTable)
      .values([
        {
          item_id: item1Id,
          transaction_type: 'purchase',
          quantity: 30,
          remaining_stock: 130,
          notes: 'Item 1 purchase'
        },
        {
          item_id: item2Id,
          transaction_type: 'purchase',
          quantity: 40,
          remaining_stock: 140,
          notes: 'Item 2 purchase'
        },
        {
          item_id: item1Id,
          transaction_type: 'usage',
          quantity: -5,
          remaining_stock: 125,
          notes: 'Item 1 usage'
        }
      ])
      .execute();

    const item1History = await getStockHistory(item1Id);
    const item2History = await getStockHistory(item2Id);

    // Item 1 should have 2 transactions
    expect(item1History).toHaveLength(2);
    item1History.forEach(transaction => {
      expect(transaction.item_id).toEqual(item1Id);
    });

    // Item 2 should have 1 transaction
    expect(item2History).toHaveLength(1);
    expect(item2History[0].item_id).toEqual(item2Id);
    expect(item2History[0].notes).toEqual('Item 2 purchase');
  });
});
