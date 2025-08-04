
import { db } from '../db';
import { circumcisionProceduresTable } from '../db/schema';
import { type CircumcisionProcedure, type DateRangeInput } from '../schema';
import { gte, lte, and, type SQL } from 'drizzle-orm';

export async function getProcedures(dateRange?: DateRangeInput): Promise<CircumcisionProcedure[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    if (dateRange) {
      conditions.push(gte(circumcisionProceduresTable.procedure_date, dateRange.start_date));
      conditions.push(lte(circumcisionProceduresTable.procedure_date, dateRange.end_date));
    }

    // Build and execute query
    const baseQuery = db.select()
      .from(circumcisionProceduresTable);

    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await query
      .orderBy(circumcisionProceduresTable.procedure_date)
      .execute();

    // Convert to proper schema format
    return results.map(procedure => ({
      id: procedure.id,
      patient_name: procedure.patient_name,
      procedure_date: procedure.procedure_date,
      notes: procedure.notes,
      created_at: procedure.created_at
    }));

  } catch (error) {
    console.error('Failed to fetch procedures:', error);
    throw error;
  }
}
