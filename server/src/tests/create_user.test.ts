
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create user with null avatar_url', async () => {
    const inputWithNullAvatar: CreateUserInput = {
      username: 'nulluser',
      email: 'null@example.com',
      avatar_url: null
    };

    const result = await createUser(inputWithNullAvatar);

    expect(result.username).toEqual('nulluser');
    expect(result.email).toEqual('null@example.com');
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      avatar_url: null
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/username already exists/i);
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      avatar_url: null
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/email already exists/i);
  });

  it('should allow different users with unique credentials', async () => {
    // Create first user
    const firstUser = await createUser(testInput);

    // Create second user with different credentials
    const secondInput: CreateUserInput = {
      username: 'seconduser',
      email: 'second@example.com',
      avatar_url: 'https://example.com/avatar2.jpg'
    };

    const secondUser = await createUser(secondInput);

    // Both users should exist and be different
    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.username).not.toEqual(secondUser.username);
    expect(firstUser.email).not.toEqual(secondUser.email);

    // Verify both are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});
