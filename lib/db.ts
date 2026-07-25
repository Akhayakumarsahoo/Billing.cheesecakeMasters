import { PrismaClient, Prisma } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  (new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
    log: ["error"],
  }).$extends(withAccelerate()) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Decimal is available directly from the Prisma namespace
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
