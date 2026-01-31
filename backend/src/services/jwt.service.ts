import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload, User } from '../types';

export function generateJWT(user: User): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
