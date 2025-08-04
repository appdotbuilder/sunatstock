
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalItemsTable, circumcisionProceduresTable, procedureItemUsageTable, stockTransactionsTable } from '../db/schema';
import { type CreateProcedureInput } from '../schema';
import { createProcedure } from '../handlers/create_procedure';
import { eq } from 'drizzle-orm';

// Test data
const testMedicalItem1 = {
  name: 'Surgical Scissors',
  category: 'alat' as const,
  unit: 'pcs',
  current_stock: 10,
  minimum_threshold: 2,
  purchase_price: '25000.00', // Convert to string for numeric column
  image_path: null
};

const testMedicalItem2 = {
  name: 'Anesthetic Gel',
  category: 'obat' as const,
  unit: 'tube',
  current_stock: 5,
  minimum_threshold: 1,
  purchase_price: '15000.00', // Convert to string for numeric column
  image_path: null
};

describe('createProcedure', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a procedure with item usage', async () => {
    // Create test medical items
    const item1Result = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();
    
    const item2Result = await db.insert(medicalItemsTable)
      .values(testMedicalItem2)
      .returning()
      .execute();

    const item1 = item1Result[0];
    const item2 = item2Result[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'John Doe',
      procedure_date: new Date('2024-01-15'),
      notes: 'Standard circumcision procedure',
      items_used: [
        { item_id: item1.id, quantity_used: 1 },
        { item_id: item2.id, quantity_used: 2 }
      ]
    };

    const result = await createProcedure(testInput);

    // Verify procedure creation
    expect(result.patient_name).toEqual('John Doe');
    expect(result.procedure_date).toEqual(new Date('2024-01-15'));
    expect(result.notes).toEqual('Standard circumcision procedure');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save procedure to database', async () => {
    // Create test medical item
    const itemResult = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();

    const item = itemResult[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'Jane Smith',
      procedure_date: new Date('2024-01-16'),
      notes: null,
      items_used: [
        { item_id: item.id, quantity_used: 1 }
      ]
    };

    const result = await createProcedure(testInput);

    // Verify procedure in database
    const procedures = await db.select()
      .from(circumcisionProceduresTable)
      .where(eq(circumcisionProceduresTable.id, result.id))
      .execute();

    expect(procedures).toHaveLength(1);
    expect(procedures[0].patient_name).toEqual('Jane Smith');
    expect(procedures[0].procedure_date).toEqual(new Date('2024-01-16'));
    expect(procedures[0].notes).toBeNull();
  });

  it('should update item stock levels', async () => {
    // Create test medical items
    const item1Result = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();

    const item2Result = await db.insert(medicalItemsTable)
      .values(testMedicalItem2)
      .returning()
      .execute();

    const item1 = item1Result[0];
    const item2 = item2Result[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'Test Patient',
      procedure_date: new Date('2024-01-15'),
      notes: null,
      items_used: [
        { item_id: item1.id, quantity_used: 3 },
        { item_id: item2.id, quantity_used: 1 }
      ]
    };

    await createProcedure(testInput);

    // Check updated stock levels
    const updatedItems = await db.select()
      .from(medicalItemsTable)
      .execute();

    const updatedItem1 = updatedItems.find(item => item.id === item1.id);
    const updatedItem2 = updatedItems.find(item => item.id === item2.id);

    expect(updatedItem1?.current_stock).toEqual(7); // 10 - 3
    expect(updatedItem2?.current_stock).toEqual(4); // 5 - 1
  });

  it('should create procedure item usage records', async () => {
    // Create test medical item
    const itemResult = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();

    const item = itemResult[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'Test Patient',
      procedure_date: new Date('2024-01-15'),
      notes: null,
      items_used: [
        { item_id: item.id, quantity_used: 2 }
      ]
    };

    const result = await createProcedure(testInput);

    // Check procedure item usage records
    const usageRecords = await db.select()
      .from(procedureItemUsageTable)
      .where(eq(procedureItemUsageTable.procedure_id, result.id))
      .execute();

    expect(usageRecords).toHaveLength(1);
    expect(usageRecords[0].item_id).toEqual(item.id);
    expect(usageRecords[0].quantity_used).toEqual(2);
    expect(usageRecords[0].created_at).toBeInstanceOf(Date);
  });

  it('should create stock transaction records', async () => {
    // Create test medical item
    const itemResult = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();

    const item = itemResult[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'Test Patient',
      procedure_date: new Date('2024-01-15'),
      notes: null,
      items_used: [
        { item_id: item.id, quantity_used: 3 }
      ]
    };

    await createProcedure(testInput);

    // Check stock transaction records
    const transactions = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, item.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_type).toEqual('usage');
    expect(transactions[0].quantity).toEqual(-3); // Negative for usage
    expect(transactions[0].remaining_stock).toEqual(7); // 10 - 3
    expect(transactions[0].notes).toMatch(/Used in procedure for patient: Test Patient/);
    expect(transactions[0].transaction_date).toEqual(new Date('2024-01-15'));
  });

  it('should throw error for non-existent item', async () => {
    const testInput: CreateProcedureInput = {
      patient_name: 'Test Patient',
      procedure_date: new Date('2024-01-15'),
      notes: null,
      items_used: [
        { item_id: 999, quantity_used: 1 } // Non-existent item
      ]
    };

    expect(createProcedure(testInput)).rejects.toThrow(/Medical item with ID 999 not found/);
  });

  it('should throw error for insufficient stock', async () => {
    // Create test medical item with low stock
    const itemResult = await db.insert(medicalItemsTable)
      .values({
        ...testMedicalItem1,
        current_stock: 2 // Only 2 in stock
      })
      .returning()
      .execute();

    const item = itemResult[0];

    const testInput: CreateProcedureInput = {
      patient_name: 'Test Patient',
      procedure_date: new Date('2024-01-15'),
      notes: null,
      items_used: [
        { item_id: item.id, quantity_used: 5 } // Trying to use 5 when only 2 available
      ]
    };

    expect(createProcedure(testInput)).rejects.toThrow(/Insufficient stock for item/);
  });

  it('should handle procedure with null patient name', async () => {
    // Create test medical item
    const itemResult = await db.insert(medicalItemsTable)
      .values(testMedicalItem1)
      .returning()
      .execute();

    const item = itemResult[0];

    const testInput: CreateProcedureInput = {
      patient_name: null,
      procedure_date: new Date('2024-01-15'),
      notes: 'Anonymous procedure',
      items_used: [
        { item_id: item.id, quantity_used: 1 }
      ]
    };

    const result = await createProcedure(testInput);

    expect(result.patient_name).toBeNull();
    expect(result.notes).toEqual('Anonymous procedure');

    // Check that stock transaction still has proper notes
    const transactions = await db.select()
      .from(stockTransactionsTable)
      .where(eq(stockTransactionsTable.item_id, item.id))
      .execute();

    expect(transactions[0].notes).toMatch(/Used in procedure for patient: Unknown/);
  });
});
