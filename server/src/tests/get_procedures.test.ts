
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { circumcisionProceduresTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getProcedures } from '../handlers/get_procedures';

describe('getProcedures', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestProcedure = async (procedureDate: Date, patientName?: string) => {
    const result = await db.insert(circumcisionProceduresTable)
      .values({
        patient_name: patientName || null,
        procedure_date: procedureDate,
        notes: 'Test procedure notes'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should return all procedures when no date range provided', async () => {
    // Create test procedures
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    await createTestProcedure(today, 'John Doe');
    await createTestProcedure(yesterday, 'Jane Smith');

    const result = await getProcedures();

    expect(result).toHaveLength(2);
    expect(result[0].patient_name).toEqual('Jane Smith');
    expect(result[1].patient_name).toEqual('John Doe');
    expect(result[0].procedure_date).toBeInstanceOf(Date);
    expect(result[1].procedure_date).toBeInstanceOf(Date);
  });

  it('should filter procedures by date range', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create procedures across different dates
    await createTestProcedure(today, 'Patient Today');
    await createTestProcedure(yesterday, 'Patient Yesterday');
    await createTestProcedure(twoDaysAgo, 'Patient Two Days Ago');

    // Filter for yesterday to today
    const dateRange: DateRangeInput = {
      start_date: yesterday,
      end_date: today
    };

    const result = await getProcedures(dateRange);

    expect(result).toHaveLength(2);
    expect(result.map(p => p.patient_name)).toContain('Patient Today');
    expect(result.map(p => p.patient_name)).toContain('Patient Yesterday');
    expect(result.map(p => p.patient_name)).not.toContain('Patient Two Days Ago');
  });

  it('should return empty array when no procedures match date range', async () => {
    const today = new Date();
    await createTestProcedure(today, 'Test Patient');

    // Query for tomorrow's date range
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const dateRange: DateRangeInput = {
      start_date: tomorrow,
      end_date: dayAfterTomorrow
    };

    const result = await getProcedures(dateRange);

    expect(result).toHaveLength(0);
  });

  it('should handle procedures with null patient names', async () => {
    const today = new Date();
    await createTestProcedure(today); // No patient name provided

    const result = await getProcedures();

    expect(result).toHaveLength(1);
    expect(result[0].patient_name).toBeNull();
    expect(result[0].procedure_date).toBeInstanceOf(Date);
    expect(result[0].notes).toEqual('Test procedure notes');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return procedures ordered by procedure date', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create in random order
    await createTestProcedure(today, 'Latest');
    await createTestProcedure(twoDaysAgo, 'Oldest');
    await createTestProcedure(yesterday, 'Middle');

    const result = await getProcedures();

    expect(result).toHaveLength(3);
    expect(result[0].patient_name).toEqual('Oldest');
    expect(result[1].patient_name).toEqual('Middle');
    expect(result[2].patient_name).toEqual('Latest');
    
    // Verify dates are in ascending order
    expect(result[0].procedure_date <= result[1].procedure_date).toBe(true);
    expect(result[1].procedure_date <= result[2].procedure_date).toBe(true);
  });
});
