import { PrismaClient } from "@prisma/client";

declare global {
  var __userPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__userPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__userPrisma = prisma;
}

export default prisma;
