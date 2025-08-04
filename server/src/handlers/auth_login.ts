
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string } | null> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // For now, do simple password comparison (in production, use bcrypt)
    // This is a simplified implementation without external dependencies
    if (input.password !== user.password_hash) {
      return null; // Invalid password
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        username: user.username,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      })
    ).toString('base64');

    // Return user data
    const userResponse: User = {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      full_name: user.full_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
