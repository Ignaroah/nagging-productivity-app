import { db } from '../config/database';
import { User } from '../types';

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    try {
      const user = await db.oneOrNone<User>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      const user = await db.oneOrNone<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      return user;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await db.oneOrNone<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(data: {
    googleId: string;
    email: string;
    name: string;
    pictureUrl?: string;
  }): Promise<User> {
    try {
      const user = await db.one<User>(
        `INSERT INTO users (google_id, email, name, picture_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [data.googleId, data.email, data.name, data.pictureUrl || null]
      );
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id: string, data: Partial<User>): Promise<User> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.pictureUrl !== undefined) {
      fields.push(`picture_url = $${paramIndex++}`);
      values.push(data.pictureUrl);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const user = await db.one<User>(query, values);
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async setApiKey(userId: string, encryptedApiKey: string): Promise<void> {
    try {
      await db.none(
        'UPDATE users SET anthropic_api_key = $1, updated_at = NOW() WHERE id = $2',
        [encryptedApiKey, userId]
      );
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  }

  static async getApiKey(userId: string): Promise<string | null> {
    try {
      const result = await db.oneOrNone<{ anthropic_api_key: string }>(
        'SELECT anthropic_api_key FROM users WHERE id = $1',
        [userId]
      );
      return result?.anthropic_api_key || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      throw error;
    }
  }
}
