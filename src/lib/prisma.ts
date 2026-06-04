import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma() {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to initialize Prisma.");
    }

    const adapter = new PrismaNeon({ connectionString });
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}
