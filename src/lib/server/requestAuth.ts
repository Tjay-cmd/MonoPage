import type { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

export class UnauthorizedError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function verifyRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Authorization bearer token.');
  }

  const idToken = authHeader.slice('Bearer '.length).trim();

  if (!idToken) {
    throw new UnauthorizedError('Invalid Authorization header format.');
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      token: decodedToken,
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      idToken,
    };
  } catch (error) {
    console.error('[auth] Failed to verify ID token.', error);
    throw new UnauthorizedError('Unauthorized: Invalid token.');
  }
}

