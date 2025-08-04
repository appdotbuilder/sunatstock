
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable } from '../db/schema';
import { type UpdateMedicalItemInput, type CreateMedicalItemInput } from '../schema';
import { updateMedicalItem } from '../handlers/update_medical_item';
import { eq } from 'drizzle-orm';

// Helper function to create a test medical item
const createTestItem = async (): Promise<number> => {
  const testItem: CreateMedicalItemInput = {
    name: 'Test Item',
    category: 'alat',
    unit: 'pcs',
    current_stock: 50,
    minimum_threshold: 10,
    purchase_price: 25.50,
    image_path: null
  };

  const result = await db.insert(medicalItemsTable)
    .values({
      ...testItem,
      purchase_price: testItem.purchase_price?.toString() ?? null
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateMedicalItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a medical item', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateMedicalItemInput = {
      id: itemId,
      name: 'Updated Test Item',
      category: 'obat',
      unit: 'box',
      minimum_threshold: 20,
      purchase_price: 35.75,
      image_path: '/images/updated-item.jpg'
    };

    const result = await updateMedicalItem(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(itemId);
    expect(result!.name).toEqual('Updated Test Item');
    expect(result!.category).toEqual('obat');
    expect(result!.unit).toEqual('box');
    expect(result!.minimum_threshold).toEqual(20);
    expect(result!.purchase_price).toEqual(35.75);
    expect(result!.image_path).toEqual('/images/updated-item.jpg');
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(typeof result!.purchase_price).toBe('number');
  });

  it('should update only specified fields', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateMedicalItemInput = {
      id: itemId,
      name: 'Partially Updated Item',
      minimum_threshold: 15
    };

    const result = await updateMedicalItem(updateInput);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Partially Updated Item');
    expect(result!.minimum_threshold).toEqual(15);
    // Other fields should remain unchanged
    expect(result!.category).toEqual('alat');
    expect(result!.unit).toEqual('pcs');
    expect(result!.current_stock).toEqual(50);
    expect(result!.purchase_price).toEqual(25.50);
  });

  it('should handle null purchase_price update', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateMedicalItemInput = {
      id: itemId,
      purchase_price: null
    };

    const result = await updateMedicalItem(updateInput);

    expect(result).toBeDefined();
    expect(result!.purchase_price).toBeNull();
  });

  it('should save updated item to database', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateMedicalItemInput = {
      id: itemId,
      name: 'Database Updated Item',
      category: 'habis_pakai',
      purchase_price: 42.99
    };

    await updateMedicalItem(updateInput);

    const items = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Database Updated Item');
    expect(items[0].category).toEqual('habis_pakai');
    expect(parseFloat(items[0].purchase_price!)).toEqual(42.99);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent item', async () => {
    const updateInput: UpdateMedicalItemInput = {
      id: 999999, // Non-existent ID
      name: 'Non-existent Item'
    };

    const result = await updateMedicalItem(updateInput);

    expect(result).toBeNull();
  });

  it('should update updated_at timestamp', async () => {
    const itemId = await createTestItem();

    // Get original timestamp
    const originalItem = await db.select()
      .from(medicalItemsTable)
      .where(eq(medicalItemsTable.id, itemId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateMedicalItemInput = {
      id: itemId,
      name: 'Timestamp Test Item'
    };

    const result = await updateMedicalItem(updateInput);

    expect(result).toBeDefined();
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalItem[0].updated_at.getTime());
  });
});
