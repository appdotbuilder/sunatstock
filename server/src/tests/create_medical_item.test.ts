
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, stockTransactionsTable } from '../db/schema';
import { type CreateMedicalItemInput } from '../schema';
import { createMedicalItem } from '../handlers/create_medical_item';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateMedicalItemInput = {
  name: 'Test Medical Item',
  category: 'alat',
  unit: 'pcs',
  current_stock: 50,
  minimum_threshold: 10,
  purchase_price: 25000.50,
  image_path: '/images/test-item.jpg'
};

const testInputWithoutPrice: CreateMedicalItemInput = {
  name: 'Free Medical Item',
  category: 'habis_pakai',
  unit: 'bungkus',
  current_stock: 0,
  minimum_threshold: 5,
  purchase_price: null,
  image_path: null
};

describe('createMedicalItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medical item with all fields', async () => {
    const result = await createMedicalItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Medical Item');
    expect(result.category).toEqual('alat');
    expect(result.unit).toEqual('pcs');
    expect(result.current_stock).toEqual(50);
    expect(result.minimum_threshold).toEqual(10);
    expect(result.purchase_price).toEqual(25000.50);
    expect(result.image_path).toEqual('/images/test-item.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a medical item with null optional fields', async () => {
    const result = await createMedicalItem(testInputWithoutPrice);

    expect(result.name).toEqual('Free Medical Item');
    expect(result.category).toEqual('habis_pakai');
    expect(result.unit).toEqual('bungkus');
    expect(result.current_stock).toEqual(0);
    expect(result.minimum_threshold).toEqual(5);
    expect(result.purchase_price).toBeNull();
    expect(result.image_path).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save medical item to database', async () => {
    const result = await createMedicalItem(testInput);

    const items = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Test Medical Item');
    expect(items[0].category).toEqual('alat');
    expect(items[0].unit).toEqual('pcs');
    expect(items[0].current_stock).toEqual(50);
    expect(items[0].minimum_threshold).toEqual(10);
    expect(parseFloat(items[0].purchase_price!)).toEqual(25000.50);
    expect(items[0].image_path).toEqual('/images/test-item.jpg');
    expect(items[0].created_at).toBeInstanceOf(Date);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create initial stock transaction when current_stock > 0', async () => {
    const result = await createMedicalItem(testInput);

    const transactions = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_type).toEqual('adjustment');
    expect(transactions[0].quantity).toEqual(50);
    expect(transactions[0].remaining_stock).toEqual(50);
    expect(transactions[0].notes).toEqual('Initial stock entry');
    expect(transactions[0].transaction_date).toBeInstanceOf(Date);
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should not create stock transaction when current_stock is 0', async () => {
    const result = await createMedicalItem(testInputWithoutPrice);

    const transactions = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, result.id))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should handle different categories correctly', async () => {
    const obatInput: CreateMedicalItemInput = {
      name: 'Test Obat',
      category: 'obat',
      unit: 'tube',
      current_stock: 25,
      minimum_threshold: 5,
      purchase_price: 15000,
      image_path: null
    };

    const result = await createMedicalItem(obatInput);

    expect(result.category).toEqual('obat');
    expect(result.unit).toEqual('tube');
    expect(result.current_stock).toEqual(25);
    expect(result.purchase_price).toEqual(15000);
  });

  it('should convert numeric price correctly', async () => {
    const result = await createMedicalItem(testInput);

    // Verify the returned price is a number
    expect(typeof result.purchase_price).toBe('number');
    expect(result.purchase_price).toEqual(25000.50);

    // Verify it's stored correctly in the database
    const dbItem = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, result.id))
      .execute();

    expect(typeof dbItem[0].purchase_price).toBe('string');
    expect(parseFloat(dbItem[0].purchase_price!)).toEqual(25000.50);
  });
});
