
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const users = await getUsers();

    expect(users).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        username: 'alice',
        email: 'alice@example.com',
        avatar_url: 'https://example.com/alice.jpg'
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        avatar_url: null
      },
      {
        username: 'charlie',
        email: 'charlie@example.com',
        avatar_url: 'https://example.com/charlie.jpg'
      }
    ];

    // Insert test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const users = await getUsers();

    expect(users).toHaveLength(3);
    
    // Check that all users are returned
    const usernames = users.map(u => u.username).sort();
    expect(usernames).toEqual(['alice', 'bob', 'charlie']);

    // Verify user properties
    users.forEach(user => {
      expect(user.id).toBeDefined();
      expect(typeof user.username).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    // Check specific user data
    const alice = users.find(u => u.username === 'alice');
    expect(alice?.email).toBe('alice@example.com');
    expect(alice?.avatar_url).toBe('https://example.com/alice.jpg');

    const bob = users.find(u => u.username === 'bob');
    expect(bob?.email).toBe('bob@example.com');
    expect(bob?.avatar_url).toBeNull();
  });

  it('should return users with correct field types', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: 'https://example.com/test.jpg'
      })
      .execute();

    const users = await getUsers();

    expect(users).toHaveLength(1);
    const user = users[0];

    // Verify all field types
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(user.avatar_url === null || typeof user.avatar_url === 'string').toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
    
    // Verify specific values
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.avatar_url).toBe('https://example.com/test.jpg');
  });
});
