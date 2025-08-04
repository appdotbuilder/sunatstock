
import { db } from '../db';
import { medicalItemsTable, procedureItemUsageTable, circumcisionProceduresTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { eq, gte, lte, and, sum } from 'drizzle-orm';

interface UsageReportItem {
  item_id: number;
  item_name: string;
  total_used: number;
  unit: string;
  category: string;
}

export async function getUsageReport(dateRange: DateRangeInput): Promise<UsageReportItem[]> {
  try {
    // Build query to aggregate usage data within date range
    const results = await db
      .select({
        item_id: medicalItemsTable.id,
        item_name: medicalItemsTable.name,
        total_used: sum(procedureItemUsageTable.quantity_used),
        unit: medicalItemsTable.unit,
        category: medicalItemsTable.category,
      })
      .from(procedureItemUsageTable)
      .innerJoin(
        medicalItemsTable,
        eq(procedureItemUsageTable.item_id, medicalItemsTable.id)
      )
      .innerJoin(
        circumcisionProceduresTable,
        eq(procedureItemUsageTable.procedure_id, circumcisionProceduresTable.id)
      )
      .where(
        and(
          gte(circumcisionProceduresTable.procedure_date, dateRange.start_date),
          lte(circumcisionProceduresTable.procedure_date, dateRange.end_date)
        )
      )
      .groupBy(
        medicalItemsTable.id,
        medicalItemsTable.name,
        medicalItemsTable.unit,
        medicalItemsTable.category
      )
      .execute();

    // Convert aggregated total_used from string to number (sum returns string)
    return results.map(result => ({
      item_id: result.item_id,
      item_name: result.item_name,
      total_used: parseInt(result.total_used || '0'),
      unit: result.unit,
      category: result.category,
    }));
  } catch (error) {
    console.error('Usage report generation failed:', error);
    throw error;
  }
}
