
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, circumcisionProceduresTable, procedureItemUsageTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getUsageReport } from '../handlers/get_usage_report';

describe('getUsageReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no procedures exist', async () => {
    const dateRange: DateRangeInput = {
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-12-31')
    };

    const result = await getUsageReport(dateRange);
    expect(result).toEqual([]);
  });

  it('should aggregate usage data for items within date range', async () => {
    // Create test medical items
    const items = await db.insert(medicalItemsTable)
      .values([
        {
          name: 'Surgical Scissors',
          category: 'alat',
          unit: 'pcs',
          current_stock: 10,
          minimum_threshold: 2,
          purchase_price: '50.00'
        },
        {
          name: 'Gauze',
          category: 'habis_pakai',
          unit: 'box',
          current_stock: 20,
          minimum_threshold: 5,
          purchase_price: '15.00'
        }
      ])
      .returning()
      .execute();

    // Create test procedures
    const procedures = await db.insert(circumcisionProceduresTable)
      .values([
        {
          patient_name: 'Patient A',
          procedure_date: new Date('2023-06-15'),
          notes: 'Procedure 1'
        },
        {
          patient_name: 'Patient B',
          procedure_date: new Date('2023-06-20'),
          notes: 'Procedure 2'
        },
        {
          patient_name: 'Patient C',
          procedure_date: new Date('2024-01-10'), // Outside date range
          notes: 'Procedure 3'
        }
      ])
      .returning()
      .execute();

    // Create procedure item usage records
    await db.insert(procedureItemUsageTable)
      .values([
        // Procedure 1 usage
        {
          procedure_id: procedures[0].id,
          item_id: items[0].id,
          quantity_used: 2
        },
        {
          procedure_id: procedures[0].id,
          item_id: items[1].id,
          quantity_used: 3
        },
        // Procedure 2 usage
        {
          procedure_id: procedures[1].id,
          item_id: items[0].id,
          quantity_used: 1
        },
        {
          procedure_id: procedures[1].id,
          item_id: items[1].id,
          quantity_used: 2
        },
        // Procedure 3 usage (outside date range)
        {
          procedure_id: procedures[2].id,
          item_id: items[0].id,
          quantity_used: 5
        }
      ])
      .execute();

    // Test usage report for 2023 date range
    const dateRange: DateRangeInput = {
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-12-31')
    };

    const result = await getUsageReport(dateRange);

    // Should aggregate usage for items within date range
    expect(result).toHaveLength(2);

    // Find results by item name for easier testing
    const scissorsResult = result.find(r => r.item_name === 'Surgical Scissors');
    const gauzeResult = result.find(r => r.item_name === 'Gauze');

    expect(scissorsResult).toBeDefined();
    expect(scissorsResult!.item_id).toEqual(items[0].id);
    expect(scissorsResult!.total_used).toEqual(3); // 2 + 1 from procedures 1 and 2
    expect(scissorsResult!.unit).toEqual('pcs');
    expect(scissorsResult!.category).toEqual('alat');

    expect(gauzeResult).toBeDefined();
    expect(gauzeResult!.item_id).toEqual(items[1].id);
    expect(gauzeResult!.total_used).toEqual(5); // 3 + 2 from procedures 1 and 2
    expect(gauzeResult!.unit).toEqual('box');
    expect(gauzeResult!.category).toEqual('habis_pakai');
  });

  it('should filter procedures by date range correctly', async () => {
    // Create test item
    const items = await db.insert(medicalItemsTable)
      .values([{
        name: 'Test Item',
        category: 'alat',
        unit: 'pcs',
        current_stock: 10,
        minimum_threshold: 2,
        purchase_price: '25.00'
      }])
      .returning()
      .execute();

    // Create procedures on different dates
    const procedures = await db.insert(circumcisionProceduresTable)
      .values([
        {
          patient_name: 'Patient Before',
          procedure_date: new Date('2023-05-31'), // Before range
          notes: 'Before range'
        },
        {
          patient_name: 'Patient In Range',
          procedure_date: new Date('2023-06-15'), // In range
          notes: 'In range'
        },
        {
          patient_name: 'Patient After',
          procedure_date: new Date('2023-07-01'), // After range
          notes: 'After range'
        }
      ])
      .returning()
      .execute();

    // Create usage for all procedures
    await db.insert(procedureItemUsageTable)
      .values([
        {
          procedure_id: procedures[0].id,
          item_id: items[0].id,
          quantity_used: 5
        },
        {
          procedure_id: procedures[1].id,
          item_id: items[0].id,
          quantity_used: 3
        },
        {
          procedure_id: procedures[2].id,
          item_id: items[0].id,
          quantity_used: 7
        }
      ])
      .execute();

    // Test with specific date range
    const dateRange: DateRangeInput = {
      start_date: new Date('2023-06-01'),
      end_date: new Date('2023-06-30')
    };

    const result = await getUsageReport(dateRange);

    // Should only include usage from procedure within date range
    expect(result).toHaveLength(1);
    expect(result[0].item_name).toEqual('Test Item');
    expect(result[0].total_used).toEqual(3); // Only from procedure in range
  });

  it('should handle items with no usage in date range', async () => {
    // Create test item but no procedures
    await db.insert(medicalItemsTable)
      .values([{
        name: 'Unused Item',
        category: 'alat',
        unit: 'pcs',
        current_stock: 10,
        minimum_threshold: 2,
        purchase_price: '25.00'
      }])
      .execute();

    const dateRange: DateRangeInput = {
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-12-31')
    };

    const result = await getUsageReport(dateRange);

    // Should return empty array as no procedures/usage exist
    expect(result).toEqual([]);
  });
});
