import { Prisma } from '@prisma/client';

const TRANSIENT_CODES = new Set(['P1001', 'P1017', 'P2024']);

function isTransientDbError(err: any): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return TRANSIENT_CODES.has(err.code);
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const msg: string = err?.message ?? '';
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|Can't reach database/i.test(msg);
}

export async function withDbRetry<T>(fn: () => Promise<T>, label = 'db'): Promise<T> {
  const delays = [1000, 3000, 5000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isTransientDbError(err) && attempt < delays.length) {
        console.warn(`[DB] Transient error on ${label}, retrying in ${delays[attempt] / 1000}s...`);
        await new Promise(r => setTimeout(r, delays[attempt]));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[DB] Max retries exceeded for ${label}`);
}
