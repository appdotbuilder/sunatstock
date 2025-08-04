
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, circumcisionProceduresTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(0);
    expect(stats.critical_items).toEqual(0);
    expect(stats.procedures_today).toEqual(0);
    expect(stats.total_procedures_this_month).toEqual(0);
  });

  it('should count total items correctly', async () => {
    // Create test items
    await db.insert(medicalItemsTable).values([
      {
        name: 'Item 1',
        category: 'alat',
        unit: 'pcs',
        current_stock: 50,
        minimum_threshold: 10
      },
      {
        name: 'Item 2',
        category: 'obat',
        unit: 'box',
        current_stock: 25,
        minimum_threshold: 5
      },
      {
        name: 'Item 3',
        category: 'habis_pakai',
        unit: 'tube',
        current_stock: 5,
        minimum_threshold: 10
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(3);
  });

  it('should count critical items correctly', async () => {
    // Create items with different stock levels
    await db.insert(medicalItemsTable).values([
      {
        name: 'Normal Stock',
        category: 'alat',
        unit: 'pcs',
        current_stock: 50,
        minimum_threshold: 10
      },
      {
        name: 'Critical Stock 1',
        category: 'obat',
        unit: 'box',
        current_stock: 5,
        minimum_threshold: 10
      },
      {
        name: 'Critical Stock 2',
        category: 'habis_pakai',
        unit: 'tube',
        current_stock: 3,
        minimum_threshold: 5
      },
      {
        name: 'Equal Stock',
        category: 'alat',
        unit: 'pcs',
        current_stock: 10,
        minimum_threshold: 10
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(4);
    expect(stats.critical_items).toEqual(3); // Items with stock <= threshold
  });

  it('should count procedures today correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create procedures on different dates
    await db.insert(circumcisionProceduresTable).values([
      {
        patient_name: 'Patient 1',
        procedure_date: today,
        notes: 'Today procedure 1'
      },
      {
        patient_name: 'Patient 2',
        procedure_date: today,
        notes: 'Today procedure 2'
      },
      {
        patient_name: 'Patient 3',
        procedure_date: yesterday,
        notes: 'Yesterday procedure'
      },
      {
        patient_name: 'Patient 4',
        procedure_date: tomorrow,
        notes: 'Tomorrow procedure'
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.procedures_today).toEqual(2);
  });

  it('should count procedures this month correctly', async () => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 15);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);

    // Create procedures in different months
    await db.insert(circumcisionProceduresTable).values([
      {
        patient_name: 'Patient 1',
        procedure_date: thisMonth,
        notes: 'This month procedure 1'
      },
      {
        patient_name: 'Patient 2',
        procedure_date: today,
        notes: 'This month procedure 2'
      },
      {
        patient_name: 'Patient 3',
        procedure_date: lastMonth,
        notes: 'Last month procedure'
      },
      {
        patient_name: 'Patient 4',
        procedure_date: nextMonth,
        notes: 'Next month procedure'
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_procedures_this_month).toEqual(2);
  });

  it('should return complete dashboard stats with mixed data', async () => {
    // Create medical items
    await db.insert(medicalItemsTable).values([
      {
        name: 'Normal Item',
        category: 'alat',
        unit: 'pcs',
        current_stock: 100,
        minimum_threshold: 20
      },
      {
        name: 'Critical Item',
        category: 'obat',
        unit: 'box',
        current_stock: 5,
        minimum_threshold: 15
      }
    ]).execute();

    // Create procedures
    const today = new Date();
    await db.insert(circumcisionProceduresTable).values([
      {
        patient_name: 'Patient Today',
        procedure_date: today,
        notes: 'Today procedure'
      },
      {
        patient_name: 'Patient This Month',
        procedure_date: new Date(today.getFullYear(), today.getMonth(), 10),
        notes: 'This month procedure'
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_items).toEqual(2);
    expect(stats.critical_items).toEqual(1);
    expect(stats.procedures_today).toEqual(1);
    expect(stats.total_procedures_this_month).toEqual(2);
  });
});
