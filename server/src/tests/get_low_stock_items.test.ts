
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable } from '../db/schema';
import { type CreateMedicalItemInput } from '../schema';
import { getLowStockItems } from '../handlers/get_low_stock_items';

describe('getLowStockItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return items where current stock is below minimum threshold', async () => {
    // Create test items - one with low stock, one with adequate stock
    const lowStockItem: CreateMedicalItemInput = {
      name: 'Low Stock Item',
      category: 'obat',
      unit: 'pcs',
      current_stock: 5,
      minimum_threshold: 10,
      purchase_price: 15.50,
      image_path: null
    };

    const adequateStockItem: CreateMedicalItemInput = {
      name: 'Adequate Stock Item',
      category: 'alat',
      unit: 'box',
      current_stock: 20,
      minimum_threshold: 10,
      purchase_price: 25.00,
      image_path: null
    };

    await db.insert(medicalItemsTable)
      .values([
        {
          ...lowStockItem,
          purchase_price: lowStockItem.purchase_price?.toString()
        },
        {
          ...adequateStockItem,
          purchase_price: adequateStockItem.purchase_price?.toString()
        }
      ])
      .execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Low Stock Item');
    expect(result[0].current_stock).toEqual(5);
    expect(result[0].minimum_threshold).toEqual(10);
    expect(result[0].purchase_price).toEqual(15.50);
    expect(typeof result[0].purchase_price).toEqual('number');
  });

  it('should return items with zero stock regardless of threshold', async () => {
    const zeroStockItem: CreateMedicalItemInput = {
      name: 'Zero Stock Item',
      category: 'habis_pakai',
      unit: 'tube',
      current_stock: 0,
      minimum_threshold: 5,
      purchase_price: null,
      image_path: null
    };

    await db.insert(medicalItemsTable)
      .values({
        ...zeroStockItem,
        purchase_price: null
      })
      .execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Zero Stock Item');
    expect(result[0].current_stock).toEqual(0);
    expect(result[0].purchase_price).toBeNull();
  });

  it('should return items where current stock equals minimum threshold', async () => {
    const equalThresholdItem: CreateMedicalItemInput = {
      name: 'Equal Threshold Item',
      category: 'alat',
      unit: 'pcs',
      current_stock: 10,
      minimum_threshold: 10,
      purchase_price: 12.75,
      image_path: null
    };

    await db.insert(medicalItemsTable)
      .values({
        ...equalThresholdItem,
        purchase_price: equalThresholdItem.purchase_price?.toString()
      })
      .execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Equal Threshold Item');
    expect(result[0].current_stock).toEqual(10);
    expect(result[0].minimum_threshold).toEqual(10);
    expect(result[0].purchase_price).toEqual(12.75);
  });

  it('should return empty array when all items have adequate stock', async () => {
    const adequateStockItem: CreateMedicalItemInput = {
      name: 'Adequate Stock Item',
      category: 'obat',
      unit: 'bungkus',
      current_stock: 25,
      minimum_threshold: 10,
      purchase_price: 8.99,
      image_path: null
    };

    await db.insert(medicalItemsTable)
      .values({
        ...adequateStockItem,
        purchase_price: adequateStockItem.purchase_price?.toString()
      })
      .execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(0);
  });

  it('should handle multiple low stock items correctly', async () => {
    const lowStockItems: CreateMedicalItemInput[] = [
      {
        name: 'Low Stock Item 1',
        category: 'alat',
        unit: 'pcs',
        current_stock: 2,
        minimum_threshold: 5,
        purchase_price: 10.00,
        image_path: null
      },
      {
        name: 'Low Stock Item 2',
        category: 'obat',
        unit: 'box',
        current_stock: 0,
        minimum_threshold: 3,
        purchase_price: null,
        image_path: null
      },
      {
        name: 'Adequate Stock Item',
        category: 'habis_pakai',
        unit: 'tube',
        current_stock: 15,
        minimum_threshold: 8,
        purchase_price: 5.50,
        image_path: null
      }
    ];

    await db.insert(medicalItemsTable)
      .values(lowStockItems.map(item => ({
        ...item,
        purchase_price: item.purchase_price?.toString() || null
      })))
      .execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(2);
    
    const resultNames = result.map(item => item.name).sort();
    expect(resultNames).toEqual(['Low Stock Item 1', 'Low Stock Item 2']);
    
    // Verify numeric conversion for items with purchase_price
    const item1 = result.find(item => item.name === 'Low Stock Item 1');
    expect(item1?.purchase_price).toEqual(10.00);
    expect(typeof item1?.purchase_price).toEqual('number');
    
    const item2 = result.find(item => item.name === 'Low Stock Item 2');
    expect(item2?.purchase_price).toBeNull();
  });
});
