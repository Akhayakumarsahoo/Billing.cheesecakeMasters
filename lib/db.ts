import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Decimal is available at runtime from @prisma/client but TypeScript types
// place it inside the Prisma namespace in this version of Prisma.
// Typed as `any` to stay compatible with Prisma's full decimal.js Decimal type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Decimal: { new(value: string | number): any } = (require('@prisma/client') as any).Decimal;
// Allow `Decimal` to be used as a type annotation
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Decimal = any;



