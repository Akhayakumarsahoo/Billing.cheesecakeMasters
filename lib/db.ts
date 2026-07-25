import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || "";

  if (dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma://")) {
    // High-performance Prisma Accelerate edge proxy connection
    return new PrismaClient({
      accelerateUrl: dbUrl,
      log: ["error"],
    }).$extends(withAccelerate()) as unknown as PrismaClient;
  } else {
    // Fallback for direct PostgreSQL connections
    const pool = new Pool({
      connectionString: dbUrl,
      max: 10,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ["error"] });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Decimal is available directly from the Prisma namespace
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
