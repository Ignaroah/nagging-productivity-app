import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/jwt.service';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header provided' });
    return;
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const payload = verifyJWT(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}
