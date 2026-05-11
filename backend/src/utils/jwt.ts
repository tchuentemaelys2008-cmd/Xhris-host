import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'xhris_super_secret_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'xhris_refresh_secret';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '30d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export const generateTokens = (payload: Omit<JwtPayload, 'sessionId'>) => {
  const sessionId = uuidv4();
  const accessToken = jwt.sign({ ...payload, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);
  const refreshToken = jwt.sign({ userId: payload.userId, sessionId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as any);
  return { accessToken, refreshToken, sessionId };
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { userId: string; sessionId: string } => {
  return jwt.verify(token, REFRESH_SECRET) as any;
};

export const generateEmailToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'email_verify' }, JWT_SECRET, { expiresIn: '24h' } as any);
};

export const generatePasswordResetToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' } as any);
};

export const verifyEmailToken = (token: string): { userId: string; type: string } => {
  return jwt.verify(token, JWT_SECRET) as any;
};
