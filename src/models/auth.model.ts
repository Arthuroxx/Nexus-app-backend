import type { Request } from 'express';

/** Codigo de error que el frontend usa para detectar que la cuenta ya existe. */
export const GOOGLE_USER_EXISTS = 'GOOGLE_USER_EXISTS';

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name?: string;
}
