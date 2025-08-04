
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/auth_login';

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async () => {
    // Store password as plain text for this simplified implementation
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'testpassword123',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should authenticate valid user credentials', async () => {
    const testUser = await createTestUser();
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'testpassword123'
    };

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.user.id).toEqual(testUser.id);
    expect(result!.user.username).toEqual('testuser');
    expect(result!.user.full_name).toEqual('Test User');
    expect(result!.user.created_at).toBeInstanceOf(Date);
    expect(result!.user.updated_at).toBeInstanceOf(Date);
    expect(result!.token).toBeDefined();
    expect(typeof result!.token).toBe('string');
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistentuser',
      password: 'anypassword'
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    await createTestUser();
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });

  it('should generate valid token', async () => {
    await createTestUser();
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'testpassword123'
    };

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.token).toBeDefined();

    // Verify token can be decoded
    const decoded = JSON.parse(
      Buffer.from(result!.token, 'base64').toString()
    );

    expect(decoded.userId).toEqual(result!.user.id);
    expect(decoded.username).toEqual('testuser');
    expect(decoded.exp).toBeDefined(); // Token should have expiration
    expect(decoded.exp).toBeGreaterThan(Date.now()); // Should not be expired
  });

  it('should handle case-sensitive username', async () => {
    await createTestUser();
    const loginInput: LoginInput = {
      username: 'TestUser', // Different case
      password: 'testpassword123'
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull(); // Should fail due to case sensitivity
  });

  it('should handle empty password', async () => {
    await createTestUser();
    const loginInput: LoginInput = {
      username: 'testuser',
      password: ''
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });
});
