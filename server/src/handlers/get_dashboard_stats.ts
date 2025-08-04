
import { db } from '../db';
import { medicalItemsTable, circumcisionProceduresTable } from '../db/schema';
import { count, sql, gte, lte, and } from 'drizzle-orm';

interface DashboardStats {
  total_items: number;
  critical_items: number;
  procedures_today: number;
  total_procedures_this_month: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total items count
    const totalItemsResult = await db.select({ count: count() })
      .from(medicalItemsTable)
      .execute();
    
    const total_items = totalItemsResult[0]?.count || 0;

    // Get critical items count (current_stock <= minimum_threshold)
    const criticalItemsResult = await db.select({ count: count() })
      .from(medicalItemsTable)
      .where(sql`current_stock <= minimum_threshold`)
      .execute();
    
    const critical_items = criticalItemsResult[0]?.count || 0;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    // Get procedures today
    const proceduresTodayResult = await db.select({ count: count() })
      .from(circumcisionProceduresTable)
      .where(
        and(
          gte(circumcisionProceduresTable.procedure_date, today),
          lte(circumcisionProceduresTable.procedure_date, tomorrow)
        )
      )
      .execute();
    
    const procedures_today = proceduresTodayResult[0]?.count || 0;

    // Get this month's date range
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Get procedures this month
    const proceduresThisMonthResult = await db.select({ count: count() })
      .from(circumcisionProceduresTable)
      .where(
        and(
          gte(circumcisionProceduresTable.procedure_date, firstDayOfMonth),
          lte(circumcisionProceduresTable.procedure_date, firstDayOfNextMonth)
        )
      )
      .execute();
    
    const total_procedures_this_month = proceduresThisMonthResult[0]?.count || 0;

    return {
      total_items,
      critical_items,
      procedures_today,
      total_procedures_this_month
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}
