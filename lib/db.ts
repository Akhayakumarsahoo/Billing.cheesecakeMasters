import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || "";

  if (dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma://")) {
    // High-performance Prisma Accelerate edge proxy connection
    return new PrismaClient({
      accelerateUrl: dbUrl,
      log: ["error"],
    }).$extends(withAccelerate());
  } else {
    // Fallback for direct PostgreSQL connections
    const pool = new Pool({
      connectionString: dbUrl,
      max: 10,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ["error"] }).$extends(withAccelerate());
  }
}

export type ExtendedPrismaClient = PrismaClient & Record<string, any>;
const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma: ExtendedPrismaClient = (globalForPrisma.prisma ?? createPrismaClient()) as unknown as ExtendedPrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Decimal is available directly from the Prisma namespace
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
