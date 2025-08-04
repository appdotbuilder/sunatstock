
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, stockTransactionsTable } from '../db/schema';
import { type RestockItemInput, type CreateMedicalItemInput } from '../schema';
import { restockItem } from '../handlers/restock_item';
import { eq } from 'drizzle-orm';

// Test input for restocking
const testRestockInput: RestockItemInput = {
  item_id: 1,
  quantity: 50,
  purchase_price: 15000,
  notes: 'Monthly restock'
};

// Test medical item to create first
const testMedicalItem: CreateMedicalItemInput = {
  name: 'Test Bandage',
  category: 'habis_pakai',
  unit: 'pcs',
  current_stock: 10,
  minimum_threshold: 5,
  purchase_price: 12000,
  image_path: null
};

describe('restockItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should restock an existing item', async () => {
    // Create a medical item first
    const createdItems = await db.insert(medicalItemsTable)
      .values({
        name: testMedicalItem.name,
        category: testMedicalItem.category,
        unit: testMedicalItem.unit,
        current_stock: testMedicalItem.current_stock,
        minimum_threshold: testMedicalItem.minimum_threshold,
        purchase_price: testMedicalItem.purchase_price?.toString() || null,
        image_path: testMedicalItem.image_path
      })
      .returning()
      .execute();

    const createdItem = createdItems[0];

    // Restock the item
    const restockInput = {
      ...testRestockInput,
      item_id: createdItem.id
    };

    const result = await restockItem(restockInput);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.name).toEqual('Test Bandage');
    expect(result!.current_stock).toEqual(60); // 10 + 50
    expect(result!.purchase_price).toEqual(15000);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated stock to database', async () => {
    // Create a medical item first
    const createdItems = await db.insert(medicalItemsTable)
      .values({
        name: testMedicalItem.name,
        category: testMedicalItem.category,
        unit: testMedicalItem.unit,
        current_stock: testMedicalItem.current_stock,
        minimum_threshold: testMedicalItem.minimum_threshold,
        purchase_price: testMedicalItem.purchase_price?.toString() || null,
        image_path: testMedicalItem.image_path
      })
      .returning()
      .execute();

    const createdItem = createdItems[0];

    // Restock the item
    const restockInput = {
      ...testRestockInput,
      item_id: createdItem.id
    };

    await restockItem(restockInput);

    // Query the database to verify the update
    const items = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, createdItem.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].current_stock).toEqual(60);
    expect(parseFloat(items[0].purchase_price!)).toEqual(15000);
  });

  it('should create a stock transaction record', async () => {
    // Create a medical item first
    const createdItems = await db.insert(medicalItemsTable)
      .values({
        name: testMedicalItem.name,
        category: testMedicalItem.category,
        unit: testMedicalItem.unit,
        current_stock: testMedicalItem.current_stock,
        minimum_threshold: testMedicalItem.minimum_threshold,
        purchase_price: testMedicalItem.purchase_price?.toString() || null,
        image_path: testMedicalItem.image_path
      })
      .returning()
      .execute();

    const createdItem = createdItems[0];

    // Restock the item
    const restockInput = {
      ...testRestockInput,
      item_id: createdItem.id
    };

    await restockItem(restockInput);

    // Query stock transactions
    const transactions = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, createdItem.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_type).toEqual('purchase');
    expect(transactions[0].quantity).toEqual(50);
    expect(transactions[0].remaining_stock).toEqual(60);
    expect(transactions[0].notes).toEqual('Monthly restock');
    expect(transactions[0].transaction_date).toBeInstanceOf(Date);
  });

  it('should handle restocking without purchase price', async () => {
    // Create a medical item first
    const createdItems = await db.insert(medicalItemsTable)
      .values({
        name: testMedicalItem.name,
        category: testMedicalItem.category,
        unit: testMedicalItem.unit,
        current_stock: testMedicalItem.current_stock,
        minimum_threshold: testMedicalItem.minimum_threshold,
        purchase_price: testMedicalItem.purchase_price?.toString() || null,
        image_path: testMedicalItem.image_path
      })
      .returning()
      .execute();

    const createdItem = createdItems[0];

    // Restock without purchase price
    const restockInput = {
      item_id: createdItem.id,
      quantity: 25,
      purchase_price: null,
      notes: null
    };

    const result = await restockItem(restockInput);

    // Verify the result - purchase price should remain unchanged
    expect(result).not.toBeNull();
    expect(result!.current_stock).toEqual(35); // 10 + 25
    expect(result!.purchase_price).toEqual(12000); // Original price unchanged
  });

  it('should return null for non-existent item', async () => {
    const result = await restockItem({
      item_id: 999,
      quantity: 10,
      purchase_price: 5000,
      notes: 'Test'
    });

    expect(result).toBeNull();
  });
});
