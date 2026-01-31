import pgPromise from 'pg-promise';
import { env } from './env';

const pgp = pgPromise({
  // Initialization options
  error(error, e) {
    console.error('Database error:', error);
  }
});

// Create database connection
export const db = pgp(env.DATABASE_URL);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.one('SELECT 1 as test');
    console.log('✓ Database connection established');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Helper to run migrations
export async function runMigrations(): Promise<void> {
  // For MVP, we'll run migrations manually
  // In production, use a proper migration tool like node-pg-migrate
  console.log('Run migrations manually using psql or a migration tool');
}
