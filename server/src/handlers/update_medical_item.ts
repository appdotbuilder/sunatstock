
import { db } from '../db';
import { medicalItemsTable } from '../db/schema';
import { type UpdateMedicalItemInput, type MedicalItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateMedicalItem(input: UpdateMedicalItemInput): Promise<MedicalItem | null> {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.category !== undefined) {
      updateData['category'] = input.category;
    }
    if (input.unit !== undefined) {
      updateData['unit'] = input.unit;
    }
    if (input.minimum_threshold !== undefined) {
      updateData['minimum_threshold'] = input.minimum_threshold;
    }
    if (input.purchase_price !== undefined) {
      updateData['purchase_price'] = input.purchase_price?.toString() ?? null;
    }
    if (input.image_path !== undefined) {
      updateData['image_path'] = input.image_path;
    }

    // Update the medical item
    const result = await db.update(medicalItemsTable)
      .set(updateData)
      .where(eq(medicalItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null
    };
  } catch (error) {
    console.error('Medical item update failed:', error);
    throw error;
  }
}
